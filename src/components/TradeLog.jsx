import { useMemo, useState } from "react";
import { format } from "date-fns";

const cardBase = "rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-black/30";

function TradeLog({ riskManager }) {
  const { trades, addTrade, getJournal } = riskManager;
  const journal = useMemo(() => getJournal(), [trades, getJournal]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    direction: "Long",
    entry: "",
    exit: "",
    pnl: "",
    rr: "",
  });

  const submit = () => {
    const pnl = Number(form.pnl);
    const rr = Number(form.rr);
    addTrade({
      direction: form.direction,
      entry: Number(form.entry),
      exit: Number(form.exit),
      pnl,
      rr: Number.isFinite(rr) ? rr : null,
    });
    setShowModal(false);
    setForm({ direction: "Long", entry: "", exit: "", pnl: "", rr: "" });
  };

  return (
    <div className={cardBase}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trade log</p>
          <h3 className="text-xl font-semibold text-slate-50">Journal</h3>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg border border-amber-300/60 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase text-amber-200 hover:bg-amber-300/15"
        >
          Log Trade
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 text-sm text-slate-200 mb-3">
        <div>Win rate: {journal.winRate.toFixed(1)}%</div>
        <div>Avg R:R: {journal.avgRR.toFixed(2)}</div>
        <div>Total PnL: ${journal.totalPnL.toFixed(2)}</div>
        <div>Trades: {journal.totalTrades}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Dir</th>
              <th className="px-2 py-2 text-right">Entry</th>
              <th className="px-2 py-2 text-right">Exit</th>
              <th className="px-2 py-2 text-right">P&L</th>
              <th className="px-2 py-2 text-right">R:R</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {trades.map((t, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40">
                <td className="px-2 py-2">{format(new Date(t.timestamp || Date.now()), "MMM d, HH:mm")}</td>
                <td className="px-2 py-2">{t.direction}</td>
                <td className="px-2 py-2 text-right">{t.entry?.toFixed?.(2) ?? "--"}</td>
                <td className="px-2 py-2 text-right">{t.exit?.toFixed?.(2) ?? "--"}</td>
                <td className={`px-2 py-2 text-right ${t.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {t.pnl >= 0 ? "+" : ""}
                  {Number(t.pnl ?? 0).toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right">{t.rr ? t.rr.toFixed(2) : "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-slate-100">Log trade</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">×</button>
            </div>
            <div className="grid gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Direction</span>
                <select
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                  value={form.direction}
                  onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
                >
                  <option>Long</option>
                  <option>Short</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Entry</span>
                <input
                  type="number"
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                  value={form.entry}
                  onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Exit</span>
                <input
                  type="number"
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                  value={form.exit}
                  onChange={(e) => setForm((f) => ({ ...f, exit: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">P&L</span>
                <input
                  type="number"
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                  value={form.pnl}
                  onChange={(e) => setForm((f) => ({ ...f, pnl: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">R:R</span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                  value={form.rr}
                  onChange={(e) => setForm((f) => ({ ...f, rr: e.target.value }))}
                />
              </label>
              <button
                onClick={submit}
                className="mt-2 rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
              >
                Save trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradeLog;
