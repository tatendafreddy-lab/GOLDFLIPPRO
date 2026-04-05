// Probability calibration engine

export function calibrateEdgeScore(journalEntries = []) {
  const buckets = { 60: [], 70: [], 80: [], 90: [] };
  journalEntries
    .filter((t) => t.edgeScore && (t.outcome === "win" || t.outcome === "loss"))
    .forEach((t) => {
      const b = Math.max(60, Math.min(90, Math.floor(t.edgeScore / 10) * 10));
      buckets[b].push(t.outcome === "win" ? 1 : 0);
    });

  const map = {};
  Object.entries(buckets).forEach(([k, arr]) => {
    if (arr.length === 0) return;
    map[k] = arr.reduce((a, b) => a + b, 0) / arr.length;
  });
  return map;
}

export function getCalibratedProbability(score, calibrationMap) {
  if (!score || !calibrationMap || Object.keys(calibrationMap).length === 0) return 0.5;
  const keys = Object.keys(calibrationMap).map(Number).sort((a, b) => a - b);
  let lower = keys[0];
  let upper = keys[keys.length - 1];
  for (let i = 0; i < keys.length; i += 1) {
    if (score >= keys[i]) lower = keys[i];
    if (score <= keys[i]) {
      upper = keys[i];
      break;
    }
  }
  if (lower === upper) return calibrationMap[lower] ?? 0.5;
  const pLower = calibrationMap[lower] ?? 0.5;
  const pUpper = calibrationMap[upper] ?? 0.5;
  const t = (score - lower) / (upper - lower);
  return pLower + t * (pUpper - pLower);
}

export function calculateExpectedValue(winProbability, riskRewardRatio) {
  const p = Math.max(0, Math.min(1, winProbability));
  const rr = Math.max(0.1, riskRewardRatio || 1);
  return p * rr - (1 - p);
}

export function calculateCalibratedKelly(winProbability, riskRewardRatio) {
  const p = Math.max(0, Math.min(1, winProbability));
  const rr = Math.max(0.1, riskRewardRatio || 1);
  const trueKelly = p - (1 - p) / rr;
  const quarterKelly = Math.min(trueKelly * 0.25, 0.05);
  return { trueKelly: Math.max(0, trueKelly), quarterKelly: Math.max(0, quarterKelly) };
}
