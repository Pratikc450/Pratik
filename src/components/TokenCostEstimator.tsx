import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Coins,
  DollarSign,
  TrendingUp,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { GeneratedArtifact } from '../types.js';

interface TokenCostEstimatorProps {
  artifacts?: GeneratedArtifact[];
  currentArtifact?: GeneratedArtifact | null;
  tokenBudgetUsed?: number;
  tokenBudgetLimit?: number;
}

export interface ModelPricingTier {
  id: string;
  name: string;
  badge: string;
  inputPerMillion: number; // USD per 1M tokens
  outputPerMillion: number; // USD per 1M tokens
  cachePerMillion: number; // USD per 1M tokens with context caching
  freeTierRpm: number;
  freeTierRpd: number;
  bestFor: string;
  recommended: boolean;
}

export const GEMINI_PRICING_TIERS: ModelPricingTier[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Default / Balanced',
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    cachePerMillion: 0.01875,
    freeTierRpm: 15,
    freeTierRpd: 1500,
    bestFor: 'Autonomous 19-artifact suite synthesis, PRDs, user stories, and real-time sandbox problem solving',
    recommended: true
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    badge: 'High Frequency / Low Cost',
    inputPerMillion: 0.0375,
    outputPerMillion: 0.15,
    cachePerMillion: 0.009375,
    freeTierRpm: 30,
    freeTierRpd: 3000,
    bestFor: 'Rapid acceptance criteria checks, high-volume regression testing, and chat copilot queries',
    recommended: false
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    badge: 'Deep Reasoning / Multi-Step',
    inputPerMillion: 1.25,
    outputPerMillion: 5.00,
    cachePerMillion: 0.3125,
    freeTierRpm: 2,
    freeTierRpd: 50,
    bestFor: 'Complex cross-system architectural diagrams, enterprise trade credit risk models, and edge-case auditing',
    recommended: false
  }
];

