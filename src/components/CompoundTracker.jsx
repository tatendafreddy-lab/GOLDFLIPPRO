import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { getCompoundProjection } from "../utils/compoundTracker.js";

const GOLD = "#C9A84C";

export default function CompoundTracker({ balance, journal, riskPercent, tradesPerMonth = 20 }) {
  const [target, setTarget] = useState(1_000_000);
  const [winRate, setWinRate] = useState(journal.winRate || 58);
  const [avgRR, setAvgRR] = useState(journal.avgRR || 2);
  const [risk, setRisk] = useState(riskPercent);

  const proj = useMemo(
    () =>
      getCompoundProjection({
        currentBalance: balance,
        targetBalance: target,
        winRate: winRate / 100,
        avgRR,
        riskPercent: risk / 100,
        tradesPerMonth,
      }),
    [balance, target, winRate, avgRR, risk, tradesPerMonth]
  );

  const data = useMemo(() => {
    const arr = [];
    let bal = balance;
    for (let m = 0; m <= 60; m += 3) {
      arr.push({ month: m, balance: m === 0 ? balance : proj.projectedBalance[`m${m}`] || bal });
    }
    return arr;
  }, [balance, proj]);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Growth Tracker</p>
          <h3 className="text-xl font-semibold text-slate-50">Compound to your target</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Current balance</p>
          <p className="text-2xl font-bold text-[#C9A84C]">${balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Target:
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value || 0))}
            className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
          Months to target: {proj.monthsToTarget ? proj.monthsToTarget : "—"}
        </span>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto py-2">
        <div className="flex items-center gap-4 min-w-[600px]">
          {proj.milestones.map((m, idx) => (
            <div key={m.label} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full ${
                    m.reached ? "bg-[#C9A84C]" : "border border-slate-700 bg-slate-900"
                  } ${idx === 0 ? "animate-pulse" : ""}`}
                />
                {idx < proj.milestones.length - 1 && (
                  <div className="h-[2px] w-24 bg-slate-800" />
                )}
              </div>
              <p className="text-xs text-slate-300">{m.label}</p>
              <p className="text-[11px] text-slate-500">
                {m.reached ? "reached" : m.monthsAway ? `in ${m.monthsAway}m` : "--"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke="#1f2937" vertical={false} />
            <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} />
            <YAxis stroke="#9ca3af" tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #1f2937" }}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Balance"]}
              labelFormatter={(l) => `${l} months`}
            />
            <ReferenceLine y={target} stroke="#f43f5e" strokeDasharray="4 4" label="Target" />
            <Area dataKey="balance" stroke={GOLD} fill={GOLD} fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* What-if */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 space-y-3 text-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <Slider label="Win rate %" value={winRate} setValue={setWinRate} min={40} max={80} />
          <Slider label="Risk % per trade" value={risk} setValue={setRisk} min={0.5} max={3} step={0.1} />
          <Slider label="Avg R:R" value={avgRR} setValue={setAvgRR} min={1} max={4} step={0.1} />
        </div>
        <p className="text-slate-200">
          You reach ${target.toLocaleString()} in{" "}
          {proj.monthsToTarget ? `${proj.monthsToTarget} months (~${(proj.yearsToTarget || 0).toFixed(2)} years)` : "—"}
        </p>
        {proj.warningMessage ? (
          <p className="text-rose-300 text-xs">{proj.warningMessage}</p>
        ) : (
          <p className="text-emerald-300 text-xs">Edge positive. Projection is on track.</p>
        )}
      </div>
    </div>
  );
}

function Slider({ label, value, setValue, min, max, step = 1 }) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="accent-amber-300"
      />
    </label>
  );
}
