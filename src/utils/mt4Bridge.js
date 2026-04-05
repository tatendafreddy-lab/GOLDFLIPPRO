export async function sendSignalToBridge({ direction, lots, stopLoss, takeProfit, symbol = "XAUUSD", comment = "GoldFlip Pro" }) {
  try {
    const res = await fetch("http://localhost:3001/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, lots, stopLoss, takeProfit, symbol, comment }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("[MT4 Bridge] sendSignal error:", err.message);
    throw err;
  }
}

export async function checkBridgeStatus() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch("http://localhost:3001/status", { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    return { running: false, error: err.message };
  }
}
