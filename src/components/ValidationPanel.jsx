import React, { useMemo } from "react";
import { compareBacktestToLive, getRollingEVTrend } from "../utils/validationEngine.js";
import { getJournal } from "../utils/tradeJournal.js";

const statusColors = {
  VALIDATED: "text-emerald-200",
  DEGRADING: "text-amber-200",
  OVERFITTED: "text-rose-200",
  INSUFFICIENT_DATA: "text-slate-200",
};

function Gauge({ score, status }) {
  const color =
    status === "VALIDATED"
      ? "text-emerald-200"
      : status === "DEGRADING"
      ? "text-amber-200"
      : "text-rose-200";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Model Trust Score</p>
      <p className={`text-5xl font-bold ${color}`}>{score.toFixed(0)}</p>
      <p className={`text-sm font-semibold ${color}`}>{status}</p>
    </div>
  );
}

function DeviationRow({ label, backtest, live, deviation }) {
  const color =
    deviation === null
      ? "text-slate-300"
      : deviation < 10
      ? "text-emerald-200"
      : deviation < 20
      ? "text-amber-200"
      : "text-rose-200";
  return (
    <tr className="border-b border-slate-800">
      <td className="px-2 py-1 text-slate-200">{label}</td>
      <td className="px-2 py-1 text-slate-300">{backtest}</td>
      <td className="px-2 py-1 text-slate-300">{live}</td>
      <td className={`px-2 py-1 font-semibold ${color}`}>
        {deviation !== null ? `${deviation.toFixed(1)}%` : "--"}
      </td>
    </tr>
  );
}

function Sparkline({ points = [] }) {
  const width = 200;
  const height = 60;
  if (!points.length) return <div className="text-xs text-slate-400">No trades yet.</div>;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0.01);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible">
      <line x1="0" y1={height - ((0 - min) / range) * height} x2={width} y2={height - ((0 - min) / range) * height} stroke="#475569" strokeDasharray="4 4" />
      <polyline fill="none" stroke={points[points.length - 1] >= 0 ? "#34d399" : "#f87171"} strokeWidth="2" points={coords.join(" ")} />
    </svg>
  );
}

export default function ValidationPanel() {
  const journal = useMemo(() => getJournal(), []);
  const liveTrades = journal.filter((t) => t.outcome === "win" || t.outcome === "loss");

  const liveWinRate =
    liveTrades.length > 0
      ? liveTrades.filter((t) => t.outcome === "win").length / liveTrades.length
      : 0;
  const rrVals = liveTrades
    .map((t) => Number(t.riskReward))
    .filter((n) => Number.isFinite(n) && n !== 0);
  const liveAvgRR = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 1;

  // crude max drawdown on R-equity curve
  const equity = liveTrades.reduce(
    (acc, t) => {
      const last = acc[acc.length - 1] || 0;
      const pnlR = Number.isFinite(Number(t.pnlR)) ? Number(t.pnlR) : t.outcome === "win" ? 1 : -1;
      acc.push(last + pnlR);
      return acc;
    },
    []
  );
  let peak = 0;
  let maxDD = 0;
  equity.forEach((v) => {
    peak = Math.max(peak, v);
    maxDD = Math.min(maxDD, v - peak);
  });
  const liveMaxDrawdown = Math.abs(maxDD);

  const validation = compareBacktestToLive({
    backtestWinRate: 0.58,
    backtestAvgRR: 2.0,
    backtestMaxDrawdown: 5,
    liveWinRate,
    liveAvgRR,
    liveMaxDrawdown,
    liveTrades: liveTrades.length,
  });

  const trend = getRollingEVTrend(liveTrades);
  const evSeries = liveTrades.slice(-50).map((t) => {
    const win = t.outcome === "win" ? 1 : 0;
    const rr = Number.isFinite(Number(t.riskReward)) ? Number(t.riskReward) : 1;
    return win * rr - (1 - win);
  });

  const broken = trend.ev10 < 0 && trend.ev20 < 0 && trend.ev50 < 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Gauge score={validation.modelTrustScore} status={validation.status} />
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recommendation</p>
          <p className={`text-sm ${statusColors[validation.status] || "text-slate-200"}`}>
            {validation.recommendation}
          </p>
          {validation.warnings.map((w) => (
            <p key={w} className="text-xs text-amber-200 mt-1">
              {w}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">Backtest vs Live</p>
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-2 py-1 text-left">Metric</th>
              <th className="px-2 py-1 text-left">Backtest</th>
              <th className="px-2 py-1 text-left">Live</th>
              <th className="px-2 py-1 text-left">Deviation</th>
            </tr>
          </thead>
          <tbody>
            <DeviationRow
              label="Win rate"
              backtest={`${(0.58 * 100).toFixed(1)}%`}
              live={`${(liveWinRate * 100).toFixed(1)}%`}
              deviation={validation.winRateDeviation}
            />
            <DeviationRow
              label="Avg RR"
              backtest={2.0.toFixed(2)}
              live={liveAvgRR.toFixed(2)}
              deviation={validation.rrDeviation}
            />
            <DeviationRow
              label="Max DD (R)"
              backtest={5}
              live={liveMaxDrawdown.toFixed(2)}
              deviation={validation.drawdownDeviation}
            />
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Rolling EV (last 50 trades)</p>
        <Sparkline points={evSeries} />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <EVStat label="Last 10" value={trend.ev10} />
          <EVStat label="Last 20" value={trend.ev20} />
          <EVStat label="Last 50" value={trend.ev50} />
        </div>
        {broken && (
          <p className="rounded-lg border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm font-semibold text-rose-100">
            STRATEGY BROKEN — HALT AUTOMATION
          </p>
        )}
      </div>
    </div>
  );
}

function EVStat({ label, value }) {
  const color = value >= 0 ? "text-emerald-200" : "text-rose-200";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value.toFixed(2)}</p>
    </div>
  );
}
