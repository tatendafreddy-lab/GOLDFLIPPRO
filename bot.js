import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import winston from "winston";
import cron from "node-cron";
import cors from "cors";
import { fileURLToPath } from "url";
import { createReconnectingWebSocket } from "./reconnect.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: path.join(LOG_DIR, "bot.log") }),
    new winston.transports.Console()
  ]
});

const app = express();
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN?.split(",").map((o) => o.trim()) || "*",
  })
);
app.use(express.json());

// In-memory state
let autoTradeEnabled = (process.env.AUTO_TRADE_ENABLED || "false") === "true";
let price = null;
let lastPriceAt = null;
let priceHistory = [];
let lastSignal = null;
let lastGate = null;
let trades = [];
let derivStatus = "disconnected";

const CONFIG = {
  goldApiKey: process.env.GOLD_API_KEY,
  derivToken: process.env.DERIV_API_TOKEN,
  maxStakeUsd: Number(process.env.MAX_STAKE_USD || 1),
  maxTradesPerDay: Number(process.env.MAX_TRADES_PER_DAY || 3),
  minEdgeScore: Number(process.env.MIN_EDGE_SCORE || 70),
  riskPercent: Number(process.env.RISK_PERCENT || 1),
  accountBalance: Number(process.env.ACCOUNT_BALANCE || 25000)
};

// Deriv WebSocket
let derivWS = null;
function startDeriv() {
  derivWS = createReconnectingWebSocket(
    "wss://ws.binaryws.com/websockets/v3?app_id=1089",
    {
      onOpen: () => {
        derivStatus = "connected";
        logger.info("Deriv WS connected");
        if (CONFIG.derivToken) {
          derivWS.send(JSON.stringify({ authorize: CONFIG.derivToken }));
        }
      },
      onMessage: (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.error) {
          logger.error(`Deriv error: ${JSON.stringify(data.error)}`);
        }
      },
      onError: (err) => {
        derivStatus = "error";
        logger.error(`Deriv WS error: ${err.message}`);
      }
    }
  );
}
startDeriv();

// Utils
function logDecision(message, extra = {}) {
  logger.info(`${message} | ${JSON.stringify(extra)}`);
}

function fetchGoldPrice() {
  const headers = {};
  if (CONFIG.goldApiKey) headers["x-access-token"] = CONFIG.goldApiKey;
  return axios
    .get("https://www.goldapi.io/api/XAU/USD", { headers })
    .then((res) => res.data?.price || res.data?.ask || res.data?.bid)
    .catch((err) => {
      logger.error(`Gold price fetch failed: ${err.message}`);
      return null;
    });
}

function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
  const ema = (series, period) => {
    const k = 2 / (period + 1);
    let emaVal = series[0];
    for (let i = 1; i < series.length; i++) {
      emaVal = series[i] * k + emaVal * (1 - k);
    }
    return emaVal;
  };
  if (data.length < slow + signal) return { macd: null, signal: null, hist: null };
  const fastEma = ema(data.slice(-slow), fast);
  const slowEma = ema(data.slice(-slow), slow);
  const macdVal = fastEma - slowEma;
  const signalVal = ema([...data.slice(-(slow + signal)), macdVal], signal);
  const hist = macdVal - signalVal;
  return { macd: macdVal, signal: signalVal, hist };
}

function calculateEdgeScore(rsi, macdHist, breakout = false) {
  let score = 0;
  if (breakout) score += 25;
  if (rsi !== null) {
    if (rsi < 40 || rsi > 60) score += 20;
  }
  if (macdHist !== null) score += Math.min(20, Math.abs(macdHist) * 5);
  return Math.max(0, Math.min(100, score));
}

function evaluateTradeQuality({ calibratedProbability = 0.58, expectedValue = 0.1, edgeScore = 50 }) {
  const rejectionReasons = [];
  if (calibratedProbability < 0.55) rejectionReasons.push("Win probability below minimum");
  if (expectedValue <= 0) rejectionReasons.push("Negative EV");
  if (edgeScore < CONFIG.minEdgeScore) rejectionReasons.push("Edge score below threshold");
  const decision = rejectionReasons.length ? "REJECTED" : "APPROVED";
  return { decision, rejectionReasons };
}

function placeTrade({ direction, stake, priceAt }) {
  const trade = {
    id: `t-${Date.now()}`,
    time: new Date().toISOString(),
    direction,
    stake,
    price: priceAt,
    status: "SENT"
  };
  trades.unshift(trade);
  trades = trades.slice(0, 50);
  logDecision("Trade sent", trade);
  // Minimal Deriv example: log only to avoid unintended live trades.
}

async function runSignalEngine() {
  if (!price) return;
  const rsi = calculateRSI(priceHistory);
  const macd = calculateMACD(priceHistory);
  const breakout = false; // placeholder for London breakout detection
  const edgeScore = calculateEdgeScore(rsi, macd.hist, breakout);
  const expectedValue = 0.1;
  const gate = evaluateTradeQuality({
    calibratedProbability: 0.58,
    expectedValue,
    edgeScore
  });

  lastSignal = { rsi, macd: macd.hist, edgeScore, breakout, at: new Date().toISOString() };
  lastGate = { ...gate, at: new Date().toISOString() };

  logDecision("Signal evaluated", { rsi, macd: macd.hist, edgeScore, decision: gate.decision });

  if (gate.decision === "APPROVED" && autoTradeEnabled) {
    placeTrade({ direction: "BUY", stake: CONFIG.maxStakeUsd, priceAt: price });
  }
}

// Schedulers
async function pollPrice() {
  const p = await fetchGoldPrice();
  if (p) {
    price = p;
    lastPriceAt = Date.now();
    priceHistory.push(p);
    if (priceHistory.length > 500) priceHistory.shift();
  }
}

setInterval(pollPrice, 60 * 1000);
setInterval(runSignalEngine, 60 * 1000);
pollPrice();

// Health cron placeholder (healthcheck module will import bot state if needed)
cron.schedule("*/5 * * * *", () => {
  logger.info("Heartbeat: bot running");
});

// HTTP endpoints
app.get("/api/status", (req, res) => {
  res.json({
    running: true,
    price,
    lastPriceAt,
    lastSignal,
    lastGate,
    autoTradeEnabled,
    derivStatus
  });
});

app.get("/api/price", (req, res) => {
  res.json({ price, lastPriceAt });
});

app.get("/api/signals", (req, res) => {
  res.json({
    lastSignal,
    lastGate
  });
});

app.post("/api/toggle-auto-trade", (req, res) => {
  autoTradeEnabled = Boolean(req.body?.enabled);
  logDecision("Auto-trade toggled", { autoTradeEnabled });
  res.json({ autoTradeEnabled });
});

app.get("/api/trades", (req, res) => {
  res.json(trades.slice(0, 50));
});

app.get("/api/logs", (req, res) => {
  const lines = fs.readFileSync(path.join(LOG_DIR, "bot.log"), "utf8").trim().split("\n");
  res.json(lines.slice(-100));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Bot server listening on ${PORT}`));
