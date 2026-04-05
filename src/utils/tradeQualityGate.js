// Trade Quality Gate: unified pre-trade check

export function evaluateTradeQuality({
  calibratedProbability = 0.5,
  expectedValue = 0,
  clvTrend = "stable",
  macroAlignmentScore = 50,
  regimeConfidence = 1,
  executionScore = 100,
  edgeScore = 50,
  consecutiveLosses = 0,
  isKillZone = false,
  sessionPerformance = 0,
  modelTrustScore = 100,
}) {
  const rejectionReasons = [];
  const warnings = [];

  // Hard rejects
  if (expectedValue <= 0) rejectionReasons.push("Negative EV — trade has no mathematical edge");
  if (calibratedProbability < 0.55) rejectionReasons.push("Win probability below minimum threshold");
  if (macroAlignmentScore < 60) rejectionReasons.push("Macro signals conflicting");
  if (executionScore < 70) rejectionReasons.push("Execution quality too poor — spread/slippage high");
  if (clvTrend === "degrading") rejectionReasons.push("Entry timing is degrading — edge may be gone");
  if (!isKillZone) rejectionReasons.push("Outside high-probability session window");
  if (consecutiveLosses > 2) rejectionReasons.push("Loss cluster detected — reduce exposure");
  if (modelTrustScore < 50) rejectionReasons.push("Low model trust — automation paused until performance recovers");

  // Soft warnings
  if (calibratedProbability >= 0.55 && calibratedProbability < 0.60)
    warnings.push("Marginal probability — consider skipping");
  if (macroAlignmentScore >= 60 && macroAlignmentScore < 70)
    warnings.push("Weak macro support");
  if (edgeScore < 70) warnings.push("Setup quality below optimal");

  const score =
    (calibratedProbability * 100) * 0.30 +
    normalizeEV(expectedValue) * 0.25 +
    macroAlignmentScore * 0.20 +
    executionScore * 0.15 +
    (regimeConfidence * 100) * 0.10;

  const qualityScore = Math.max(0, Math.min(100, score));

  const decision = rejectionReasons.length ? "REJECTED" : "APPROVED";
  const confidence =
    qualityScore >= 80 ? "high" : qualityScore >= 65 ? "medium" : "low";

  return { decision, qualityScore, rejectionReasons, warnings, confidence };
}

function normalizeEV(ev) {
  // cap EV contribution roughly between -1 and +3R for weighting
  const capped = Math.max(-1, Math.min(3, ev));
  // map -1..3 to 0..100
  return ((capped + 1) / 4) * 100;
}
