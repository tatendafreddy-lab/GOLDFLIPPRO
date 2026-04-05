import { useState } from "react";

export default function TradeGate({ gate, onOverride }) {
  if (!gate) return null;
  const [confirm, setConfirm] = useState("");
  const isRejected = gate.decision === "REJECTED";

  const canOverride = confirm === "OVERRIDE";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 shadow-lg shadow-slate-900/40">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Trade Quality Gate</p>
          <h3
            className={`text-2xl font-bold ${
              isRejected ? "text-rose-300" : "text-amber-200"
            }`}
          >
            {gate.decision}
          </h3>
          <p className="text-sm text-slate-300">Quality Score: {gate.qualityScore.toFixed(1)} ({gate.confidence} confidence)</p>
        </div>
      </div>

      {gate.rejectionReasons?.length > 0 && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-3 text-xs text-rose-100">
          {gate.rejectionReasons.map((r, idx) => (
            <div key={idx}>• {r}</div>
          ))}
        </div>
      )}

      {gate.warnings?.length > 0 && (
        <div className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-xs text-amber-100">
          {gate.warnings.map((r, idx) => (
            <div key={idx}>• {r}</div>
          ))}
        </div>
      )}

      {isRejected && (
        <div className="space-y-2 text-xs text-slate-200">
          <p className="text-slate-300">Type <span className="font-semibold text-amber-200">OVERRIDE</span> to force this trade (logged).</p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            placeholder="OVERRIDE"
          />
          <button
            disabled={!canOverride}
            onClick={() => canOverride && onOverride?.()}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold ${
              canOverride ? "bg-amber-300 text-slate-900" : "bg-slate-700 text-slate-400"
            }`}
          >
            OVERRIDE AND TRADE ANYWAY
          </button>
        </div>
      )}
    </div>
  );
}
