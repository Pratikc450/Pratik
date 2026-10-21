import React, { useState, useMemo } from 'react';
import { GeneratedArtifact, ArtifactVersionRecord, ArtifactStatus } from '../types.js';
import {
  computePrdDiff,
  PrdStructuredDiff,
  DiffChangeType,
  PrdFunctionalRequirementDiff
} from '../utils/diffUtils.js';
import {
  GitCompare,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
  Edit3,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Target,
  FileText,
  Sliders,
  Filter,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface InlinePrdStructuralDiffProps {
  artifact: GeneratedArtifact;
  versionHistory: ArtifactVersionRecord[];
  currentSelectedVersion: number;
  productName: string;
  onOpenFullComparison: (versionA: number, versionB: number) => void;
  onClose?: () => void;
}

export const InlinePrdStructuralDiff: React.FC<InlinePrdStructuralDiffProps> = ({
  artifact,
  versionHistory,
  currentSelectedVersion,
  productName,
  onOpenFullComparison,
  onClose
}) => {
  const sortedVersions = useMemo(() => {
    return [...versionHistory].sort((a, b) => a.version - b.version);
  }, [versionHistory]);

  const defaultTarget = currentSelectedVersion || artifact.version;
  const defaultBase = useMemo(() => {
    const prior = sortedVersions.filter(v => v.version < defaultTarget);
    if (prior.length > 0) return prior[prior.length - 1].version;
    return sortedVersions.length >= 2 ? sortedVersions[0].version : defaultTarget;
  }, [sortedVersions, defaultTarget]);

  const [versionA, setVersionA] = useState<number>(defaultBase);
  const [versionB, setVersionB] = useState<number>(defaultTarget);
  const [activeSection, setActiveSection] = useState<'functional' | 'slas' | 'metrics' | 'scope' | 'intent'>('functional');
  const [filterMode, setFilterMode] = useState<'all' | 'changes-only'>('changes-only');

  const objA = useMemo(() => {
    return sortedVersions.find(v => v.version === versionA) || sortedVersions[0];
  }, [sortedVersions, versionA]);

  const objB = useMemo(() => {
    return sortedVersions.find(v => v.version === versionB) || sortedVersions[sortedVersions.length - 1];
  }, [sortedVersions, versionB]);

  const prdDiff: PrdStructuredDiff | null = useMemo(() => {
    if (!objA?.schemaData || !objB?.schemaData) return null;
    return computePrdDiff(objA.schemaData, objB.schemaData);
  }, [objA, objB]);

  const summary = prdDiff?.summary || { addedCount: 0, modifiedCount: 0, removedCount: 0, unchangedCount: 0 };

  const handleSwap = () => {
    const temp = versionA;
    setVersionA(versionB);
    setVersionB(temp);
  };

  const shouldShow = (type: DiffChangeType) => {
    if (filterMode === 'changes-only') return type !== 'unchanged';
    return true;
  };

  return (
    <div className="rounded-2xl border border-indigo-500/40 bg-slate-950/95 p-4 sm:p-5 space-y-4 shadow-xl shadow-indigo-950/20">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Inline Structural Diff Viewer
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                v{versionA}.0 vs v{versionB}.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Structural comparison of requirements, priorities, non-functional SLAs, and success metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onOpenFullComparison(versionA, versionB)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Open Full Side-by-Side Comparison Workspace"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Comparison View</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* 2. Version Picker & Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
        {/* Base Version */}
        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Base (A):</span>
          <select
            value={versionA}
            onChange={(e) => setVersionA(Number(e.target.value))}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {sortedVersions.map(v => (
              <option key={`a-${v.version}`} value={v.version}>
                v{v.version}.0 {v.status === 'APPROVED' ? '✓' : '✎'} ({v.changeSummary?.slice(0, 30) || 'Iteration'})
              </option>
            ))}
          </select>
        </div>

        {/* Swap & Metrics Badges */}
        <div className="md:col-span-4 flex items-center justify-center gap-2">
          <button
            onClick={handleSwap}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Swap Base and Target"
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300" title="Added items">
              +{summary.addedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300" title="Modified items">
              ~{summary.modifiedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300" title="Removed items">
              -{summary.removedCount}
            </span>
          </div>
        </div>

        {/* Target Version */}
        <div className="md:col-span-4 flex items-center gap-2 justify-end">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Target (B):</span>
          <select
            value={versionB}
            onChange={(e) => setVersionB(Number(e.target.value))}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {sortedVersions.map(v => (
              <option key={`b-${v.version}`} value={v.version}>
                v{v.version}.0 {v.status === 'APPROVED' ? '✓' : '✎'} ({v.changeSummary?.slice(0, 30) || 'Iteration'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Section Navigation & Filter Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSection('functional')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeSection === 'functional'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Functional Reqs ({prdDiff?.functionalRequirements.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveSection('slas')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeSection === 'slas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>SLAs & Non-Functional ({prdDiff?.nonFunctionalRequirements.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveSection('metrics')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeSection === 'metrics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>Success Metrics ({prdDiff?.successMetrics.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveSection('scope')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeSection === 'scope'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Scope Boundaries</span>
          </button>
          <button
            onClick={() => setActiveSection('intent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeSection === 'intent'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Intent & Objective</span>
          </button>
        </div>

        <button
          onClick={() => setFilterMode(prev => prev === 'all' ? 'changes-only' : 'all')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
            filterMode === 'changes-only'
              ? 'bg-amber-950/60 border-amber-800 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>{filterMode === 'changes-only' ? 'Showing Changes Only' : 'Showing All Elements'}</span>
        </button>
      </div>

      {/* 4. Section Diff Content */}
      <div className="space-y-3 pt-1">
        {/* Section: Functional Requirements */}
        {activeSection === 'functional' && prdDiff && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {prdDiff.functionalRequirements
                .filter(fr => shouldShow(fr.type))
                .map((fr, idx) => {
                  const isPriorityChanged = fr.priorityA && fr.priorityB && fr.priorityA !== fr.priorityB;
                  const isReqChanged = fr.requirementA && fr.requirementB && fr.requirementA !== fr.requirementB;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        fr.type === 'added' ? 'bg-emerald-950/20 border-emerald-800/80' :
                        fr.type === 'removed' ? 'bg-rose-950/20 border-rose-800/80 line-through opacity-70' :
                        fr.type === 'modified' ? 'bg-amber-950/20 border-amber-800/80' :
                        'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-200">{fr.id}</span>
                        <div className="flex items-center gap-1.5">
                          {isPriorityChanged ? (
                            <span className="font-mono text-[10px] flex items-center gap-1">
                              <span className="text-slate-500 line-through">{fr.priorityA}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800">
                                {fr.priorityB}
                              </span>
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              (fr.priorityB || fr.priorityA) === 'MUST' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                              (fr.priorityB || fr.priorityA) === 'SHOULD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {fr.priorityB || fr.priorityA}
                            </span>
                          )}

                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            fr.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' :
                            fr.type === 'removed' ? 'bg-rose-500/20 text-rose-300' :
                            fr.type === 'modified' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-800 text-slate-500'
                          }`}>
                            {fr.type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {isReqChanged ? (
                        <div className="space-y-1 text-[11px] leading-relaxed">
                          <p className="text-slate-500 line-through">Prev: {fr.requirementA}</p>
                          <p className="text-slate-100 font-medium">New: {fr.requirementB}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {fr.requirementB || fr.requirementA}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
            {prdDiff.functionalRequirements.filter(fr => shouldShow(fr.type)).length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No functional requirement differences between v{versionA} and v{versionB}.
              </div>
            )}
          </div>
        )}

        {/* Section: SLAs & Non-Functional */}
        {activeSection === 'slas' && prdDiff && (
          <div className="space-y-2">
            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800">
              {prdDiff.nonFunctionalRequirements
                .filter(n => shouldShow(n.type))
                .map((n, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-2.5 text-xs">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      n.type === 'added' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      n.type === 'removed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 line-through' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {n.type === 'added' ? '+ ADD' : n.type === 'removed' ? '- REM' : '='}
                    </span>
                    <span className={`text-slate-200 leading-relaxed ${n.type === 'removed' ? 'line-through text-slate-500' : ''}`}>
                      {n.value}
                    </span>
                  </div>
                ))}
            </div>
            {prdDiff.nonFunctionalRequirements.filter(n => shouldShow(n.type)).length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No non-functional requirement differences between v{versionA} and v{versionB}.
              </div>
            )}
          </div>
        )}

        {/* Section: Success Metrics */}
        {activeSection === 'metrics' && prdDiff && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {prdDiff.successMetrics
                .filter(m => shouldShow(m.type))
                .map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      m.type === 'added' ? 'bg-emerald-950/20 border-emerald-800/80' :
                      m.type === 'removed' ? 'bg-rose-950/20 border-rose-800/80' :
                      m.type === 'modified' ? 'bg-amber-950/20 border-amber-800/80' :
                      'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{m.metric}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        m.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' :
                        m.type === 'removed' ? 'bg-rose-500/20 text-rose-300' :
                        m.type === 'modified' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {m.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono flex items-center gap-2">
                      {m.type === 'modified' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 line-through">{m.targetA}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-400 font-bold">{m.targetB}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">Target: <strong className="text-white">{m.targetB || m.targetA}</strong></span>
                      )}
                      <span className="text-slate-500 text-[10px]">
                        (Baseline: {m.baselineB || m.baselineA || 'N/A'})
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            {prdDiff.successMetrics.filter(m => shouldShow(m.type)).length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No success metrics differences between v{versionA} and v{versionB}.
              </div>
            )}
          </div>
        )}

        {/* Section: Scope Boundaries */}
        {activeSection === 'scope' && prdDiff && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* MVP In Scope */}
            <div className="p-3 rounded-xl bg-emerald-950/10 border border-emerald-900/40 space-y-2">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                MVP Scope Additions & Changes
              </span>
              <div className="space-y-1">
                {prdDiff.mvpScope.filter(s => shouldShow(s.type)).map((s, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-1.5 text-[11px]">
                    <span className="text-emerald-400">{s.type === 'added' ? '➕' : '✅'}</span>
                    <span className={s.type === 'added' ? 'text-emerald-300 font-semibold' : ''}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Out of Scope */}
            <div className="p-3 rounded-xl bg-rose-950/10 border border-rose-900/40 space-y-2">
              <span className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
                Explicitly Out of Scope
              </span>
              <div className="space-y-1">
                {prdDiff.outOfScope.filter(s => shouldShow(s.type)).map((s, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 text-[11px]">
                    <span className="text-rose-400">{s.type === 'added' ? '➕' : '🚫'}</span>
                    <span>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: Intent & Objective */}
        {activeSection === 'intent' && prdDiff && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Objective Diff
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  prdDiff.objective.type === 'modified' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {prdDiff.objective.type.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                  <div className="text-[10px] font-mono text-slate-500 mb-0.5">v{versionA}.0 Baseline:</div>
                  <p>{prdDiff.objective.oldValue}</p>
                </div>
                <div className={`p-2.5 rounded-lg bg-slate-950 border border-slate-800 ${prdDiff.objective.type === 'modified' ? 'border-amber-700/80 bg-amber-950/10' : ''}`}>
                  <div className="text-[10px] font-mono text-indigo-400 mb-0.5">v{versionB}.0 Target:</div>
                  <p className="text-slate-100 font-medium">{prdDiff.objective.value}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
