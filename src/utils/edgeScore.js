const GOLD = "#C9A84C";

export function calculateEdgeScore({
  rsi,
  macd,
  londonBreakout,
  isKillZone,
  sessionBias,
  volatility,
  trendStrength,
  bestRegime,
  worstRegime,
  currentRegime,
  journalTrades,
  squeezeBoost = 0,
  sweepBoost = 0,
  macroBoost = 0,
  liquidityScore = 0,
}) {
  const breakdown = {
    kill: 0,
    breakout: 0,
    rsi: 0,
    macd: 0,
    trend: 0,
  };
  const reasoning = [];

  // Time windows in UTC
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // Kill zone + NY open proximity (capped to 25)
  if (isKillZone || (hour >= 7 && hour < 10)) {
    breakdown.kill += 25;
    reasoning.push("London Kill Zone active");
  }
  const nyOpenWindow = hour === 13 && minute >= 30 || hour === 14 && minute <= 0;
  if (nyOpenWindow) breakdown.kill = Math.min(25, breakdown.kill + 10);

  // Breakout
  const dir = londonBreakout?.signal || null; // BUY/SELL
  if (dir === "BUY" || dir === "SELL") {
    breakdown.breakout += 25;
    reasoning.push("London Breakout signal present");
  } else if (londonBreakout?.entry && londonBreakout?.price) {
    const dist = Math.abs(londonBreakout.price - londonBreakout.entry);
    if (dist <= 2) breakdown.breakout += 10; // within ~20 pips ($2)
  }

  // RSI confluence
  const rsiVal = rsi?.value ?? 50;
  if (dir === "BUY" && rsiVal < 45 || dir === "SELL" && rsiVal > 55) {
    breakdown.rsi += 20;
    reasoning.push("RSI agrees with direction");
  } else if (rsiVal >= 40 && rsiVal <= 60) {
    breakdown.rsi += 10;
  }

  // MACD confluence
  const macdSignal = macd?.signal || macd?.histogram;
  const macdDir = macdSignal === "buy" || macdSignal > 0 ? "BUY" : macdSignal === "sell" || macdSignal < 0 ? "SELL" : "NEUTRAL";
  if (dir && macdDir === dir) {
    breakdown.macd += 20;
    reasoning.push("MACD agrees with direction");
  } else if (macdDir === "NEUTRAL") breakdown.macd += 10;

  // Trend alignment
  const trendDir = trendStrength || "NEUTRAL";
  if (dir && trendDir === dir) {
    breakdown.trend += 10;
    reasoning.push("50-candle trend aligned");
  }

  // Aggregate
  const liquidityBonus = Math.max(0, Number(liquidityScore) || 0) / 10;
  if (liquidityBonus > 0) {
    reasoning.push(`Session liquidity +${liquidityBonus.toFixed(1)}`);
  }

  const score =
    breakdown.kill +
    breakdown.breakout +
    breakdown.rsi +
    breakdown.macd +
    breakdown.trend +
    squeezeBoost +
    sweepBoost +
    macroBoost +
    liquidityBonus;

  // Personal edge adjustments
  if (journalTrades >= 50 && currentRegime) {
    if (bestRegime && bestRegime === currentRegime) breakdown.trend += 10;
    if (worstRegime && worstRegime === currentRegime) breakdown.trend -= 10;
  }

  let grade = "F";
  let label = "Skip";
  if (score >= 80) {
    grade = "A";
    label = "Elite Setup";
  } else if (score >= 65) {
    grade = "B";
    label = "Good Setup";
  } else if (score >= 50) {
    grade = "C";
    label = "Weak";
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    grade,
    label,
    breakdown,
    shouldTrade: score >= 65,
    reasoning,
  };
}

export const EDGE_COLORS = {
  A: GOLD,
  B: "#60a5fa",
  C: "#f59e0b",
  F: "#f43f5e",
};
