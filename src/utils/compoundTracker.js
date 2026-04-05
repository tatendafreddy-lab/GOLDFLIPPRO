const MILESTONES = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];

function projectBalance({ currentBalance, winRate, avgRR, riskPercent, tradesPerMonth, months }) {
  let balance = currentBalance;
  const p = winRate;
  const q = 1 - p;
  const risk = riskPercent;
  const g = p * avgRR - q; // expectation in R
  const monthlyGrowth = 1 + g * risk * tradesPerMonth;
  balance *= Math.max(0.01, monthlyGrowth);
  return balance;
}

export function getCompoundProjection({
  currentBalance,
  targetBalance,
  winRate,
  avgRR,
  riskPercent,
  tradesPerMonth,
}) {
  const p = winRate > 1 ? winRate / 100 : winRate;
  const r = riskPercent > 1 ? riskPercent / 100 : riskPercent;
  const avg = avgRR || 2;
  const trades = tradesPerMonth || 20;

  let balance = currentBalance || 0;
  const projected = { m3: balance, m6: balance, m12: balance, m24: balance, m36: balance, m60: balance };
  let monthsToTarget = null;
  const milestones = MILESTONES.map((m) => ({ label: `$${m.toLocaleString()}`, reached: balance >= m, monthsAway: null }));

  for (let m = 1; m <= 60; m += 1) {
    balance = projectBalance({
      currentBalance: balance,
      winRate: p,
      avgRR: avg,
      riskPercent: r,
      tradesPerMonth: trades / m, // keep growth reasonable
      months: m,
    });
    if (m === 3) projected.m3 = balance;
    if (m === 6) projected.m6 = balance;
    if (m === 12) projected.m12 = balance;
    if (m === 24) projected.m24 = balance;
    if (m === 36) projected.m36 = balance;
    if (m === 60) projected.m60 = balance;

    milestones.forEach((ms) => {
      const val = Number(ms.label.replace(/[$,]/g, ""));
      if (!ms.reached && balance >= val) {
        ms.reached = true;
        ms.monthsAway = m;
      } else if (!ms.reached) {
        ms.monthsAway = m;
      }
    });

    if (!monthsToTarget && balance >= targetBalance) monthsToTarget = m;
  }

  const yearsToTarget = monthsToTarget ? monthsToTarget / 12 : null;

  const dailyCompoundRate = ((projected.m12 / (currentBalance || 1)) ** (1 / 365)) - 1;

  const edgeScore = Math.max(0, Math.min(100, (p * avgRR - (1 - p)) * 100));

  let warningMessage = "";
  if (p * avgRR - (1 - p) < 0) {
    warningMessage = "Current settings lead to negative expectancy. Reduce risk or improve edge.";
  }

  return {
    monthsToTarget,
    yearsToTarget,
    projectedBalance: projected,
    milestones,
    dailyCompoundRate,
    edgeScore,
    warningMessage,
  };
}
