import { useEffect, useMemo, useState } from "react";
import {
  getJournal,
  getJournalStats,
  updateTrade,
} from "../utils/tradeJournal.js";
import { getCLVStats, getSizingMultiplier } from "../utils/clvTracker.js";

function OutcomeTag({ outcome }) {
  if (outcome === "win") return <span className="text-emerald-400 font-semibold">WIN</span>;
  if (outcome === "loss") return <span className="text-rose-400 font-semibold">LOSS</span>;
  if (outcome === "skipped") return <span className="text-slate-400 font-semibold">SKIPPED</span>;
  return <span className="text-slate-400">PENDING</span>;
}

export default function JournalPanel() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState({});

  const stats = useMemo(() => getJournalStats(), [rows]);
  const clvStats = useMemo(() => getCLVStats(rows), [rows]);
  const clvMult = getSizingMultiplier(clvStats);

  useEffect(() => {
    setRows(getJournal());
  }, []);

  const saveOutcome = (id) => {
    const edit = editing[id];
    if (!edit) return;
    const { outcome, exitPrice, notes } = edit;
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    let pnlR = 0;
    const rrDenom = row.entry - row.stopLoss;
    if (outcome === "win") {
      if (rrDenom !== 0 && row.direction === "BUY") {
        pnlR = (exitPrice - row.entry) / rrDenom;
      } else if (rrDenom !== 0 && row.direction === "SELL") {
      pnlR =
        row.entry - exitPrice !== 0 && (row.entry - row.takeProfit !== 0)
          ? (row.entry - exitPrice) / (row.entry - row.takeProfit || rrDenom)
          : -1;
      } else {
        pnlR = Number(row.riskReward || 0);
      }
    } else if (outcome === "loss") {
      pnlR = -1;
    } else {
      pnlR = 0;
    }

    updateTrade(id, {
      outcome,
      exitPrice: exitPrice || null,
      exitTime: Date.now(),
      notes: notes || "",
      pnlR,
    });
    setEditing((e) => {
      const copy = { ...e };
      delete copy[id];
      return copy;
    });
    setRows(getJournal());
  };

  const streakLabel =
    stats.streak > 0
      ? `${stats.streak}W`
      : stats.streak < 0
      ? `${Math.abs(stats.streak)}L`
      : "0";

  const edgeColors = {
    confirmed: "text-emerald-300 border-emerald-300/40",
    warning: "text-amber-300 border-amber-300/40",
    review: "text-rose-300 border-rose-300/40",
  };

  return (
    <div className="space-y-4">
      {/* Edge card */}
      <div
        className={`rounded-xl border p-4 bg-slate-900/70 ${
          edgeColors[stats.edgeStatus] || "border-slate-700"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Edge Status</p>
            <h3 className="text-xl font-semibold">
              {stats.edgeStatus === "confirmed"
                ? "EDGE CONFIRMED"
                : stats.edgeStatus === "warning"
                ? "EDGE WARNING"
                : "STRATEGY REVIEW NEEDED"}
            </h3>
            {stats.taken < 30 && (
              <p className="text-xs text-slate-400">Need 30+ trades for statistical significance</p>
            )}
          </div>
          <div className="text-sm text-slate-200">
            <p>Live Win Rate: {(stats.liveWinRate * 100).toFixed(1)}%</p>
            <p>Backtest Win Rate: {(stats.backtestWinRate * 100).toFixed(1)}%</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-slate-400">Edge drift</p>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full ${
                  stats.edgeDrift >= 0 ? "bg-emerald-400/80" : "bg-rose-400/80"
                }`}
                style={{
                  width: `${Math.min(Math.abs(stats.edgeDrift) * 1000, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Closing Line Value</p>
            <h3 className="text-lg font-semibold text-slate-100">
              Avg CLV: {clvStats.averageCLV.toFixed(2)} · Trend: {clvStats.clvTrend}
            </h3>
            <p className="text-xs text-slate-400">Last20: {clvStats.last20CLV.toFixed(2)} · Last50: {clvStats.last50CLV.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sizing Multiplier</p>
            <p className={`text-xl font-semibold ${clvMult <= 0.5 ? "text-rose-300" : "text-emerald-300"}`}>x {clvMult.toFixed(2)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">{clvStats.interpretation}</p>
        {clvMult <= 0.25 && (
          <p className="mt-2 rounded-lg border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-xs text-rose-100">
            EDGE DEGRADING — consider pausing automation until CLV recovers.
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <StatCard label="Current streak" value={streakLabel} color={stats.streak > 0 ? "text-emerald-300" : stats.streak < 0 ? "text-rose-300" : "text-slate-200"} />
        <StatCard label="Total R" value={stats.totalPnLR.toFixed(2)} />
        <StatCard label="Avg R on winners" value={stats.avgLiveRR.toFixed(2)} />
        <StatCard label="Best / Worst streak" value={`${stats.bestStreak} / ${stats.worstStreak}`} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
            <tr>
              {["Date", "Direction", "Entry", "SL", "TP", "R:R", "Outcome", "P&L (R)", "Action"].map((h) => (
                <th key={h} className="px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => {
              const isPending = r.status === "pending";
              const borderColor =
                r.outcome === "win"
                  ? "border-l-4 border-emerald-500/60"
                  : r.outcome === "loss"
                  ? "border-l-4 border-rose-500/60"
                  : r.outcome === "skipped"
                  ? "border-l-4 border-slate-700"
                  : "";
              return (
                <tr key={r.id} className={`hover:bg-slate-900/40 ${borderColor}`}>
                  <td className="px-3 py-2 text-slate-200">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 text-slate-200">{r.direction}</td>
                  <td className="px-3 py-2 text-slate-200">${r.entry}</td>
                  <td className="px-3 py-2 text-slate-200">${r.stopLoss}</td>
                  <td className="px-3 py-2 text-slate-200">${r.takeProfit}</td>
                  <td className="px-3 py-2 text-slate-200">{r.riskReward}</td>
                  <td className="px-3 py-2"><OutcomeTag outcome={r.outcome} /></td>
                  <td className="px-3 py-2 text-slate-200">{r.pnlR != null ? Number(r.pnlR).toFixed(2) : "--"}</td>
                  <td className="px-3 py-2">
                    {isPending ? (
                      <InlineForm
                        row={r}
                        onChange={(val) => setEditing((prev) => ({ ...prev, [r.id]: val }))}
                        onSave={() => saveOutcome(r.id)}
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">Logged</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-slate-200" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function InlineForm({ row, onChange, onSave }) {
  const [outcome, setOutcome] = useState("win");
  const [exitPrice, setExitPrice] = useState(row.takeProfit || row.entry);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    onChange({ outcome, exitPrice: Number(exitPrice), notes });
  }, [outcome, exitPrice, notes, onChange]);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-1">
        {["win", "loss", "skipped"].map((opt) => (
          <button
            key={opt}
            onClick={() => setOutcome(opt)}
            className={`rounded-md px-2 py-1 border ${
              outcome === opt ? "border-amber-300 text-amber-200" : "border-slate-700 text-slate-300"
            }`}
          >
            {opt.toUpperCase()}
          </button>
        ))}
      </div>
      <input
        type="number"
        value={exitPrice}
        onChange={(e) => setExitPrice(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
        placeholder="Exit price"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
        rows={2}
        placeholder="Notes (optional)"
      />
      <button
        onClick={onSave}
        className="w-full rounded bg-amber-300 px-3 py-1 font-semibold text-slate-900 hover:bg-amber-200"
      >
        Save
      </button>
    </div>
  );
}
