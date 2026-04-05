const WS_URL = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

export class DerivTrader {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.isAuthorized = false;
    this.isConnected = false;
    this.balanceCb = null;
    this.tradeCb = null;
    this.errorCb = null;
    this.reconnectTimer = null;
  }

  setHandlers({ onBalance, onTrade, onError }) {
    this.balanceCb = onBalance;
    this.tradeCb = onTrade;
    this.errorCb = onError;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.ws = new WebSocket(WS_URL);
    this.ws.addEventListener("open", () => {
      this.isConnected = true;
      if (this.token) this.send({ authorize: this.token });
    });
    this.ws.addEventListener("message", (evt) => {
      const data = JSON.parse(evt.data);
      this.handleMessage(data);
    });
    this.ws.addEventListener("close", () => {
      this.isConnected = false;
      this.isAuthorized = false;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });
    this.ws.addEventListener("error", (err) => {
      if (this.errorCb) this.errorCb(err.message || "WebSocket error");
    });
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
    this.isConnected = false;
    this.isAuthorized = false;
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  handleMessage(msg) {
    if (msg.error) {
      if (this.errorCb) this.errorCb(msg.error.message);
      return;
    }
    if (msg.authorize) {
      this.isAuthorized = true;
      this.getBalance();
      return;
    }
    if (msg.balance && this.balanceCb) {
      this.balanceCb(msg.balance);
      return;
    }
    if (msg.buy && this.tradeCb) {
      this.tradeCb(msg.buy);
    }
  }

  getBalance() {
    this.send({ balance: 1, subscribe: 1 });
  }

  placeTrade({ direction = "BUY", stake = 1, stopLoss, takeProfit }) {
    if (!this.isAuthorized) {
      if (this.errorCb) this.errorCb("Not authorized");
      return;
    }
    const contractType = direction.toUpperCase() === "BUY" ? "CALL" : "PUT";
    this.send({
      buy: 1,
      price: stake,
      parameters: {
        contract_type: contractType,
        symbol: "frxXAUUSD",
        duration: 1,
        duration_unit: "hour",
        basis: "stake",
        amount: stake,
        limit_order: {
          stop_loss: stopLoss,
          take_profit: takeProfit,
        },
      },
    });
  }
}
