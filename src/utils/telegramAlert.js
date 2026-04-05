export async function sendTelegramAlert(signal) {
  const emoji = signal.direction === "BUY" ? "🟢" : "🔴";
  const sweepNote =
    signal.sweep && signal.sweep.swept
      ? `\nSweep: ${signal.sweep.direction?.toUpperCase()} at ${Number(signal.sweep.sweptLevel || 0).toFixed(2)} (${Number(signal.sweep.wickSize || 0).toFixed(1)} pips)`
      : "";

  const message = `
${emoji} GOLDFLIP PRO SIGNAL
XAU/USD ${signal.direction}

Entry: $${signal.entry}
Stop Loss: $${signal.stopLoss}
Take Profit: $${signal.takeProfit}
Risk:Reward: ${signal.riskReward}R
Confidence: ${signal.confidence}%
${sweepNote}

Strategy: London Breakout
Time: ${new Date().toUTCString()}

GoldFlip Pro — goldflip.vercel.app
  `.trim();

  await fetch("/api/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}
