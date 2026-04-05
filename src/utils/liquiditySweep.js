// Detects liquidity sweeps on the last 30 candles.
// Returns: { swept, direction, sweptLevel, wickSize, reversalConfirmed, entryOpportunity, confidence }
export function detectLiquiditySweep(ohlcvData, isKillZone = false) {
  const EMPTY = {
    swept: false,
    direction: null,
    sweptLevel: null,
    wickSize: 0,
    reversalConfirmed: false,
    entryOpportunity: false,
    confidence: 0,
  };
  if (!Array.isArray(ohlcvData) || ohlcvData.length < 5) return EMPTY;

  const recent = ohlcvData.slice(-30);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);

  const swingHigh = Math.max(...highs.slice(0, highs.length - 1));
  const swingLow = Math.min(...lows.slice(0, lows.length - 1));

  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2] || {};

  const pip = 0.1; // gold pip = $0.10

  // Bearish sweep then bullish reversal (wick below, close above)
  if (last.low < swingLow - 5 * pip && last.close > swingLow && last.close > last.open) {
    const wick = (swingLow - last.low) / pip;
    const reversalConfirmed = prev.close < last.close; // simple confirmation: next candle (current) higher than previous close
    const entryOpportunity = reversalConfirmed && isKillZone;
    const confidence = Math.min(100, 70 + Math.min(30, wick));
    return {
      swept: true,
      direction: "bullish",
      sweptLevel: swingLow,
      wickSize: wick,
      reversalConfirmed,
      entryOpportunity,
      confidence,
    };
  }

  // Bullish sweep then bearish reversal (wick above, close below)
  if (last.high > swingHigh + 5 * pip && last.close < swingHigh && last.close < last.open) {
    const wick = (last.high - swingHigh) / pip;
    const reversalConfirmed = prev.close > last.close;
    const entryOpportunity = reversalConfirmed && isKillZone;
    const confidence = Math.min(100, 70 + Math.min(30, wick));
    return {
      swept: true,
      direction: "bearish",
      sweptLevel: swingHigh,
      wickSize: wick,
      reversalConfirmed,
      entryOpportunity,
      confidence,
    };
  }

  return EMPTY;
}

// Fair Value Gaps detection (last 50 candles, 3-candle pattern)
export function detectFairValueGaps(ohlcvData) {
  if (!Array.isArray(ohlcvData) || ohlcvData.length < 5) return [];
  const recent = ohlcvData.slice(-50);
  const fvgs = [];
  const pip = 0.1;

  for (let i = 0; i < recent.length - 2; i += 1) {
    const c1 = recent[i];
    const c2 = recent[i + 1];
    const c3 = recent[i + 2];

    // Bullish FVG: c3.low > c1.high
    if (c3.low > c1.high) {
      const gapTop = c3.low;
      const gapBottom = c1.high;
      const gapSize = (gapTop - gapBottom) / pip;
      fvgs.push({
        type: "bullish",
        gapTop,
        gapBottom,
        gapSize,
        candlesAgo: recent.length - 1 - (i + 2),
        filled: false,
        strength: gapSize > 10 ? "strong" : "weak",
      });
    }

    // Bearish FVG: c3.high < c1.low
    if (c3.high < c1.low) {
      const gapTop = c1.low;
      const gapBottom = c3.high;
      const gapSize = (gapTop - gapBottom) / pip;
      fvgs.push({
        type: "bearish",
        gapTop,
        gapBottom,
        gapSize,
        candlesAgo: recent.length - 1 - (i + 2),
        filled: false,
        strength: gapSize > 10 ? "strong" : "weak",
      });
    }
  }
  return fvgs;
}

export function isPriceInFVG(currentPrice, fvgArray = []) {
  if (!currentPrice || !Array.isArray(fvgArray)) return null;
  return fvgArray.find(
    (fvg) => currentPrice <= fvg.gapTop && currentPrice >= fvg.gapBottom
  );
}
