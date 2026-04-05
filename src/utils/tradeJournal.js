const STORAGE_KEY = "goldflip-journal";

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function saveSignal(payload) {
  const list = read();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entry = {
    id,
    status: "pending",
    outcome: null,
    exitPrice: null,
    exitTime: null,
    notes: "",
    ...payload,
  };
  list.unshift(entry);
  write(list);
  return id;
}

export function updateTrade(id, changes) {
  const list = read();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...changes, status: "completed" };
  write(list);
  return true;
}

export function getJournal() {
  return read();
}

export function getJournalStats() {
  const list = read();
  const completed = list.filter((t) => t.status === "completed");
  const taken = completed.filter((t) => t.outcome !== "skipped");
  const skipped = completed.filter((t) => t.outcome === "skipped");
  const wins = taken.filter((t) => t.outcome === "win");
  const losses = taken.filter((t) => t.outcome === "loss");

  const totalSignals = list.length;
  const liveWinRate = taken.length ? wins.length / taken.length : 0;
  const backtestWinRate = 0.58;
  const edgeDrift = liveWinRate - backtestWinRate;

  let edgeStatus = "review";
  const absDrift = Math.abs(edgeDrift);
  if (absDrift <= 0.05) edgeStatus = "confirmed";
  else if (absDrift <= 0.1) edgeStatus = "warning";

  const takenWithRR = taken.filter((t) => Number.isFinite(Number(t.riskReward)));
  const avgLiveRR =
    takenWithRR.length > 0
      ? takenWithRR.reduce((s, t) => s + Number(t.riskReward || 0), 0) /
        takenWithRR.length
      : 0;

  const totalPnLR = taken.reduce((sum, t) => {
    if (!Number.isFinite(Number(t.pnlR))) return sum;
    return sum + Number(t.pnlR);
  }, 0);

  // streaks
  let current = 0;
  let best = 0;
  let worst = 0;
  const ordered = completed
    .filter((t) => t.outcome === "win" || t.outcome === "loss")
    .sort((a, b) => a.timestamp - b.timestamp);
  for (const t of ordered) {
    if (t.outcome === "win") {
      current = current >= 0 ? current + 1 : 1;
    } else {
      current = current <= 0 ? current - 1 : -1;
    }
    best = Math.max(best, current);
    worst = Math.min(worst, current);
  }

  return {
    totalSignals,
    taken: taken.length,
    skipped: skipped.length,
    wins: wins.length,
    losses: losses.length,
    liveWinRate,
    backtestWinRate,
    edgeDrift,
    edgeStatus,
    avgLiveRR,
    totalPnLR,
    streak: current,
    bestStreak: best,
    worstStreak: worst,
  };
}
