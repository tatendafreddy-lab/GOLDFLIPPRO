function Pill({ children, color }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {children}
    </span>
  );
}

export default function StructurePanel({ structure, londonBreakout }) {
  if (!structure) return null;
  const bb = structure.bollinger || {};
  const bos = structure.bos || {};
  const eq = structure.equal || {};

  const squeezeBuilding = bb.squeeze;
  const squeezeRelease = bb.squeezeRelease;

  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Market Structure</p>
          <h4 className="text-lg font-semibold text-slate-50">Volatility & Liquidity</h4>
        </div>
        {squeezeRelease ? (
          <Pill color="bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/40">
            EXPLOSION IMMINENT
          </Pill>
        ) : squeezeBuilding ? (
          <Pill color="bg-amber-400/10 text-amber-200 ring-1 ring-amber-300/40">
            SQUEEZE BUILDING
          </Pill>
        ) : (
          <Pill color="bg-slate-700/60 text-slate-200 ring-1 ring-slate-600/40">Normal</Pill>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-200">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Break of Structure</p>
          {bos.bos ? (
            <div className="mt-1">
              <Pill
                color={
                  bos.bos === "bullish"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-rose-400/10 text-rose-200"
                }
              >
                {bos.bos.toUpperCase()} BOS
              </Pill>
              <p className="mt-1 text-slate-100">Level: {bos.level ? `$${bos.level.toFixed(2)}` : "--"}</p>
              <p className="text-xs text-slate-400">Strength: {bos.strength || "weak"}</p>
            </div>
          ) : (
            <p className="mt-1 text-slate-400">No fresh BOS detected.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Equal Highs / Lows</p>
          {eq.equalHighs?.length ? (
            <p className="text-amber-200">Liquidity above: ${eq.equalHighs[0].toFixed(2)}</p>
          ) : (
            <p className="text-slate-400">No equal highs</p>
          )}
          {eq.equalLows?.length ? (
            <p className="text-emerald-200">Liquidity below: ${eq.equalLows[0].toFixed(2)}</p>
          ) : (
            <p className="text-slate-400">No equal lows</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Sweep risk: {eq.sweepRisk || "low"}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Bollinger Bands</p>
          <p className="text-slate-100">Upper: {bb.upper ? `$${bb.upper.toFixed(2)}` : "--"}</p>
          <p className="text-slate-100">Lower: {bb.lower ? `$${bb.lower.toFixed(2)}` : "--"}</p>
          <p className="text-slate-100">Width: {bb.width ? bb.width.toFixed(2) : "--"}</p>
        </div>
      </div>

      <div className="text-xs text-slate-400">
        {londonBreakout?.signal === "BUY" && eq.equalHighs?.length
          ? "Potential stop-hunt above equal highs — be ready for a sweep then long."
          : null}
        {londonBreakout?.signal === "SELL" && eq.equalLows?.length
          ? "Potential stop-hunt below equal lows — be ready for a sweep then short."
          : null}
      </div>
    </div>
  );
}
