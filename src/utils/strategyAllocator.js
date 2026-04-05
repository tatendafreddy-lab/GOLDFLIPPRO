// Strategy capital allocation engine

function getOutcomeR(trade) {
  // Prefer recorded pnlR; otherwise map outcome + riskReward to R-multiple
  if (Number.isFinite(Number(trade?.pnlR))) return Number(trade.pnlR);
  if (trade?.outcome === "win") {
    if (Number.isFinite(Number(trade?.riskReward))) return Number(trade.riskReward);
    return 1;
  }
  if (trade?.outcome === "loss") return -1;
  return 0;
}

function stddev(values = []) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return Math.sqrt(variance);
}

function computeExpectancy(winRate, avgRR) {
  // per instructions: winRate * avgRR - (1 - winRate)
  const p = winRate;
  const q = 1 - p;
  return p * avgRR - q;
}

export function calculateStrategyMetrics(journalEntries = []) {
  const grouped = {};
  journalEntries.forEach((t) => {
    const key = t.strategy || "unspecified";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  return Object.entries(grouped).map(([strategy, trades]) => {
    const outcomes = trades.map(getOutcomeR);
    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.filter((t) => t.outcome === "loss").length;
    const taken = wins + losses || trades.length;
    const winRate = taken ? wins / taken : 0;
    const rrValues = trades
      .map((t) => Number(t.riskReward))
      .filter((v) => Number.isFinite(v) && v !== 0);
    const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 1;
    const expectancy = computeExpectancy(winRate, avgRR);

    const recent = outcomes.slice(-20);
    const rollingExp =
      recent.length > 0
        ? recent.reduce((a, b) => a + b, 0) / recent.length
        : expectancy;
    const sd = stddev(outcomes);
    const sharpeProxy = sd > 0 ? expectancy / sd : expectancy > 0 ? 10 : -10; // reward stable winners
    const rollingSd = stddev(recent);
    const rollingSharpe = rollingSd > 0 ? rollingExp / rollingSd : rollingExp;

    let status = "ACTIVE";
    if (rollingExp < 0) status = "DISABLED";
    else if (rollingSharpe < sharpeProxy * 0.75) status = "REDUCED";

    return {
      strategy,
      winRate,
      avgRR,
      totalTrades: trades.length,
      expectancy,
      sharpeProxy,
      rollingExpectancy: rollingExp,
      rollingSharpe,
      status,
    };
  });
}

export function getCapitalAllocation(strategyMetrics = []) {
  const active = strategyMetrics.filter((s) => s.status !== "DISABLED");
  const disabledStrategies = strategyMetrics.filter((s) => s.status === "DISABLED").map((s) => s.strategy);

  const weights = active.map((s) => {
    const base = Math.max(0, s.sharpeProxy);
    const adjusted = s.status === "REDUCED" ? base * 0.5 : base;
    return { strategy: s.strategy, weight: adjusted };
  });

  const totalWeight = weights.reduce((a, b) => a + b.weight, 0);
  const allocations = {};

  if (totalWeight === 0 && active.length) {
    const even = 1 / active.length;
    active.forEach((s) => {
      allocations[s.strategy] = s.status === "REDUCED" ? even * 0.5 : even;
    });
  } else {
    weights.forEach(({ strategy, weight }) => {
      allocations[strategy] = totalWeight > 0 ? weight / totalWeight : 0;
    });
  }

  // ensure disabled are zeroed
  disabledStrategies.forEach((s) => {
    allocations[s] = 0;
  });

  const reasoning = [
    `${Object.keys(allocations).length} strategies allocated.`,
    disabledStrategies.length ? `${disabledStrategies.length} disabled for negative rolling expectancy.` : "No disabled strategies.",
  ].join(" ");

  return { allocations, disabledStrategies, reasoning };
}

export function getStrategyStakeMultiplier(strategyName, allocations = {}) {
  if (!strategyName) return 1;
  const key = allocations[strategyName];
  if (key === undefined) return 1;
  return Number(key) || 0;
}
