// Simple MT4/MT5 bridge for GoldFlip Pro
// Usage: npm install express cors && node mt4-bridge.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const tradeQueue = [];

app.post("/signal", (req, res) => {
  const { direction, lots, stopLoss, takeProfit, symbol = "XAUUSD", comment = "GoldFlip Pro" } = req.body || {};
  if (!direction || !lots) {
    return res.status(400).json({ error: "direction and lots are required" });
  }
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const trade = {
    id,
    direction: direction.toUpperCase(),
    lots: Number(lots),
    stopLoss: stopLoss ?? null,
    takeProfit: takeProfit ?? null,
    symbol,
    comment,
    status: "pending",
    ts: Date.now(),
  };
  tradeQueue.push(trade);
  console.log("[BRIDGE] queued", trade);
  res.json({ ok: true, id });
});

app.get("/queue", (req, res) => {
  res.json({ trades: tradeQueue.filter((t) => t.status === "pending") });
});

app.post("/confirm/:id", (req, res) => {
  const { id } = req.params;
  const trade = tradeQueue.find((t) => t.id === id);
  if (!trade) return res.status(404).json({ error: "not found" });
  trade.status = "executed";
  trade.executedAt = Date.now();
  console.log("[BRIDGE] confirmed", id);
  res.json({ ok: true });
});

app.get("/status", (req, res) => {
  res.json({ running: true, queueLength: tradeQueue.filter((t) => t.status === "pending").length });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[BRIDGE] MT4 bridge listening on http://localhost:${PORT}`);
});
