import { EDGE_COLORS } from "../utils/edgeScore.js";

const regimeColors = {
  TRENDING_UP: "bg-emerald-900/40 border-emerald-500/40 text-emerald-200",
  TRENDING_DOWN: "bg-emerald-900/40 border-emerald-500/40 text-emerald-200",
  RANGING: "bg-blue-900/30 border-blue-400/30 text-blue-200",
  VOLATILE: "bg-rose-900/40 border-rose-500/40 text-rose-200",
};

export default function RegimePanel({ regime, atr, recommendation, personal }) {
  const color = regimeColors[regime] || "bg-slate-800 border-slate-700 text-slate-200";
  const volLabel =
    atr && atr > 2 ? "Volatility: High" : atr && atr > 3 ? "Volatility: Extreme" : "Volatility: Normal";
  return (
    <div className={`rounded-xl border p-4 ${color} shadow-lg`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Market Regime</p>
          <h3 className="text-2xl font-bold">{regime || "Unknown"}</h3>
          <p className="text-sm text-slate-200">{volLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Best strategy now</p>
          <p className="text-lg font-semibold text-amber-200">{recommendation?.bestStrategy}</p>
          <p className="text-xs text-slate-200">{recommendation?.reasoning}</p>
          <p className="text-xs font-semibold text-amber-200">
            {recommendation?.riskMultiplier >= 1
              ? "Trade at 100% size"
              : recommendation?.riskMultiplier <= 0.5
              ? "Reduce to 50%"
              : "Reduce slightly"}
          </p>
        </div>
      </div>

      {personal?.regimeStats?.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs text-slate-200">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                {["Regime", "Trades", "Win Rate", "Avg R:R", "Verdict"].map((h) => (
                  <th key={h} className="px-2 py-1 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {personal.regimeStats.map((r) => {
                const isBest = personal.bestRegime === r.regime;
                const isWorst = personal.worstRegime === r.regime;
                return (
                  <tr
                    key={r.regime}
                    className={`${isBest ? "bg-emerald-500/10" : ""} ${isWorst ? "bg-rose-500/10" : ""}`}
                  >
                    <td className="px-2 py-1">{r.regime}</td>
                    <td className="px-2 py-1">{r.trades}</td>
                    <td className="px-2 py-1">{(r.winRate * 100).toFixed(1)}%</td>
                    <td className="px-2 py-1">{r.avgRR.toFixed(2)}</td>
                    <td className="px-2 py-1">
                      {isBest ? "Best" : isWorst ? "Worst" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-emerald-200">
            You perform best in {personal.bestRegime || "—"} markets
          </p>
        </div>
      )}
    </div>
  );
}
