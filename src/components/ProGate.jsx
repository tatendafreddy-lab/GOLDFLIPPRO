import { useState } from "react";

export default function ProGate({ isPro, children, activateCode }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (isPro) return children;

  const submit = () => {
    const ok = activateCode(code);
    if (ok) {
      setSuccess(true);
      setError("");
      setTimeout(() => setOpen(false), 800);
    } else {
      setError("Invalid code");
      setSuccess(false);
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <div className="rounded-lg border border-amber-300/60 bg-slate-900/90 px-4 py-3 text-sm text-amber-100 shadow-lg">
          <p className="font-semibold">Pro feature</p>
          <button
            onClick={() => setOpen(true)}
            className="mt-2 rounded-md bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-200"
          >
            Unlock Pro Access
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-300/40 bg-slate-900 p-5 shadow-2xl shadow-amber-300/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Upgrade</p>
                <h3 className="text-xl font-bold text-amber-100">Upgrade to GoldFlip Pro</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-amber-300 hover:text-amber-200"
              >
                ✕
              </button>
            </div>

            <p className="text-lg font-semibold text-amber-200">$29/month</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              <li>• Full signals & London Breakout entries/SL/TP</li>
              <li>• Backtester + Monte Carlo + Strategy Comparison</li>
              <li>• Risk Calculator & Trade Log</li>
            </ul>

            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-200">
              <p className="font-semibold text-amber-200">Payment instructions</p>
              <p>Send $29 via Payoneer to: <span className="font-mono text-amber-200">YOUR_PAYONEER_EMAIL</span></p>
              <p>Reference: GoldFlip Pro</p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm text-slate-300">I've paid — enter my code:</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                placeholder="GF-XXXXXX"
              />
              <button
                onClick={submit}
                className="w-full rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
              >
                Submit
              </button>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              {success && <p className="text-sm text-emerald-300">Code accepted! Pro unlocked.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
