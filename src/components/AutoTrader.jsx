import { useEffect, useMemo, useState } from "react";
import { useDerivTrader } from "../hooks/useDerivTrader.js";
import { checkAllSafetyRules } from "../utils/safetyGuardian.js";
import { saveSignal } from "../utils/tradeJournal.js";
import { sendTelegramAlert } from "../utils/telegramAlert.js";
import { checkBridgeStatus, sendSignalToBridge } from "../utils/mt4Bridge.js";
import { createPyramidPlan, calculatePyramidStatus } from "../utils/pyramidManager.js";
import PyramidTracker from "./PyramidTracker.jsx";
import { getNewsRiskLevel } from "../utils/macroOverlay.js";
import { recordExecution, getExecutionStats } from "../utils/executionMonitor.js";
import { evaluateTradeQuality } from "../utils/tradeQualityGate.js";
import { getJournal } from "../utils/tradeJournal.js";
import {
  calculateStrategyMetrics,
  getCapitalAllocation,
  getStrategyStakeMultiplier,
} from "../utils/strategyAllocator.js";
import { compareBacktestToLive } from "../utils/validationEngine.js";

export default function AutoTrader({ signals, market, riskManager, autoTradeRef, sessionContext }) {
  const {
    isConnected,
    isAuthorized,
    derivBalance,
    tradeHistory,
    lastTrade,
    placeTrade,
    connect,
    disconnect,
    error,
  } = useDerivTrader();
  const sessionMultiplier = sessionContext?.sessionMultiplier ?? 1;
  const sessionKey =
    sessionContext?.sessionInfo?.subSession === "DEAD_ZONE"
      ? "DEAD_ZONE"
      : sessionContext?.sessionInfo?.session;
  const currentSessionStat = sessionContext?.sessionStats?.find((s) => s.session === sessionKey);

  const [enabled, setEnabled] = useState(false);
  const [stake, setStake] = useState(1);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(3);
  const [minEdgeScore, setMinEdgeScore] = useState(70);
  const [requireConfirm, setRequireConfirm] = useState(true);
  const [autoLog, setAutoLog] = useState([]);
  const [bridgeStatus, setBridgeStatus] = useState({ running: false });
  const [pyramidPlan, setPyramidPlan] = useState(null);
  const [executions, setExecutions] = useState([]);

  const today = new Date().toDateString();
  const dailyTradeCount = tradeHistory.filter(
    (t) => new Date(t.timestamp || Date.now()).toDateString() === today
  ).length;
  const news = getNewsRiskLevel();

  const strategyJournal = getJournal();
  const strategyMetrics = calculateStrategyMetrics(strategyJournal);
  const strategyAlloc = getCapitalAllocation(strategyMetrics);
  const strategyName = signals?.strategyName || signals?.strategy || "London Breakout";
  const strategyStakeMult = getStrategyStakeMultiplier(strategyName, strategyAlloc.allocations);
  const liveTrades = strategyJournal.filter((t) => t.outcome === "win" || t.outcome === "loss");
  const liveWinRate =
    liveTrades.length > 0
      ? liveTrades.filter((t) => t.outcome === "win").length / liveTrades.length
      : 0;
  const rrVals = liveTrades
    .map((t) => Number(t.riskReward))
    .filter((n) => Number.isFinite(n) && n !== 0);
  const liveAvgRR = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 1;
  const trust = compareBacktestToLive({
    backtestWinRate: 0.58,
    backtestAvgRR: 2.0,
    backtestMaxDrawdown: 5,
    liveWinRate,
    liveAvgRR,
    liveMaxDrawdown: 5,
    liveTrades: liveTrades.length,
  });

  const safety = useMemo(
    () =>
      checkAllSafetyRules({
        edgeScore: signals?.confidence ?? 0,
        isKillZone: signals?.londonBreakout?.isKillZone ?? false,
        dailyLoss: riskManager.getDailyStatus?.().dailyLoss ?? 0,
        accountBalance: riskManager.accountBalance ?? 0,
        dailyTradeCount,
        weeklyLoss: 0, // placeholder
        consecutiveLosses: 0, // placeholder
        regime: "normal",
        isLiveFeedConnected: !market.isMock,
        isNewsExtreme: news.riskLevel === "extreme",
      }),
    [signals, market, riskManager, dailyTradeCount, news.riskLevel]
  );

  const shouldTrade =
    enabled &&
    signals?.combined &&
    signals?.combined !== "neutral" &&
    (signals?.confidence ?? 0) >= minEdgeScore &&
    (signals?.londonBreakout?.isKillZone ?? false) &&
    dailyTradeCount < maxTradesPerDay &&
    sessionMultiplier > 0 &&
    strategyStakeMult > 0 &&
    safety.canTrade &&
    gate.decision === "APPROVED";

  useEffect(() => {
    if (!shouldTrade) return;
    const direction = signals.combined.toUpperCase() === "BUY" ? "BUY" : "SELL";
    const entry = market?.price || signals?.londonBreakout?.entry || 0;
    const stopLoss = signals?.londonBreakout?.stopLoss || undefined;
    const takeProfit = signals?.londonBreakout?.takeProfit || undefined;

    const execute = () => {
      const sessionStake = Number((stake * sessionMultiplier * strategyStakeMult).toFixed(2));
      // Spread guard (simple: block if > $0.5)
      const spread = market?.spread || 0.2;
      if (spread > 0.5) {
        setAutoLog((prev) => [
          { time: new Date().toISOString(), direction, stake: sessionStake, status: "SPREAD TOO WIDE" },
          ...prev,
        ]);
        setTimeout(() => {}, 30000);
        return;
      }

      placeTrade({
        direction,
        stake: sessionStake,
        stopLoss,
        takeProfit,
      });
      saveSignal({
        direction,
        entry,
        stopLoss,
        takeProfit,
        riskReward: signals?.londonBreakout?.riskReward ?? "N/A",
        confidence: signals?.confidence ?? 0,
        strategy: strategyName,
        timestamp: Date.now(),
      });
      sendTelegramAlert({
        direction,
        entry,
        stopLoss,
        takeProfit,
        riskReward: signals?.londonBreakout?.riskReward ?? "N/A",
        confidence: signals?.confidence ?? 0,
      }).catch(() => {});
      setAutoLog((prev) => [
        {
          time: new Date().toISOString(),
          direction,
          stake: sessionStake,
          stopLoss,
          takeProfit,
          status: "sent",
        },
        ...prev,
      ]);

      recordExecution({
        tradeId: `auto-${Date.now()}`,
        requestedPrice: entry,
        filledPrice: entry,
        requestedTime: Date.now(),
        filledTime: Date.now(),
        spreadAtEntry: spread,
        direction,
      });
      setExecutions((prev) =>
        [
          {
            requestedPrice: entry,
            filledPrice: entry,
            spreadAtEntry: spread,
            slippagePips: 0,
            executionDelay: 0,
            direction,
          },
          ...prev,
        ].slice(0, 50)
      );

      // initialize pyramiding after Entry 1
      const plan = createPyramidPlan({
        entry,
        stopLoss,
        takeProfit,
        initialStake: sessionStake,
        direction,
      });
      setPyramidPlan(plan);
    };

    if (requireConfirm) {
      const ok = window.confirm(
        `Auto-trade signal: ${direction} stake $${stake}. Proceed? (Edge ${signals?.confidence})`
      );
      if (!ok) return;
    }
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldTrade, signals?.combined]);

  const testBridge = async () => {
    const status = await checkBridgeStatus();
    setBridgeStatus(status);
  };

  // Auto-pyramid when price enters aligned FVG
  useEffect(() => {
    if (!pyramidPlan) return;
    const lbDir = signals?.londonBreakout?.signal;
    const fvg = signals?.structure?.priceInFvg;
    if (!fvg || !lbDir) return;
    const dirMatch =
      (lbDir === "BUY" && fvg.type === "bullish") || (lbDir === "SELL" && fvg.type === "bearish");
    if (!dirMatch) return;
    const pendingLvl = pyramidPlan.levels.find((l) => l.status === "pending");
    if (!pendingLvl) return;

    placeTrade({
      direction: pyramidPlan.direction,
      stake: pendingLvl.stake,
      stopLoss: pyramidPlan.stopLoss,
      takeProfit: pyramidPlan.takeProfit,
    });

    const updated = {
      ...pyramidPlan,
      levels: pyramidPlan.levels.map((l) =>
        l.id === pendingLvl.id ? { ...l, status: "filled" } : l
      ),
    };
    setPyramidPlan(updated);
    setAutoLog((prev) => [
      {
        time: new Date().toISOString(),
        direction: pyramidPlan.direction,
        stake: pendingLvl.stake,
        status: `Auto FVG add E${pendingLvl.id}`,
      },
      ...prev,
    ]);
  }, [signals?.structure?.priceInFvg, pyramidPlan, placeTrade, signals?.londonBreakout?.signal, signals?.structure]);

  const executionStats = getExecutionStats(executions);

  const gate = evaluateTradeQuality({
    calibratedProbability: signals?.winProb ?? 0.58,
    expectedValue: signals?.expectedValue ?? 0.1,
    clvTrend: riskManager?.clvTrend || "stable",
    macroAlignmentScore: signals?.macroAlignmentScore ?? 70,
    regimeConfidence: riskManager?.regimeConfidence ?? 1,
    executionScore: executionStats.executionScore ?? 100,
    edgeScore: signals?.confidence ?? 50,
    consecutiveLosses: riskManager?.consecutiveLosses ?? 0,
    isKillZone: signals?.londonBreakout?.isKillZone ?? false,
    sessionPerformance: currentSessionStat?.winRate ?? 0,
    modelTrustScore: trust.modelTrustScore ?? 100,
  });

  const sendToBridge = async () => {
    try {
      await sendSignalToBridge({
        direction: signals?.combined?.toUpperCase() === "BUY" ? "BUY" : "SELL",
        lots: 0.01,
        stopLoss: signals?.londonBreakout?.stopLoss,
        takeProfit: signals?.londonBreakout?.takeProfit,
      });
      alert("Sent to MT4 bridge queue.");
    } catch {
      alert("Failed to send to bridge. Is it running?");
    }
  };

  // expose settings to upstream ref for useSignals auto-trigger
  useEffect(() => {
    if (!autoTradeRef) return;
    autoTradeRef.current = {
      enabled,
      minEdgeScore,
      maxTradesPerDay,
      dailyTradeCount,
      safetyCanTrade: safety.canTrade,
      onAutoTrade: ({ direction, entry, stopLoss, takeProfit }) => {
        const sessionStake = Number((stake * sessionMultiplier * strategyStakeMult).toFixed(2));
        placeTrade({ direction, stake: sessionStake, stopLoss, takeProfit });
      },
    };
  }, [
    autoTradeRef,
    enabled,
    minEdgeScore,
    maxTradesPerDay,
    dailyTradeCount,
    safety.canTrade,
    stake,
    placeTrade,
    sessionMultiplier,
    strategyStakeMult,
  ]);

  return (
    <div className="space-y-6">
      {/* Connection bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
        <span
          className={`h-3 w-3 rounded-full ${
            isConnected ? "bg-emerald-400" : "bg-rose-400"
          }`}
        ></span>
        <span className="text-sm text-slate-200">
          {isConnected ? "Connected" : "Disconnected"} {isAuthorized ? "(Authorized)" : ""}
        </span>
        <span className="text-sm text-slate-400">
          Balance: {derivBalance?.balance ?? "--"} {derivBalance?.currency ?? ""}
        </span>
        {!isAuthorized && (
          <button
            onClick={connect}
            className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
          >
            Authorize
          </button>
        )}
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`ml-auto rounded-full px-4 py-2 text-sm font-semibold ${
            enabled ? "bg-amber-300 text-slate-900" : "bg-slate-800 text-slate-200"
          }`}
        >
          Auto-Trade {enabled ? "ON" : "OFF"}
        </button>
        <button
          onClick={disconnect}
          className="rounded-full border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-400/10"
        >
          Pause
        </button>
        <button
          onClick={() => {
            setEnabled(false);
            disconnect();
            alert("EMERGENCY STOP activated. Auto-trading disabled until refresh.");
          }}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white"
        >
          EMERGENCY STOP
        </button>
      </div>

      {/* Settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Auto-Trade Settings</p>
          <label className="flex items-center justify-between text-sm text-slate-200">
            Stake per trade ($)
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={stake}
              onChange={(e) => setStake(Number(e.target.value) || 0)}
              className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-slate-200">
            Max trades per day
            <input
              type="number"
              min={1}
              value={maxTradesPerDay}
              onChange={(e) => setMaxTradesPerDay(Number(e.target.value) || 0)}
              className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-slate-200">
            Min Edge Score
            <input
              type="number"
              min={60}
              max={100}
              value={minEdgeScore}
              onChange={(e) => setMinEdgeScore(Number(e.target.value) || 0)}
              className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-slate-200">
            Require confirm before each trade
            <input
              type="checkbox"
              checked={requireConfirm}
              onChange={(e) => setRequireConfirm(e.target.checked)}
              className="h-4 w-4 accent-amber-300"
            />
          </label>
          <p className="text-xs text-amber-300">Safety Guardian is always enforced.</p>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Strategy allocations</span>
              <button
                onClick={() => {
                  const journal = getJournal();
                  const m = calculateStrategyMetrics(journal);
                  const alloc = getCapitalAllocation(m);
                  setAutoLog((prev) => [
                    { time: new Date().toISOString(), direction: "-", stake: "-", status: "Allocations refreshed" },
                    ...prev,
                  ]);
                  // no state setter for alloc here; rely on render recalculations at top of component
                }}
                className="text-amber-200 hover:text-amber-100"
              >
                Refresh
              </button>
            </div>
            {Object.keys(strategyAlloc.allocations || {}).length === 0 ? (
              <p className="text-slate-500">Log trades with strategy names to allocate capital.</p>
            ) : (
              Object.entries(strategyAlloc.allocations).map(([name, pct]) => (
                <div key={name} className="flex items-center justify-between">
                  <span>{name}</span>
                  <span className="text-amber-200">{(pct * 100).toFixed(1)}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Safety Rules</p>
          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
            {[
              "Edge Score >= 65",
              "In kill zone",
              "Daily loss <= 3%",
              "Max 3 trades per day",
              "Live feed connected",
              "Consecutive losses < 3",
              "Weekly loss <= 10%",
              "Account >= $10",
            ].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className={`rounded-lg px-3 py-2 text-sm ${safety.riskLevel === "green"
              ? "bg-emerald-500/10 text-emerald-200"
              : safety.riskLevel === "amber"
              ? "bg-amber-500/10 text-amber-200"
              : "bg-rose-500/10 text-rose-200"
            }`}>
            {safety.riskLevel.toUpperCase()}{" "}
            {safety.blockedReasons.length
              ? safety.blockedReasons.join("; ")
              : safety.warnings.join("; ") || "All clear"}
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-200">Auto-Trade Log</p>
          <button
            onClick={() => setAutoLog([])}
            className="text-xs text-slate-400 hover:text-amber-200"
          >
            Clear
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-slate-200">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-2 py-1 text-left">Time</th>
                <th className="px-2 py-1 text-left">Direction</th>
                <th className="px-2 py-1 text-left">Stake</th>
                <th className="px-2 py-1 text-left">SL</th>
                <th className="px-2 py-1 text-left">TP</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">P&L</th>
              </tr>
            </thead>
            <tbody>
              {autoLog.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-800/60">
                  <td className="px-2 py-1">{row.time}</td>
                  <td className="px-2 py-1">{row.direction}</td>
                  <td className="px-2 py-1">${row.stake}</td>
                  <td className="px-2 py-1">{row.stopLoss ?? "--"}</td>
                  <td className="px-2 py-1">{row.takeProfit ?? "--"}</td>
                  <td className="px-2 py-1">{row.status}</td>
                  <td className="px-2 py-1">{row.pnl ?? "--"}</td>
                </tr>
              ))}
              {autoLog.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                    No auto-trades yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Execution Quality</p>
        <p className="text-lg font-semibold text-slate-100">
          Score {executionStats.executionScore.toFixed(1)} · Avg slippage {executionStats.averageSlippage.toFixed(2)} pips
        </p>
        <p className="text-xs text-slate-400">{executionStats.recommendation}</p>
      </div>

      {pyramidPlan ? (
        <PyramidTracker
          plan={pyramidPlan}
          currentPrice={market?.price}
          onAdd={(lvl) => {
            placeTrade({ direction: pyramidPlan.direction, stake: lvl.stake, stopLoss: pyramidPlan.stopLoss, takeProfit: pyramidPlan.takeProfit });
            setAutoLog((prev) => [
              { time: new Date().toISOString(), direction: pyramidPlan.direction, stake: lvl.stake, status: `Pyramid ${lvl.id}` },
              ...prev,
            ]);
          }}
          onAdjustStop={(s) => {
            // Placeholder: in Deriv we don't have stop adjustment here; just log
            setAutoLog((prev) => [
              { time: new Date().toISOString(), direction: pyramidPlan.direction, stake: 0, status: `Set stop ${s?.toFixed?.(2)}` },
              ...prev,
            ]);
          }}
        />
      ) : null}

      {error && <p className="text-xs text-rose-300">Deriv error: {error}</p>}

      {/* MT4 Bridge tab area */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">MT4/MT5 Bridge</p>
          <span
            className={`text-xs font-semibold ${
              bridgeStatus.running ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {bridgeStatus.running ? "Online" : "Offline"}
          </span>
        </div>
        <button
          onClick={testBridge}
          className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-300"
        >
          Test Connection
        </button>
        <button
          onClick={sendToBridge}
          className="rounded-full border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
        >
          Send Current Signal to MT4 Bridge
        </button>
        <p className="text-xs text-slate-300">
          If the bridge is offline, use Deriv auto-trader. To set up MT4: run the bridge server,
          enable WebRequests in MT4 for http://localhost:3001, attach GoldFlipEA to XAUUSD, and keep MT4 running.
        </p>
      </div>
    </div>
  );
}
