import { useRef, useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import { useGoldPrice } from "./hooks/useGoldPrice.js";
import { useSignals } from "./hooks/useSignals.js";
import { useRiskManagerStore } from "./hooks/useRiskManager.js";
import { sendTelegramAlert } from "./utils/telegramAlert.js";

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
      {["demo", "live"].map((value) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`min-h-[44px] rounded-full px-3 py-1 transition-colors ${
            mode === value
              ? "bg-amber-300 text-slate-900"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          {value === "demo" ? "Demo" : "Live"}
        </button>
      ))}
    </div>
  );
}

function SettingsPanel({ open, onClose, riskManager }) {
  const {
    apiKey,
    derivToken,
    accountBalance,
    riskPercent,
    timezoneOffset,
    alertSoundEnabled,
    setApiKey,
    setDerivToken,
    setAccountBalance,
    setRiskPercent,
    setTimezoneOffset,
    setAlertSoundEnabled,
  } = riskManager;
  const [testStatus, setTestStatus] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60">
      <div className="h-full w-full max-w-md bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">x</button>
        </div>
        <div className="space-y-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Metals API key</span>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                try {
                  localStorage.setItem("goldflip-api-key", e.target.value);
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="Optional - improves live price quality"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Deriv API token</span>
            <input
              type="text"
              value={derivToken || ""}
              onChange={(e) => {
                setDerivToken(e.target.value);
                try {
                  localStorage.setItem("deriv-token", e.target.value);
                } catch {}
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="Deriv token for auto-trader"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Account balance ($)</span>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value || 0))}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Risk %</span>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value || 0))}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Timezone offset (minutes from GMT)</span>
            <input
              type="number"
              value={timezoneOffset}
              onChange={(e) => setTimezoneOffset(Number(e.target.value || 0))}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              placeholder="e.g. 120 for GMT+2"
            />
          </label>

          <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Alert sound on signals</span>
            <input
              type="checkbox"
              checked={alertSoundEnabled}
              onChange={(e) => setAlertSoundEnabled(e.target.checked)}
              className="h-4 w-4 accent-amber-300"
            />
          </label>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-400">Telegram test alert</span>
              <button
                onClick={async () => {
                  setTestStatus("Sending...");
                  try {
                    await sendTelegramAlert({
                      direction: "BUY",
                      entry: 3150,
                      stopLoss: 3140,
                      takeProfit: 3170,
                      riskReward: "2.0",
                      confidence: 80,
                    });
                    setTestStatus("Sent!");
                    setTimeout(() => setTestStatus(""), 2000);
                  } catch (e) {
                    setTestStatus("Failed");
                  }
                }}
                className="rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
              >
                Send Test Alert
              </button>
            </div>
            {testStatus && <p className="text-xs text-slate-300">{testStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const timezones = [
  { label: "UTC−5 (New York)", value: -300 },
  { label: "UTC±0 (London)", value: 0 },
  { label: "UTC+2 (Africa/Harare)", value: 120 },
  { label: "UTC+3 (Nairobi)", value: 180 },
  { label: "UTC+8 (Singapore)", value: 480 },
];

function OnboardingOverlay({ open, onClose, riskManager }) {
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState(riskManager.accountBalance || 25000);
  const [riskPct, setRiskPct] = useState(riskManager.riskPercent || 1);
  const [apiKey, setApiKey] = useState(riskManager.apiKey || "");
  const [timezone, setTimezone] = useState(
    riskManager.timezoneOffset ?? 120
  );

  if (!open) return null;

  const saveStep = (s) => {
    if (s === 0) {
      riskManager.setAccountBalance(Number(balance) || 0);
    } else if (s === 1) {
      riskManager.setRiskPercent(Number(riskPct) || 0);
    } else if (s === 2) {
      riskManager.setApiKey(apiKey.trim());
      if (apiKey.trim()) {
        riskManager.setMode("live");
      } else {
        riskManager.setMode("demo");
      }
    } else if (s === 3) {
      riskManager.setTimezoneOffset(Number(timezone) || 0);
    }
  };

  const next = () => {
    saveStep(step);
    if (step < 3) setStep(step + 1);
    else finish();
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    saveStep(step);
    try {
      localStorage.setItem("goldflip-onboarded-v2", "yes");
    } catch {
      /* ignore */
    }
    onClose();
  };

  const StepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <p className="text-sm text-slate-300 mb-3">Enter your starting account balance</p>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
              min={0}
            />
          </>
        );
      case 1:
        return (
          <>
            <p className="text-sm text-slate-300 mb-3">Set your max risk per trade (we recommend 1%)</p>
            <input
              type="number"
              step="0.1"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
              min={0}
            />
          </>
        );
      case 2:
        return (
          <>
            <p className="text-sm text-slate-300 mb-3">Enter your Gold-API key (or skip to use demo mode)</p>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
              placeholder="sk_live_..."
            />
            <button
              onClick={() => {
                setApiKey("");
                riskManager.setMode("demo");
                finish();
              }}
              className="mt-3 w-full rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-amber-300"
            >
              Skip & stay in demo
            </button>
          </>
        );
      case 3:
      default:
        return (
          <>
            <p className="text-sm text-slate-300 mb-3">Choose your timezone (used for kill-zone timing)</p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-amber-300/40 bg-slate-900/95 p-6 shadow-2xl shadow-amber-300/20">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Onboarding</p>
            <h2 className="text-2xl font-bold text-amber-100">Step {step + 1} of 4</h2>
          </div>
          <button
            onClick={finish}
            className="min-h-[44px] rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-wide text-slate-300 hover:border-amber-300 hover:text-amber-200"
          >
            Skip
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <StepContent />
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={step === 0}
              className="min-h-[44px] rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 disabled:opacity-40 hover:border-amber-300"
            >
              Back
            </button>
            <button
              onClick={next}
              className="min-h-[44px] rounded-full bg-amber-300 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
            >
              {step === 3 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const riskManager = useRiskManagerStore();
  const autoTradeRef = useRef({
    enabled: false,
    minEdgeScore: 70,
    maxTradesPerDay: 3,
    dailyTradeCount: 0,
    safetyCanTrade: false,
    onAutoTrade: null,
  });
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      return !localStorage.getItem("goldflip-onboarded-v2");
    } catch {
      return true;
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Prefer env key (or hardcoded fallback) so Live works automatically.
  const goldApiKey =
    riskManager.apiKey ||
    import.meta.env.VITE_GOLD_API_KEY ||
    "b675823b982ae86a2b9a843438f64171db76b53c319a4533e9da8fb6039e9bce";

  // If we have a key, force live; otherwise keep stored mode.
  const effectiveMode = goldApiKey ? "live" : riskManager.mode;

  const market = useGoldPrice(goldApiKey, effectiveMode);
  const signals = useSignals(market.ohlcv, autoTradeRef.current);

  const closeOnboarding = () => {
    try {
      localStorage.setItem("goldflip-onboarded-v2", "yes");
    } catch {
      /* ignore */
    }
    setOnboardingOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed right-4 top-4 z-40 flex flex-wrap items-center justify-end gap-2">
        <ModeToggle mode={riskManager.mode} onChange={riskManager.setMode} />
        <button
          onClick={() => setOnboardingOpen(true)}
          className="min-h-[44px] rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-amber-300 hover:text-amber-200"
        >
          Guide
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="min-h-[44px] rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-amber-300 hover:text-amber-200"
          aria-label="Settings"
        >
          Settings
        </button>
      </div>
      <Dashboard
        market={market}
        signals={signals}
        riskManager={riskManager}
        autoTradeRef={autoTradeRef}
      />
      {/* Auto-trade bridge config is set inside Dashboard/AutoTrader via ref */}
      <OnboardingOverlay
        open={onboardingOpen}
        onClose={closeOnboarding}
        riskManager={riskManager}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} riskManager={riskManager} />
    </div>
  );
}

export default App;