export const TokenCostEstimator: React.FC<TokenCostEstimatorProps> = ({
  artifacts = [],
  currentArtifact,
  tokenBudgetUsed = 43923,
  tokenBudgetLimit = 50000
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');
  const [monthlyArtifactCount, setMonthlyArtifactCount] = useState<number>(350);
  const [teamMembersCount, setTeamMembersCount] = useState<number>(4);
  const [useContextCaching, setUseContextCaching] = useState<boolean>(true);
  const [copiedForecast, setCopiedForecast] = useState<boolean>(false);

  // Calculate actual token consumption metrics from workspace
  const workspaceMetrics = useMemo(() => {
    let totalOutputTokens = 0;
    let totalInputTokens = 0;
    let countWithTokens = 0;

    artifacts.forEach(art => {
      const out = art.metadata?.outputTokens;
      const inp = art.metadata?.inputTokens;
      if (out || inp) {
        totalOutputTokens += out || 0;
        totalInputTokens += inp || 0;
        countWithTokens++;
      }
    });

    // Fallbacks if workspace is fresh
    if (countWithTokens === 0) {
      totalInputTokens = 2150;
      totalOutputTokens = 820;
      countWithTokens = 1;
    }

    const avgInputPerArtifact = Math.round(totalInputTokens / countWithTokens) || 2150;
    const avgOutputPerArtifact = Math.round(totalOutputTokens / countWithTokens) || 820;
    const avgTotalPerArtifact = avgInputPerArtifact + avgOutputPerArtifact;

    return {
      avgInputPerArtifact,
      avgOutputPerArtifact,
      avgTotalPerArtifact,
      totalWorkspaceTokens: tokenBudgetUsed || (totalInputTokens + totalOutputTokens),
      count: artifacts.length
    };
  }, [artifacts, tokenBudgetUsed]);

  // Selected model info
  const selectedModel = useMemo(() => {
    return GEMINI_PRICING_TIERS.find(m => m.id === selectedModelId) || GEMINI_PRICING_TIERS[0];
  }, [selectedModelId]);

  // Projections
  const costProjections = useMemo(() => {
    const totalMonthlyArtifacts = monthlyArtifactCount * teamMembersCount;
    const totalMonthlyInputTokens = totalMonthlyArtifacts * workspaceMetrics.avgInputPerArtifact;
    const totalMonthlyOutputTokens = totalMonthlyArtifacts * workspaceMetrics.avgOutputPerArtifact;
    const totalMonthlyTokens = totalMonthlyInputTokens + totalMonthlyOutputTokens;

    // Calculate per-model monthly costs
    const modelsComparison = GEMINI_PRICING_TIERS.map(tier => {
      const inputRate = useContextCaching ? tier.cachePerMillion : tier.inputPerMillion;
      const inputCost = (totalMonthlyInputTokens / 1_000_000) * inputRate;
      const outputCost = (totalMonthlyOutputTokens / 1_000_000) * tier.outputPerMillion;
      const totalCost = inputCost + outputCost;

      // Free tier ceiling check
      const dailyGenerations = Math.ceil(totalMonthlyArtifacts / 30);
      const isWithinFreeTierDaily = dailyGenerations <= tier.freeTierRpd;

      return {
        ...tier,
        inputCost,
        outputCost,
        totalCost,
        isWithinFreeTierDaily,
        dailyGenerations
      };
    });

    const activeModelCost = modelsComparison.find(m => m.id === selectedModelId) || modelsComparison[0];

    // Single generation cost
    const singleGenInputCost = (workspaceMetrics.avgInputPerArtifact / 1_000_000) * (useContextCaching ? selectedModel.cachePerMillion : selectedModel.inputPerMillion);
    const singleGenOutputCost = (workspaceMetrics.avgOutputPerArtifact / 1_000_000) * selectedModel.outputPerMillion;
    const singleGenTotalCost = singleGenInputCost + singleGenOutputCost;

    // Compare Flash vs Pro savings
    const flashCost = modelsComparison.find(m => m.id === 'gemini-3.8-flash')?.totalCost || 1;
    const proCost = modelsComparison.find(m => m.id === 'gemini-3.1-pro-preview')?.totalCost || 1;
    const monthlySavingsVsPro = Math.max(0, proCost - flashCost);

    return {
      totalMonthlyArtifacts,
      totalMonthlyTokens,
      totalMonthlyInputTokens,
      totalMonthlyOutputTokens,
      activeModelCost,
      singleGenTotalCost,
      modelsComparison,
      monthlySavingsVsPro
    };
  }, [monthlyArtifactCount, teamMembersCount, useContextCaching, selectedModelId, workspaceMetrics, selectedModel]);

  const handleCopyForecast = () => {
    const forecastSummary = `--- Navigator Token Cost & Gemini Pricing Projection ---
Model: ${selectedModel.name}
Active Team Size: ${teamMembersCount} PMs
Monthly Volume: ${costProjections.totalMonthlyArtifacts} Artifacts / month
Average Tokens per Artifact: ${workspaceMetrics.avgTotalPerArtifact.toLocaleString()} tokens (${workspaceMetrics.avgInputPerArtifact} in / ${workspaceMetrics.avgOutputPerArtifact} out)
Total Monthly Projected Tokens: ${(costProjections.totalMonthlyTokens / 1_000_000).toFixed(2)}M Tokens
Context Caching: ${useContextCaching ? 'Enabled (75% discount on repeated prompts)' : 'Disabled'}
Projected Monthly API Cost: $${costProjections.activeModelCost.totalCost.toFixed(2)} USD / month
Cost per Generated Specification: $${costProjections.singleGenTotalCost.toFixed(5)} USD
Google AI Studio Free Tier Status: ${costProjections.activeModelCost.isWithinFreeTierDaily ? 'Eligible ($0.00 with 1,500 RPD cap)' : 'Exceeds Free Tier (Pay-As-You-Go required)'}
Generated by Navigator Token Cost Estimator`;

    navigator.clipboard.writeText(forecastSummary);
    setCopiedForecast(true);
    setTimeout(() => setCopiedForecast(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-indigo-900/60 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 shadow-xl overflow-hidden transition-all">
      {/* Top Banner / Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-indigo-950/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Coins className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Token Cost Estimator</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Gemini API Pricing Tiers</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                Avg ${(costProjections.singleGenTotalCost).toFixed(4)} / artifact
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live token consumption telemetry mapped to projected monthly billing across Gemini Flash, Flash-Lite, and Pro tiers.
            </p>
          </div>
        </div>

        {/* Quick KPI summary & toggle arrow */}
        <div className="flex items-center gap-4 self-end sm:self-center">
          <div className="text-right hidden md:block">
            <div className="text-[11px] text-slate-400 font-medium">Projected Monthly Bill</div>
            <div className="text-base font-black text-indigo-200 font-mono">
              ${costProjections.activeModelCost.totalCost < 0.01 ? '<$0.01' : costProjections.activeModelCost.totalCost.toFixed(2)}
              <span className="text-xs text-slate-400 font-normal ml-1">/mo</span>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle Token Cost Estimator details"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Estimator Utility Body */}
      {isOpen && (
        <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/60 space-y-6">
          {/* Row 1: Current Consumption Telemetry vs Projected Volume Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Current Workspace Telemetry */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Active Artifact Consumption
              </span>
              <div className="text-xl font-bold font-mono text-slate-100">
                {workspaceMetrics.avgTotalPerArtifact.toLocaleString()}
                <span className="text-xs text-slate-400 font-normal ml-1">tokens / spec</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800">
                <span>Prompt: ~{workspaceMetrics.avgInputPerArtifact}</span>
                <span>Output: ~{workspaceMetrics.avgOutputPerArtifact}</span>
              </div>
            </div>

            {/* Metric 2: Monthly Artifact Volume Input */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  Specs / PM / Month
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">{monthlyArtifactCount}</span>
              </div>
              <input
                type="range"
                min="20"
                max="2000"
                step="20"
                value={monthlyArtifactCount}
                onChange={(e) => setMonthlyArtifactCount(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span>20 specs</span>
                <span>500</span>
                <span>2,000 specs</span>
              </div>
            </div>

            {/* Metric 3: Active PM Team Size */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  Active PM Seats
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">{teamMembersCount} PMs</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={teamMembersCount}
                onChange={(e) => setTeamMembersCount(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span>1 PM</span>
                <span>10 PMs</span>
                <span>25 PMs</span>
              </div>
            </div>

            {/* Metric 4: Context Caching Discount Toggle */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    Context Caching
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-semibold">
                    -75% Cost
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Caches repeat system instructions and schema definitions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setUseContextCaching(!useContextCaching)}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  useContextCaching
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${useContextCaching ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                <span>{useContextCaching ? 'Context Caching Active' : 'Caching Disabled'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Model Comparison Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gemini Model Pricing Tier Comparison</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Target Volume: {costProjections.totalMonthlyArtifacts.toLocaleString()} specs / mo (~{(costProjections.totalMonthlyTokens / 1_000_000).toFixed(2)}M tok)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {costProjections.modelsComparison.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          model.recommended
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}>
                          {model.badge}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          ${model.inputPerMillion}/1M in · ${model.outputPerMillion}/1M out
                        </span>
                      </div>

                      <h5 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{model.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </h5>

                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {model.bestFor}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">Monthly Projection:</span>
                        <span className="text-lg font-black font-mono text-slate-100">
                          ${model.totalCost < 0.01 ? '<$0.01' : model.totalCost.toFixed(2)}
                          <span className="text-xs text-slate-400 font-normal ml-0.5">/mo</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        <span>Per Spec:</span>
                        <span className="text-indigo-300 font-semibold">
                          ${((model.totalCost / Math.max(1, costProjections.totalMonthlyArtifacts))).toFixed(4)}
                        </span>
                      </div>

                      {/* Free Tier Eligibility Banner */}
                      <div className={`text-[10px] px-2 py-1 rounded flex items-center justify-between ${
                        model.isWithinFreeTierDaily
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}>
                        <span>Free Tier: {model.dailyGenerations} / {model.freeTierRpd} daily limit</span>
                        <span className="font-semibold">{model.isWithinFreeTierDaily ? '100% Free' : 'Pay-As-You-Go'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Action Ribbon & Budget ROI Insight */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-100">Strategic PM Guidance: </span>
                Running autonomous PRD and Agile suite synthesis on <strong>Gemini 3.8 Flash</strong> saves{' '}
                <span className="text-emerald-400 font-bold font-mono">
                  ${costProjections.monthlySavingsVsPro.toFixed(2)}/mo
                </span>{' '}
                compared to Pro models, delivering sub-second Zod compliance at just{' '}
                <span className="text-slate-100 font-mono font-semibold">
                  ${(costProjections.singleGenTotalCost * 19).toFixed(3)}
                </span>{' '}
                for the complete 19-artifact suite.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyForecast}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-950"
              >
                {copiedForecast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Forecast Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Cost Forecast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
