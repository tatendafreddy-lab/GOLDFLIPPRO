# GoldFlip Pro MT4/MT5 Bridge

## What it does
- Receives trade signals from GoldFlip Pro via HTTP.
- Exposes them to MT4/MT5 via a simple queue.
- The EA polls the queue and executes trades, then confirms back.

## Prereqs
- Node.js installed.
- MetaTrader 4 (works similarly for MT5 with minor tweaks).

## Setup (Bridge)
1) Open a terminal in this `bridge` folder.
2) Run:
   ```bash
   npm install express cors
   node mt4-bridge.js
   ```
3) Bridge listens on http://localhost:3001.

## Setup (MT4)
1) Copy `GoldFlipEA.mq4` to your MT4 `Experts` folder.
2) In MT4: Tools → Options → Expert Advisors:
   - Enable “Allow WebRequests for listed URL”.
   - Add: `http://localhost:3001`
3) Restart MT4 or refresh Experts.
4) Drag `GoldFlipEA` onto an `XAUUSD` chart.
5) Keep MT4 running; the EA polls every 5s.

## How it works
- Frontend (or your serverless) calls `POST /signal` with: direction, lots, stopLoss, takeProfit, symbol (default XAUUSD), comment.
- EA polls `GET /queue`, executes trades, then calls `POST /confirm/:id`.
- `GET /status` reports running:true and pending queue length.

## Notes
- This bridge is local-only by default (localhost). If you need remote, open the port securely and update BridgeURL in the EA.
- Deriv remains the recommended built-in path; use this when MT4/MT5 is required.***
