# GoldFlip Pro

Single-page gold trading desk built with Vite + React + Tailwind. Ships with a demo/live toggle, onboarding guide, alerts, backtester, and risk management helpers.

## Features
- Demo / Live data switch with an onboarding overlay to pick your starting mode.
- Live XAU/USD price (via Gold-API proxy) with cached fallback and auto demo if offline.
- Signal stack: RSI, MACD, London breakout timing, agreement meter, and alert feed (sound + desktop notifications).
- Risk toolkit: position sizing, daily drawdown guardrails, trade journal, and configurable risk % / account balance.
- Backtester with Monte Carlo stress, CSV export hooks, and strategy comparison (lazy-loaded to keep the live tab fast).
- Responsive marketing landing page with mobile nav and clear pricing CTA.

## Quick start
```bash
npm install
npm run dev -- --host --port 5314   # or run-dev.bat
# build & preview
npm run build
npm run preview -- --host --port 5315
```

## Live data (optional)
Gold-API is proxied in `vite.config.js`. Add your key to a `.env` file:
```
VITE_GOLD_API_KEY=your_key_here
```
Then start the dev server. In the app, switch the top-right toggle to **Live**. If the feed fails, the app falls back to demo candles automatically.

## Deploy to Vercel (free)
1) Create a new Vercel project and import this repo.
2) In Vercel dashboard ? Settings ? Environment Variables, add `VITE_GOLD_API_KEY`.
3) Build command: `npm run build` ? Output directory: `dist`.
4) Keep default SPA routing (no extra rewrites needed).
5) Deploy. Vercel will serve the static `dist` with the SPA router.

## App navigation
- `/` ? Marketing/landing page (mobile nav supported). CTA goes to the app.
- `/app` ? Trading desk. Top-right controls:
  - **Demo/Live toggle** to switch data source.
  - **Guide** to reopen onboarding.
  - **Settings** for account balance, risk %, timezone offset (minutes from GMT), alerts, and optional API key storage.

## Performance notes
- Price data is cached for 60s; demo mode skips network entirely.
- Backtester loads via React `lazy`/`Suspense` only when its tab is active.

## Tech stack
- React 18, Vite, TailwindCSS
- Zustand for risk/store state
- Axios for the gold price fetcher

## Conventions
- Persisted local keys:
  - `goldflip-price-cache-v2` ? price/ohlcv cache
  - `goldflip-risk-store` ? risk, mode, and settings
  - `goldflip-onboarded-v2` ? onboarding completion flag
  - `goldflip-alerts` ? alert feed history
- Ports: dev `5314`, preview `5315` (strict).

## Screenshots (placeholders)
- Landing hero, features, pricing ? _add screenshot here_.
- App dashboard (Live mode) ? _add screenshot here_.
- Backtester tab ? _add screenshot here_.
