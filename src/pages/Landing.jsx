import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccess } from "../hooks/useAccess.js";

const gold = "#C9A84C";

function useMockTicker(start = 3150) {
  const [price, setPrice] = useState(start);
  useEffect(() => {
    const id = setInterval(() => {
      setPrice((p) => {
        const drift = (Math.random() - 0.5) * 2.5;
        const next = Math.max(3000, Math.min(3400, p + drift));
        return Number(next.toFixed(2));
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);
  return price;
}

export default function Landing() {
  const price = useMockTicker();
  const [menuOpen, setMenuOpen] = useState(false);
  const { activateCode } = useAccess();
  const [payOpen, setPayOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

  const priceDir = useMemo(() => (Math.random() > 0.5 ? "up" : "down"), []);

  const submitCode = () => {
    const ok = activateCode(code);
    if (ok) {
      setStatus("Code accepted! Pro unlocked in this browser.");
      setTimeout(() => setPayOpen(false), 800);
    } else {
      setStatus("Invalid code");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-slate-100">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg border border-[#C9A84C]/50 bg-[#C9A84C]/10 flex items-center justify-center">
            <span className="text-[#C9A84C] font-bold text-sm">G</span>
          </div>
          <span className="text-lg font-semibold text-[#C9A84C]">GoldFlip Pro</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:text-[#C9A84C]">Features</a>
          <a href="#pricing" className="hover:text-[#C9A84C]">Pricing</a>
          <Link
            to="/app"
            className="rounded-full border border-[#C9A84C]/60 bg-[#C9A84C]/10 px-4 py-2 text-[#C9A84C] hover:bg-[#C9A84C]/15"
          >
            Launch Free Dashboard →
          </Link>
        </nav>

        <button
          className="md:hidden rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-200 hover:border-[#C9A84C]"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {menuOpen && (
        <div className="mx-6 mb-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg md:hidden">
          <div className="flex flex-col gap-3 text-sm">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-800">Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-800">Pricing</a>
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg bg-[#C9A84C] px-4 py-2 text-center font-semibold text-slate-900 hover:bg-[#d7b96e]"
            >
              Launch Free Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 space-y-16 pb-20">
        <section className="grid gap-10 lg:grid-cols-2 items-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[#C9A84C]">Demo ready</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#F8F7F4] leading-tight">
              Trade Gold Like the Top 1%
            </h1>
            <p className="text-lg text-slate-300">
              Live XAU/USD signals powered by the London Breakout strategy — the same technique used by professional gold traders worldwide.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app"
                className="rounded-lg bg-[#C9A84C] px-5 py-3 text-slate-900 font-semibold hover:bg-[#d7b96e]"
              >
                Launch Free Dashboard →
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-slate-700 px-5 py-3 text-slate-200 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                View Live Signals
              </a>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
              <span className="flex items-center gap-2 font-mono text-[#C9A84C]">
                XAU/USD {priceDir === "up" ? "▲" : "▼"} ${price.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">mock ticker</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#C9A84C]/30 bg-slate-900/70 p-6 shadow-amber-300/20 shadow-xl">
            <p className="text-sm text-[#C9A84C] mb-2">What you get</p>
            <ul className="space-y-3 text-slate-100">
              <li>• Live XAU/USD signals with kill-zone timing</li>
              <li>• Backtester + Monte Carlo stress on any strategy mix</li>
              <li>• Alerts, CSV export, and risk guardrails</li>
              <li>• Free tier with live price, RSI, MACD</li>
            </ul>
          </div>
        </section>

        {/* Social proof */}
        <section className="grid gap-3 sm:grid-cols-4 text-center text-sm">
          {[
            "500+ traders",
            "London Breakout Strategy",
            "Live XAU/USD Data",
            "Free to Start",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-[#C9A84C] font-semibold"
            >
              {item}
            </div>
          ))}
        </section>

        {/* Features */}
        <section id="features" className="space-y-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[#C9A84C]">Features</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Live Signals", text: "RSI + MACD + London Breakout combined." },
              { title: "Risk Manager", text: "Never blow your account again." },
              { title: "Backtester", text: "Test strategies on real historical data." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
                <p className="text-sm uppercase tracking-[0.15em] text-[#C9A84C] mb-2">{f.title}</p>
                <p className="text-slate-300 text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#C9A84C]">How it works</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Open the dashboard each morning at 9am Harare time",
              "Wait for all 3 indicators to agree on a signal",
              "Enter the trade with your calculated position size",
            ].map((text, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-[0.15em] text-[#C9A84C] mb-2">Step {i + 1}</p>
                <p className="text-slate-200 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#C9A84C]">Pricing</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
              <p className="text-lg font-semibold text-[#C9A84C]">Free</p>
              <p className="text-3xl font-bold text-slate-50 mt-2">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>• Live price</li>
                <li>• RSI & MACD</li>
                <li>• Price chart (20 candles)</li>
              </ul>
              <Link
                to="/app"
                className="mt-6 inline-block rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d7b96e]"
              >
                Start Free →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#C9A84C] bg-slate-900/80 p-6 shadow-lg shadow-amber-300/20">
              <p className="text-lg font-semibold text-[#C9A84C]">Pro</p>
              <p className="text-3xl font-bold text-slate-50 mt-2">$29 <span className="text-base text-slate-400">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>• London Breakout signals (entry/SL/TP)</li>
                <li>• Backtester + Monte Carlo + Strategy Comparison</li>
                <li>• Risk Calculator & Trade Log</li>
              </ul>
              <button
                onClick={() => setPayOpen(true)}
                className="mt-6 inline-block rounded-lg border border-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#C9A84C] hover:bg-[#C9A84C]/10"
              >
                Get Pro Access →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-slate-400">
          <span>GoldFlip Pro — Built for serious gold traders</span>
          <span>Trading involves risk. Past performance does not guarantee future results.</span>
        </div>
      </footer>

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#C9A84C]/40 bg-slate-900 p-5 shadow-2xl shadow-amber-300/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#C9A84C]">Upgrade</p>
                <h3 className="text-xl font-bold text-[#C9A84C]">GoldFlip Pro — $29/month</h3>
              </div>
              <button
                onClick={() => setPayOpen(false)}
                className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              <p>Send $29 via Payoneer to: <span className="font-mono text-[#C9A84C]">YOUR_PAYONEER_EMAIL</span></p>
              <p>Reference: GoldFlip Pro</p>
              <p>After payment, enter your access code below:</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                placeholder="GF-XXXXXX"
              />
              <button
                onClick={submitCode}
                className="w-full rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d7b96e]"
              >
                Submit Code
              </button>
              {status && <p className="text-sm text-amber-200">{status}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
