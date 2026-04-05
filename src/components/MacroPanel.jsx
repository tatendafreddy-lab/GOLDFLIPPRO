import { useEffect, useState } from "react";
import {
  fetchDXYProxy,
  getNewsRiskLevel,
  getMacroConfluence,
  getYieldSentiment,
  getRiskSentimentProxy,
  getTripleConfluence,
} from "../utils/macroOverlay.js";

export default function MacroPanel({ londonBreakoutDirection, regime }) {
  const [macro, setMacro] = useState({ usdStrength: "neutral", goldBias: "neutral", confidence: 0 });
  const [yieldSent, setYieldSent] = useState({ sentiment: "neutral", goldBias: "neutral", confidence: 0 });
  const news = getNewsRiskLevel();
  const confluence = getMacroConfluence({
    goldBias: macro.goldBias,
    londonBreakoutDirection,
    regime,
  });
  const riskSent = getRiskSentimentProxy({ usdStrength: macro.usdStrength });
  const triple = getTripleConfluence({
    usdStrength: macro.usdStrength,
    yieldSentiment: yieldSent,
    riskSentiment: riskSent,
    londonBreakoutDirection,
  });

  useEffect(() => {
    fetchDXYProxy().then(setMacro).catch(() => {});
    getYieldSentiment().then(setYieldSent).catch(() => {});
  }, []);

  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Macro Overlay</p>
          <h4 className="text-lg font-semibold text-slate-50">USD & News Context</h4>
        </div>
        <div className="text-sm text-slate-300">
          Confluence: <span className="font-semibold">{confluence.confluenceLabel}</span> ({Math.round(confluence.confluenceScore)}%)
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-200">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">USD strength</p>
          <p className="text-lg font-semibold text-amber-200">{macro.usdStrength}</p>
          <p className="text-xs text-slate-400">Proxy {macro.dxyProxy ? macro.dxyProxy.toFixed(3) : "--"}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Gold macro bias</p>
          <p className="text-lg font-semibold text-emerald-200">
            {macro.goldBias === "bullish" ? "BUY BIAS" : macro.goldBias === "bearish" ? "SELL BIAS" : "NEUTRAL"}
          </p>
          <p className="text-xs text-slate-400">Confidence {Math.round(macro.confidence || 0)}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">News risk</p>
          <p className={`text-lg font-semibold ${news.riskLevel === "extreme" ? "text-rose-300" : news.riskLevel === "high" ? "text-amber-200" : "text-slate-100"}`}>
            {news.isNewsDay ? `${news.eventName} (${news.riskLevel})` : "Normal"}
          </p>
          <p className="text-xs text-slate-400">{news.recommendation}</p>
        </div>
      </div>

      {news.isNewsDay && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          High-impact news today: {news.eventName}. Recommendation: {news.recommendation}.
        </div>
      )}

      <div
        className={`rounded-lg border p-3 text-sm ${
          triple.alignmentScore >= 80
            ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
            : triple.alignmentScore >= 60
            ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
            : "border-rose-400/60 bg-rose-400/10 text-rose-100"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em]">Triple Confluence</p>
        <p className="text-lg font-semibold">
          Score {Math.round(triple.alignmentScore)} — {triple.recommendation}
        </p>
      </div>
    </div>
  );
}
