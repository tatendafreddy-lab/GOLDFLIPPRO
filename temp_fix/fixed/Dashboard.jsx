import { useEffect, useMemo, useState } from "react";
import { isLondonKillZone } from "../utils/londonBreakout.js";
import PriceChart from "./PriceChart.jsx";
import SignalPanel from "./SignalPanel.jsx";
import RiskCalculator from "./RiskCalculator.jsx";
import TradeLog from "./TradeLog.jsx";
import Backtester from "./Backtester.jsx";

const cardBase =
  "rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-black/30";

// ─── Source badge ─────────────────────────────────────────────────────────────
// Shows "Live" (green) or "Demo" (grey) — never "Cache"
function SourceBadge({ source, isMock }) {
  const isLive = !isMock && source === "live";
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
        isLive
          ? "bg-emerald-400/20 text-emerald-200"
          : "bg-slate-700/60 text-slate-200"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isLive ? "animate-pulse bg-emerald-300" : "bg-slate-400"
        }`}
      />
      {isLive ? "Live" : "Demo"}
    </span>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ title, value, sub, badge }) {
  return (
    <div className={cardBase}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
        {badge}
      </div>
      <p className="mt-2 text-2xl font-semibold text-amber-300">{value}</p>
      {sub ? <p className="text-sm text-slate-400">{sub}</p> : null}
    </div>
  );
}

// ─── Kill zone timer ─────────────────────────────────────────────────────────
function KillZoneTimer() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { label, active } = useMemo(() => {
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const inZone = hour >= 7 && hour < 10;
    if (inZone) {
      const minutesLeft = (9 - hour) * 60 + (60 - minute);
      return { active: true, label: `Kill zone ends in ${minutesLeft}m` };
    }
    const startMinutes =
      hour < 7
        ? (7 - hour - 1) * 60 + (60 - minute)
        : (24 - hour + 7 - 1) * 60 + (60 - minute);
    return { active: false, label: `Kill zone in ${startMinutes}m` };
  }, [now]);

  return (
    <span
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${
        active
          ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/50"
          : "bg-slate-700/60 text-slate-200 ring-1 ring-slate-600/40"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active ? "animate-pulse bg-emerald-300" : "bg-slate-400"
        }`}
      />
      {label}
    </span>
  );
}

// ─── Settings gear icon ──────────────────────────────────────────────────────
function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ market, signals, riskManager }) {
  const [tab, setTab] = useState("live");
  const priceChange = market.changePct ?? 0;
  const macdHist = signals?.macd?.histogram || [];
  const lastHist = macdHist[macdHist.length - 1] ?? 0;

  const signalColor = (sig) => {
    if (sig === "buy") return "bg-emerald-400/20 text-emerald-200";
    if (sig === "sell") return "bg-rose-400/20 text-rose-200";
    return "bg-slate-700/60 text-slate-200";
  };

  return (
    <div className="min-h-screen text-slate-100" style={{ backgroundColor: "#0F0F0F" }}>
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">

        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-300/20 ring-2 ring-amber-300/40 flex items-center justify-center">
              <span className="text-amber-300 font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Gold trading desk
              </p>
              <h1 className="text-2xl font-semibold text-amber-300">GoldFlip Pro</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">XAU/USD</p>
              <p className="text-xl font-semibold text-slate-50">
                ${market.price > 0 ? market.price.toFixed(2) : "---"}
              </p>
            </div>
            <KillZoneTimer />
            <SettingsIcon />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2">
          {["live", "backtest"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "bg-amber-300 text-slate-900"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {t === "live" ? "Live Trading" : "Backtester"}
            </button>
          ))}
        </div>

        {tab === "live" ? (
          <>
            {/* ── Metric cards ── */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {/* Spot price */}
              <MetricCard
                title="Spot price"
                value={`$${market.price > 0 ? market.price.toFixed(2) : "---"}`}
                sub={
                  market.isMock
                    ? "Demo mode — no API connection"
                    : `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}% session`
                }
                badge={<SourceBadge source={market.source} isMock={market.isMock} />}
              />

              {/* RSI */}
              <MetricCard
                title="RSI"
                value={
                  signals?.rsi?.value != null
                    ? signals.rsi.value.toFixed(1)
                    : "--"
                }
                sub="Buy < 40, Sell > 60"
                badge={
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${signalColor(
                      signals?.rsi?.signal
                    )}`}
                  >
                    {signals?.rsi?.signal || "neutral"}
                  </span>
                }
              />

              {/* MACD */}
              <MetricCard
                title="MACD"
                value={lastHist ? lastHist.toFixed(4) : "--"}
                sub="Histogram momentum"
                badge={
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${signalColor(
                      signals?.macd?.signal
                    )}`}
                  >
                    {signals?.macd?.signal || "neutral"}
                  </span>
                }
              />

              {/* Account */}
              <MetricCard
                title="Account"
                value={`$${riskManager.accountBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                sub={`Today P&L: $${(
                  (riskManager.getDailyStatus?.()?.dailyLoss ?? 0) * -1
                ).toFixed(2)}`}
              />
            </div>

            {/* ── Main grid ── */}
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="space-y-6">
                <PriceChart market={market} signals={signals} />
                <SignalPanel signal={signals} />
              </div>
              <div className="space-y-6">
                <RiskCalculator riskManager={riskManager} />
                <TradeLog riskManager={riskManager} />
              </div>
            </div>
          </>
        ) : (
          <Backtester market={market} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
