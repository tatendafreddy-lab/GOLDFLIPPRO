import React, { useEffect, useMemo, useState } from "react";
import { getJournal } from "../utils/tradeJournal.js";
import {
  calculateStrategyMetrics,
  getCapitalAllocation,
} from "../utils/strategyAllocator.js";

const statusColors = {
  ACTIVE: "bg-emerald-400/15 text-emerald-200 border-emerald-400/40",
  REDUCED: "bg-amber-400/15 text-amber-200 border-amber-400/40",
  DISABLED: "bg-rose-400/15 text-rose-200 border-rose-400/40",
};

export default function StrategyAllocator() {
  const [metrics, setMetrics] = useState([]);
  const [allocation, setAllocation] = useState({ allocations: {}, disabledStrategies: [], reasoning: "" });

  const recalc = () => {
    const journal = getJournal();
    const m = calculateStrategyMetrics(journal);
    const alloc = getCapitalAllocation(m);
    setMetrics(m);
    setAllocation(alloc);
  };

  useEffect(() => {
    recalc();
  }, []);

  const rows = useMemo(
    () =>
      metrics.map((m) => ({
        ...m,
        allocationPct: (allocation.allocations[m.strategy] || 0) * 100,
      })),
    [metrics, allocation]
  );

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Strategy allocation</p>
          <h3 className="text-xl font-semibold text-slate-100">Capital by strategy</h3>
          <p className="text-xs text-slate-400">{allocation.reasoning}</p>
        </div>
        <button
          onClick={recalc}
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
        >
          Rebalance
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">Log trades with a strategy tag to see allocations.</p>
        ) : (
          rows.map((row) => (
            <div key={row.strategy} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{row.strategy}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusColors[row.status]}`}>
                    {row.status}
                  </span>
                </div>
                <span className="text-lg font-bold text-amber-200">{row.allocationPct.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full rounded bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${
                    row.status === "ACTIVE"
                      ? "bg-emerald-400/80"
                      : row.status === "REDUCED"
                      ? "bg-amber-400/80"
                      : "bg-rose-400/80"
                  }`}
                  style={{ width: `${Math.min(100, row.allocationPct)}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs text-slate-300">
                <Stat label="Win rate" value={`${(row.winRate * 100).toFixed(1)}%`} />
                <Stat label="Avg RR" value={row.avgRR.toFixed(2)} />
                <Stat label="Expectancy" value={row.expectancy.toFixed(2)} />
                <Stat label="Last20 Exp" value={row.rollingExpectancy.toFixed(2)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}
