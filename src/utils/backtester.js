import { getAsianRange } from "./londonBreakout.js";

// Simple seeded rng
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMockOHLCV(days = 180, seed = 42) {
  const rand = mulberry32(seed);
  const out = [];
  let price = 3100;
  for (let d = days - 1; d >= 0; d -= 1) {
    const dayStart = Date.now() - d * 24 * 60 * 60 * 1000;
    const dailyRange = 20 + rand() * 40;
    const bias = 1 + 0.0003;
    for (let h = 0; h < 24; h += 1) {
      const time = dayStart + h * 60 * 60 * 1000;
      const drift = (rand() - 0.5) * (dailyRange / 12);
      const open = price;
      price = Math.max(2900, Math.min(3400, price * bias + drift));
      const close = price;
      const high = Math.max(open, close) + rand() * 3;
      const low = Math.min(open, close) - rand() * 3;
      const volume = 200 + rand() * 100;
      out.push({ time, open: Number(open.toFixed(2)), high: Number(high.toFixed(2)), low: Number(low.toFixed(2)), close: Number(close.toFixed(2)), volume: Number(volume.toFixed(2)) });
    }
  }
  return out;
}

function groupByDay(ohlcv) {
  const map = new Map();
  ohlcv.forEach((c) => {
    const day = new Date(c.time).toISOString().slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(c);
  });
  return Array.from(map.entries())
    .map(([date, candles]) => ({ date, candles: candles.sort((a, b) => a.time - b.time) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function simulateTrade({ side, entry, stop, tp, candlesAfter, riskPercent, accountBalance }) {
  const stopDist = Math.abs(entry - stop) || 0.01;
  const positionSize = (accountBalance * (riskPercent / 100)) / stopDist;
  let result = "LOSS";
  let exit = stop;

  for (const c of candlesAfter) {
    if (side === "BUY") {
      if (c.low <= stop) { exit = stop; result = "LOSS"; break; }
      if (c.high >= tp) { exit = tp; result = "WIN"; break; }
    } else {
      if (c.high >= stop) { exit = stop; result = "LOSS"; break; }
      if (c.low <= tp) { exit = tp; result = "WIN"; break; }
    }
  }
  const pnl = (result === "WIN" ? tp - entry : stop - entry) * (side === "BUY" ? 1 : -1) * positionSize;
  const rr = Math.abs(tp - entry) / stopDist;
  return { result, exit, pnl, rr, newBalance: accountBalance + pnl };
}

function computeEMA(values, period) {
  const k = 2 / (period + 1);
  const out = [];
  values.forEach((v, i) => {
    if (i === 0) out.push(v);
    else out.push(v * k + out[i - 1] * (1 - k));
  });
  return out;
}

function decideTrade(strategy, { candle, index, candles, asian, triggerHigh, triggerLow, ema20, ema50 }) {
  const hour = new Date(candle.time).getUTCHours();

  if (strategy === "london_breakout") {
    if (hour < 7 || hour >= 10) return null;
    if (candle.high >= triggerHigh) return { side: "BUY", entry: triggerHigh, stop: asian.low, tp: triggerHigh + asian.rangeSize * 1.5 };
    if (candle.low <= triggerLow) return { side: "SELL", entry: triggerLow, stop: asian.high, tp: triggerLow - asian.rangeSize * 1.5 };
    return null;
  }

  if (strategy === "asian_fade") {
    const nyOpen = hour >= 13 && hour <= 15;
    if (!nyOpen) return null;
    const buffer = 0.5;
    if (candle.high >= asian.high - buffer) return { side: "SELL", entry: candle.close, stop: asian.high + buffer, tp: asian.midpoint };
    if (candle.low <= asian.low + buffer) return { side: "BUY", entry: candle.close, stop: asian.low - buffer, tp: asian.midpoint };
    return null;
  }

  if (strategy === "ema_trend") {
    if (index === 0 || !ema20?.length || !ema50?.length) return null;
    const slopeUp = ema50[index] > ema50[index - 1];
    const pullback = candle.close <= ema20[index] && candle.close >= ema20[index] - 1;
    if (slopeUp && pullback && candle.close > ema50[index]) {
      const entry = candle.close;
      const stop = Math.min(candle.low, entry - 1);
      const tp = entry + (entry - stop) * 1.5;
      return { side: "BUY", entry, stop, tp };
    }
    return null;
  }

  if (strategy === "news_scalp") {
    const range = candle.high - candle.low;
    if (range < asian.rangeSize * 0.6) return null;
    const mid = (candle.high + candle.low) / 2;
    if (candle.close > mid) return { side: "BUY", entry: candle.close, stop: candle.low, tp: candle.close + range * 0.8 };
    return { side: "SELL", entry: candle.close, stop: candle.high, tp: candle.close - range * 0.8 };
  }

  return null;
}

export function runBacktest({ ohlcvData, riskPercent = 1, accountBalance = 1000, strategy = "london_breakout" }) {
  return runStrategyBacktest({ strategy, ohlcvData, riskPercent, accountBalance });
}

export function runStrategyBacktest({ strategy = "london_breakout", ohlcvData, riskPercent = 1, accountBalance = 1000 }) {
  const grouped = groupByDay(ohlcvData);
  const trades = [];
  let balance = accountBalance;
  let peak = balance;
  let maxDrawdown = 0;

  grouped.forEach(({ date, candles }) => {
    const asian = getAsianRange(candles);
    if (!asian.high || !asian.low) return;
    asian.midpoint = (asian.high + asian.low) / 2;

    const triggerHigh = asian.high + 1.0;
    const triggerLow = asian.low - 1.0;

    const closes = candles.map((c) => c.close);
    const ema20 = computeEMA(closes, 20);
    const ema50 = computeEMA(closes, 50);

    let tradeTaken = false;
    for (let i = 0; i < candles.length; i += 1) {
      if (tradeTaken && strategy === "london_breakout") break; // only one breakout trade per day
      const c = candles[i];
      const act = decideTrade(strategy, { candle: c, index: i, candles, asian, triggerHigh, triggerLow, ema20, ema50 });
      if (!act) continue;

      const { side, entry, stop, tp } = act;
      const sim = simulateTrade({ side, entry, stop, tp, candlesAfter: candles.slice(i), riskPercent, accountBalance: balance });
      balance = sim.newBalance;
      peak = Math.max(peak, balance);
      maxDrawdown = Math.max(maxDrawdown, ((peak - balance) / peak) * 100);
      trades.push({ date, side, entry, stop, tp, exit: sim.exit, pnl: sim.pnl, rr: sim.rr, result: sim.result, balance });
      if (strategy === "london_breakout") tradeTaken = true;
    }
  });

  const wins = trades.filter((t) => t.result === "WIN");
  const grossWins = wins.reduce((acc, t) => acc + t.pnl, 0);
  const grossLosses = trades.filter((t) => t.result === "LOSS").reduce((acc, t) => acc + Math.abs(t.pnl), 0);
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgRiskReward = wins.length ? wins.reduce((acc, t) => acc + (t.rr || 0), 0) / wins.length : 0;
  const totalReturn = trades.length ? ((balance - accountBalance) / accountBalance) * 100 : 0;
  const profitFactor = grossLosses === 0 ? grossWins : grossWins / grossLosses;
  const equityCurve = trades.map((t, idx) => ({ trade: idx + 1, balance: t.balance }));

  return { trades, strategy, winRate, avgRiskReward, totalReturn, maxDrawdown, profitFactor, equityCurve };
}

export function getBacktestSummary(result) {
  if (!result || !result.trades?.length) return "No trades generated for the selected period.";
  return `Trades: ${result.trades.length}, Win rate: ${result.winRate.toFixed(1)}%, Avg R:R: ${result.avgRiskReward.toFixed(2)}, Return: ${result.totalReturn.toFixed(2)}%, Max DD: ${result.maxDrawdown.toFixed(2)}%, PF: ${result.profitFactor.toFixed(2)}`;
}

export function runMonteCarlo({ trades, runs = 500, startBalance, riskPercent = 1 }) {
  if (!trades?.length) return null;

  const curves = [];
  const summaries = [];

  for (let r = 0; r < runs; r += 1) {
    const seed = (Date.now() + r * 9973) >>> 0;
    const rng = mulberry32(seed);
    const sample = Array.from({ length: trades.length }, () => trades[Math.floor(rng() * trades.length)]);

    const curve = [];
    let bal = startBalance;
    sample.forEach((t, idx) => {
      const riskAmt = bal * (riskPercent / 100);
      const rr = Math.max(t.rr || 1, 0);
      const pnl = t.result === "WIN" ? riskAmt * rr : -riskAmt;
      bal += pnl;
      curve.push({ trade: idx + 1, balance: bal });
    });
    curves.push(curve);
    summaries.push({ idx: r, final: bal });
  }

  const sorted = summaries.slice().sort((a, b) => a.final - b.final);
  const pickIdx = (pct) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * pct)))].idx;

  const worstIdx = pickIdx(0.10);
  const medianIdx = pickIdx(0.50);
  const bestIdx = pickIdx(0.90);

  const bestFinal = summaries.find((s) => s.idx === bestIdx).final;
  const medianFinal = summaries.find((s) => s.idx === medianIdx).final;
  const worstFinal = summaries.find((s) => s.idx === worstIdx).final;

  return {
    best: curves[bestIdx],
    median: curves[medianIdx],
    worst: curves[worstIdx],
    bestReturn: ((bestFinal - startBalance) / startBalance) * 100,
    medianReturn: ((medianFinal - startBalance) / startBalance) * 100,
    worstReturn: ((worstFinal - startBalance) / startBalance) * 100,
  };
}
