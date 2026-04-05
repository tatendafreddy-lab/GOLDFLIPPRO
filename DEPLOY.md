# Deploying GoldFlip Pro Bot (24/7)

This covers Railway.app (one-click) and a generic VPS with PM2.

## Environment variables (both targets)
- `GOLD_API_KEY`
- `DERIV_API_TOKEN`
- `AUTO_TRADE_ENABLED` (true/false)
- `MAX_STAKE_USD`, `MAX_TRADES_PER_DAY`, `MIN_EDGE_SCORE`, `RISK_PERCENT`, `ACCOUNT_BALANCE`
- Optional alerts: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## Railway.app
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. From repo root: `railway init` (pick/create project)
4. Deploy: `railway up` (uses `railway.json` -> `node server/bot.js`)
5. In Railway dashboard → Variables: add the env vars above.
6. Restart deploy. Your bot runs 24/7; URL shows HTTP endpoints (`/api/status`, `/api/price`, etc.).

## VPS + PM2
1. Update packages: `sudo apt update`
2. Install Node.js (LTS) and git: `sudo apt install -y nodejs npm git`
3. Clone repo: `git clone <your-repo-url> && cd GoldFlipPro`
4. Install server deps: `cd server && npm install`
5. Copy env template and set values: `cp .env.example .env` then edit.
6. Install PM2 globally: `sudo npm i -g pm2`
7. Start bot: `cd ..` (repo root) then `pm2 start ecosystem.config.js`
8. Persist PM2: `pm2 save && pm2 startup` (run the suggested command)
9. Check logs: `pm2 logs goldflip-bot` (combined at `server/logs/combined.log`)

## Frontend note
Set `VITE_BOT_URL` (e.g., `https://your-railway-url` or `http://your-vps:3000`) and rebuild the React app so it reads data from the bot server instead of Vercel functions.
