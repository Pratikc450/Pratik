import React, { useState, useMemo } from 'react';
import { GeneratedArtifact, ArtifactVersionRecord } from '../types.js';
import {
  computeRoadmapDiff,
  RoadmapStructuredDiff,
  DiffChangeType,
  RoadmapInitiativeDiff
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
  Map,
  Layers,
  Calendar,
  Maximize2,
  Filter,
  Check,
  TrendingUp,
  Tag
} from 'lucide-react';

interface InlineRoadmapStructuralDiffProps {
  artifact: GeneratedArtifact;
  versionHistory: ArtifactVersionRecord[];
  currentSelectedVersion: number;
  productName: string;
  onOpenFullComparison: (versionA: number, versionB: number) => void;
  onClose?: () => void;
}

export const InlineRoadmapStructuralDiff: React.FC<InlineRoadmapStructuralDiffProps> = ({
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
  const [activeTab, setActiveTab] = useState<'initiatives' | 'quarters' | 'vision' | 'risks'>('initiatives');
  const [filterMode, setFilterMode] = useState<'all' | 'changes-only'>('changes-only');

  const objA = useMemo(() => {
    return sortedVersions.find(v => v.version === versionA) || sortedVersions[0];
  }, [sortedVersions, versionA]);

  const objB = useMemo(() => {
    return sortedVersions.find(v => v.version === versionB) || sortedVersions[sortedVersions.length - 1];
  }, [sortedVersions, versionB]);

  const roadmapDiff: RoadmapStructuredDiff | null = useMemo(() => {
    if (!objA?.schemaData || !objB?.schemaData) return null;
    return computeRoadmapDiff(objA.schemaData, objB.schemaData);
  }, [objA, objB]);

  const summary = roadmapDiff?.summary || { addedCount: 0, modifiedCount: 0, removedCount: 0, unchangedCount: 0 };

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
    <div className="rounded-2xl border border-blue-500/40 bg-slate-950/95 p-4 sm:p-5 space-y-4 shadow-xl shadow-blue-950/20 animate-in fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Inline Roadmap Structural Diff
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                v{versionA}.0 vs v{versionB}.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Structural differences in delivery quarters, initiative timeline shifts, effort modifications, and strategic vision.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onOpenFullComparison(versionA, versionB)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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

      {/* 2. Version Pickers & Change Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
        {/* Base Version */}
        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Base (A):</span>
          <select
            value={versionA}
            onChange={(e) => setVersionA(Number(e.target.value))}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {sortedVersions.map(v => (
              <option key={`a-${v.version}`} value={v.version}>
                v{v.version}.0 {v.status === 'APPROVED' ? '✓' : '✎'} ({v.changeSummary?.slice(0, 30) || 'Milestone'})
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
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {sortedVersions.map(v => (
              <option key={`b-${v.version}`} value={v.version}>
                v{v.version}.0 {v.status === 'APPROVED' ? '✓' : '✎'} ({v.changeSummary?.slice(0, 30) || 'Milestone'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('initiatives')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeTab === 'initiatives'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Initiative Shifts & Changes</span>
          </button>
          <button
            onClick={() => setActiveTab('quarters')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeTab === 'quarters'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Quarter Horizons & Themes ({roadmapDiff?.quarters.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeTab === 'vision'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3 h-3" />
            <span>Strategic Vision & Pillars</span>
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              activeTab === 'risks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Delivery Risks ({roadmapDiff?.risks.length || 0})</span>
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

      {/* 4. Section Diff Details */}
      <div className="space-y-3 pt-1">
        {/* Initiatives Tab */}
        {activeTab === 'initiatives' && roadmapDiff && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roadmapDiff.quarters.flatMap(q => q.initiatives)
                .filter(init => shouldShow(init.type))
                .map((init, idx) => {
                  const isPriorityChanged = init.priorityA && init.priorityB && init.priorityA !== init.priorityB;
                  const isEffortChanged = init.effortWeeksA !== undefined && init.effortWeeksB !== undefined && init.effortWeeksA !== init.effortWeeksB;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        init.type === 'added' ? 'bg-emerald-950/20 border-emerald-800/80' :
                        init.type === 'removed' ? 'bg-rose-950/20 border-rose-800/80 line-through opacity-70' :
                        init.type === 'modified' ? 'bg-amber-950/20 border-amber-800/80' :
                        'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-slate-500 mr-1.5">{init.id}</span>
                          <span className="font-semibold text-slate-200">{init.title}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${
                          init.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' :
                          init.type === 'removed' ? 'bg-rose-500/20 text-rose-300' :
                          init.type === 'modified' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-slate-800 text-slate-500'
                        }`}>
                          {init.type.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        {isPriorityChanged ? (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-500 line-through">{init.priorityA}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-amber-400 font-bold px-1 py-0.2 rounded bg-amber-950 border border-amber-800">{init.priorityB}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Priority: {init.priorityB || init.priorityA}</span>
                        )}

                        {isEffortChanged && (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-500 line-through">{init.effortWeeksA}w</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-blue-400 font-bold">{init.effortWeeksB}w</span>
                          </span>
                        )}
                      </div>

                      {init.targetOutcomeB && (
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans pt-1 border-t border-slate-900">
                          <strong className="text-slate-400 font-mono text-[10px]">Target Outcome: </strong>
                          {init.targetOutcomeB}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Quarters Tab */}
        {activeTab === 'quarters' && roadmapDiff && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {roadmapDiff.quarters.map((q, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-400">{q.quarter}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    q.type === 'modified' ? 'bg-amber-500/20 text-amber-300' :
                    q.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {q.type.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200">{q.themeB || q.themeA}</h4>
                {q.themeA && q.themeB && q.themeA !== q.themeB && (
                  <p className="text-[10px] text-slate-500 line-through">Prev: {q.themeA}</p>
                )}
                <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800">
                  {q.initiatives.length} initiatives assigned
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vision & Pillars Tab */}
        {activeTab === 'vision' && roadmapDiff && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Strategic Vision Diff
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  roadmapDiff.vision.type === 'modified' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {roadmapDiff.vision.type.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                  <div className="text-[10px] font-mono text-slate-500 mb-0.5">v{versionA}.0 Baseline:</div>
                  <p>{roadmapDiff.vision.oldValue}</p>
                </div>
                <div className={`p-2.5 rounded-lg bg-slate-950 border border-slate-800 ${roadmapDiff.vision.type === 'modified' ? 'border-amber-700/80 bg-amber-950/10' : ''}`}>
                  <div className="text-[10px] font-mono text-blue-400 mb-0.5">v{versionB}.0 Target:</div>
                  <p className="text-slate-100 font-medium">{roadmapDiff.vision.value}</p>
                </div>
              </div>
            </div>

            {/* Strategic Pillars */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Strategic Pillars
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roadmapDiff.strategicPillars.map((p, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      p.type === 'added' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                      p.type === 'removed' ? 'bg-rose-950 text-rose-300 border-rose-700 line-through' :
                      'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    {p.type === 'added' && '+ '}
                    {p.type === 'removed' && '- '}
                    <span>{p.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risks Tab */}
        {activeTab === 'risks' && roadmapDiff && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {roadmapDiff.risks.filter(r => shouldShow(r.type)).map((r, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  r.type === 'added' ? 'bg-emerald-950/20 border-emerald-800/80' :
                  r.type === 'removed' ? 'bg-rose-950/20 border-rose-800/80 line-through' :
                  r.type === 'modified' ? 'bg-amber-950/20 border-amber-800/80' :
                  'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>{r.value.risk}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    r.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' :
                    r.type === 'removed' ? 'bg-rose-500/20 text-rose-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {r.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Mitigation: </strong>{r.value.mitigation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
