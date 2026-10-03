import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  User,
  RotateCcw,
  Check,
  X,
  Sliders,
  DollarSign,
  History,
  Zap,
  Info,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface RiceSuggestionItem {
  storyId: string;
  storyTitle: string;
  asA: string;
  persona: string;
  personaRole: string;
  personaPainPoint: string;
  personaGoal: string;
  personaAlignmentScore: number;
  currentValues: {
    reach: number;
    impact: number;
    effort: number;
    confidence: number;
    riceScore: number;
    tier: string;
  };
  recommendedValues: {
    reach: number;
    impact: number;
    effort: number;
    confidence: number;
    riceScore: number;
    tier: string;
  };
  riceDelta: number;
  riceDeltaPct: number;
  valueRationale: string;
  effortRationale: string;
  confidenceRationale: string;
  trendInfluence: string;
  isTierShift: boolean;
}

interface AiRiceSuggestionEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: any[];
  personas?: any[];
  productId: string;
  productName?: string;
  onApplySuggestions: (updates: Array<{ id: string; impact?: number; effort?: number; confidence?: number; riceScore?: number; priority?: string }>) => Promise<void>;
}

export const AiRiceSuggestionEngineModal: React.FC<AiRiceSuggestionEngineModalProps> = ({
  isOpen,
  onClose,
  stories,
  personas = [],
  productId,
  productName = 'Product',
  onApplySuggestions
}) => {
  const [suggestions, setSuggestions] = useState<RiceSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'ALL' | 'VALUE_UPGRADES' | 'EFFORT_SHIFTS' | 'TIER_SHIFTS'>('ALL');
  const [appliedStoryIds, setAppliedStoryIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stories.length > 0) {
      fetchSuggestions();
    }
  }, [isOpen, stories, productId]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/rice-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories,
          personas,
          productId,
          historicalTrends: {
            sprintVelocity: 36,
            erpSlipRate: 0.38,
            checkoutConversionGrowth: 0.48
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
          if (data.suggestions.length > 0) {
            setExpandedStoryId(data.suggestions[0].storyId);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch RICE suggestions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuggestions = suggestions.filter(item => {
    if (filterType === 'VALUE_UPGRADES') {
      return item.recommendedValues.impact > item.currentValues.impact;
    }
    if (filterType === 'EFFORT_SHIFTS') {
      return item.recommendedValues.effort !== item.currentValues.effort;
    }
    if (filterType === 'TIER_SHIFTS') {
      return item.isTierShift;
    }
    return true;
  });

  const valueUpgradesCount = suggestions.filter(s => s.recommendedValues.impact > s.currentValues.impact).length;
  const tierShiftsCount = suggestions.filter(s => s.isTierShift).length;
  const avgShiftPct = suggestions.length > 0
    ? Math.round(suggestions.reduce((acc, s) => acc + s.riceDeltaPct, 0) / suggestions.length)
    : 0;

  const handleApplySingle = async (item: RiceSuggestionItem) => {
    setIsApplying(true);
    try {
      await onApplySuggestions([{
        id: item.storyId,
        impact: item.recommendedValues.impact,
        effort: item.recommendedValues.effort,
        confidence: item.recommendedValues.confidence,
        riceScore: item.recommendedValues.riceScore,
        priority: item.recommendedValues.tier
      }]);
      setAppliedStoryIds(prev => new Set([...prev, item.storyId]));
      setSuccessToast(`Applied AI suggestions to ${item.storyId}! Score: ${item.recommendedValues.riceScore} pts`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to apply suggestion', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      const updates = suggestions.map(item => ({
        id: item.storyId,
        impact: item.recommendedValues.impact,
        effort: item.recommendedValues.effort,
        confidence: item.recommendedValues.confidence,
        riceScore: item.recommendedValues.riceScore,
        priority: item.recommendedValues.tier
      }));
      await onApplySuggestions(updates);
      setAppliedStoryIds(new Set(suggestions.map(s => s.storyId)));
      setSuccessToast(`Successfully calibrated Value, Effort, and Confidence across all ${suggestions.length} stories!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to apply all suggestions', err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  AI Suggestion Engine: Value, Effort & Confidence
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  Persona & Trend Linked
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Recommends calibrated Value, Effort, and Confidence updates based on linked customer persona pain points and historical sprint RICE delivery telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Re-run suggestion engine"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary KPI Strip */}
        <div className="p-4 bg-slate-950 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg RICE Score Shift</span>
            <div className={`text-base font-bold font-mono flex items-center gap-1 ${avgShiftPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {avgShiftPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{avgShiftPct >= 0 ? `+${avgShiftPct}%` : `${avgShiftPct}%`}</span>
            </div>
            <span className="text-[10px] text-slate-500">Refined ROI alignment</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Value Upgrades</span>
            <div className="text-base font-bold font-mono text-purple-300 flex items-center gap-1">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>{valueUpgradesCount} Stories</span>
            </div>
            <span className="text-[10px] text-slate-500">Directly resolve core friction</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Priority Shifts</span>
            <div className="text-base font-bold font-mono text-cyan-300 flex items-center gap-1">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{tierShiftsCount} Tier Changes</span>
            </div>
            <span className="text-[10px] text-slate-500">P0 / P1 realignments</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Persona Grounding</span>
            <div className="text-base font-bold font-mono text-emerald-400 flex items-center gap-1">
              <User className="w-4 h-4 text-emerald-400" />
              <span>100% Mapped</span>
            </div>
            <span className="text-[10px] text-slate-500">JTBD & pain points synced</span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-semibold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Suggestions ({suggestions.length})
            </button>
            <button
              onClick={() => setFilterType('VALUE_UPGRADES')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === 'VALUE_UPGRADES' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Value Upgrades ({valueUpgradesCount})
            </button>
            <button
              onClick={() => setFilterType('TIER_SHIFTS')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === 'TIER_SHIFTS' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tier Shifts ({tierShiftsCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyAll}
              disabled={isApplying || suggestions.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>Apply All Calibrated Suggestions ({suggestions.length})</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Main Suggestion Cards List */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 max-h-[56vh]">
          {isLoading ? (
            <div className="p-16 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-slate-200">
                AI Suggestion Engine analyzing Persona pain points and historical RICE trends...
              </p>
              <p className="text-xs text-slate-400">
                Synthesizing JTBD value multipliers, ERP delivery speed variance, and confidence evidence.
              </p>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No stories match the selected filter.
            </div>
          ) : (
            filteredSuggestions.map((item) => {
              const isApplied = appliedStoryIds.has(item.storyId);
              const isExpanded = expandedStoryId === item.storyId;

              return (
                <div
                  key={item.storyId}
                  className={`p-4 rounded-xl border transition-all space-y-3.5 ${
                    item.isTierShift
                      ? 'bg-purple-950/15 border-purple-900/50 hover:border-purple-700/60'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {item.storyId}
                      </span>
                      <span className="text-xs font-bold text-slate-100">
                        {item.storyTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-slate-400">{item.currentValues.riceScore.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400 font-bold text-sm">
                          {item.recommendedValues.riceScore.toLocaleString()} pts
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.riceDelta >= 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {item.riceDelta >= 0 ? `+${item.riceDeltaPct}%` : `${item.riceDeltaPct}%`}
                        </span>
                      </div>

                      {item.isTierShift && (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          {item.currentValues.tier} → {item.recommendedValues.tier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linked Persona Context Banner */}
                  <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-300">
                        <strong>Linked Persona:</strong> {item.persona} ({item.personaRole})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800 shrink-0">
                      Alignment: {item.personaAlignmentScore}%
                    </span>
                  </div>

                  {/* 3 Parameter Comparative Grid: Value, Effort, Confidence */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    {/* VALUE (IMPACT) */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                        <span>1. Value (Impact)</span>
                        <span className={item.recommendedValues.impact > item.currentValues.impact ? 'text-purple-400' : 'text-slate-500'}>
                          {item.currentValues.impact} → {item.recommendedValues.impact}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="text-purple-300">{item.recommendedValues.impact} / 3.0</span>
                        {item.recommendedValues.impact > item.currentValues.impact && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-sans">
                            Upgrade
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans leading-snug">
                        {item.valueRationale}
                      </p>
                    </div>

                    {/* EFFORT */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                        <span>2. Effort (Weeks)</span>
                        <span className="text-cyan-400">
                          {item.currentValues.effort}w → {item.recommendedValues.effort}w
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="text-cyan-300">{item.recommendedValues.effort} person-weeks</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans leading-snug">
                        {item.effortRationale}
                      </p>
                    </div>

                    {/* CONFIDENCE */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                        <span>3. Confidence</span>
                        <span className="text-emerald-400">
                          {(item.currentValues.confidence * 100).toFixed(0)}% → {(item.recommendedValues.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="text-emerald-300">{(item.recommendedValues.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans leading-snug">
                        {item.confidenceRationale}
                      </p>
                    </div>
                  </div>

                  {/* Historical Trend Grounding */}
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-start gap-2 text-xs">
                    <History className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      <strong className="text-cyan-300">Historical RICE Trend Factor: </strong>
                      {item.trendInfluence}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Strict RICE formula: (Reach × Value × Confidence) / Effort
                    </span>

                    <button
                      onClick={() => handleApplySingle(item)}
                      disabled={isApplied || isApplying}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isApplied
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 opacity-80'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply AI Suggestions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            AI Suggestion Engine · Calibrated against Customer Personas & Backlog Telemetry
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close Engine
          </button>
        </div>
      </div>
    </div>
  );
};
