import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Sliders, 
  TrendingUp, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  Zap, 
  Info, 
  ArrowRight, 
  HelpCircle,
  X
} from 'lucide-react';

export interface RiceMetrics {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
}

interface RiceScoreCalculatorWidgetProps {
  story: any;
  allStories?: any[];
  onSave?: (storyId: string, metrics: RiceMetrics & { riceScore: number }) => Promise<void> | void;
  onClose?: () => void;
  isCompact?: boolean;
}

export const RiceScoreCalculatorWidget: React.FC<RiceScoreCalculatorWidgetProps> = ({
  story,
  allStories = [],
  onSave,
  onClose,
  isCompact = false
}) => {
  // Current tuning metrics initialized from story
  const [reach, setReach] = useState<number>(story.reach || 1000);
  const [impact, setImpact] = useState<number>(story.impact || 2.0);
  const [confidence, setConfidence] = useState<number>(story.confidence || 0.8);
  const [effort, setEffort] = useState<number>(story.effort || 2.0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync state when incoming story changes
  useEffect(() => {
    setReach(story.reach || 1000);
    setImpact(story.impact || 2.0);
    setConfidence(story.confidence || 0.8);
    setEffort(story.effort || 2.0);
    setSavedSuccess(false);
  }, [story.id, story.reach, story.impact, story.confidence, story.effort]);

  // Deterministic RICE calculation
  const riceScore = useMemo(() => {
    const safeEffort = Math.max(effort, 0.25);
    const score = (reach * impact * confidence) / safeEffort;
    return Math.round(score * 10) / 10;
  }, [reach, impact, confidence, effort]);

  // Ease calculation (ICE framework alignment):
  // 10-point scale inversely proportional to effort weeks
  // 0.5w -> 10/10 (Super Easy), 1w -> 9/10, 2w -> 8/10, 4w -> 6/10, 8w -> 2/10, 10w -> 1/10
  const easeScore = useMemo(() => {
    const rawEase = 10.5 - effort;
    return Math.max(1, Math.min(10, Math.round(rawEase * 10) / 10));
  }, [effort]);

  // ICE Score for PMs comparing methodologies: Impact (1-10) * Confidence (1-10) * Ease (1-10)
  const iceScore = useMemo(() => {
    const impactScale10 = impact * 3.33; // 0.25 - 3.0 scaled to ~1-10
    const confScale10 = confidence * 10; // 0.5 - 1.0 scaled to 5-10
    return Math.round(impactScale10 * confScale10 * easeScore);
  }, [impact, confidence, easeScore]);

  // Projected rank in backlog based on live calculated RICE score
  const rankProjection = useMemo(() => {
    if (!allStories || allStories.length === 0) return { currentRank: 1, projectedRank: 1 };
    
    // Sort current stories by existing RICE
    const sortedCurrent = [...allStories].sort((a, b) => (b.riceScore || 0) - (a.riceScore || 0));
    const currentRank = sortedCurrent.findIndex(s => s.id === story.id) + 1 || 1;

    // Simulate new list with updated score for this story
    const simulated = allStories.map(s => s.id === story.id ? { ...s, riceScore } : s);
    simulated.sort((a, b) => (b.riceScore || 0) - (a.riceScore || 0));
    const projectedRank = simulated.findIndex(s => s.id === story.id) + 1 || 1;

    return { currentRank, projectedRank };
  }, [allStories, story.id, riceScore]);

  // Priority classification tier
  const priorityTier = useMemo(() => {
    if (riceScore >= 3500) {
      return {
        label: 'Tier 1: High Velocity Quick-Win',
        color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80',
        icon: '🚀',
        recommendation: 'Must-have in current sprint. Delivers outsized customer value relative to engineering effort.'
      };
    } else if (riceScore >= 1500) {
      return {
        label: 'Tier 2: Strategic Core Backlog',
        color: 'text-blue-400 bg-blue-950/80 border-blue-800/80',
        icon: '⚡',
        recommendation: 'Target for next delivery horizon. Solid business return with validated customer reach.'
      };
    } else if (riceScore >= 600) {
      return {
        label: 'Tier 3: Standard Priority',
        color: 'text-amber-400 bg-amber-950/80 border-amber-800/80',
        icon: '⚖️',
        recommendation: 'Candidate for sprint filler or secondary release once top-tier initiatives ship.'
      };
    } else {
      return {
        label: 'Tier 4: Low Priority / Heavy Lift',
        color: 'text-rose-400 bg-rose-950/80 border-rose-800/80',
        icon: '⏳',
        recommendation: 'High effort or low confidence. Consider de-scoping into smaller sub-tasks before commitment.'
      };
    }
  }, [riceScore]);

  const handleReset = () => {
    setReach(story.reach || 1000);
    setImpact(story.impact || 2.0);
    setConfidence(story.confidence || 0.8);
    setEffort(story.effort || 2.0);
    setSavedSuccess(false);
  };

  const handleApply = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(story.id, {
        reach,
        impact,
        confidence,
        effort,
        riceScore
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save RICE metrics', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      isCompact 
        ? 'p-4 bg-slate-950/90 border-emerald-500/30 shadow-lg' 
        : 'p-5 sm:p-6 bg-slate-900/95 border-emerald-500/40 shadow-2xl'
    }`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>RICE Score Calculator & Priority Simulator</span>
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800">
                {story.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Persona: <strong className="text-slate-200">{story.persona}</strong> · Adjust parameters to dynamically recalibrate backlog ranking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rankProjection.currentRank !== rankProjection.projectedRank && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800 text-[11px] font-mono text-indigo-300">
              <span>Backlog Rank:</span>
              <span className="line-through text-slate-400">#{rankProjection.currentRank}</span>
              <ArrowRight className="w-3 h-3 text-indigo-400" />
              <span className="font-bold text-emerald-400">#{rankProjection.projectedRank}</span>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close Calculator"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scorecard Visualizer Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 items-center">
        {/* Calculated RICE Score Box */}
        <div className="md:col-span-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calculated RICE Score</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">Live Formula</span>
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {riceScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-mono text-slate-500">points</span>
          </div>

          {/* Priority Tier Indicator */}
          <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${priorityTier.color}`}>
            <span>{priorityTier.icon}</span>
            <span>{priorityTier.label}</span>
          </div>
        </div>

        {/* Dynamic Formula Breakdown & Ease Correlation */}
        <div className="md:col-span-8 p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400">
              Interactive Mathematical Formula Breakdown:
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>Ease Index: <strong className="text-teal-400">{easeScore}/10</strong></span>
              <span>·</span>
              <span>ICE Score: <strong className="text-blue-400">{iceScore}</strong></span>
            </div>
          </div>

          {/* Formula Equation Pill */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
              <span className="text-[10px] text-blue-400">R:</span>
              <span className="font-bold">{reach.toLocaleString()}</span>
            </div>
            <span className="text-slate-500">×</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
              <span className="text-[10px] text-purple-400">I:</span>
              <span className="font-bold">{impact.toFixed(2)}x</span>
            </div>
            <span className="text-slate-500">×</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
              <span className="text-[10px] text-amber-400">C:</span>
              <span className="font-bold">{((confidence) * 100).toFixed(0)}%</span>
            </div>
            <span className="text-slate-500">÷</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
              <span className="text-[10px] text-rose-400">E:</span>
              <span className="font-bold">{effort.toFixed(1)}w</span>
            </div>
            <span className="text-slate-500">=</span>
            <span className="font-bold text-emerald-400 text-sm">{riceScore.toFixed(1)}</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            {priorityTier.recommendation}
          </p>
        </div>
      </div>

      {/* Sliders & Interactive Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* 1. Reach Parameter */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Reach (R)</span>
            </label>
            <span className="text-xs font-mono font-bold text-blue-400">
              {reach.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Estimated customers impacted per quarter</p>
          
          <input
            type="range"
            min={100}
            max={20000}
            step={100}
            value={reach}
            onChange={(e) => setReach(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          <div className="flex items-center justify-between gap-1 pt-1">
            {[500, 2500, 5000, 10000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReach(preset)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  reach === preset
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Impact Parameter */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Impact (I)</span>
            </label>
            <span className="text-xs font-mono font-bold text-purple-400">
              {impact.toFixed(2)}x
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Per-user value lift when using feature</p>

          <input
            type="range"
            min={0.25}
            max={3.0}
            step={0.25}
            value={impact}
            onChange={(e) => setImpact(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />

          <div className="grid grid-cols-4 gap-1 pt-1">
            {[
              { val: 0.5, label: 'Low' },
              { val: 1.0, label: 'Med' },
              { val: 2.0, label: 'High' },
              { val: 3.0, label: 'Massive' }
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setImpact(p.val)}
                className={`px-1 py-0.5 rounded text-[10px] transition-colors truncate text-center ${
                  impact === p.val
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title={`${p.label} (${p.val}x)`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Confidence Parameter */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Confidence (C)</span>
            </label>
            <span className="text-xs font-mono font-bold text-amber-400">
              {((confidence) * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Certainty based on user research data</p>

          <input
            type="range"
            min={0.4}
            max={1.0}
            step={0.05}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="grid grid-cols-4 gap-1 pt-1">
            {[
              { val: 0.5, label: '50% Spec' },
              { val: 0.7, label: '70% Talk' },
              { val: 0.85, label: '85% Beta' },
              { val: 1.0, label: '100% Data' }
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setConfidence(p.val)}
                className={`px-1 py-0.5 rounded text-[9px] transition-colors truncate text-center font-mono ${
                  confidence === p.val
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title={p.label}
              >
                {((p.val) * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>

        {/* 4. Effort & Ease Parameter */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Effort & Ease (E)</span>
            </label>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="font-bold text-rose-400">{effort.toFixed(1)}w</span>
              <span className="text-[10px] text-teal-400">({easeScore}/10 Ease)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Total engineering weeks to production</p>

          <input
            type="range"
            min={0.5}
            max={10.0}
            step={0.5}
            value={effort}
            onChange={(e) => setEffort(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />

          <div className="grid grid-cols-4 gap-1 pt-1">
            {[
              { val: 0.5, label: '0.5w Quick' },
              { val: 1.5, label: '1.5w S-Sprint' },
              { val: 3.0, label: '3w Medium' },
              { val: 6.0, label: '6w Epic' }
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setEffort(p.val)}
                className={`px-1 py-0.5 rounded text-[9px] transition-colors truncate text-center font-mono ${
                  effort === p.val
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title={p.label}
              >
                {p.val}w
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>
            Formula: <code className="text-slate-300 font-mono">(Reach × Impact × Confidence) ÷ Effort</code>
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {onSave && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isSaving}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Applied & Ranked!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Calculating...' : 'Save & Recalculate Backlog'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
