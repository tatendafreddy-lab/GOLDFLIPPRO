import { useMemo } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { getAsianRange } from "../utils/londonBreakout.js";

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs shadow-lg shadow-black/30">
      <p className="font-semibold text-amber-300">${p.close.toFixed(2)}</p>
      <p className="text-slate-400">O {p.open.toFixed(2)} H {p.high.toFixed(2)} L {p.low.toFixed(2)} C {p.close.toFixed(2)}</p>
      <p className="text-slate-500">{format(new Date(p.time), "MMM d, HH:mm")}</p>
    </div>
  );
}

function PriceChart({ market, signals, isPro }) {
  const data = useMemo(
    () => market.ohlcv.slice(isPro ? -50 : -20),
    [market.ohlcv, isPro]
  );
  const asian = useMemo(() => getAsianRange(market.ohlcv), [market.ohlcv]);
  const lb = signals?.londonBreakout ?? {};

  const showSkeleton = market.isLoading || !data.length;

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price action</p>
          <h3 className="text-xl font-semibold text-slate-50">Last 50 candles</h3>
        </div>
        <span className="text-xs text-slate-400">Session times GMT</span>
      </div>
      <div className="h-80 w-full">
        {showSkeleton ? (
          <div className="h-full animate-pulse space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="h-6 w-32 rounded bg-slate-800" />
            <div className="grid h-full grid-cols-12 gap-2 items-end">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded bg-slate-800"
                  style={{ height: `${40 + (i % 5) * 10}%` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" />
              <XAxis
                dataKey="time"
                tickFormatter={(value) => format(new Date(value), "HH:mm")}
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis stroke="#6b7280" tickLine={false} axisLine={false} width={64} domain={["dataMin", "dataMax"]} />
              <Tooltip content={<PriceTooltip />} />

              {asian.high && (
                <ReferenceLine y={asian.high} stroke="#C9A84C" strokeDasharray="4 4" />
              )}
              {asian.low && (
                <ReferenceLine y={asian.low} stroke="#C9A84C" strokeDasharray="4 4" />
              )}
              {lb.entry && <ReferenceLine y={lb.entry} stroke="#22c55e" strokeDasharray="2 2" />}
              {lb.stopLoss && <ReferenceLine y={lb.stopLoss} stroke="#ef4444" strokeDasharray="2 2" />}
              {lb.takeProfit && <ReferenceLine y={lb.takeProfit} stroke="#fbbf24" strokeDasharray="2 2" />}

              <Line type="monotone" dataKey="close" stroke="#E1C776" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default PriceChart;
