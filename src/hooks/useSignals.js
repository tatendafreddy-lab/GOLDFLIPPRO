import { useMemo, useRef, useEffect } from "react";
import { calculateRSI, calculateMACD, calculateBollingerBands, detectBreakOfStructure, detectEqualHighsLows } from "../utils/indicators.js";
import { detectLiquiditySweep, detectFairValueGaps, isPriceInFVG } from "../utils/liquiditySweep.js";
import { getLondonBreakoutSignal } from "../utils/londonBreakout.js";
import { sendTelegramAlert } from "../utils/telegramAlert.js";
import { saveSignal } from "../utils/tradeJournal.js";

function rsiSignal(value) {
  if (value === null || value === undefined) return { signal: "neutral", confidence: 0 };
  if (value < 40) {
    return { signal: "buy", confidence: Math.min(((40 - value) / 40) * 100, 100) };
  }
  if (value > 60) {
    return { signal: "sell", confidence: Math.min(((value - 60) / 40) * 100, 100) };
  }
  return { signal: "neutral", confidence: 0 };
}

function macdSignal(macdLine, signalLine, histogram) {
  const lastIdx = (() => {
    for (let i = macdLine.length - 1; i >= 1; i -= 1) {
      if (macdLine[i] !== null && signalLine[i] !== null && macdLine[i - 1] !== null && signalLine[i - 1] !== null) {
        return i;
      }
    }
    return -1;
  })();

  if (lastIdx === -1) return { signal: "neutral", confidence: 0, macdLine, signalLine, histogram };

  const currentMacd = macdLine[lastIdx];
  const currentSignal = signalLine[lastIdx];
  const prevMacd = macdLine[lastIdx - 1];
  const prevSignal = signalLine[lastIdx - 1];
  const currentHist = histogram[lastIdx];

  const bullCross = currentMacd > currentSignal && prevMacd <= prevSignal;
  const bearCross = currentMacd < currentSignal && prevMacd >= prevSignal;

  if (currentHist > 0 && bullCross) {
    return {
      signal: "buy",
      confidence: Math.min(Math.abs(currentHist) * 120, 100),
      macdLine,
      signalLine,
      histogram,
    };
  }
  if (currentHist < 0 && bearCross) {
    return {
      signal: "sell",
      confidence: Math.min(Math.abs(currentHist) * 120, 100),
      macdLine,
      signalLine,
      histogram,
    };
  }

  return { signal: "neutral", confidence: 0, macdLine, signalLine, histogram };
}

export function useSignals(ohlcv, autoTradeConfig = null) {
  const alertRef = useRef(null);
  const journalRef = useRef(null);

  const computed = useMemo(() => {
    const closes = Array.isArray(ohlcv) ? ohlcv.map((c) => c.close) : [];
    if (!closes.length) {
      return {
        rsi: { value: null, signal: "neutral" },
        macd: { macdLine: [], signalLine: [], histogram: [], signal: "neutral" },
        combined: "neutral",
        confidence: 0,
        londonBreakout: {
          signal: "WAIT",
          entry: null,
          stopLoss: null,
          takeProfit: null,
          riskReward: null,
          isKillZone: false,
        },
        structure: {},
      };
    }

    const rsiSeries = calculateRSI(closes, 14);
    const rsiValue = rsiSeries[rsiSeries.length - 1];
    const rsiSig = rsiSignal(rsiValue);

    const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
    const macdSig = macdSignal(macdLine, signalLine, histogram);

    let combined = "neutral";
    let confidence = 0;
    if (rsiSig.signal !== "neutral" && rsiSig.signal === macdSig.signal) {
      combined = rsiSig.signal;
      confidence = Math.round((rsiSig.confidence + macdSig.confidence) / 2);
    }

    const currentPrice = closes[closes.length - 1];
    const londonBreakout = getLondonBreakoutSignal(ohlcv, currentPrice);

    const bb = calculateBollingerBands(closes, 20, 2);
    const bos = detectBreakOfStructure(ohlcv);
    const equal = detectEqualHighsLows(ohlcv);
    const sweep = detectLiquiditySweep(ohlcv, londonBreakout?.isKillZone);
    const fvgs = detectFairValueGaps(ohlcv);
    const price = closes[closes.length - 1];
    const priceInFvg = isPriceInFVG(price, fvgs);

    const structure = {
      bollinger: {
        squeeze: bb.squeeze[bb.squeeze.length - 1] || false,
        squeezeRelease: bb.squeezeRelease || false,
        upper: bb.upper[bb.upper.length - 1],
        lower: bb.lower[bb.lower.length - 1],
        middle: bb.middle[bb.middle.length - 1],
        width: bb.width[bb.width.length - 1],
      },
      bos,
      equal,
      sweep,
      fvgs,
      priceInFvg,
      macro: {}, // placeholder (set in MacroPanel fetch)
    };

    return {
      rsi: { value: rsiValue, signal: rsiSig.signal },
      macd: { macdLine, signalLine, histogram, signal: macdSig.signal },
      combined,
      confidence,
      londonBreakout,
      structure,
    };
  }, [ohlcv]);

  useEffect(() => {
    const { combined, confidence, londonBreakout } = computed;
    if (!combined || combined === "neutral") return;
    if (confidence <= 70) return;

    const key = `${combined}-${confidence}-${londonBreakout?.entry || ""}`;
    if (alertRef.current === key) return;

    alertRef.current = key;
    const direction = combined.toUpperCase();
    const entry = londonBreakout?.entry ?? ohlcv?.[ohlcv.length - 1]?.close ?? 0;
    const stopLoss = londonBreakout?.stopLoss ?? "N/A";
    const takeProfit = londonBreakout?.takeProfit ?? "N/A";
    const riskReward = londonBreakout?.riskReward ?? "N/A";

    sendTelegramAlert({
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      confidence,
      sweep: computed?.structure?.sweep,
    }).catch(() => {});

    // Optional auto-trade hook
    if (
      autoTradeConfig &&
      autoTradeConfig.enabled &&
      confidence >= (autoTradeConfig.minEdgeScore ?? 70) &&
      (autoTradeConfig.dailyTradeCount ?? 0) < (autoTradeConfig.maxTradesPerDay ?? 3) &&
      (londonBreakout?.isKillZone ?? false) &&
      autoTradeConfig.safetyCanTrade
    ) {
      autoTradeConfig.onAutoTrade?.({
        direction,
        entry,
        stopLoss,
        takeProfit,
        confidence,
        riskReward,
      });
    }

    // Journal save once per signal
    const journalKey = `${direction}-${entry}-${stopLoss}-${takeProfit}`;
    if (journalRef.current === journalKey) return;
    journalRef.current = journalKey;
    saveSignal({
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      confidence,
      strategy: "London Breakout",
      timestamp: Date.now(),
    });
  }, [computed, ohlcv]);

  return computed;
}
