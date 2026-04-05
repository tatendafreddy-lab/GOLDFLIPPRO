import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import winston from "winston";

dotenv.config();

const LOG_DIR = path.join(process.cwd(), "server", "logs");
const BOT_URL = process.env.BOT_URL || "http://localhost:3000";

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

function readLastLogLines(count = 10) {
  const file = path.join(LOG_DIR, "bot.log");
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  return lines.slice(-count);
}

async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.warn(`Telegram not configured. Alert: ${message}`);
    return;
  }
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message
    });
  } catch (e) {
    logger.error(`Failed to send Telegram alert: ${e.message}`);
  }
}

async function runHealthcheck() {
  const issues = [];
  try {
    const status = await axios.get(`${BOT_URL}/api/status`).then((r) => r.data);
    const now = Date.now();

    if (status.derivStatus !== "connected") issues.push("Deriv WS not connected");
    if (!status.price || !status.lastPriceAt || now - status.lastPriceAt > 2 * 60 * 1000) {
      issues.push("Price stale (>2m) or missing");
    }
  } catch (e) {
    issues.push(`Status endpoint error: ${e.message}`);
  }

  const recentLogs = readLastLogLines(10).join("\n");
  if (/error/i.test(recentLogs)) {
    issues.push("Recent logs contain errors");
  }

  if (issues.length) {
    const message = `GOLDFLIP BOT ALERT — issue detected: ${issues.join("; ")}`;
    await sendTelegramAlert(message);
    logger.warn(message);
  } else {
    logger.info("Healthcheck OK");
  }
}

runHealthcheck();
