import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  calculatePositionSize,
  calculateRiskReward,
  getDailyDrawdownStatus,
  getTradeJournal,
} from "../utils/riskEngine.js";

const STORAGE_KEY = "goldflip-risk-store";

export const useRiskManagerStore = create(
  persist(
    (set, get) => ({
      accountBalance: 25000,
      riskPercent: 1,
      entryPrice: 2300,
      stopLoss: 2295,
      // Default to env key (or hardcoded fallback) so Live works automatically.
      apiKey:
        import.meta.env.VITE_GOLD_API_KEY ||
        "b675823b982ae86a2b9a843438f64171db76b53c319a4533e9da8fb6039e9bce",
      derivToken: import.meta.env.VITE_DERIV_API_TOKEN || "",
      timezoneOffset: 120, // default UTC+2 (Africa/Harare), minutes offset from GMT
      alertSoundEnabled: true,
      // If a key exists, start in live; otherwise stay demo.
      mode:
        (import.meta.env.VITE_GOLD_API_KEY ||
          "b675823b982ae86a2b9a843438f64171db76b53c319a4533e9da8fb6039e9bce")
          ? "live"
          : "demo", // demo | live
      trades: [],

      setAccountBalance: (value) => set({ accountBalance: Number(value) || 0 }),
      setRiskPercent: (value) => set({ riskPercent: Number(value) || 0 }),
      setEntryPrice: (value) => set({ entryPrice: Number(value) || 0 }),
      setStopLoss: (value) => set({ stopLoss: Number(value) || 0 }),
      setApiKey: (value) => set({ apiKey: value || "" }),
      setDerivToken: (value) => set({ derivToken: value || "" }),
      setTimezoneOffset: (value) => set({ timezoneOffset: Number(value) || 0 }),
      setAlertSoundEnabled: (value) => set({ alertSoundEnabled: Boolean(value) }),
      setMode: (value) =>
        set({ mode: value === "live" ? "live" : "demo" }),

      addTrade: (trade) =>
        set((state) => {
          const stamped = { ...trade, timestamp: trade.timestamp ?? Date.now() };
          return { trades: [...state.trades, stamped] };
        }),

      clearDay: () =>
        set((state) => {
          const today = new Date().toDateString();
          const trades = state.trades.filter(
            (t) => new Date(t.timestamp || t.date).toDateString() !== today
          );
          return { trades };
        }),

      getPosition: () =>
        calculatePositionSize({
          accountBalance: get().accountBalance,
          riskPercent: get().riskPercent,
          entry: get().entryPrice,
          stopLoss: get().stopLoss,
        }),

      getRiskReward: (takeProfit) =>
        calculateRiskReward(get().entryPrice, get().stopLoss, takeProfit),

      getDailyStatus: () => getDailyDrawdownStatus(get().trades, get().accountBalance),

      getJournal: () => getTradeJournal(get().trades),
    }),
    {
      name: STORAGE_KEY,
      version: 5,
      migrate: (persistedState, version) => {
        if (!persistedState?.state) return persistedState;
        const next = { ...persistedState };

        // v2: force live as default
        if (version < 2) {
          next.state = { ...next.state, mode: "live" };
        }

        // v3: set default timezone to UTC+2 if unset/zero
        if (version < 3) {
          const tz = next.state?.timezoneOffset;
          if (tz === undefined || tz === null || tz === 0) {
            next.state = { ...next.state, timezoneOffset: 120 };
          }
        }

        // v4: backfill API key from env if missing
        if (version < 4) {
          const storedKey = next.state?.apiKey;
          const envKey = import.meta.env.VITE_GOLD_API_KEY;
          if ((!storedKey || storedKey.length === 0) && envKey) {
            next.state = { ...next.state, apiKey: envKey };
          }
        }

        // v5: force env key (or fallback) and set mode live when key exists
        if (version < 5) {
          const envKey =
            import.meta.env.VITE_GOLD_API_KEY ||
            "b675823b982ae86a2b9a843438f64171db76b53c319a4533e9da8fb6039e9bce";
          if (envKey) {
            next.state = { ...next.state, apiKey: envKey, mode: "live" };
          }
          const derivKey = import.meta.env.VITE_DERIV_API_TOKEN || "";
          if (derivKey) {
            next.state = { ...next.state, derivToken: derivKey };
          }
        }

        next.version = 5;
        return next;
      },
    }
  )
);

