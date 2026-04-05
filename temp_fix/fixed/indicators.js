/**
 * Exponential Moving Average (EMA)
 * Returns an array aligned to the input prices; entries before `period` are null.
 */
export function calculateEMA(prices, period) {
  if (!Array.isArray(prices) || prices.length === 0 || period <= 0) return [];

  const k = 2 / (period + 1);
  const ema = Array(prices.length).fill(null);

  if (prices.length < period) return ema;

  const first = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
  ema[period - 1] = first;

  for (let i = period; i < prices.length; i += 1) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
}

/**
 * Relative Strength Index (RSI) using Wilder's smoothing.
 * Returns an array aligned to prices; entries before the first RSI value are null.
 */
export function calculateRSI(prices, period = 14) {
  if (!Array.isArray(prices) || prices.length === 0 || period <= 0) return [];

  const rsi = Array(prices.length).fill(null);
  if (prices.length <= period) return rsi;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = period + 1; i < prices.length; i += 1) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 0 : avgGain / avgLoss;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  }

  return rsi;
}

/**
 * Moving Average Convergence Divergence (MACD)
 * Returns arrays aligned to input prices.
 */
export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEma = calculateEMA(prices, fastPeriod);
  const slowEma = calculateEMA(prices, slowPeriod);

  const macdLine = prices.map((_, idx) => {
    if (fastEma[idx] === null || slowEma[idx] === null) return null;
    return fastEma[idx] - slowEma[idx];
  });

  const signalLine = calculateEMA(
    macdLine.map((v) => (v === null ? 0 : v)),
    signalPeriod
  ).map((val, idx) => (macdLine[idx] === null ? null : val));

  const histogram = macdLine.map((val, idx) => {
    if (val === null || signalLine[idx] === null) return null;
    return val - signalLine[idx];
  });

  return { macdLine, signalLine, histogram };
}
