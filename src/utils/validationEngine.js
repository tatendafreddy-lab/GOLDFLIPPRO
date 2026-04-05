// Forward test validation and rolling EV tracking

function pctDeviation(base, live) {
  if (!Number.isFinite(base) || base === 0) return 100;
  return Math.abs((live - base) / base) * 100;
}

function computeExpectancy(winRate, avgRR) {
  const p = winRate;
  const q = 1 - p;
  return p * avgRR - q;
}

export function compareBacktestToLive({
  backtestWinRate,
  backtestAvgRR,
  backtestMaxDrawdown,
  liveWinRate,
  liveAvgRR,
  liveMaxDrawdown,
  liveTrades = 0,
}) {
  if (!liveTrades || liveTrades < 10) {
    return {
      winRateDeviation: null,
      rrDeviation: null,
      drawdownDeviation: null,
      overallDeviation: null,
      modelTrustScore: 50,
      status: "INSUFFICIENT_DATA",
      warnings: ["Need more live trades to validate model"],
      recommendation: "Keep collecting live data before increasing size.",
    };
  }

  const winRateDeviation = pctDeviation(backtestWinRate, liveWinRate);
  const rrDeviation = pctDeviation(backtestAvgRR, liveAvgRR);
  const drawdownDeviation = pctDeviation(backtestMaxDrawdown, liveMaxDrawdown);

  const overallDeviation = (winRateDeviation + rrDeviation + drawdownDeviation) / 3;

  let status = "VALIDATED";
  let modelTrustScore = 95;
  const warnings = [];
  let recommendation = "Performance matches backtest. Maintain sizing.";

  if (overallDeviation >= 10 && overallDeviation < 20) {
    status = "DEGRADING";
    modelTrustScore = 75;
    warnings.push("Performance drifting from backtest — monitor closely.");
    recommendation = "Tighten risk and monitor live stats daily.";
  } else if (overallDeviation >= 20) {
    status = "OVERFITTED";
    modelTrustScore = Math.max(30, 90 - overallDeviation);
    warnings.push("Live performance deviates significantly from backtest — strategy may be curve fitted, reduce size immediately.");
    recommendation = "Cut size or pause automation until live edge improves.";
  }

  // fine tune trust score in validated band
  if (status === "VALIDATED") {
    modelTrustScore = Math.max(90, 100 - overallDeviation);
  }

  return {
    winRateDeviation,
    rrDeviation,
    drawdownDeviation,
    overallDeviation,
    modelTrustScore: Math.min(100, Math.max(0, modelTrustScore)),
    status,
    warnings,
    recommendation,
  };
}

export function calculateRollingEV(journalEntries = [], window = 20) {
  const tail = journalEntries.slice(-window);
  if (!tail.length) return 0;
  const outcomes = tail.map((t) => {
    const win = t.outcome === "win" ? 1 : 0;
    const rr = Number.isFinite(Number(t.riskReward)) ? Number(t.riskReward) : 1;
    return computeExpectancy(win, rr);
  });
  return outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
}

export function getRollingEVTrend(journalEntries = []) {
  const ev10 = calculateRollingEV(journalEntries, 10);
  const ev20 = calculateRollingEV(journalEntries, 20);
  const ev50 = calculateRollingEV(journalEntries, 50);

  let trend = "stable";
  if (ev10 > ev20 && ev20 > ev50) trend = "improving";
  if (ev10 < ev20 && ev20 < ev50) trend = "declining";

  return { ev10, ev20, ev50, trend };
}
