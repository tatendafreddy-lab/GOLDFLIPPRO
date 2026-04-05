import WebSocket from "ws";

export function createReconnectingWebSocket(url, handlers = {}) {
  let ws = null;
  let shouldReconnect = true;
  let attempt = 0;

  const connect = () => {
    const backoff = Math.min(30000, Math.pow(2, attempt) * 1000); // 1s,2s,4s... up to 30s
    ws = new WebSocket(url);

    ws.on("open", (...args) => {
      attempt = 0;
      handlers.onOpen?.(...args);
    });

    ws.on("message", (...args) => {
      handlers.onMessage?.(...args);
    });

    ws.on("error", (err) => {
      handlers.onError?.(err);
    });

    ws.on("close", () => {
      if (!shouldReconnect) return;
      attempt += 1;
      setTimeout(connect, backoff);
    });
  };

  connect();

  return {
    send: (...args) => ws?.send?.(...args),
    close: () => {
      shouldReconnect = false;
      ws?.close();
    },
    raw: () => ws
  };
}

export default createReconnectingWebSocket;
