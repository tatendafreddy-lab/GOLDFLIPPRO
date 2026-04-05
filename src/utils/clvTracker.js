const CLV_KEY = "goldflip-clv-history";

function read() {
  try {
    const raw = localStorage.getItem(CLV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(CLV_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function recordTradeEntry(tradeId, entryPrice, direction, timestamp = Date.now()) {
  const list = read();
  const existing = list.find((t) => t.id === tradeId);
  if (existing) {
    existing.entryPrice = entryPrice;
    existing.direction = direction;
    existing.entryTime = timestamp;
  } else {
    list.push({ id: tradeId, entryPrice, direction, entryTime: timestamp });
  }
  write(list);
}

export function recordTradeClose(tradeId, closingPrice) {
  const list = read();
  const t = list.find((x) => x.id === tradeId);
  if (!t || !closingPrice) return null;
  const dir = (t.direction || "BUY").toUpperCase();
  const clvRaw =
    dir === "BUY"
      ? (closingPrice - t.entryPrice) * -1
      : closingPrice - t.entryPrice;
  // positive means you beat the closing price
  t.clv = clvRaw;
  t.closePrice = closingPrice;
  t.closeTime = Date.now();
  write(list);
  return clvRaw;
}

export function getCLVStats(tradeHistory = null) {
  // use stored CLV entries or provided trade history with clv values
  const list =
    tradeHistory ||
    read().filter((t) => typeof t.clv === "number" && !Number.isNaN(t.clv));
  if (!list.length) {
    return {
      averageCLV: 0,
      clvTrend: "stable",
      last20CLV: 0,
      last50CLV: 0,
      interpretation: "No CLV data yet.",
    };
  }

  const avg = list.reduce((a, b) => a + b.clv, 0) / list.length;
  const last20 = list.slice(-20);
  const last50 = list.slice(-50);
  const avg20 = last20.length ? last20.reduce((a, b) => a + b.clv, 0) / last20.length : avg;
  const avg50 = last50.length ? last50.reduce((a, b) => a + b.clv, 0) / last50.length : avg;

  let clvTrend = "stable";
  if (avg20 > avg50 * 1.05) clvTrend = "improving";
  else if (avg20 < avg50 * 0.95) clvTrend = "degrading";

  const interpretation =
    avg > 0
      ? "Your entries are consistently beating the closing price — edge looks real."
      : "Entries are worse than close — edge may be timing lag.";

  return {
    averageCLV: avg,
    clvTrend,
    last20CLV: avg20,
    last50CLV: avg50,
    interpretation,
  };
}

export function getSizingMultiplier(clvStats) {
  if (!clvStats) return 1;
  const { last20CLV, last50CLV } = clvStats;
  if (last50CLV < 0) return 0.25;
  if (last20CLV < 0) return 0.5;
  if (last20CLV < 0.02) return 0.75; // slightly negative/flat
  return 1.0;
}
