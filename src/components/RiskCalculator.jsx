import { useMemo, useState } from "react";
import { calculatePositionSize, calculateKelly } from "../utils/riskEngine.js";
import { getCLVStats, getSizingMultiplier } from "../utils/clvTracker.js";
import { compareBacktestToLive } from "../utils/validationEngine.js";
import { getJournal as getTradeJournal } from "../utils/tradeJournal.js";

function Stat({ label, value, accent = false, danger = false }) {
  return (
    <div
      className={`flex flex-col rounded-lg border px-3 py-2 ${
        danger ? "border-rose-500/60 bg-rose-900/20" : "border-slate-800/80 bg-slate-800/40"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${accent ? "text-amber-300" : danger ? "text-rose-200" : "text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

function RiskCalculator({ riskManager, sessionContext }) {
  const {
    accountBalance,
    riskPercent,
    entryPrice,
    stopLoss,
    setAccountBalance,
    setRiskPercent,
    setEntryPrice,
    setStopLoss,
    getPosition,
    getDailyStatus,
    getJournal,
  } = riskManager;

  const sessionMultiplier = sessionContext?.sessionMultiplier ?? 1;
  const [kellyMode, setKellyMode] = useState(false);

  const basePosition = useMemo(() => getPosition(), [accountBalance, riskPercent, entryPrice, stopLoss]);
  const positionSize = (basePosition.positionSize || 0) * sessionMultiplier;
  const dollarRisk = (basePosition.dollarRisk || 0) * sessionMultiplier;

  const takeProfit = useMemo(() => {
    const dist = entryPrice - stopLoss;
    if (!Number.isFinite(dist) || dist === 0) return null;
    return stopLoss < entryPrice ? entryPrice + Math.abs(dist) * 2 : entryPrice - Math.abs(dist) * 2;
  }, [entryPrice, stopLoss]);

  const daily = getDailyStatus();
  const journal = getJournal();

  const riskWarning = riskPercent > 2;

  const kellyInputs = useMemo(() => {
    const enoughData = journal.totalTrades >= 30;
    const winRate = enoughData ? journal.winRate / 100 : 0.58;
    const avgRR = enoughData ? journal.avgRR : 2;
    const avgWin = avgRR;
    const avgLoss = 1;
    return { enoughData, winRate, avgWin, avgLoss };
  }, [journal]);

  const clvStats = getCLVStats(riskManager.getJournal ? riskManager.getJournal() : null);
  const clvMultiplier = getSizingMultiplier(clvStats);

  const liveJournalEntries = useMemo(() => getTradeJournal(), []);
  const liveTrades = useMemo(
    () => liveJournalEntries.filter((t) => t.outcome === "win" || t.outcome === "loss"),
    [liveJournalEntries]
  );
  const liveWinRate =
    liveTrades.length > 0 ? liveTrades.filter((t) => t.outcome === "win").length / liveTrades.length : 0;
  const rrVals = liveTrades
    .map((t) => Number(t.riskReward))
    .filter((n) => Number.isFinite(n) && n !== 0);
  const liveAvgRR = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 1;
  const validation = compareBacktestToLive({
    backtestWinRate: 0.58,
    backtestAvgRR: 2.0,
    backtestMaxDrawdown: 5,
    liveWinRate,
    liveAvgRR,
    liveMaxDrawdown: 5,
    liveTrades: liveTrades.length,
  });

  const kelly = calculateKelly({
    winRate: kellyInputs.winRate,
    avgWin: kellyInputs.avgWin,
    avgLoss: kellyInputs.avgLoss,
    accountBalance,
    regimeConfidence: riskManager.regimeConfidence || 1,
    edgeScore: riskManager.edgeScore || 50,
    sweepDetected: riskManager.sweepDetected || false,
    macroConfluence: riskManager.macroConfluence || 50,
    consecutiveLosses: riskManager.consecutiveLosses || 0,
    modelTrustScore: validation.modelTrustScore || 50,
  });

  const adjustedRisk =
    riskPercent * (riskManager.riskMultiplier || 1) * clvMultiplier * sessionMultiplier;

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk toolbox</p>
          <h3 className="text-xl font-semibold text-slate-50">Protect the stack</h3>
        </div>
        {daily.isHaltTrading ? (
          <span className="animate-pulse rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-semibold uppercase text-rose-100 ring-1 ring-rose-500/60">
            Trading halted ({daily.dailyLossPercent.toFixed(2)}% DD)
          </span>
        ) : (
          <span className="rounded-full bg-slate-700/70 px-3 py-1 text-[11px] font-semibold uppercase text-slate-200 ring-1 ring-slate-600/50">
            Daily DD {daily.dailyLossPercent.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">Account balance ($)</span>
          <input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(Number(e.target.value || 0))}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-amber-300 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">Risk per trade (%)</span>
            <span className={`text-xs ${riskWarning ? "text-rose-300" : "text-slate-300"}`}>{riskPercent.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={riskPercent}
            onChange={(e) => setRiskPercent(Number(e.target.value))}
            className="accent-amber-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">Entry price</span>
          <input
            type="number"
            step="0.1"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value || 0))}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-amber-300 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">Stop loss</span>
          <input
            type="number"
            step="0.1"
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value || 0))}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-amber-300 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Position size (oz)" value={Number.isFinite(positionSize) ? positionSize.toFixed(2) : "--"} accent />
        <Stat
          label="Dollar risk"
          value={Number.isFinite(dollarRisk) ? `$${dollarRisk.toFixed(2)}` : "--"}
          danger={riskWarning}
        />
        <Stat
          label="Take profit (2R)"
          value={Number.isFinite(takeProfit) ? `$${takeProfit.toFixed(2)}` : "--"}
        />
      </div>

      <p className="mt-2 text-xs text-amber-200">
        Adjusted risk: {adjustedRisk.toFixed(2)}% (base {riskPercent.toFixed(2)}% · session x{sessionMultiplier.toFixed(2)} · CLV x{clvMultiplier.toFixed(2)})
      </p>

      {riskWarning && (
        <p className="mt-2 rounded-lg border border-rose-500/50 bg-rose-900/20 px-3 py-2 text-xs text-rose-100">
          Warning: risk per trade above 2%. Consider dialing down to protect the account.
        </p>
      )}

      {daily.isHaltTrading && (
        <div className="mt-3 rounded-lg border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
          TRADING HALTED: Daily drawdown limit exceeded. Step away and reassess.
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Stat label="Trades today" value={journal.totalTrades} />
        <Stat label="Win rate" value={`${journal.winRate.toFixed(1)}%`} />
        <Stat label="Avg RR" value={journal.avgRR.toFixed(2)} />
        <Stat label="Total PnL" value={`$${journal.totalPnL.toFixed(2)}`} />
      </div>

      {/* Kelly Sizer */}
      <div className="mt-6 space-y-3 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Kelly Sizer</p>
            <p className="text-sm text-slate-300">
              Using {kellyInputs.enoughData ? "live journal stats" : "backtest defaults (58% / 2R)"}
            </p>
          </div>
          <div className="text-xs text-slate-400 max-w-md">
            Kelly Criterion calculates the mathematically optimal bet size to maximise account growth. Half Kelly gives
            75% of the growth with much lower risk of ruin.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <KellyCard label="Full Kelly" value={kelly.fullKelly} dollars={kelly.dollarFull} />
          <KellyCard label="Half Kelly (Recommended)" value={kelly.halfKelly} dollars={kelly.dollarHalf} highlight />
          <KellyCard label="Quarter Kelly" value={kelly.quarterKelly} dollars={kelly.dollarQuarter} />
        </div>

        <div className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-100">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Dynamic Kelly</p>
          <p className="text-xl font-semibold text-amber-100">
            {(kelly.dynamicKelly * 100).toFixed(2)}% risk per trade
          </p>
          <p className="text-xs text-amber-100/80">
            Base: {(kelly.baseKelly * 100).toFixed(2)}% · {kelly.multipliers.join(" · ")}
          </p>
          <p className="text-xs text-amber-100/70 mt-1">{kelly.explanation}</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs text-slate-900">
            <div className="rounded bg-slate-100/90 p-2 font-semibold">
              Static 1% win ≈ ${((accountBalance * 0.01) * 2).toFixed(2)} at 2R
            </div>
            <div className="rounded bg-amber-200/90 p-2 font-semibold">
              Dynamic Kelly win ≈ ${((accountBalance * kelly.dynamicKelly) * 2).toFixed(2)} at 2R
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">CLV Sizing Multiplier</p>
          <p className="text-lg font-semibold text-amber-200">x {clvMultiplier.toFixed(2)}</p>
          <p className="text-xs text-slate-400">
            Avg CLV: {clvStats.averageCLV.toFixed(2)} · Last20: {clvStats.last20CLV.toFixed(2)} · Trend: {clvStats.clvTrend}
          </p>
          <p className="text-xs text-slate-400 mt-1">{clvStats.interpretation}</p>
        </div>

        {kelly.warning && (
          <p className="rounded-lg border border-amber-500/50 bg-amber-900/20 px-3 py-2 text-xs text-amber-100">
            {kelly.warning}
          </p>
        )}

        <button
          onClick={() => setRiskPercent(Number((kelly.halfKelly * 100).toFixed(2)))}
          className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
        >
          Use this size ({(kelly.halfKelly * 100).toFixed(2)}%)
        </button>
      </div>

      {/* Compounding projections */}
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Compounding projections</p>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={kellyMode}
              onChange={(e) => setKellyMode(e.target.checked)}
              className="accent-amber-300"
            />
            Kelly mode (Half Kelly) vs fixed 1%
          </label>
        </div>
        <CompoundingBlock balance={accountBalance} halfKelly={kelly.halfKelly} kellyMode={kellyMode} />
      </div>
    </div>
  );
}

export default RiskCalculator;

function KellyCard({ label, value, dollars, highlight = false }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-amber-400 bg-amber-400/10" : "border-slate-800 bg-slate-900/70"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-amber-200">{(value * 100).toFixed(2)}%</p>
      <p className="text-xs text-slate-300">~ ${dollars.toFixed(2)} risk</p>
    </div>
  );
}

function CompoundingBlock({ balance, halfKelly, kellyMode }) {
  const trades = 60;
  const fixedRisk = 0.01;

  let balFixed = balance;
  let balKelly = balance;
  for (let i = 0; i < trades; i += 1) {
    const growth = 0.02; // placeholder expected edge per trade
    balFixed *= 1 + fixedRisk * growth;
    balKelly *= 1 + (halfKelly || 0.01) * growth;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 text-sm">
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Fixed 1% risk (60 trades)</p>
        <p className="text-lg font-semibold text-slate-100">${balFixed.toFixed(2)}</p>
      </div>
      <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-200">Kelly (Half) {kellyMode ? "(on)" : "(off)"}</p>
        <p className="text-lg font-semibold text-amber-200">${balKelly.toFixed(2)}</p>
        <p className="text-xs text-amber-100">Shows faster compounding when Kelly mode is used</p>
      </div>
    </div>
  );
}
