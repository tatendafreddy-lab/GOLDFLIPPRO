import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { isLondonKillZone } from "../utils/londonBreakout.js";
import { checkAlerts } from "../utils/alertEngine.js";
import {
  classifySession,
  getSessionPerformanceStats,
  getSessionSizingMultiplier,
  nextHighLiquiditySession,
} from "../utils/sessionEngine.js";
import PriceChart from "./PriceChart.jsx";
import SignalPanel from "./SignalPanel.jsx";
import RiskCalculator from "./RiskCalculator.jsx";
import TradeLog from "./TradeLog.jsx";
import AlertFeed from "./AlertFeed.jsx";
import ProGate from "./ProGate.jsx";
import { useAccess } from "../hooks/useAccess.js";
import JournalPanel from "./JournalPanel.jsx";
import CompoundTracker from "./CompoundTracker.jsx";
import AutoTrader from "./AutoTrader.jsx";
import SessionPanel from "./SessionPanel.jsx";
import { InstallButton } from "../hooks/usePWA.jsx";
import { getJournal as getTradeJournal } from "../utils/tradeJournal.js";
import StrategyAllocator from "./StrategyAllocator.jsx";
import ValidationPanel from "./ValidationPanel.jsx";

const Backtester = lazy(() => import("./Backtester.jsx"));

const cardBase =
  "rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-black/30";

// Source badge — Shows "Live" (green) or "Demo" (grey)
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
      {isLive ? "Live" : "Demo Mode"}
    </span>
  );
}

// Metric card
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

// Kill zone timer
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

function BellIcon({ filled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M14 19a2 2 0 1 1-4 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 9a6 6 0 1 1 12 0c0 1.726.338 2.82.93 3.815.383.639-.06 1.442-.79 1.442H5.86c-.73 0-1.173-.803-.79-1.442C5.662 11.82 6 10.726 6 9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={filled ? "fill-amber-300/30" : ""}
      />
    </svg>
  );
}

