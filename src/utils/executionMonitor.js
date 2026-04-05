const EXEC_KEY = "goldflip-executions";

const read = () => {
  try {
    const raw = localStorage.getItem(EXEC_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(EXEC_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

export function recordExecution({ tradeId, requestedPrice, filledPrice, requestedTime, filledTime, spreadAtEntry, direction }) {
  const slippagePips = Math.abs((filledPrice || requestedPrice) - requestedPrice) / 0.1;
  const executionDelay = Math.max(0, (filledTime || Date.now()) - (requestedTime || Date.now()));
  const entry = {
    id: tradeId || `${Date.now()}`,
    requestedPrice,
    filledPrice: filledPrice ?? requestedPrice,
    spreadAtEntry: spreadAtEntry ?? 0,
    slippagePips,
    executionDelay,
    direction,
    ts: Date.now(),
  };
  const list = read();
  list.unshift(entry);
  write(list.slice(0, 200));
  return entry;
}

export function getExecutionStats(executions = null) {
  const list = executions || read();
  if (!list.length)
    return { averageSlippage: 0, worstSlippage: 0, averageSpread: 0, executionScore: 100, recommendation: "No data" };

  const avgSlip = list.reduce((a, b) => a + (b.slippagePips || 0), 0) / list.length;
  const worstSlip = Math.max(...list.map((e) => e.slippagePips || 0));
  const avgSpread = list.reduce((a, b) => a + (b.spreadAtEntry || 0), 0) / list.length;

  let executionScore = 100 - avgSlip * 5;
  const avgDelay = list.reduce((a, b) => a + (b.executionDelay || 0), 0) / list.length;
  if (avgDelay > 500) executionScore -= ((avgDelay - 500) / 1) * 2 / 1000; // minor effect
  executionScore = Math.max(0, Math.min(100, executionScore));

  let recommendation = "Good execution";
  if (executionScore < 60) recommendation = "Execution drag detected — check spread/liquidity";

  return {
    averageSlippage: avgSlip,
    worstSlippage: worstSlip,
    averageSpread: avgSpread,
    executionScore,
    recommendation,
  };
}
