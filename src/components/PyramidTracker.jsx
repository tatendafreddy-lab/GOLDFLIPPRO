import { calculatePyramidStatus } from "../utils/pyramidManager.js";

export default function PyramidTracker({ plan, currentPrice, onAdd, onAdjustStop }) {
  if (!plan) return null;
  const status = calculatePyramidStatus({ plan, currentPrice });
  if (!status) return null;

  const levels = plan.levels;

  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pyramiding</p>
          <h4 className="text-lg font-semibold text-slate-50">
            Direction: {plan.direction} · R = {plan.R.toFixed(2)}
          </h4>
        </div>
        <div className="text-right text-xs text-slate-300">
          <p>Exposure: {status.exposure.toFixed(2)} stake</p>
          <p>Unrealized: {status.unrealizedR.toFixed(2)} R</p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        {levels.map((lvl) => {
          const filled = status.filled.find((f) => f.id === lvl.id);
          const pending = status.pending.find((p) => p.id === lvl.id);
          return (
            <div
              key={lvl.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                filled ? "border-emerald-400/60 bg-emerald-400/10" : "border-slate-700 bg-slate-800/40"
              }`}
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Entry {lvl.id}</p>
                <p className="text-slate-100">
                  @ ${lvl.price.toFixed(2)} · stake {lvl.stake.toFixed(2)}
                </p>
              </div>
              {!filled && (
                <button
                  onClick={() => onAdd?.(lvl)}
                  className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
                >
                  ADD TO TRADE
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-200">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Current price</p>
          <p className="text-amber-200 font-semibold">${currentPrice?.toFixed?.(2) ?? "--"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Suggested stop</p>
          <p className="text-slate-100">${status.suggestedStop?.toFixed?.(2) ?? "--"}</p>
          <button
            onClick={() => onAdjustStop?.(status.suggestedStop)}
            className="mt-1 text-xs text-amber-200 hover:text-amber-100"
          >
            Move stop
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
        {status.nextAction}
      </div>
    </div>
  );
}
