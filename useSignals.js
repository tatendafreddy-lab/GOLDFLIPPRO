import { useEffect, useState } from "react";
import axios from "axios";

const BOT_URL = import.meta.env.VITE_BOT_URL || "http://localhost:3000";

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

export function useSignals() {
  const [signals, setSignals] = useState({
    rsi: { value: null, signal: "neutral" },
    macd: { macdLine: [], signalLine: [], histogram: [], signal: "neutral" },
    combined: "neutral",
    confidence: 0,
    londonBreakout: { signal: "WAIT", isKillZone: false },
    structure: {}
  });

  useEffect(() => {
    let cancel = false;
    const fetchSignals = async () => {
      try {
        const res = await axios.get(`${BOT_URL.replace(/\/$/, "")}/api/signals`, { timeout: 5000 });
        if (!cancel && res.data?.lastSignal) {
          setSignals((prev) => ({
            ...prev,
            rsi: { value: res.data.lastSignal.rsi, signal: rsiSignal(res.data.lastSignal.rsi).signal },
            macd: { histogram: res.data.lastSignal.macd, signal: res.data.lastSignal.macd >= 0 ? "buy" : "sell" },
            combined: res.data.lastGate?.decision === "APPROVED" ? "buy" : "neutral",
            confidence: res.data.lastSignal.edgeScore || 0,
            edgeScore: res.data.lastSignal.edgeScore,
            gate: res.data.lastGate,
            structure: {}
          }));
        }
      } catch (e) {
        // silent; leave previous signals
      }
    };
    fetchSignals();
    const id = setInterval(fetchSignals, 30000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, []);

  return signals;
}
