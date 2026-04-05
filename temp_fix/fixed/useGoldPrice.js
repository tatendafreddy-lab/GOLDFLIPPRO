import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// Proxied through Vite — no auth header needed here, vite.config.js handles it
const API_URL = "/api/gold";
const CACHE_KEY = "goldflip-price-cache";
const CACHE_TTL_MS = 60_000; // 60 seconds

// ─── Mock data generator ────────────────────────────────────────────────────

function generateMockOhlcv(points = 80, seedPrice = 3150) {
  const out = [];
  let close = seedPrice;
  for (let i = points - 1; i >= 0; i -= 1) {
    const time = Date.now() - i * 30 * 60 * 1000;
    const drift = (Math.random() - 0.48) * 6;
    const open = close;
    close = Math.max(3000, Math.min(3400, close + drift));
    const high = Math.max(open, close) + Math.random() * 2.5;
    const low = Math.min(open, close) - Math.random() * 2.5;
    const volume = 120 + Math.random() * 80;
    out.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    });
  }
  return out;
}

// ─── Cache helpers ───────────────────────────────────────────────────────────

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.price) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...payload, timestamp: Date.now() })
    );
  } catch {
    /* storage full — ignore */
  }
}

// ─── Parse Gold-API response ─────────────────────────────────────────────────
// Gold-API returns: { price: 3147.72, ... }
// We handle several possible shapes just in case

function parsePrice(data) {
  if (!data) return NaN;

  // Primary: { price: 3147.72 }
  if (typeof data.price === "number") return data.price;

  // Alternate field names
  const candidates = [data.value, data.XAU, data.XAU_price, data.rate];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }

  // Array format: [[timestamp, price], ...]
  if (Array.isArray(data) && Array.isArray(data[0])) return Number(data[0][1]);
  if (Array.isArray(data) && typeof data[0] === "number") return data[0];

  return NaN;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGoldPrice() {
  const [ohlcv, setOhlcv] = useState([]);
  const [price, setPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [source, setSource] = useState("init");

  useEffect(() => {
    let cancelled = false;

    // Build a new candle and append to existing OHLCV array
    const appendCandle = (prev, latestPrice) => {
      const base =
        prev?.length ? prev.slice(-79) : generateMockOhlcv(79, latestPrice);
      const last = base[base.length - 1] || { close: latestPrice };
      const newCandle = {
        time: Date.now(),
        open: last.close,
        high: Math.max(last.close, latestPrice) + Math.random() * 0.5,
        low: Math.min(last.close, latestPrice) - Math.random() * 0.5,
        close: latestPrice,
        volume: 150 + Math.random() * 50,
      };
      return [...base, newCandle];
    };

    const fetchPrice = async () => {
      // Serve from cache if still fresh
      const cache = readCache();
      const now = Date.now();
      if (cache && now - cache.timestamp < CACHE_TTL_MS) {
        if (!cancelled) {
          setPrice(cache.price);
          setOhlcv(cache.ohlcv || []);
          setIsMock(cache.isMock || false);
          // Show "live" if cache was populated from live data, not "cache"
          setSource(cache.isMock ? "demo" : "live");
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) setIsLoading(true);

        const response = await axios.get(API_URL, {
          timeout: 8000,
          // No auth headers here — proxy injects x-access-token
        });

        console.log("[useGoldPrice] Raw response:", response.status, response.data);

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`);
        }

        const latestPrice = parsePrice(response.data);

        if (!Number.isFinite(latestPrice) || latestPrice <= 0) {
          throw new Error(`Unexpected response shape: ${JSON.stringify(response.data).slice(0, 120)}`);
        }

        if (!cancelled) {
          setPrice(latestPrice);
          setIsMock(false);
          setSource("live");
          setError(null);
          setOhlcv((prev) => {
            const next = appendCandle(prev, latestPrice);
            writeCache({ price: latestPrice, ohlcv: next, isMock: false });
            return next;
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error("[useGoldPrice] Fetch failed:", err.message);

        // Try stale cache before falling back to mock
        if (cache) {
          if (!cancelled) {
            setPrice(cache.price);
            setOhlcv(cache.ohlcv || []);
            setIsMock(cache.isMock || false);
            setSource(cache.isMock ? "demo" : "live");
            setError(null); // stale cache is fine, don't show error
            setIsLoading(false);
          }
          return;
        }

        // No cache — use mock
        if (!cancelled) {
          const seedPrice = price || 3150;
          const mock = generateMockOhlcv(80, seedPrice);
          const mockPrice = mock[mock.length - 1]?.close ?? seedPrice;
          setOhlcv(mock);
          setPrice(mockPrice);
          setIsMock(true);
          setSource("demo");
          setError(err?.message || "Network error");
          writeCache({ price: mockPrice, ohlcv: mock, isMock: true });
          setIsLoading(false);
        }
      }
    };

    // Kick off immediately
    void fetchPrice();

    const interval = setInterval(fetchPrice, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePct = useMemo(() => {
    if (ohlcv.length < 2) return 0;
    const first = ohlcv[0].close;
    const last = ohlcv[ohlcv.length - 1].close;
    return ((last - first) / first) * 100;
  }, [ohlcv]);

  return { price, ohlcv, isLoading, error, isMock, changePct, source };
}
