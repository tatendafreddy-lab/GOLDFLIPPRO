import { isLondonKillZone } from "./londonBreakout.js";

// Utility to build consistent alert objects
function makeAlert(type, message, severity = "info") {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    type,
    message,
    severity,
    timestamp: Date.now(),
  };
}

/**
 * Evaluate strategy/market states and return alerts to surface to the UI.
 * This function is intentionally stateless; callers should gate on transitions
 * (e.g., when a signal changes) to avoid duplicates.
 */
export function checkAlerts({ signals = {}, londonBreakout, rsi, macd, dailyDrawdownPercent }) {
  const alerts = [];

  const lb = londonBreakout ?? signals.londonBreakout ?? {};
  const rsiValue = rsi?.value ?? signals.rsi?.value ?? null;
  const rsiSignal = rsi?.signal ?? signals.rsi?.signal ?? "neutral";
  const macdSignal = macd?.signal ?? signals.macd?.signal ?? "neutral";
  const killZoneActive = lb.isKillZone ?? isLondonKillZone();

  if (killZoneActive) {
    alerts.push(makeAlert("kill_zone", "London Kill Zone active (07:00-10:00 GMT)", "warning"));
  }

  if (lb.signal === "BUY" || lb.signal === "SELL") {
    alerts.push(makeAlert("london_breakout", `London Breakout ${lb.signal} setup`, "signal"));
  }

  const lbDir = lb.signal?.toLowerCase();
  const highConfidence = ["buy", "sell"].includes(rsiSignal) && rsiSignal === macdSignal && rsiSignal === lbDir;
  if (highConfidence) {
    alerts.push(makeAlert("high_confidence", "HIGH CONFIDENCE — all 3 signals agree", "signal"));
  }

  if (typeof rsiValue === "number") {
    if (rsiValue < 35) {
      alerts.push(makeAlert("rsi_oversold", `RSI oversold at ${rsiValue.toFixed(1)}`, "info"));
    } else if (rsiValue > 65) {
      alerts.push(makeAlert("rsi_overbought", `RSI overbought at ${rsiValue.toFixed(1)}`, "info"));
    }
  }

  if (dailyDrawdownPercent !== undefined && dailyDrawdownPercent !== null && dailyDrawdownPercent > 2) {
    alerts.push(makeAlert("drawdown", "Approaching daily loss limit", "warning"));
  }

  return alerts;
}

export default checkAlerts;


