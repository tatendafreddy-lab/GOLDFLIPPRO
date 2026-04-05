import React from "react";

const sessionNames = {
  ASIA: "Asia",
  LONDON: "London",
  OVERLAP: "London / NY Overlap",
  NEW_YORK: "New York",
  DEAD_ZONE: "Dead Zone",
};

const subSessionNames = {
  LONDON_OPEN: "London Open",
  NY_OPEN: "New York Main",
  LONDON_CLOSE: "London Close",
  DEAD_ZONE: "Dead Zone",
};

function formatMinutes(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function SessionPanel({
  sessionInfo,
  sessionStats = [],
  sessionMultiplier = 1,
  nextSession,
}) {
  const name =
    subSessionNames[sessionInfo?.subSession] ||
    sessionNames[sessionInfo?.session] ||
    "Session";

  return (
    <div className="glass-panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Current session</p>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-300/15 px-3 py-1 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/50">
              {name}
            </span>
            <span className="text-xs text-slate-300">{sessionInfo?.description}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Liquidity score</p>
          <p className="text-2xl font-semibold text-amber-200">{sessionInfo?.liquidityScore ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your size this session</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <p className="text-4xl font-bold text-amber-200">x {sessionMultiplier.toFixed(2)}</p>
          <span className="text-xs text-slate-400">Applies to risk/stake before execution</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session performance</p>
          <span className="text-xs text-slate-400">Win rate / Avg RR / Avg EV</span>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-2 py-1 text-left">Session</th>
                <th className="px-2 py-1 text-left">Trades</th>
                <th className="px-2 py-1 text-left">Win %</th>
                <th className="px-2 py-1 text-left">Avg RR</th>
                <th className="px-2 py-1 text-left">Avg EV</th>
                <th className="px-2 py-1 text-left">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sessionStats.map((row) => (
                <tr key={row.session}>
                  <td className="px-2 py-1 text-slate-200">{sessionNames[row.session] || row.session}</td>
                  <td className="px-2 py-1 text-slate-200">{row.trades}</td>
                  <td className="px-2 py-1 text-slate-200">
                    {row.winRate !== null ? `${row.winRate.toFixed(1)}%` : "--"}
                  </td>
                  <td className="px-2 py-1 text-slate-200">
                    {row.avgRR !== null ? row.avgRR.toFixed(2) : "--"}
                  </td>
                  <td className="px-2 py-1 text-slate-200">
                    {row.avgEV !== null ? row.avgEV.toFixed(2) : "--"}
                  </td>
                  <td className="px-2 py-1 text-amber-200">{row.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next high-liquidity window</p>
          <p className="text-lg font-semibold text-slate-100">{nextSession?.label ?? "N/A"}</p>
          {nextSession ? (
            <p className="text-xs text-slate-400">
              Starts in {formatMinutes(nextSession.minutesAway)} (UTC)
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Liquidity score</p>
          <p className="text-2xl font-bold text-amber-200">{nextSession?.liquidityScore ?? "--"}</p>
        </div>
      </div>
    </div>
  );
}
