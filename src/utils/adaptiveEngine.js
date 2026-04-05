import { calculateATR } from "./edgeScore.js";

export function calculateATRUtil(ohlcv, period = 14) {
  return calculateATR(ohlcv, period);
}

export function analyseMarketRegime(ohlcv = []) {
  if (!ohlcv || ohlcv.length < 50) return "RANGING";
  const closes = ohlcv.map((c) => c.close);

  // 50 EMA rough proxy using simple mean last 50
  const ema50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const last = closes[closes.length - 1];

  const atr14 = calculateATR(ohlcv, 14);
  const atr30 = calculateATR(ohlcv, 30);
  const atrRatio = atr30 ? atr14 / atr30 : 1;

  if (atrRatio >= 2) return "VOLATILE";

  // simple trend expansion: last 5 higher highs/lows
  const recent = closes.slice(-6);
  const up = recent.every((v, i, arr) => i === 0 || v >= arr[i - 1]);
  const down = recent.every((v, i, arr) => i === 0 || v <= arr[i - 1]);

  if (last > ema50 && up) return "TRENDING_UP";
  if (last < ema50 && down) return "TRENDING_DOWN";

  return "RANGING";
}

export function getStrategyRecommendation(regime, personalBestWorst = {}) {
  let bestStrategy = "London Breakout";
  let riskMultiplier = 1.0;
  let reasoning = "";
  let color = "#60a5fa";

  if (regime === "TRENDING_UP" || regime === "TRENDING_DOWN") {
    bestStrategy = "London Breakout + EMA Trend";
    riskMultiplier = 1.0;
    reasoning = "Trend conditions — standard size";
    color = "#22c55e";
  } else if (regime === "RANGING") {
    bestStrategy = "Asian Range Fade";
    riskMultiplier = 0.75;
    reasoning = "Range detected — reduce size slightly";
    color = "#3b82f6";
  } else if (regime === "VOLATILE") {
    bestStrategy = "Stand aside or half-size";
    riskMultiplier = 0.5;
    reasoning = "High volatility — cut size 50%";
    color = "#f97316";
  }

  if (personalBestWorst.bestRegime && personalBestWorst.bestRegime === regime) {
    riskMultiplier = Math.min(riskMultiplier * 1.1, 1);
    reasoning += " | Personal edge strong here.";
  }
  if (personalBestWorst.worstRegime && personalBestWorst.worstRegime === regime) {
    riskMultiplier = Math.max(riskMultiplier * 0.5, 0.25);
    reasoning += " | Historically weak here, size down.";
  }

  return { regime, bestStrategy, riskMultiplier, reasoning, color };
}

export function learnFromJournal(entries = []) {
  if (!entries || entries.length < 50) return { bestRegime: null, worstRegime: null, regimeStats: [] };
  const grouped = {};
  entries.forEach((e) => {
    const reg = e.regime || "UNKNOWN";
    if (!grouped[reg]) grouped[reg] = { trades: 0, wins: 0, rr: [] };
    grouped[reg].trades += 1;
    if (e.outcome === "win") grouped[reg].wins += 1;
    if (Number.isFinite(Number(e.riskReward))) grouped[reg].rr.push(Number(e.riskReward));
  });

  const stats = Object.entries(grouped).map(([reg, v]) => ({
    regime: reg,
    trades: v.trades,
    winRate: v.trades ? v.wins / v.trades : 0,
    avgRR: v.rr.length ? v.rr.reduce((a, b) => a + b, 0) / v.rr.length : 0,
  }));

  const best = stats.reduce((b, s) => (b == null || s.winRate > b.winRate ? s : b), null);
  const worst = stats.reduce((b, s) => (b == null || s.winRate < b.winRate ? s : b), null);

  return {
    bestRegime: best?.regime || null,
    worstRegime: worst?.regime || null,
    regimeStats: stats,
  };
}
