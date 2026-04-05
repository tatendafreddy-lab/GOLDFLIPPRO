import { EDGE_COLORS } from "../utils/edgeScore.js";

export default function EdgeScoreGauge({ edge, winProb, expectedValue, trueKelly, insufficient }) {
  const score = edge?.score || 0;
  const grade = edge?.grade || "F";
  const label = edge?.label || "Skip";
  const breakdown = edge?.breakdown || {};

  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = EDGE_COLORS[grade] || "#f43f5e";

  const bars = [
    { label: "Kill Zone", max: 25, val: breakdown.kill || 0 },
    { label: "Breakout", max: 25, val: breakdown.breakout || 0 },
    { label: "RSI", max: 20, val: breakdown.rsi || 0 },
    { label: "MACD", max: 20, val: breakdown.macd || 0 },
    { label: "Trend", max: 10, val: breakdown.trend || 0 },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#1f2937"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="none"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </g>
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            className="fill-slate-100"
            fontSize="40"
            fontWeight="700"
          >
            {score.toFixed(0)}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            className="fill-slate-300"
            fontSize="18"
            fontWeight="600"
          >
            {grade}
          </text>
          <text
            x="50%"
            y="68%"
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="12"
          >
            {label}
          </text>
        </svg>

        <div className="mt-2 text-center text-sm text-slate-200 space-y-1">
          <p>
            Calibrated Win Probability:{" "}
            <span className="font-semibold">
              {insufficient ? "Insufficient data" : `${(winProb * 100).toFixed(1)}%`}
            </span>
          </p>
          <p>
            Expected Value:{" "}
            <span className={expectedValue < 0 ? "text-rose-300 font-semibold" : "text-emerald-300 font-semibold"}>
              {expectedValue >= 0 ? "+" : ""}
              {expectedValue.toFixed(2)} R
            </span>
          </p>
          <p>
            True Kelly (quarter):{" "}
            <span className="font-semibold">{((trueKelly || 0) * 100).toFixed(2)}%</span>
          </p>
          {expectedValue < 0 ? (
            <p className="text-xs text-rose-300">NEGATIVE EV — SKIP THIS TRADE</p>
          ) : score >= 65 ? (
            <p className="text-xs text-emerald-200">Positive EV — size with Dynamic Kelly</p>
          ) : (
            <p className="text-xs text-slate-400">WAIT FOR BETTER SETUP</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">{b.label}</span>
              <span className="text-slate-400 text-xs">
                {b.val}/{b.max}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-300"
                style={{ width: `${Math.min((b.val / b.max) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