function Dashboard({ market, signals, riskManager, autoTradeRef }) {
  const { isPro, activateCode } = useAccess();
  const [tab, setTab] = useState("live");
  const [now, setNow] = useState(() => new Date());
  const [journalEntries, setJournalEntries] = useState(() => {
    try {
      return getTradeJournal();
    } catch {
      return [];
    }
  });
  const [alerts, setAlerts] = useState(() => {
    try {
      const raw = localStorage.getItem("goldflip-alerts");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("[alerts] failed to read cache", e);
    }
    return [];
  });
  const [feedOpen, setFeedOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const audioCtxRef = useRef(null);

  // Transition refs to avoid spamming alerts
  const prevKillZoneRef = useRef(false);
  const prevLbSignalRef = useRef("WAIT");
  const prevAgreeRef = useRef(false);
  const prevRsiZoneRef = useRef("neutral");
  const prevDrawdownRef = useRef(false);
  const dashboardRef = useRef(null);
  const signalsRef = useRef(null);
  const riskRef = useRef(null);

  const priceChange = market.changePct ?? 0;
  const macdHist = signals?.macd?.histogram || [];
  const lastHist = macdHist[macdHist.length - 1] ?? 0;

  // Clock for session classification
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Keep journal snapshot fresh for session stats
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const sync = () => {
      try {
        setJournalEntries(getTradeJournal());
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(sync, 15_000);
    window.addEventListener("storage", sync);
    sync();
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Request notification permission on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Persist alerts & unread count
  useEffect(() => {
    try {
      const trimmed = alerts.slice(0, 50);
      localStorage.setItem("goldflip-alerts", JSON.stringify(trimmed));
    } catch {}
    setUnread(alerts.filter((a) => !a.read).length);
  }, [alerts]);

  // Mark read when feed opened
  useEffect(() => {
    if (feedOpen) {
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    }
  }, [feedOpen]);

  const playBeep = () => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("[beep]", e?.message);
    }
  };

  const notifySignal = (message) => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification("GoldFlip Pro", { body: message });
    } catch {}
  };

  // Core alert engine wiring
  useEffect(() => {
    const dailyStatus = riskManager.getDailyStatus?.() ?? {};
    const killZoneActive = signals?.londonBreakout?.isKillZone ?? isLondonKillZone();
    const lbSignal = signals?.londonBreakout?.signal ?? "WAIT";
    const rsiSignal = signals?.rsi?.signal ?? "neutral";
    const macdSignal = signals?.macd?.signal ?? "neutral";
    const lbDir = lbSignal?.toLowerCase();
    const agreeDirection =
      ["buy", "sell"].includes(rsiSignal) && rsiSignal === macdSignal && rsiSignal === lbDir;

    const rsiVal = signals?.rsi?.value;
    const rsiZone = rsiVal < 35 ? "oversold" : rsiVal > 65 ? "overbought" : "neutral";
    const drawdownExceeded = (dailyStatus.dailyLossPercent ?? 0) > 2;

    const triggeredTypes = [];
    if (killZoneActive && !prevKillZoneRef.current) triggeredTypes.push("kill_zone");
    if ((lbSignal === "BUY" || lbSignal === "SELL") && lbSignal !== prevLbSignalRef.current) {
      triggeredTypes.push("london_breakout");
    }
    if (agreeDirection && !prevAgreeRef.current) triggeredTypes.push("high_confidence");
    if (rsiZone !== prevRsiZoneRef.current && rsiZone !== "neutral") {
      triggeredTypes.push(rsiZone === "oversold" ? "rsi_oversold" : "rsi_overbought");
    }
    if (drawdownExceeded && !prevDrawdownRef.current) triggeredTypes.push("drawdown");

    prevKillZoneRef.current = killZoneActive;
    prevLbSignalRef.current = lbSignal;
    prevAgreeRef.current = agreeDirection;
    prevRsiZoneRef.current = rsiZone;
    prevDrawdownRef.current = drawdownExceeded;

    if (!triggeredTypes.length) return;

    const candidateAlerts = checkAlerts({
      signals,
      londonBreakout: signals?.londonBreakout,
      rsi: signals?.rsi,
      macd: signals?.macd,
      dailyDrawdownPercent: dailyStatus.dailyLossPercent,
    }).filter((a) => triggeredTypes.includes(a.type));

    if (!candidateAlerts.length) return;

    setAlerts((prev) => {
      const merged = [...prev];
      candidateAlerts.forEach((a) => {
        // avoid duplicates within the last minute
        const isDupe = merged.some(
          (m) => m.type === a.type && m.message === a.message && Math.abs(m.timestamp - a.timestamp) < 60_000
        );
        if (isDupe) return;
        const nextAlert = { ...a, read: feedOpen };
        merged.unshift(nextAlert);

        if (a.severity === "signal") {
          if (riskManager.alertSoundEnabled) playBeep();
          notifySignal(a.message);
        }
      });
      return merged.slice(0, 50);
    });
  }, [signals, riskManager]);

  const sessionInfo = useMemo(() => classifySession(now), [now]);
  const sessionStats = useMemo(() => getSessionPerformanceStats(journalEntries), [journalEntries]);
  const sweepDetected = useMemo(
    () => !!(signals?.structure?.sweep?.swept && signals?.structure?.sweep?.reversalConfirmed),
    [signals]
  );
  const sessionMultiplier = useMemo(
    () => getSessionSizingMultiplier(sessionInfo, sessionStats, sweepDetected),
    [sessionInfo, sessionStats, sweepDetected]
  );
  const nextSession = useMemo(() => nextHighLiquiditySession(now), [now]);
  const sessionContext = useMemo(
    () => ({ sessionInfo, sessionStats, sessionMultiplier, nextSession, sweepDetected }),
    [sessionInfo, sessionStats, sessionMultiplier, nextSession, sweepDetected]
  );

  const signalColor = (sig) => {
    if (sig === "buy") return "bg-emerald-400/20 text-emerald-200";
    if (sig === "sell") return "bg-rose-400/20 text-rose-200";
    return "bg-slate-700/60 text-slate-200";
  };

  const clearAlerts = () => {
    setAlerts([]);
    setUnread(0);
  };

  const scrollTo = (ref) => {
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen text-slate-100" style={{ backgroundColor: "#0F0F0F" }}>
      <div ref={dashboardRef} className="mx-auto max-w-7xl px-6 py-6 space-y-6 pb-24">

        {/* Top bar */}
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
            <SourceBadge source={market.source} isMock={market.isMock} />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Growth tracker</p>
              <p className="text-sm font-semibold text-amber-200">
                ${riskManager.accountBalance.toLocaleString()} · proj to $1M: see Growth tab
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">XAU/USD</p>
              <p className="text-xl font-semibold text-slate-50">
                ${market.price > 0 ? market.price.toFixed(2) : "---"}
              </p>
            </div>
            <KillZoneTimer />
            {autoTradeRef?.current?.enabled ? (
              <span className="animate-pulse rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-200 border border-amber-300/60">
                AUTO ON
              </span>
            ) : null}
            <InstallButton />
            <button
              onClick={() => setFeedOpen((o) => !o)}
              className="relative rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-200 hover:border-amber-300 hover:text-amber-200"
              aria-label="Toggle alerts"
            >
              <BellIcon filled={unread > 0} />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-amber-400 px-1 text-[10px] font-semibold text-slate-900 text-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["live", "journal", "growth", "backtest", "autotrader", "validation"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "bg-amber-300 text-slate-900"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {t === "live"
                ? "Live Trading"
                : t === "journal"
                ? "Journal"
                 : t === "growth"
                ? "Growth Tracker"
                : t === "backtest"
                ? "Backtester"
                : t === "autotrader"
                ? "Auto-Trader"
                : "Validation"}
              {t === "backtest" && !isPro ? (
                <span className="ml-2 rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                  PRO
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "live" ? (
          <>
            {/* Metric cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="space-y-6">
                <div ref={signalsRef}>
                  <PriceChart market={market} signals={signals} isPro={isPro} />
                </div>
                <ProGate isPro={isPro} activateCode={activateCode}>
                  <SignalPanel
                    signal={signals}
                    price={market?.price}
                    onSweepPrefill={(dir) => handleSweepPrefill(dir, signals?.structure?.sweep)}
                  />
                </ProGate>
              </div>
              <div className="space-y-6">
                <SessionPanel
                  sessionInfo={sessionInfo}
                  sessionStats={sessionStats}
                  sessionMultiplier={sessionMultiplier}
                  nextSession={nextSession}
                />
                <div ref={riskRef}>
                  <ProGate isPro={isPro} activateCode={activateCode}>
                    <RiskCalculator riskManager={riskManager} sessionContext={sessionContext} />
                  </ProGate>
                </div>
                <StrategyAllocator />
                <ProGate isPro={isPro} activateCode={activateCode}>
                  <TradeLog riskManager={riskManager} />
                </ProGate>
              </div>
            </div>
          </>
        ) : tab === "journal" ? (
          <JournalPanel />
        ) : tab === "growth" ? (
          <CompoundTracker balance={riskManager.accountBalance} journal={riskManager.getJournal()} riskPercent={riskManager.riskPercent} />
        ) : tab === "autotrader" ? (
          <AutoTrader
            signals={signals}
            market={market}
            riskManager={riskManager}
            sessionContext={sessionContext}
            autoTradeRef={autoTradeRef}
          />
        ) : tab === "validation" ? (
          <ValidationPanel />
        ) : (
          <Suspense fallback={
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200">
              Loading backtester?
            </div>
          }>
            <ProGate isPro={isPro} activateCode={activateCode}>
              <Backtester market={market} />
            </ProGate>
          </Suspense>
        )}
      </div>

      <AlertFeed
        open={feedOpen}
        alerts={alerts}
        onClear={clearAlerts}
        onClose={() => setFeedOpen(false)}
      />

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-around px-2 py-2">
          <button
            onClick={() => {
              setTab("live");
              scrollTo(dashboardRef);
            }}
            className="min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setTab("live");
              scrollTo(signalsRef);
            }}
            className="min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Signals
          </button>
          <button
            onClick={() => {
              setTab("backtest");
              scrollTo(dashboardRef);
            }}
            className="min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Backtest {!isPro ? " (PRO)" : ""}
          </button>
          <button
            onClick={() => {
              setTab("live");
              scrollTo(riskRef);
            }}
            className="min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Risk
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

  const handleSweepPrefill = (dir, sweep) => {
    if (!sweep?.sweptLevel || !riskManager?.setEntryPrice || !riskManager?.setStopLoss) return;
    const entry = sweep.sweptLevel;
    const buffer = Math.max(1, (sweep.wickSize || 5) * 0.1); // at least $1, or wick*0.1 dollars
    const stopLoss = dir === "BUY" ? entry - buffer : entry + buffer;
    riskManager.setEntryPrice(Number(entry.toFixed(2)));
    riskManager.setStopLoss(Number(stopLoss.toFixed(2)));
  };
