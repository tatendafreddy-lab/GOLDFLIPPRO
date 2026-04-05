const PIP_VALUE = 0.1; // gold pip = $0.10

export function isLondonKillZone(date = new Date()) {
  const hour = date.getUTCHours();
  return hour >= 7 && hour < 10;
}

export function getAsianRange(ohlcvData) {
  if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) {
    return { high: null, low: null, rangeSize: null, midpoint: null };
  }

  const asian = ohlcvData.filter((candle) => {
    const hour = new Date(candle.time).getUTCHours();
    return hour >= 0 && hour < 7;
  });

  if (!asian.length) {
    return { high: null, low: null, rangeSize: null, midpoint: null };
  }

  const highs = asian.map((c) => c.high);
  const lows = asian.map((c) => c.low);
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const rangeSize = high - low;
  const midpoint = low + rangeSize / 2;

  return { high, low, rangeSize, midpoint };
}

export function getLondonBreakoutSignal(ohlcvData, currentPrice) {
  const killZone = isLondonKillZone();
  const asian = getAsianRange(ohlcvData);

  if (asian.high === null || asian.low === null || asian.rangeSize === null) {
    return {
      signal: "WAIT",
      entry: null,
      stopLoss: null,
      takeProfit: null,
      riskReward: null,
      isKillZone: killZone,
    };
  }

  const threshold = 10 * PIP_VALUE; // 1.0
  const stopOffset = 5 * PIP_VALUE; // 0.5
  const rrTarget = asian.rangeSize * 1.5;

  let signal = "WAIT";
  let entry = null;
  let stopLoss = null;
  let takeProfit = null;

  if (currentPrice > asian.high + threshold) {
    signal = "BUY";
    entry = currentPrice;
    stopLoss = asian.high - stopOffset;
    takeProfit = entry + rrTarget;
  } else if (currentPrice < asian.low - threshold) {
    signal = "SELL";
    entry = currentPrice;
    stopLoss = asian.low + stopOffset;
    takeProfit = entry - rrTarget;
  }

  const riskReward =
    entry !== null && stopLoss !== null && takeProfit !== null
      ? Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss || 1)
      : null;

  return {
    signal,
    entry,
    stopLoss,
    takeProfit,
    riskReward,
    isKillZone: killZone,
  };
}
