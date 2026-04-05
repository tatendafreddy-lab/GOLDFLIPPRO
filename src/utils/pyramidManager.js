// Pyramid position manager
const DIR = { BUY: 1, SELL: -1 };

export function createPyramidPlan({ entry, stopLoss, takeProfit, initialStake, direction }) {
  if (!entry || !stopLoss || !direction) return null;
  const dir = DIR[direction.toUpperCase()] || 1;
  const R = Math.abs(entry - stopLoss);
  const e1 = entry;
  const e2 = entry + dir * R;
  const e3 = entry + dir * R * 2;

  const plan = {
    direction: direction.toUpperCase(),
    entry,
    stopLoss,
    takeProfit: takeProfit ?? entry + dir * R * 3,
    R,
    levels: [
      { id: 1, price: e1, stake: initialStake, status: "pending" },
      { id: 2, price: e2, stake: initialStake * 0.75, status: "pending" },
      { id: 3, price: e3, stake: initialStake * 0.5, status: "pending" },
    ],
    totalMaxRisk: initialStake * R,
    projectedRewardIfAllFill: R * 3,
    instructions: [
      "Entry 1: original price, full size, risk 1R.",
      "Entry 2: +1R; move Entry1 stop to breakeven.",
      "Entry 3: +2R; move stops to +1R on Entries 1 & 2.",
    ],
  };
  return plan;
}

export function calculatePyramidStatus({ plan, currentPrice }) {
  if (!plan || !currentPrice) return null;
  const dir = DIR[plan.direction] || 1;
  const filled = [];
  const pending = [];
  plan.levels.forEach((lvl) => {
    const triggered = dir === 1 ? currentPrice >= lvl.price : currentPrice <= lvl.price;
    if (triggered) filled.push({ ...lvl, status: "filled" });
    else pending.push({ ...lvl, status: "pending" });
  });

  const totalStake = filled.reduce((a, b) => a + b.stake, 0);
  const avgEntry = totalStake
    ? filled.reduce((a, b) => a + b.price * b.stake, 0) / totalStake
    : plan.entry;
  const unrealizedR = ((currentPrice - avgEntry) * (DIR[plan.direction] || 1)) / plan.R;

  let suggestedStop = plan.stopLoss;
  if (filled.length >= 2) suggestedStop = plan.entry; // breakeven
  if (filled.length === 3) suggestedStop = plan.entry + (DIR[plan.direction] || 1) * plan.R; // +1R

  const nextAction =
    pending.length === 0
      ? "Manage TP / trail stops."
      : filled.length === 1
      ? "Add Entry 2 at +1R and move stop to BE."
      : "Add Entry 3 at +2R and move stops to +1R.";

  return {
    filled,
    pending,
    exposure: totalStake,
    unrealizedR,
    suggestedStop,
    nextAction,
  };
}
