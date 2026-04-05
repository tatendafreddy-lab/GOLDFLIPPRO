// Session classifier, performance rollups, and session-aware sizing

const BASE_SESSIONS = ["ASIA", "LONDON", "OVERLAP", "NEW_YORK", "DEAD_ZONE"];

function inferMinutes(dateLike) {
  const d = new Date(dateLike);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function classifySession(currentTimeUTC = new Date()) {
  const minutes = inferMinutes(currentTimeUTC);

  const ranges = [
    {
      start: 0,
      end: 7 * 60,
      session: "ASIA",
      subSession: null,
      liquidityScore: 30,
      description: "Asia session - quieter books, wider spreads.",
    },
    {
      start: 7 * 60,
      end: 8 * 60 + 30,
      session: "LONDON",
      subSession: "LONDON_OPEN",
      liquidityScore: 95,
      description: "London open - peak liquidity and price discovery.",
    },
    {
      start: 8 * 60 + 30,
      end: 12 * 60,
      session: "LONDON",
      subSession: null,
      liquidityScore: 85,
      description: "London main - deep liquidity, trending flows.",
    },
    {
      start: 12 * 60,
      end: 15 * 60,
      session: "OVERLAP",
      subSession: null,
      liquidityScore: 90,
      description: "London / New York overlap - highest depth and velocity.",
    },
    {
      start: 15 * 60,
      end: 16 * 60,
      session: "NEW_YORK",
      subSession: "NY_OPEN",
      liquidityScore: 75,
      description: "New York main - robust flows, stay disciplined.",
    },
    {
      start: 16 * 60,
      end: 17 * 60,
      session: "NEW_YORK",
      subSession: "LONDON_CLOSE",
      liquidityScore: 60,
      description: "London close - chop risk rises as books roll.",
    },
    {
      start: 17 * 60,
      end: 24 * 60,
      session: "NEW_YORK",
      subSession: "DEAD_ZONE",
      liquidityScore: 20,
      description: "Dead zone - avoid unless a sweep is live.",
    },
  ];

  const match = ranges.find((r) => minutes >= r.start && minutes < r.end) ?? ranges[0];

  return {
    session: match.session,
    subSession: match.subSession,
    liquidityScore: match.liquidityScore,
    description: match.description,
  };
}

export function getSessionPerformanceStats(journalEntries = []) {
  const buckets = BASE_SESSIONS.reduce((acc, key) => {
    acc[key] = { session: key, trades: 0, wins: 0, rrSum: 0, evSum: 0, evCount: 0 };
    return acc;
  }, {});

  const resolveTimestamp = (entry) =>
    entry?.timestamp ||
    entry?.executedAt ||
    entry?.settledAt ||
    entry?.date ||
    entry?.loggedAt ||
    null;

  const isCompletedTrade = (entry) =>
    entry?.outcome === "win" || entry?.outcome === "loss" || entry?.status === "completed";

  const inferRR = (entry) => {
    if (Number.isFinite(Number(entry?.riskReward))) return Number(entry.riskReward);
    if (Number.isFinite(Number(entry?.rr))) return Number(entry.rr);
    if (Number.isFinite(Number(entry?.rrMultiple))) return Number(entry.rrMultiple);
    if (Number.isFinite(Number(entry?.odds)) && Number(entry.odds) > 1) return Number(entry.odds) - 1;
    return 1;
  };

  const inferEV = (entry) => {
    if (Number.isFinite(Number(entry?.pnlR))) return Number(entry.pnlR);
    if (
      Number.isFinite(Number(entry?.expectedValue)) &&
      Number.isFinite(Number(entry?.riskReward))
    ) {
      return Number(entry.expectedValue) * Number(entry.riskReward);
    }
    return null;
  };

  journalEntries.forEach((entry) => {
    const ts = resolveTimestamp(entry);
    if (!ts) return;
    if (!isCompletedTrade(entry)) return;
    const classification = classifySession(ts);
    const key =
      classification.subSession === "DEAD_ZONE"
        ? "DEAD_ZONE"
        : classification.session || "UNKNOWN";
    if (!buckets[key]) return;

    buckets[key].trades += 1;
    if (entry.outcome === "win") buckets[key].wins += 1;
    buckets[key].rrSum += inferRR(entry);
    const ev = inferEV(entry);
    if (ev !== null) {
      buckets[key].evSum += ev;
      buckets[key].evCount += 1;
    }
  });

  const stats = BASE_SESSIONS.map((key) => {
    const row = buckets[key];
    const winRate = row.trades > 0 ? (row.wins / row.trades) * 100 : null;
    const avgRR = row.trades > 0 ? row.rrSum / row.trades : null;
    const avgEV = row.evCount > 0 ? row.evSum / row.evCount : null;

    let recommendation = "Standard size";
    if (key === "ASIA" || key === "DEAD_ZONE") {
      recommendation = "Skip unless sweep detected";
    } else if (winRate !== null && winRate < 45) {
      recommendation = "Reduce size";
    } else if (winRate !== null && winRate >= 60) {
      recommendation = "Press (best session)";
    } else if (row.trades < 3) {
      recommendation = "Need sample";
    }

    return {
      session: key,
      trades: row.trades,
      winRate: winRate !== null ? Number(winRate.toFixed(1)) : null,
      avgRR: avgRR !== null ? Number(avgRR.toFixed(2)) : null,
      avgEV: avgEV !== null ? Number(avgEV.toFixed(2)) : null,
      recommendation,
    };
  });

  const best = stats
    .filter((s) => s.trades >= 3 && s.winRate !== null)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];
  if (best) {
    const idx = stats.findIndex((s) => s.session === best.session);
    if (idx >= 0) {
      stats[idx] = { ...stats[idx], recommendation: "Press - top performer" };
    }
  }

  return stats;
}

export function getSessionSizingMultiplier(session, sessionStats = [], sweepDetected = false) {
  const sessionKey = session?.session || session;

  if ((sessionKey === "ASIA" || sessionKey === "DEAD_ZONE") && !sweepDetected) {
    return 0.0;
  }
  if ((sessionKey === "ASIA" || sessionKey === "DEAD_ZONE") && sweepDetected) {
    return 0.5;
  }

  const current = sessionStats.find((s) => s.session === sessionKey);
  const best = sessionStats
    .filter((s) => s.trades >= 3 && s.winRate !== null)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];

  if (current && current.winRate !== null && current.winRate < 45) {
    return 0.5;
  }

  if (best && best.session === sessionKey) {
    return 1.5;
  }

  return 1.0;
}

export function nextHighLiquiditySession(currentTimeUTC = new Date()) {
  const now = new Date(currentTimeUTC);
  const slots = [
    { start: 7 * 60, label: "London Open", liquidityScore: 95 },
    { start: 8 * 60 + 30, label: "London Main", liquidityScore: 85 },
    { start: 12 * 60, label: "London/NY Overlap", liquidityScore: 90 },
    { start: 15 * 60, label: "New York Main", liquidityScore: 75 },
  ];

  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const upcoming = slots.find((s) => s.start > minutesNow) || slots[0];
  const dayOffset = slots.find((s) => s.start > minutesNow) ? 0 : 1;

  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  startDate.setUTCMinutes(upcoming.start);
  if (dayOffset) startDate.setUTCDate(startDate.getUTCDate() + 1);

  const minutesAway = Math.max(0, Math.round((startDate.getTime() - now.getTime()) / 60000));

  return {
    label: upcoming.label,
    startsAt: startDate,
    minutesAway,
    liquidityScore: upcoming.liquidityScore,
  };
}
