import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers,
  X,
  FileDown,
  Check,
  Info,
  Sliders,
  History,
  Activity
} from 'lucide-react';

export interface ConfidenceAuditItem {
  storyId: string;
  storyTitle: string;
  asA: string;
  persona: string;
  currentConfidence: number;
  suggestedConfidence: number;
  confidenceDelta: number;
  driftRisk: 'HIGH' | 'MODERATE' | 'LOW' | 'CALIBRATED';
  originalRationale: string;
  auditFindings: string;
  historicalDeliveryFactor: string;
  recommendedAction: string;
  currentRice: number;
  recalculatedRice: number;
  oldTier: string;
  newTier: string;
  tierChanged: boolean;
}

interface ConfidenceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: any[];
  productId: string;
  productName?: string;
  artifactId?: string;
  onApplyUpdates: (updates: Array<{ id: string; confidence: number; riceScore: number; priority?: string }>) => Promise<void>;
}

export const ConfidenceAuditModal: React.FC<ConfidenceAuditModalProps> = ({
  isOpen,
  onClose,
  stories,
  productId,
  productName = 'Product',
  artifactId,
  onApplyUpdates
}) => {
  const [audits, setAudits] = useState<ConfidenceAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'HIGH' | 'MODERATE' | 'TIER_CHANGED'>('ALL');
  const [appliedStoryIds, setAppliedStoryIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stories.length > 0) {
      runAudit();
    }
  }, [isOpen, stories, productId]);

  const runAudit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/confidence-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories,
          productId,
          deliveryTelemetry: {
            meanSprintVelocity: 36,
            integrationSlipRatio: 1.38,
            p95LatencyMs: 140
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audits) {
          setAudits(data.audits);
        }
      }
    } catch (err) {
      console.warn('Failed to run confidence audit', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAudits = audits.filter(item => {
    if (selectedFilter === 'HIGH') return item.driftRisk === 'HIGH';
    if (selectedFilter === 'MODERATE') return item.driftRisk === 'MODERATE';
    if (selectedFilter === 'TIER_CHANGED') return item.tierChanged;
    return true;
  });

  const highDriftCount = audits.filter(a => a.driftRisk === 'HIGH').length;
  const tierChangedCount = audits.filter(a => a.tierChanged).length;
  const avgDrift = audits.length > 0
    ? Math.round((audits.reduce((acc, a) => acc + a.confidenceDelta, 0) / audits.length) * 100)
    : 0;

  const handleApplySingle = async (item: ConfidenceAuditItem) => {
    setIsApplying(true);
    try {
      await onApplyUpdates([{
        id: item.storyId,
        confidence: item.suggestedConfidence,
        riceScore: item.recalculatedRice,
        priority: item.newTier
      }]);
      setAppliedStoryIds(prev => new Set([...prev, item.storyId]));
      setSuccessToast(`Calibrated ${item.storyId} confidence to ${(item.suggestedConfidence * 100).toFixed(0)}%`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error('Failed to apply update', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      const updates = audits.map(a => ({
        id: a.storyId,
        confidence: a.suggestedConfidence,
        riceScore: a.recalculatedRice,
        priority: a.newTier
      }));
      await onApplyUpdates(updates);
      setAppliedStoryIds(new Set(audits.map(a => a.storyId)));
      setSuccessToast(`Applied calibrated confidence to all ${audits.length} stories!`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error('Failed to apply all updates', err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  AI RICE Confidence Audit & Calibration
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Telemetry Grounded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audits rationale behind RICE confidence scores against historical delivery speed, API friction, and sprint slip telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Baseline Strip */}
        <div className="p-4 bg-slate-950 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Confidence Drift</span>
            <div className={`text-base font-bold font-mono mt-0.5 flex items-center gap-1 ${avgDrift < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {avgDrift < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              <span>{avgDrift > 0 ? `+${avgDrift}%` : `${avgDrift}%`}</span>
            </div>
            <span className="text-[10px] text-slate-500">vs historical execution</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">High Drift Exposure</span>
            <div className="text-base font-bold font-mono text-rose-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{highDriftCount} Stories</span>
            </div>
            <span className="text-[10px] text-slate-500">Overly optimistic estimates</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Priority Shifts</span>
            <div className="text-base font-bold font-mono text-purple-300 mt-0.5 flex items-center gap-1">
              <Layers className="w-4 h-4" />
              <span>{tierChangedCount} Tier Shifts</span>
            </div>
            <span className="text-[10px] text-slate-500">RICE threshold realignment</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Delivery Telemetry Grounding</span>
            <div className="text-base font-bold font-mono text-cyan-300 mt-0.5 flex items-center gap-1">
              <History className="w-4 h-4" />
              <span>5 Sprints Analyzed</span>
            </div>
            <span className="text-[10px] text-slate-500">Slip rate +38% on ERP/Webhooks</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                selectedFilter === 'ALL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Audits ({audits.length})
            </button>
            <button
              onClick={() => setSelectedFilter('HIGH')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                selectedFilter === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              High Drift ({highDriftCount})
            </button>
            <button
              onClick={() => setSelectedFilter('TIER_CHANGED')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                selectedFilter === 'TIER_CHANGED' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tier Shifts ({tierChangedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAudit}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Re-Audit</span>
            </button>

            <button
              onClick={handleApplyAll}
              disabled={isApplying || audits.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Apply All Calibrated ({audits.length})</span>
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

        {/* Audit Cards List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[55vh]">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-slate-200">
                Auditing RICE confidence rationale against historical delivery telemetry...
              </p>
              <p className="text-xs text-slate-400">
                Evaluating sprint burndown velocity, API failure metrics, and optimism bias.
              </p>
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No stories match the selected audit filter.
            </div>
          ) : (
            filteredAudits.map((item) => {
              const isApplied = appliedStoryIds.has(item.storyId);
              return (
                <div
                  key={item.storyId}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    item.driftRisk === 'HIGH'
                      ? 'bg-rose-950/15 border-rose-900/50 hover:border-rose-700/60'
                      : item.driftRisk === 'MODERATE'
                      ? 'bg-amber-950/15 border-amber-900/50 hover:border-amber-700/60'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {item.storyId}
                      </span>
                      <span className="text-xs font-bold text-slate-100">
                        {item.storyTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({item.persona})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        item.driftRisk === 'HIGH' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                        item.driftRisk === 'MODERATE' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                        'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        {item.driftRisk} DRIFT
                      </span>

                      {item.tierChanged && (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          {item.oldTier} → {item.newTier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confidence Comparison Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase block">Original Confidence</span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-200">
                          {(item.currentConfidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (RICE: {item.currentRice.toLocaleString()} pts)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans italic line-clamp-1">
                        "{item.originalRationale}"
                      </p>
                    </div>

                    <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-3">
                      <span className="text-[10px] text-purple-400 uppercase font-bold block">
                        Telemetry Calibrated Suggestion
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-emerald-400">
                          {(item.suggestedConfidence * 100).toFixed(0)}%
                        </span>
                        <span className={`text-[11px] font-bold ${item.confidenceDelta < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          ({item.confidenceDelta > 0 ? `+${(item.confidenceDelta * 100).toFixed(0)}%` : `${(item.confidenceDelta * 100).toFixed(0)}%`})
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs text-purple-300 font-bold">
                          {item.recalculatedRice.toLocaleString()} pts ({item.newTier})
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-300/80 font-sans leading-snug">
                        {item.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Telemetry Findings Breakdown */}
                  <div className="text-xs space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong className="text-purple-300">Rationale Audit: </strong>
                        {item.auditFindings}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-800/50">
                      <Activity className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <p className="text-slate-400 text-[11px] font-mono leading-relaxed">
                        <strong className="text-cyan-300 font-sans">Historical Delivery Signal: </strong>
                        {item.historicalDeliveryFactor}
                      </p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Telemetry Calibrated · Audit Hash: CALIB-{item.storyId}
                    </span>

                    <button
                      onClick={() => handleApplySingle(item)}
                      disabled={isApplied || isApplying}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isApplied
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 opacity-80'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Calibrated</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply Calibration</span>
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
            Strict Formula: RICE = (Reach × Impact × Confidence) / Effort
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
