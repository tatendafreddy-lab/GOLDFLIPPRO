import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import { runBacktest, generateMockOHLCV, getBacktestSummary, runMonteCarlo } from "../utils/backtester.js";

const cardBase = "rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-black/30";

const ranges = {
  "30": 30,
  "90": 90,
  "180": 180,
};

function ResultCard({ title, value, highlight }) {
  const color =
    highlight === "good" ? "text-emerald-300" : highlight === "bad" ? "text-rose-300" : "text-slate-100";
  return (
    <div className={cardBase}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Backtester({ market }) {
  const [range, setRange] = useState("90");
  const [balance, setBalance] = useState(10000);
  const [risk, setRisk] = useState(1);
  const [result, setResult] = useState(null);
  const [mc, setMc] = useState(null);
  const [view, setView] = useState("single");
  const [comparison, setComparison] = useState([]);

  const ohlcv = useMemo(() => {
    if (market?.ohlcv?.length >= ranges[range] * 24) return market.ohlcv;
    return generateMockOHLCV(ranges[range]);
  }, [market.ohlcv, range]);

  const run = () => {
    const backtest = runBacktest({ ohlcvData: ohlcv, riskPercent: risk, accountBalance: balance });
    setResult(backtest);
    setMc(null);
    setComparison([]);
  };

  const runMC = () => {
    if (!result?.trades?.length) return;
    const mcResult = runMonteCarlo({ trades: result.trades, runs: 500, startBalance: balance, riskPercent: risk });
    setMc(mcResult);
  };

  const runComparison = () => {
    const strategies = [
      { id: "london_breakout", label: "London Breakout" },
      { id: "asian_fade", label: "Asian Fade" },
      { id: "ema_trend", label: "EMA Trend" },
      { id: "news_scalp", label: "News Scalp" },
    ];
    const comps = strategies.map((s) => {
      const res = runBacktest({ ohlcvData: ohlcv, riskPercent: risk, accountBalance: balance, strategy: s.id });
      return { ...res, label: s.label, profitFactor: res.profitFactor || 0 };
    });
    comps.sort((a, b) => b.profitFactor - a.profitFactor);
    setComparison(comps);
  };

  const equityData = useMemo(() => result?.equityCurve || [], [result]);

  const csv = useMemo(() => {
    if (!result?.trades?.length) return "";
    const header = ["Date", "Direction", "Entry", "Exit", "PnL", "Result"].join(",");
    const rows = result.trades.map((t) =>
      [t.date, t.side, t.entry, t.exit, t.pnl.toFixed(2), t.result].join(",")
    );
    return [header, ...rows].join("\n");
  }, [result]);

  const exportCsv = () => {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "goldflip-backtest.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(ranges).map((key) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              range === key ? "bg-amber-300 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
          >
            Last {ranges[key]}d
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {["single", "comparison"].map((m) => (
          <button
            key={m}
            onClick={() => setView(m)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              view === m ? "bg-amber-300 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
          >
            {m === "single" ? "Single Backtest" : "Strategy Comparison"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className={cardBase + " text-sm"}>
          <span className="text-xs uppercase tracking-wide text-slate-400">Starting balance ($)</span>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value || 0))}
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
        <label className={cardBase + " text-sm"}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">Risk %</span>
            <span className="text-xs text-slate-300">{risk.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={risk}
            onChange={(e) => setRisk(Number(e.target.value))}
            className="mt-2 w-full accent-amber-300"
          />
        </label>
        <div className={cardBase + " flex items-center justify-between"}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Engine</p>
            <p className="text-sm text-slate-200">
              {view === "single" ? "London Breakout backtest" : "All strategies comparison"}
            </p>
          </div>
          {view === "single" ? (
            <button
              onClick={run}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
            >
              Run Backtest
            </button>
          ) : (
            <button
              onClick={runComparison}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
            >
              Compare Strategies
            </button>
          )}
        </div>
      </div>

      {view === "single" && result && (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            <ResultCard
              title="Win rate"
              value={`${result.winRate.toFixed(1)}%`}
              highlight={result.winRate > 55 ? "good" : result.winRate < 45 ? "bad" : undefined}
            />
            <ResultCard title="Avg R:R" value={result.avgRiskReward.toFixed(2)} />
            <ResultCard
              title="Total return"
              value={`${result.totalReturn.toFixed(2)}%`}
              highlight={result.totalReturn >= 0 ? "good" : "bad"}
            />
            <ResultCard title="Max drawdown" value={`${result.maxDrawdown.toFixed(2)}%`} highlight={result.maxDrawdown > 10 ? "bad" : undefined} />
            <ResultCard title="Profit factor" value={result.profitFactor.toFixed(2)} />
          </div>

          <div className={cardBase}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Equity curve</p>
                <p className="text-sm text-slate-200">{getBacktestSummary(result)}</p>
              </div>
              <button
                onClick={exportCsv}
                className="rounded-lg border border-amber-300/60 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase text-amber-200 hover:bg-amber-300/15"
              >
                Export CSV
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={equityData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" />
                  <XAxis dataKey="trade" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-slate-100">
                          Trade #{p.trade}: ${p.balance.toFixed(2)}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={balance} stroke="#6b7280" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#C9A84C"
                    fill="#C9A84C"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cardBase}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Monte Carlo (500 runs)</p>
                <p className="text-sm text-slate-200">Randomized trade order stress test</p>
              </div>
              <button
                onClick={runMC}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/40 hover:bg-slate-700"
              >
                Run Monte Carlo
              </button>
            </div>

            {mc ? (
              <>
                <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-200 mb-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                    Best: {mc.bestReturn.toFixed(2)}%
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                    Median: {mc.medianReturn.toFixed(2)}%
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                    Worst: {mc.worstReturn.toFixed(2)}%
                  </div>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <LineChart data={mc.median} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" />
                      <XAxis dataKey="trade" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-slate-100">
                              Trade #{p.trade}: ${p.balance.toFixed(2)}
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine y={balance} stroke="#6b7280" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="balance" data={mc.best} stroke="#22c55e" dot={false} name="Best" />
                      <Line type="monotone" dataKey="balance" data={mc.median} stroke="#C9A84C" dot={false} name="Median" />
                      <Line type="monotone" dataKey="balance" data={mc.worst} stroke="#ef4444" dot={false} name="Worst" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Run a backtest first, then Monte Carlo to see distribution.</p>
            )}
          </div>

          <div className={cardBase}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Trades</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2 text-left">Dir</th>
                    <th className="px-2 py-2 text-right">Entry</th>
                    <th className="px-2 py-2 text-right">Exit</th>
                    <th className="px-2 py-2 text-right">P&L</th>
                    <th className="px-2 py-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {result.trades.map((t, idx) => (
                    <tr
                      key={idx}
                      className={t.result === "WIN" ? "bg-emerald-400/5" : "bg-rose-400/5"}
                    >
                      <td className="px-2 py-2">{t.date}</td>
                      <td className="px-2 py-2">{t.side}</td>
                      <td className="px-2 py-2 text-right">{t.entry.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right">{t.exit.toFixed(2)}</td>
                      <td className={`px-2 py-2 text-right ${t.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {t.pnl >= 0 ? "+" : ""}
                        {t.pnl.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right">{t.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === "comparison" && comparison.length > 0 && (
        <div className={cardBase}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Strategy comparison</p>
              <p className="text-sm text-slate-200">Ranked by profit factor</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2 text-left">Strategy</th>
                  <th className="px-2 py-2 text-right">Win %</th>
                  <th className="px-2 py-2 text-right">Avg R:R</th>
                  <th className="px-2 py-2 text-right">Return %</th>
                  <th className="px-2 py-2 text-right">Max DD %</th>
                  <th className="px-2 py-2 text-right">Profit Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {comparison.map((c, idx) => (
                  <tr key={c.strategy} className={idx === 0 ? "bg-amber-300/15 text-amber-100" : ""}>
                    <td className="px-2 py-2">{c.label}</td>
                    <td className="px-2 py-2 text-right">{c.winRate.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{c.avgRiskReward.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{c.totalReturn.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{c.maxDrawdown.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{c.profitFactor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Backtester;



