export default function SweepAlert({ sweep, onPrefill, fvgs = [], currentPrice }) {
  const showSweep = sweep?.entryOpportunity;
  const dir = sweep?.direction === "bullish" ? "BUY" : "SELL";
  const level = sweep?.sweptLevel ? `$${sweep.sweptLevel.toFixed(2)}` : "--";
  const wick = sweep?.wickSize ? `${sweep.wickSize.toFixed(1)} pips` : "--";

  if (!showSweep && !fvgs.length) return null;

  return (
    <div className="space-y-3">
      {showSweep && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-300/10 p-4 text-slate-100 shadow-lg shadow-amber-500/20">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Smart Money Setup</p>
          <h4 className="mt-1 text-2xl font-bold text-amber-100">LIQUIDITY SWEEP DETECTED</h4>
          <p className="mt-1 text-sm text-slate-200">
            {dir} setup — swept level: <span className="font-semibold">{level}</span>, wick:{" "}
            <span className="font-semibold">{wick}</span>
          </p>
          <p className="text-sm text-slate-200">
            Confidence: <span className="font-semibold">{Math.round(sweep.confidence || 0)}%</span>
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onPrefill?.(dir, sweep)}
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
            >
              SWEEP ENTRY
            </button>
            <span className="text-xs text-slate-300 self-center">
              Prefills Risk Calculator with sweep entry/SL/TP.
            </span>
          </div>
        </div>
      )}

      {fvgs.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Fair Value Gaps</p>
          <div className="space-y-2">
            {fvgs.map((fvg, idx) => {
              const inGap =
                currentPrice &&
                currentPrice <= fvg.gapTop &&
                currentPrice >= fvg.gapBottom;
              const dist = currentPrice
                ? Math.max(
                    0,
                    inGap
                      ? 0
                      : Math.min(
                          Math.abs(currentPrice - fvg.gapTop),
                          Math.abs(currentPrice - fvg.gapBottom)
                        )
                  ).toFixed(2)
                : "--";
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded border px-2 py-1 ${
                    inGap ? "border-amber-300 bg-amber-300/10" : "border-slate-700 bg-slate-800/40"
                  }`}
                >
                  <div>
                    <p className="text-xs text-slate-400">
                      {fvg.type === "bullish" ? "BUY ZONE" : "SELL ZONE"} · {fvg.strength}
                    </p>
                    <p className="text-slate-100">
                      {fvg.gapBottom.toFixed(2)} - {fvg.gapTop.toFixed(2)} ({fvg.gapSize.toFixed(1)} pips)
                    </p>
                  </div>
                  <p className="text-xs text-slate-300">Dist: {dist}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
