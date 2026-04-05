const FRANKFURTER = "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY";

// Fetch a simple DXY proxy using USD vs EUR, GBP, JPY
export async function fetchDXYProxy() {
  try {
    const res = await fetch(FRANKFURTER);
    const json = await res.json();
    const { rates } = json;
    // Convert to the common USD majors
    const eurusd = 1 / rates.EUR; // EUR per USD -> invert to EURUSD
    const gbpusd = 1 / rates.GBP;
    const usdjpy = rates.JPY; // already USDJPY

    // Rough DXY-style weighting (EUR 57.6%, GBP 11.9%, JPY 13.6%)
    const dxyProxy = 0.576 * eurusd + 0.136 * gbpusd + 0.136 * (usdjpy / 110) + 0.152; // small bias term

    let usdStrength = "neutral";
    if (dxyProxy > 1.02) usdStrength = "strong";
    else if (dxyProxy < 0.98) usdStrength = "weak";

    const goldBias =
      usdStrength === "strong" ? "bearish" : usdStrength === "weak" ? "bullish" : "neutral";

    const confidence = Math.min(100, Math.abs((dxyProxy - 1) * 200));

    return { dxyProxy, usdStrength, goldBias, confidence };
  } catch (err) {
    return { dxyProxy: 1, usdStrength: "neutral", goldBias: "neutral", confidence: 0, error: err.message };
  }
}

// Very lightweight high-impact news calendar
export function getNewsRiskLevel(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  const dom = d.getUTCDate();

  // First Friday: NFP
  const firstFriday = (() => {
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const offset = (5 - first.getUTCDay() + 7) % 7;
    return 1 + offset;
  })();
  // Second Tuesday: CPI
  const secondTuesday = (() => {
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const offset = (2 - first.getUTCDay() + 7) % 7;
    return 1 + offset + 7;
  })();

  // Simple FOMC placeholder dates (add more as needed)
  const fomcDays = [
    "2026-01-28",
    "2026-03-18",
    "2026-05-06",
    "2026-06-17",
    "2026-07-29",
    "2026-09-16",
    "2026-11-04",
    "2026-12-16",
  ];
  const iso = d.toISOString().slice(0, 10);

  if (dom === firstFriday && day === 5) {
    return { isNewsDay: true, eventName: "NFP", riskLevel: "high", recommendation: "reduce size" };
  }
  if (dom === secondTuesday && day === 2) {
    return { isNewsDay: true, eventName: "US CPI", riskLevel: "high", recommendation: "reduce size" };
  }
  if (fomcDays.includes(iso)) {
    return { isNewsDay: true, eventName: "FOMC", riskLevel: "extreme", recommendation: "avoid trading" };
  }

  return { isNewsDay: false, eventName: "", riskLevel: "normal", recommendation: "normal" };
}

export function getMacroConfluence({ goldBias, londonBreakoutDirection, regime }) {
  if (!goldBias || !londonBreakoutDirection) return { confluenceScore: 50, confluenceLabel: "Neutral" };
  const lbDir = londonBreakoutDirection.toUpperCase();
  let score = 50;
  if (goldBias === "bullish" && lbDir === "BUY") score = 85;
  else if (goldBias === "bearish" && lbDir === "SELL") score = 85;
  else if (goldBias === "neutral") score = 60;
  else score = 40;

  if (regime === "VOLATILE") score -= 10;

  let confluenceLabel = "Weak Confluence";
  if (score >= 75) confluenceLabel = "Strong Confluence";
  else if (score <= 45) confluenceLabel = "Against Macro";

  return { confluenceScore: score, confluenceLabel };
}

export async function getYieldSentiment() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=JPY");
    const data = await res.json();
    const usdJpy = data.rates?.JPY;
    let sentiment = "neutral";
    let goldBias = "neutral";
    if (usdJpy > 155) {
      sentiment = "risk-off";
      goldBias = "bullish";
    } else if (usdJpy < 145) {
      sentiment = "risk-on";
      goldBias = "bearish";
    }
    const confidence = Math.min(100, Math.abs((usdJpy - 150) * 2));
    return { sentiment, goldBias, confidence, explanation: `USDJPY ${usdJpy}` };
  } catch (err) {
    return { sentiment: "neutral", goldBias: "neutral", confidence: 0, error: err.message };
  }
}

export function getRiskSentimentProxy({ usdStrength }) {
  if (!usdStrength) return { sentiment: "neutral", goldBias: "neutral", confidence: 50, explanation: "No data" };
  if (usdStrength === "strong") return { sentiment: "risk-off", goldBias: "bullish", confidence: 70, explanation: "USD strength vs JPY implies risk-off" };
  if (usdStrength === "weak") return { sentiment: "risk-on", goldBias: "bearish", confidence: 60, explanation: "USD weak vs JPY implies risk-on" };
  return { sentiment: "neutral", goldBias: "neutral", confidence: 50, explanation: "USD neutral" };
}

export function getTripleConfluence({ usdStrength, yieldSentiment, riskSentiment, londonBreakoutDirection }) {
  const dir = londonBreakoutDirection?.toUpperCase();
  const alignments = [
    usdStrength === "weak" && dir === "BUY",
    usdStrength === "strong" && dir === "SELL",
    yieldSentiment?.goldBias === (dir === "BUY" ? "bullish" : dir === "SELL" ? "bearish" : "neutral"),
    riskSentiment?.goldBias === (dir === "BUY" ? "bullish" : dir === "SELL" ? "bearish" : "neutral"),
  ].filter(Boolean).length;

  let alignmentScore = 25 * alignments;
  let recommendation = "Mixed signals";
  if (alignments >= 3) {
    alignmentScore = 90;
    recommendation = "Full size";
  } else if (alignments === 2) {
    alignmentScore = 70;
    recommendation = "Half size";
  } else {
    alignmentScore = 40;
    recommendation = "Quarter size or skip";
  }

  return {
    aligned: alignments >= 3,
    alignmentScore,
    recommendation,
  };
}
