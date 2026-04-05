import { formatDistanceToNow } from "date-fns";

const severityStyles = {
  signal: "border-amber-400/80",
  warning: "border-rose-500/80",
  info: "border-sky-400/80",
};

const severityDot = {
  signal: "text-amber-300",
  warning: "text-rose-300",
  info: "text-sky-300",
};

function AlertCard({ alert }) {
  const borderClass = severityStyles[alert.severity] ?? "border-slate-600";
  const dotClass = severityDot[alert.severity] ?? "text-slate-300";

  return (
    <div
      className={`rounded-lg border-l-4 ${borderClass} bg-slate-900/80 px-4 py-3 shadow-lg shadow-black/30`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-50">{alert.message}</p>
          <p className="text-xs text-slate-400 mt-1">
            {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
          </p>
        </div>
        <span className={`mt-1 text-lg ${dotClass}`}>?</span>
      </div>
    </div>
  );
}

export default function AlertFeed({ open, alerts, onClear, onClose }) {
  return (
    <div
      className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm transform bg-slate-950/95 backdrop-blur-md border-l border-slate-800 transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Alerts</p>
          <p className="text-lg font-semibold text-slate-50">Signal feed</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-xs rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:border-amber-300 hover:text-amber-200"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Close alerts"
          >
            ×
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-64px)] overflow-y-auto space-y-3 p-4">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No alerts yet.</p>
        ) : (
          alerts.map((a) => <AlertCard key={a.id} alert={a} />)
        )}
      </div>
    </div>
  );
}

