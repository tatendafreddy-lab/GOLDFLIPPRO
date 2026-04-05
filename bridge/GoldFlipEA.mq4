//+------------------------------------------------------------------+
//| GoldFlip Pro Bridge EA (MQL4)                                    |
//+------------------------------------------------------------------+
#property strict
extern string BridgeURL   = "http://localhost:3001";
extern double DefaultLots = 0.01;

int OnInit() {
   EventSetTimer(5);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

void OnTimer() {
   string url = BridgeURL + "/queue";
   char data[];
   int res = WebRequest("GET", url, "", NULL, 0, data, NULL, NULL);
   if(res != 200) return;
   string body = CharArrayToString(data,0,ArraySize(data));
   // crude parse: look for "BUY" or "SELL" and an "id"
   int iBuy = StringFind(body, "BUY");
   int iSell = StringFind(body, "SELL");
   if(iBuy < 0 && iSell < 0) return;

   string dir = (iBuy >= 0) ? "BUY" : "SELL";
   int idPos = StringFind(body, "\"id\":\"");
   string tradeId = "";
   if(idPos >= 0) {
      int start = idPos + 6;
      int end = StringFind(body, "\"", start);
      if(end > start) tradeId = StringSubstr(body, start, end - start);
   }

   int type = dir=="BUY" ? OP_BUY : OP_SELL;
   double price = (dir=="BUY") ? Ask : Bid;
   int ticket = OrderSend("XAUUSD", type, DefaultLots, price, 3, 0, 0, "GoldFlip Pro", 0, 0, clrGold);
   if(ticket > 0 && tradeId != "") {
      string confirmUrl = BridgeURL + "/confirm/" + tradeId;
      char c[];
      WebRequest("POST", confirmUrl, "", NULL, 0, c, NULL, NULL);
   }
}
