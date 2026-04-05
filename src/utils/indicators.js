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

// Bollinger Bands with squeeze detection
export function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (!Array.isArray(prices) || prices.length < period) {
    return { upper: [], middle: [], lower: [], width: [], squeeze: [] };
  }

  const upper = Array(prices.length).fill(null);
  const middle = Array(prices.length).fill(null);
  const lower = Array(prices.length).fill(null);
  const width = Array(prices.length).fill(null);
  const squeeze = Array(prices.length).fill(false);

  for (let i = period - 1; i < prices.length; i += 1) {
    const window = prices.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / period;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    middle[i] = mean;
    upper[i] = mean + stdDev * sd;
    lower[i] = mean - stdDev * sd;
    width[i] = upper[i] - lower[i];
  }

  // squeeze: width below its own 20-period average
  for (let i = period - 1; i < prices.length; i += 1) {
    const wSlice = width.slice(Math.max(0, i - 19), i + 1).filter((v) => v !== null);
    if (wSlice.length === 0) continue;
    const wAvg = wSlice.reduce((a, b) => a + b, 0) / wSlice.length;
    squeeze[i] = width[i] !== null && width[i] < wAvg;
  }

  // detect release
  const squeezeRelease =
    squeeze.length >= 2 && squeeze[squeeze.length - 2] === true && squeeze[squeeze.length - 1] === false;

  return { upper, middle, lower, width, squeeze, squeezeRelease };
}

// Break of Structure detection (last 50 candles)
export function detectBreakOfStructure(ohlcvData) {
  if (!Array.isArray(ohlcvData) || ohlcvData.length < 10) return { bos: null, level: null, candlesAgo: null, strength: "weak" };
  const recent = ohlcvData.slice(-50);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);
  // swing high: highest high; swing low: lowest low
  let swingHigh = -Infinity;
  let swingHighIdx = -1;
  let swingLow = Infinity;
  let swingLowIdx = -1;
  highs.forEach((h, idx) => {
    if (h > swingHigh) {
      swingHigh = h;
      swingHighIdx = idx;
    }
  });
  lows.forEach((l, idx) => {
    if (l < swingLow) {
      swingLow = l;
      swingLowIdx = idx;
    }
  });

  const lastClose = recent[recent.length - 1].close;
  let bos = null;
  let level = null;
  let strength = "weak";
  let candlesAgo = null;
  if (lastClose > swingHigh && swingHighIdx !== -1) {
    bos = "bullish";
    level = swingHigh;
    candlesAgo = recent.length - 1 - swingHighIdx;
    strength = recent.length - swingHighIdx <= 10 ? "strong" : "weak";
  } else if (lastClose < swingLow && swingLowIdx !== -1) {
    bos = "bearish";
    level = swingLow;
    candlesAgo = recent.length - 1 - swingLowIdx;
    strength = recent.length - swingLowIdx <= 10 ? "strong" : "weak";
  }

  return { bos, level, candlesAgo, strength };
}

// Equal highs / lows detection (liquidity pools)
export function detectEqualHighsLows(ohlcvData, tolerance = 0.002) {
  if (!Array.isArray(ohlcvData) || ohlcvData.length < 5) {
    return { equalHighs: [], equalLows: [], sweepRisk: "low" };
  }
  const highs = ohlcvData.map((c) => c.high);
  const lows = ohlcvData.map((c) => c.low);

  const equalHighs = [];
  const equalLows = [];

  for (let i = 0; i < highs.length; i += 1) {
    for (let j = i + 1; j < highs.length; j += 1) {
      if (Math.abs(highs[i] - highs[j]) / highs[i] <= tolerance) {
        equalHighs.push(highs[i]);
        equalHighs.push(highs[j]);
        i = highs.length;
        break;
      }
    }
  }

  for (let i = 0; i < lows.length; i += 1) {
    for (let j = i + 1; j < lows.length; j += 1) {
      if (Math.abs(lows[i] - lows[j]) / lows[i] <= tolerance) {
        equalLows.push(lows[i]);
        equalLows.push(lows[j]);
        i = lows.length;
        break;
      }
    }
  }

  const sweepRisk = equalHighs.length || equalLows.length ? "high" : "low";
  return { equalHighs, equalLows, sweepRisk };
}
