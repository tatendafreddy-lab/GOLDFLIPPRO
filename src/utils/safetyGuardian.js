/**
 * Safety Guardian – central risk gate for auto-trading.
 * All thresholds are hard-coded per product spec.
 */

const COOLDOWN_KEY = "goldflip-cooldown-ends";
const EMERGENCY_STOP_KEY = "goldflip-emergency-stop";

export function checkAllSafetyRules({
  edgeScore = 100,
  isKillZone = false,
  dailyLoss = 0,
  accountBalance = 0,
  dailyTradeCount = 0,
  weeklyLoss = 0,
  consecutiveLosses = 0,
  regime = "normal",
  isLiveFeedConnected = true,
  outsidePeakKillZone = false,
  isNewsExtreme = false,
}) {
  const blockedReasons = [];
  const warnings = [];

  // Hard rules (block)
  if (edgeScore < 65) blockedReasons.push("Edge score below 65");
  if (!isKillZone) blockedReasons.push("Not in kill zone");
  if (accountBalance > 0 && (dailyLoss / accountBalance) * 100 > 3)
    blockedReasons.push("Daily loss exceeds 3%");
  if (dailyTradeCount > 3) blockedReasons.push("More than 3 trades today");
  if (!isLiveFeedConnected) blockedReasons.push("Live price feed disconnected");
  if (consecutiveLosses >= 3) blockedReasons.push("3+ consecutive losses");
  if (accountBalance > 0 && (weeklyLoss / accountBalance) * 100 > 10)
    blockedReasons.push("Weekly loss exceeds 10%");
  if (regime === "VOLATILE") blockedReasons.push("Market regime volatile / extreme ATR");
  if (accountBalance > 0 && accountBalance < 10) blockedReasons.push("Account balance below $10");
  if (isNewsExtreme) blockedReasons.push("Extreme news risk — do not trade");

  // Amber warnings (allow but warn)
  if (edgeScore >= 65 && edgeScore < 70) warnings.push("Edge score in watch zone (65-70)");
  if (consecutiveLosses === 2) warnings.push("Two consecutive losses");
  if (accountBalance > 0) {
    const dl = (dailyLoss / accountBalance) * 100;
    if (dl >= 2 && dl <= 3) warnings.push("Daily loss between 2-3%");
  }
  if (outsidePeakKillZone) warnings.push("Outside peak kill-zone hours");

  let riskLevel = "green";
  if (blockedReasons.length) riskLevel = "red";
  else if (warnings.length) riskLevel = "amber";

  const canTrade = riskLevel !== "red";

  return { canTrade, blockedReasons, warnings, riskLevel };
}

export function setCooldown(hours = 24) {
  const endsAt = Date.now() + hours * 60 * 60 * 1000;
  try {
    localStorage.setItem(COOLDOWN_KEY, String(endsAt));
  } catch {}
  return endsAt;
}

export function getCooldownRemaining() {
  try {
    const ends = Number(localStorage.getItem(COOLDOWN_KEY));
    if (!ends) return 0;
    const remain = ends - Date.now();
    return remain > 0 ? remain : 0;
  } catch {
    return 0;
  }
}

export function clearCooldown() {
  try {
    localStorage.removeItem(COOLDOWN_KEY);
  } catch {}
}

export function enableEmergencyStop() {
  try {
    localStorage.setItem(EMERGENCY_STOP_KEY, "on");
  } catch {}
}

export function disableEmergencyStop() {
  try {
    localStorage.removeItem(EMERGENCY_STOP_KEY);
  } catch {}
}

export function isEmergencyStopActive() {
  try {
    return localStorage.getItem(EMERGENCY_STOP_KEY) === "on";
  } catch {
    return false;
  }
}

export function isMondayResetNeeded(lastResetTs) {
  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  if (!isMonday) return false;
  if (!lastResetTs) return true;
  const last = new Date(lastResetTs);
  return last.getUTCDate() !== now.getUTCDate() || last.getUTCMonth() !== now.getUTCMonth();
}

export async function sendTelegramMessage(text) {
  try {
    await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
  } catch (err) {
    console.error("[SafetyGuardian] Telegram send failed:", err?.message);
  }
}
