import { useEffect, useMemo, useRef, useState } from "react";
import { DerivTrader } from "../utils/derivTrader.js";

export function useDerivTrader() {
  const token =
    import.meta.env.VITE_DERIV_API_TOKEN ||
    (typeof localStorage !== "undefined" && localStorage.getItem("deriv-token")) ||
    "";
  const traderRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [derivBalance, setDerivBalance] = useState(null);
  const [lastTrade, setLastTrade] = useState(null);
  const [error, setError] = useState("");
  const [tradeHistory, setTradeHistory] = useState([]);

  useEffect(() => {
    const trader = new DerivTrader(token);
    trader.setHandlers({
      onBalance: (b) => {
        setDerivBalance(b);
        setIsConnected(true);
        setIsAuthorized(true);
      },
      onTrade: (t) => {
        setLastTrade(t);
        setTradeHistory((prev) => [{ ...t, timestamp: Date.now() }, ...prev].slice(0, 50));
      },
      onError: (msg) => setError(msg),
    });
    traderRef.current = trader;
    trader.connect();
    return () => trader.disconnect();
  }, [token]);

  const placeTrade = (params) => traderRef.current?.placeTrade(params);
  const connect = () => traderRef.current?.connect();
  const disconnect = () => traderRef.current?.disconnect();

  const state = useMemo(
    () => ({
      isConnected,
      isAuthorized,
      derivBalance,
      lastTrade,
      tradeHistory,
      error,
    }),
    [isConnected, isAuthorized, derivBalance, lastTrade, tradeHistory, error]
  );

  return { ...state, placeTrade, connect, disconnect };
}
