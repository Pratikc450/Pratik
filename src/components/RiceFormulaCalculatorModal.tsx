import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  X, 
  Sparkles, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  User, 
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Info
} from 'lucide-react';

interface Story {
  id: string;
  epicTitle?: string;
  asA: string;
  iWant?: string;
  soThat?: string;
  persona: string;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  riceScore?: number;
  estimationJustification?: string;
  acceptanceCriteria?: string[];
}

interface RiceFormulaCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  initialStoryId?: string;
  productName?: string;
  productContext?: string;
  onSaveScore: (storyId: string, metrics: {
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    riceScore: number;
    estimationJustification?: string;
  }) => Promise<void> | void;
}

export const RiceFormulaCalculatorModal: React.FC<RiceFormulaCalculatorModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialStoryId,
  productName = 'Product',
  productContext = '',
  onSaveScore
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>(initialStoryId || stories[0]?.id || 'US-101');
  
  // Slider metrics
  const [reach, setReach] = useState<number>(2500);
  const [impact, setImpact] = useState<number>(2.0);
  const [confidence, setConfidence] = useState<number>(0.8);
  const [effort, setEffort] = useState<number>(2.0);
  const [justification, setJustification] = useState<string>('');
  
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active Story
  const activeStory = useMemo(() => {
    return stories.find(s => s.id === selectedStoryId) || stories[0];
  }, [stories, selectedStoryId]);

  // Sync state when selected story changes or modal opens
  useEffect(() => {
    if (activeStory) {
      setReach(activeStory.reach ?? 2500);
      setImpact(activeStory.impact ?? 2.0);
      setConfidence(activeStory.confidence ?? 0.8);
      setEffort(activeStory.effort ?? 2.0);
      setJustification(activeStory.estimationJustification ?? '');
      setSaveSuccess(false);
    }
  }, [selectedStoryId, activeStory]);

  useEffect(() => {
    if (initialStoryId) {
      setSelectedStoryId(initialStoryId);
    }
  }, [initialStoryId]);

  if (!isOpen) return null;

  // Real-time RICE calculation
  const computedRiceScore = Math.round(((reach * impact * confidence) / effort) * 10) / 10;
  const originalScore = activeStory?.riceScore ?? Math.round(((activeStory?.reach ?? 1000) * (activeStory?.impact ?? 2) * (activeStory?.confidence ?? 0.8)) / (activeStory?.effort ?? 2));
  const scoreDelta = computedRiceScore - originalScore;

  // Ease score derived from effort
  const easeScore = effort <= 1.0 ? 10 : effort <= 1.5 ? 9 : effort <= 2.0 ? 8 : effort <= 3.0 ? 7 : effort <= 4.0 ? 5 : effort <= 6.0 ? 3 : 2;

  // Priority Tier
  const getTier = (score: number) => {
    if (score >= 3000) {
      return {
        label: 'P0 Critical (Sprint-Ready Gate)',
        badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-600',
        color: 'text-emerald-400',
        glow: 'shadow-emerald-950/40'
      };
    }
    if (score >= 1500) {
      return {
        label: 'P1 High Strategic Value',
        badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-600',
        color: 'text-cyan-400',
        glow: 'shadow-cyan-950/40'
      };
    }
    if (score >= 600) {
      return {
        label: 'P2 Medium Iteration',
        badge: 'bg-amber-950/80 text-amber-300 border-amber-600',
        color: 'text-amber-400',
        glow: 'shadow-amber-950/40'
      };
    }
    return {
      label: 'P3 Deprioritized Backlog',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      color: 'text-slate-400',
      glow: 'shadow-slate-950/40'
    };
  };

  const calculatedTier = getTier(computedRiceScore);

  // AI Quick Auto-fill inside the modal
  const handleAiAutoFill = async () => {
    if (!activeStory) return;
    setIsAutoFilling(true);
    try {
      const res = await fetch('/api/ai/suggest-rice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: activeStory,
          productName,
          productContext
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setReach(data.metrics.reach);
          setImpact(data.metrics.impact);
          setConfidence(data.metrics.confidence);
          setEffort(data.metrics.effort);
          if (data.metrics.justification) {
            setJustification(data.metrics.justification);
          }
        }
      }
    } catch (err) {
      console.warn('AI suggestion failed', err);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Reset to original story baseline
  const handleReset = () => {
    if (activeStory) {
      setReach(activeStory.reach ?? 2500);
      setImpact(activeStory.impact ?? 2.0);
      setConfidence(activeStory.confidence ?? 0.8);
      setEffort(activeStory.effort ?? 2.0);
      setJustification(activeStory.estimationJustification ?? '');
    }
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveScore(selectedStoryId, {
        reach,
        impact,
        confidence,
        effort,
        riceScore: computedRiceScore,
        estimationJustification: justification.trim() || undefined
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save calibrated score', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Calculator className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  RICE Formula Calculator & Calibration Modal
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Interactive Calibrator
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manually tune Reach, Impact, Confidence, and Effort sliders to calibrate exact roadmap ROI before saving.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Target Story Selector & Story Summary Bar */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-400">Select Target Story:</label>
                <select
                  value={selectedStoryId}
                  onChange={(e) => setSelectedStoryId(e.target.value)}
                  className="bg-slate-900 text-xs font-bold text-purple-300 border border-purple-500/40 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  {stories.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id}: {s.persona} (Score: {(s.riceScore ?? 1000).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAiAutoFill}
                  disabled={isAutoFilling}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Use Gemini AI to analyze story narrative and suggest quantitative baseline"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isAutoFilling ? 'animate-spin' : ''}`} />
                  <span>{isAutoFilling ? 'Analyzing...' : 'AI Auto-fill Baseline'}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Reset sliders to story original baseline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Story Statement Detail */}
            {activeStory && (
              <div className="pt-2 border-t border-slate-850 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 text-[10px] border border-purple-850">
                    {activeStory.id}
                  </span>
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>{activeStory.persona}</span>
                  </span>
                  {activeStory.epicTitle && (
                    <span className="text-[11px] text-slate-500">· {activeStory.epicTitle}</span>
                  )}
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-purple-300">As a</strong> {activeStory.asA}{' '}
                  <strong className="text-cyan-300">I want</strong> {activeStory.iWant}{' '}
                  <strong className="text-emerald-300">So that</strong> {activeStory.soThat}
                </p>
              </div>
            )}
          </div>

          {/* Real-Time Live Calculation Display & Formula Header */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Live Quantitative RICE Formula Output</span>
                </span>
                <div className="font-mono text-xs sm:text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-purple-300">({reach.toLocaleString()} Reach)</span>
                  <span>×</span>
                  <span className="text-cyan-300">({impact.toFixed(1)}x Impact)</span>
                  <span>×</span>
                  <span className="text-emerald-300">({(confidence * 100).toFixed(0)}% Conf)</span>
                  <span>÷</span>
                  <span className="text-amber-300">({effort}w Effort)</span>
                  <span>=</span>
                  <span className="text-xl font-black text-white px-2.5 py-0.5 rounded bg-purple-950 border border-purple-600 shadow-md">
                    {computedRiceScore.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Tier & Delta Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border ${calculatedTier.badge}`}>
                  {calculatedTier.label}
                </span>

                {scoreDelta !== 0 && (
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border ${
                    scoreDelta > 0 
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
                  }`}>
                    {scoreDelta > 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                    )}
                    <span>{scoreDelta > 0 ? `+${scoreDelta.toLocaleString()}` : scoreDelta.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4 Interactive Calibration Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Reach Slider */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                    <span>1. Reach (R)</span>
                  </span>
                  <p className="text-[10px] text-slate-500">Quarterly target audience exposed</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    step="100"
                    value={reach}
                    onChange={(e) => setReach(Math.max(100, Number(e.target.value)))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-purple-200 text-right focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-400">users</span>
                </div>
              </div>

              <input
                type="range"
                min="300"
                max="25000"
                step="200"
                value={reach}
                onChange={(e) => setReach(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
              />

              {/* Reach Presets */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setReach(1200)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                >
                  Admin (1.2k)
                </button>
                <button
                  type="button"
                  onClick={() => setReach(4500)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                >
                  Procurement (4.5k)
                </button>
                <button
                  type="button"
                  onClick={() => setReach(15000)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                >
                  Checkout (15k)
                </button>
              </div>
            </div>

            {/* 2. Impact Slider */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <span>2. Impact (I)</span>
                  </span>
                  <p className="text-[10px] text-slate-500">Business value & conversion multiplier</p>
                </div>
                <div className="flex items-center gap-1 font-mono text-cyan-300 text-xs font-bold">
                  <span>{impact.toFixed(1)}x</span>
                </div>
              </div>

              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.25"
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
              />

              {/* Impact Presets */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setImpact(0.5)}
                  className={`px-1.5 py-0.5 rounded border ${impact === 0.5 ? 'bg-cyan-950 text-cyan-200 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  0.5x Low
                </button>
                <button
                  type="button"
                  onClick={() => setImpact(1.0)}
                  className={`px-1.5 py-0.5 rounded border ${impact === 1.0 ? 'bg-cyan-950 text-cyan-200 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  1.0x Med
                </button>
                <button
                  type="button"
                  onClick={() => setImpact(2.0)}
                  className={`px-1.5 py-0.5 rounded border ${impact === 2.0 ? 'bg-cyan-950 text-cyan-200 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  2.0x High
                </button>
                <button
                  type="button"
                  onClick={() => setImpact(3.0)}
                  className={`px-1.5 py-0.5 rounded border ${impact === 3.0 ? 'bg-cyan-950 text-cyan-200 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  3.0x Massive
                </button>
              </div>
            </div>

            {/* 3. Confidence Slider */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    <span>3. Confidence (C)</span>
                  </span>
                  <p className="text-[10px] text-slate-500">Requirement certainty & evidence validation</p>
                </div>
                <div className="flex items-center gap-1 font-mono text-emerald-300 text-xs font-bold">
                  <span>{(confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
              />

              {/* Confidence Presets */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setConfidence(0.5)}
                  className={`px-1.5 py-0.5 rounded border ${confidence === 0.5 ? 'bg-emerald-950 text-emerald-200 border-emerald-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  50% Speculative
                </button>
                <button
                  type="button"
                  onClick={() => setConfidence(0.8)}
                  className={`px-1.5 py-0.5 rounded border ${confidence === 0.8 ? 'bg-emerald-950 text-emerald-200 border-emerald-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  80% Clear Spec
                </button>
                <button
                  type="button"
                  onClick={() => setConfidence(0.95)}
                  className={`px-1.5 py-0.5 rounded border ${confidence === 0.95 ? 'bg-emerald-950 text-emerald-200 border-emerald-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  95% Validated Data
                </button>
              </div>
            </div>

            {/* 4. Effort & Ease Slider */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <span>4. Effort (E) & Ease</span>
                  </span>
                  <p className="text-[10px] text-slate-500">Engineering person-weeks required</p>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-amber-300 text-xs font-bold">
                  <span>{effort}w</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300">
                    Ease {easeScore}/10
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />

              {/* Effort Presets */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setEffort(0.5)}
                  className={`px-1.5 py-0.5 rounded border ${effort === 0.5 ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  0.5w Quick Win
                </button>
                <button
                  type="button"
                  onClick={() => setEffort(2.0)}
                  className={`px-1.5 py-0.5 rounded border ${effort === 2.0 ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  2.0w Standard
                </button>
                <button
                  type="button"
                  onClick={() => setEffort(4.0)}
                  className={`px-1.5 py-0.5 rounded border ${effort === 4.0 ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  4.0w Complex
                </button>
                <button
                  type="button"
                  onClick={() => setEffort(6.0)}
                  className={`px-1.5 py-0.5 rounded border ${effort === 6.0 ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  6.0w Distributed
                </button>
              </div>
            </div>
          </div>

          {/* Calibration Rationale / Justification Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>Calibration Rationale / Audit Justification Note:</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Sizing adjusted following architectural sync with core backend team. High impact grounded on cart abandonment telemetry."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            Formulas governed under Navigator Production PM Schema
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-950/60 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Saved to System!</span>
                </>
              ) : isSaving ? (
                <span>Saving to System...</span>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-100" />
                  <span>Save & Apply Score ({computedRiceScore.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
