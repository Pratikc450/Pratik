import React, { useState, useMemo } from 'react';
import {
  ArtifactType,
  ArtifactStatus
} from '../types.js';
import {
  computePrdDiff,
  computeRoadmapDiff,
  computeProseLineDiff,
  PrdStructuredDiff,
  RoadmapStructuredDiff,
  DiffChangeType
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
  Download,
  Filter,
  Eye,
  FileText,
  Map,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  X,
  Layers,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Tag
} from 'lucide-react';

export interface VersionOption {
  version: number;
  label: string;
  status: ArtifactStatus;
  date: string;
  author?: string;
  changeSummary?: string;
  schemaData: any;
  renderedMarkdown: string;
  id?: string;
}

interface ArtifactDiffViewerProps {
  taskType: 'PRD' | 'ROADMAP';
  productName: string;
  versions: VersionOption[];
  initialVersionA?: number;
  initialVersionB?: number;
  onClose?: () => void;
  onCreateRevision?: () => void;
}

export const ArtifactDiffViewer: React.FC<ArtifactDiffViewerProps> = ({
  taskType,
  productName,
  versions,
  initialVersionA,
  initialVersionB,
  onClose,
  onCreateRevision
}) => {
  // Ensure we have at least 2 versions to compare
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => a.version - b.version);
  }, [versions]);

  const defaultA = initialVersionA ?? (sortedVersions.length >= 2 ? sortedVersions[sortedVersions.length - 2].version : sortedVersions[0]?.version ?? 1);
  const defaultB = initialVersionB ?? (sortedVersions[sortedVersions.length - 1]?.version ?? 2);

  const [versionA, setVersionA] = useState<number>(defaultA);
  const [versionB, setVersionB] = useState<number>(defaultB);
  const [diffMode, setDiffMode] = useState<'structured' | 'prose'>('structured');
  const [filterMode, setFilterMode] = useState<'all' | 'changes-only' | 'additions' | 'modifications'>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const currentObjA = useMemo(() => {
    return sortedVersions.find(v => v.version === versionA) || sortedVersions[0];
  }, [sortedVersions, versionA]);

  const currentObjB = useMemo(() => {
    return sortedVersions.find(v => v.version === versionB) || sortedVersions[sortedVersions.length - 1] || sortedVersions[0];
  }, [sortedVersions, versionB]);

  // Compute structured diffs
  const prdDiff: PrdStructuredDiff | null = useMemo(() => {
    if (taskType !== 'PRD') return null;
    return computePrdDiff(currentObjA?.schemaData, currentObjB?.schemaData);
  }, [taskType, currentObjA, currentObjB]);

  const roadmapDiff: RoadmapStructuredDiff | null = useMemo(() => {
    if (taskType !== 'ROADMAP') return null;
    return computeRoadmapDiff(currentObjA?.schemaData, currentObjB?.schemaData);
  }, [taskType, currentObjA, currentObjB]);

  // Compute prose diffs
  const proseDiff = useMemo(() => {
    return computeProseLineDiff(currentObjA?.renderedMarkdown || '', currentObjB?.renderedMarkdown || '');
  }, [currentObjA, currentObjB]);

  const summary = prdDiff ? prdDiff.summary : roadmapDiff ? roadmapDiff.summary : {
    addedCount: proseDiff.filter(l => l.type === 'added').length,
    modifiedCount: proseDiff.filter(l => l.type === 'modified').length,
    removedCount: proseDiff.filter(l => l.type === 'removed').length,
    unchangedCount: proseDiff.filter(l => l.type === 'unchanged').length
  };

  const handleSwap = () => {
    setVersionA(versionB);
    setVersionB(versionA);
  };

  const handleCopySummary = () => {
    const text = `Artifact Version Comparison (${taskType})
Product: ${productName}
Base Version: v${currentObjA?.version} (${currentObjA?.status})
Target Version: v${currentObjB?.version} (${currentObjB?.status})
Summary of Changes:
- Additions: +${summary.addedCount}
- Modifications: ~${summary.modifiedCount}
- Removals: -${summary.removedCount}
- Unchanged Items: ${summary.unchangedCount}
Note: ${currentObjB?.changeSummary || 'Version progression'}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownloadMarkdownDiff = () => {
    const content = `# Version Comparison Diff: ${taskType} for ${productName}
**Base:** v${currentObjA?.version} (${currentObjA?.status} · ${new Date(currentObjA?.date).toLocaleDateString()})  
**Target:** v${currentObjB?.version} (${currentObjB?.status} · ${new Date(currentObjB?.date).toLocaleDateString()})  

## Summary of Changes
- **Additions (+):** ${summary.addedCount}
- **Modifications (~):** ${summary.modifiedCount}
- **Removals (-):** ${summary.removedCount}
- **Unchanged:** ${summary.unchangedCount}

---

## Target Version Specification (v${currentObjB?.version})
${currentObjB?.renderedMarkdown}
`;
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${taskType.toLowerCase()}_diff_v${currentObjA?.version}_to_v${currentObjB?.version}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper to filter diff items
  const shouldShowItem = (type: DiffChangeType) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'changes-only') return type !== 'unchanged';
    if (filterMode === 'additions') return type === 'added';
    if (filterMode === 'modifications') return type === 'modified';
    return true;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-5 flex flex-col gap-4">
        {/* Main Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Side-by-Side Version Diff & Changelog
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {taskType}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Workspace: <span className="font-semibold text-slate-200">{productName}</span> · Compare additions, deletions, SLA shifts, and scope revisions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onCreateRevision && (
              <button
                onClick={onCreateRevision}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                title="Create a new version revision"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Revision</span>
              </button>
            )}

            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="Copy diff metrics"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdownDiff}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="Download full diff markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors ml-1"
                title="Close Diff Viewer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Version Pickers & Change Statistics Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          {/* Base Version (A) */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Base (A):
            </span>
            <div className="relative flex-1">
              <select
                value={versionA}
                onChange={(e) => setVersionA(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {sortedVersions.map((v) => (
                  <option key={`a-${v.version}`} value={v.version}>
                    v{v.version}.0 — {v.label} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              currentObjA?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {currentObjA?.status}
            </span>
          </div>

          {/* Swap Button & Diff Badges */}
          <div className="lg:col-span-4 flex items-center justify-center gap-2">
            <button
              onClick={handleSwap}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Swap Base and Comparison Versions"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            {/* Change Badges Pill Bar */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-emerald-300" title="Added items">
                <Plus className="w-3 h-3" />
                <span>{summary.addedCount}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 text-amber-300" title="Modified items">
                <Edit3 className="w-3 h-3" />
                <span>{summary.modifiedCount}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-800/60 text-rose-300" title="Removed items">
                <Minus className="w-3 h-3" />
                <span>{summary.removedCount}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400" title="Unchanged items">
                <span>={summary.unchangedCount}</span>
              </span>
            </div>
          </div>

          {/* Target Version (B) */}
          <div className="lg:col-span-4 flex items-center gap-2 justify-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Target (B):
            </span>
            <div className="relative flex-1">
              <select
                value={versionB}
                onChange={(e) => setVersionB(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {sortedVersions.map((v) => (
                  <option key={`b-${v.version}`} value={v.version}>
                    v{v.version}.0 — {v.label} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              currentObjB?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {currentObjB?.status}
            </span>
          </div>
        </div>

        {/* Secondary Mode & Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* View Mode Toggle: Structured vs Prose */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDiffMode('structured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                diffMode === 'structured'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Structured Specifications Diff</span>
            </button>
            <button
              onClick={() => setDiffMode('prose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                diffMode === 'prose'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Prose Markdown Split View</span>
            </button>
          </div>

          {/* Filter Changed Items Pill */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>
            {(['all', 'changes-only', 'additions', 'modifications'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filterMode === mode
                    ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'all' && 'All Elements'}
                {mode === 'changes-only' && `Changes Only (${summary.addedCount + summary.modifiedCount + summary.removedCount})`}
                {mode === 'additions' && `Additions (+${summary.addedCount})`}
                {mode === 'modifications' && `Modifications (~${summary.modifiedCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Diff Content Container */}
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-6">
        {/* Version Metadata Header Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Base Version v{currentObjA?.version}.0</span>
              <span className="text-slate-500 text-[11px] font-mono">{new Date(currentObjA?.date).toLocaleDateString()}</span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {currentObjA?.changeSummary || 'Baseline specification snapshot'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>Comparison Version v{currentObjB?.version}.0</span>
                <span className="text-[10px] text-emerald-400 font-mono">(Active Target)</span>
              </span>
              <span className="text-slate-500 text-[11px] font-mono">{new Date(currentObjB?.date).toLocaleDateString()}</span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {currentObjB?.changeSummary || 'Official approved revision with expanded requirements'}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODE 1: STRUCTURED SPECIFICATIONS DIFF (PRD)                   */}
        {/* ------------------------------------------------------------- */}
        {diffMode === 'structured' && taskType === 'PRD' && prdDiff && (
          <div className="space-y-6">
            {/* 1. Title & Objective */}
            {shouldShowItem(prdDiff.objective.type) && (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Objective & Strategic Intent</span>
                  </span>
                  {prdDiff.objective.type === 'modified' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Modified in v{versionB}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Unchanged
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  <div className="p-4 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-500">v{versionA}.0 Baseline</div>
                    <div className="text-xs text-slate-300 leading-relaxed font-sans">{prdDiff.objective.oldValue}</div>
                  </div>
                  <div className={`p-4 space-y-1 ${prdDiff.objective.type === 'modified' ? 'bg-amber-950/20' : ''}`}>
                    <div className="text-[10px] font-mono uppercase text-slate-500">v{versionB}.0 Target</div>
                    <div className="text-xs text-slate-100 font-medium leading-relaxed font-sans">{prdDiff.objective.value}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Functional Requirements Diff */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40 space-y-0">
              <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Functional Requirements (MoSCoW Matrix)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Requirement specifications, priority shifts (e.g. SHOULD → MUST), and new capabilities.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  {prdDiff.functionalRequirements.length} Items Total
                </span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {prdDiff.functionalRequirements
                  .filter(fr => shouldShowItem(fr.type))
                  .map((fr, idx) => {
                    const isAdded = fr.type === 'added';
                    const isRemoved = fr.type === 'removed';
                    const isModified = fr.type === 'modified';

                    return (
                      <div
                        key={idx}
                        className={`p-4 transition-colors ${
                          isAdded ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' :
                          isRemoved ? 'bg-rose-950/20 border-l-4 border-l-rose-500 opacity-75' :
                          isModified ? 'bg-amber-950/20 border-l-4 border-l-amber-500' :
                          'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-200">{fr.id}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              isAdded ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              isRemoved ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                              isModified ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {isAdded && '+ ADDED IN V' + versionB}
                              {isRemoved && '- REMOVED IN V' + versionB}
                              {isModified && '~ MODIFIED'}
                              {!isAdded && !isRemoved && !isModified && 'UNCHANGED'}
                            </span>
                          </div>

                          {/* MoSCoW Priority Indicator */}
                          <div className="flex items-center gap-2 text-xs font-mono">
                            {isModified && fr.priorityA !== fr.priorityB ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 line-through">
                                  {fr.priorityA}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-amber-400" />
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                  {fr.priorityB}
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                {fr.priorityB || fr.priorityA}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Requirement Text Comparison */}
                        <div className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                          {isModified ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                                <div className="text-[10px] font-mono text-slate-500 mb-1">Old Spec (v{versionA}):</div>
                                <div className="text-slate-400 line-through">{fr.requirementA}</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                                <div className="text-[10px] font-mono text-emerald-400 mb-1">Updated Spec (v{versionB}):</div>
                                <div className="text-slate-100 font-medium">{fr.requirementB}</div>
                              </div>
                            </div>
                          ) : (
                            <div className={isRemoved ? 'line-through text-slate-500' : ''}>
                              {fr.requirementB || fr.requirementA}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 3. Non-Functional SLAs & Success Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Success Metrics */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    <span>Success Metrics & Baselines</span>
                  </span>
                </div>
                <div className="p-3 divide-y divide-slate-800/60">
                  {prdDiff.successMetrics
                    .filter(m => shouldShowItem(m.type))
                    .map((m, idx) => (
                      <div key={idx} className="py-2.5 px-2 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{m.metric}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            m.type === 'added' ? 'bg-emerald-500/10 text-emerald-400' :
                            m.type === 'modified' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {m.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          {m.type === 'modified' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 line-through">{m.targetA}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-emerald-400 font-bold">{m.targetB}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Target: <strong className="text-slate-200">{m.targetB || m.targetA}</strong></span>
                          )}
                          <span className="text-slate-500">
                            Baseline: {m.baselineB || m.baselineA || 'unknown'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Non-Functional SLAs */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Non-Functional Requirements & SLAs</span>
                  </span>
                </div>
                <div className="p-3 divide-y divide-slate-800/60">
                  {prdDiff.nonFunctionalRequirements
                    .filter(n => shouldShowItem(n.type))
                    .map((n, idx) => (
                      <div key={idx} className="py-2.5 px-2 flex items-start gap-2.5 text-xs">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                          n.type === 'added' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                          n.type === 'removed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 line-through' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {n.type === 'added' ? '+ ADD' : n.type === 'removed' ? '- REM' : '='}
                        </span>
                        <span className={`text-slate-300 leading-snug ${n.type === 'removed' ? 'line-through text-slate-500' : ''}`}>
                          {n.value}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 4. Scope Boundaries: In-Scope vs Out-of-Scope */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <span>MVP In-Scope (Day 1)</span>
                  <span className="font-mono text-[11px] text-emerald-500">{prdDiff.mvpScope.length} Items</span>
                </div>
                <div className="space-y-1.5">
                  {prdDiff.mvpScope
                    .filter(s => shouldShowItem(s.type))
                    .map((s, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-2 text-xs">
                        <span className="text-emerald-400 font-bold">{s.type === 'added' ? '➕' : '✅'}</span>
                        <span className={`text-slate-200 ${s.type === 'added' ? 'text-emerald-300 font-semibold' : ''}`}>
                          {s.value}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <span>Explicitly Out of Scope</span>
                  <span className="font-mono text-[11px] text-rose-500">{prdDiff.outOfScope.length} Items</span>
                </div>
                <div className="space-y-1.5">
                  {prdDiff.outOfScope
                    .filter(s => shouldShowItem(s.type))
                    .map((s, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-2 text-xs">
                        <span className="text-rose-400 font-bold">{s.type === 'added' ? '➕' : '🚫'}</span>
                        <span className="text-slate-300">{s.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE 2: STRUCTURED SPECIFICATIONS DIFF (ROADMAP)              */}
        {/* ------------------------------------------------------------- */}
        {diffMode === 'structured' && taskType === 'ROADMAP' && roadmapDiff && (
          <div className="space-y-6">
            {/* Strategic Vision Diff */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Map className="w-4 h-4 text-blue-400" />
                  <span>Strategic Vision & Long-Term Transformation</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  roadmapDiff.vision.type === 'modified' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {roadmapDiff.vision.type === 'modified' ? 'Adjusted in v' + versionB : 'Unchanged'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                  <div className="text-[10px] font-mono text-slate-500 mb-1">v{versionA}.0 Baseline Vision:</div>
                  <div>{roadmapDiff.vision.oldValue}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200">
                  <div className="text-[10px] font-mono text-blue-400 mb-1">v{versionB}.0 Target Vision:</div>
                  <div className="font-medium">{roadmapDiff.vision.value}</div>
                </div>
              </div>
            </div>

            {/* Strategic Pillars Diff */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Strategic Pillars
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {roadmapDiff.strategicPillars
                  .filter(p => shouldShowItem(p.type))
                  .map((p, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                        p.type === 'added' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                        p.type === 'removed' ? 'bg-rose-950 text-rose-300 border-rose-700 line-through' :
                        'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      {p.type === 'added' && <Plus className="w-3 h-3 text-emerald-400" />}
                      {p.type === 'removed' && <Minus className="w-3 h-3 text-rose-400" />}
                      <span>{p.value}</span>
                    </span>
                  ))}
              </div>
            </div>

            {/* Quarter Horizons Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Quarter Horizons & Delivery Timeline
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  Comparing {roadmapDiff.quarters.length} Horizon Phases
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {roadmapDiff.quarters.map((q, qIdx) => {
                  const isQuarterAdded = q.type === 'added';
                  const isQuarterRemoved = q.type === 'removed';
                  const isQuarterModified = q.type === 'modified';

                  return (
                    <div
                      key={qIdx}
                      className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between space-y-4 ${
                        isQuarterAdded ? 'bg-emerald-950/20 border-emerald-700/60' :
                        isQuarterRemoved ? 'bg-rose-950/20 border-rose-700/60 opacity-70' :
                        isQuarterModified ? 'bg-slate-900/90 border-slate-800' :
                        'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div>
                        {/* Quarter Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-800/80 text-blue-300">
                            {q.quarter}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isQuarterAdded ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            isQuarterRemoved ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isQuarterAdded ? '+ NEW QUARTER' : isQuarterRemoved ? '- REMOVED' : `${q.initiatives.length} Initiatives`}
                          </span>
                        </div>

                        {/* Theme */}
                        <div className="mt-3">
                          <h4 className="text-xs font-bold text-slate-200 leading-snug">
                            {q.themeB || q.themeA}
                          </h4>
                          {q.themeA && q.themeB && q.themeA !== q.themeB && (
                            <p className="text-[10px] text-slate-500 line-through mt-0.5">
                              Prev: {q.themeA}
                            </p>
                          )}
                        </div>

                        {/* Initiatives in this quarter */}
                        <div className="mt-4 space-y-2.5">
                          {q.initiatives
                            .filter(init => shouldShowItem(init.type))
                            .map((init, iIdx) => {
                              const isInitAdded = init.type === 'added';
                              const isInitRemoved = init.type === 'removed';
                              const isInitModified = init.type === 'modified';

                              return (
                                <div
                                  key={iIdx}
                                  className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                                    isInitAdded ? 'bg-emerald-950/30 border-emerald-800/60 shadow-sm' :
                                    isInitRemoved ? 'bg-rose-950/30 border-rose-800/60 line-through opacity-70' :
                                    isInitModified ? 'bg-amber-950/30 border-amber-800/60' :
                                    'bg-slate-950 border-slate-800/80'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className={`font-semibold ${isInitAdded ? 'text-emerald-200' : 'text-slate-200'}`}>
                                      {init.title}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {isInitModified && init.priorityA !== init.priorityB ? (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                          {init.priorityA} → {init.priorityB}
                                        </span>
                                      ) : (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          (init.priorityB || init.priorityA) === 'P0' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                                          (init.priorityB || init.priorityA) === 'P1' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                          'bg-slate-800 text-slate-400'
                                        }`}>
                                          {init.priorityB || init.priorityA}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-slate-400 leading-relaxed">
                                    {init.descriptionB || init.descriptionA}
                                  </p>

                                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                    {isInitModified && init.effortWeeksA !== init.effortWeeksB ? (
                                      <span className="text-amber-400 font-bold">
                                        {init.effortWeeksA}w → {init.effortWeeksB}w
                                      </span>
                                    ) : (
                                      <span>{init.effortWeeksB || init.effortWeeksA} weeks</span>
                                    )}
                                    <span className="text-blue-400 truncate max-w-[120px] text-right">
                                      {init.targetOutcomeB || init.targetOutcomeA}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE 3: PROSE MARKDOWN SPLIT VIEW                             */}
        {/* ------------------------------------------------------------- */}
        {diffMode === 'prose' && (
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950 font-mono text-xs">
            {/* Header Columns */}
            <div className="grid grid-cols-2 bg-slate-900 border-b border-slate-800 px-4 py-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <div className="flex items-center gap-2">
                <span>Base Version (v{versionA}.0)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">Old</span>
              </div>
              <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
                <span>Target Version (v{versionB}.0)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">New</span>
              </div>
            </div>

            {/* Split Lines Container */}
            <div className="divide-y divide-slate-900 overflow-x-auto max-h-[60vh]">
              {proseDiff
                .filter(item => shouldShowItem(item.type))
                .map((item, idx) => {
                  const isAdded = item.type === 'added';
                  const isRemoved = item.type === 'removed';
                  const isModified = item.type === 'modified';

                  return (
                    <div
                      key={idx}
                      className={`grid grid-cols-2 transition-colors ${
                        isAdded ? 'bg-emerald-950/20' :
                        isRemoved ? 'bg-rose-950/20' :
                        isModified ? 'bg-amber-950/20' :
                        'hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Left Column (Version A) */}
                      <div className="p-2.5 flex items-start gap-3 border-r border-slate-900 overflow-x-hidden">
                        <span className="text-slate-600 text-[10px] select-none w-8 text-right shrink-0">
                          {item.lineA || ''}
                        </span>
                        <div className={`whitespace-pre-wrap break-words flex-1 ${
                          isRemoved ? 'text-rose-300 line-through bg-rose-950/40 px-1 rounded' :
                          isModified ? 'text-amber-300/80 line-through' :
                          'text-slate-300'
                        }`}>
                          {item.contentA || ''}
                        </div>
                      </div>

                      {/* Right Column (Version B) */}
                      <div className="p-2.5 flex items-start gap-3 pl-4 overflow-x-hidden">
                        <span className="text-slate-600 text-[10px] select-none w-8 text-right shrink-0">
                          {item.lineB || ''}
                        </span>
                        <div className={`whitespace-pre-wrap break-words flex-1 ${
                          isAdded ? 'text-emerald-200 font-semibold bg-emerald-950/40 px-1 rounded' :
                          isModified ? 'text-amber-200 font-semibold bg-amber-950/40 px-1 rounded' :
                          'text-slate-300'
                        }`}>
                          {item.contentB || ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Summary Ribbon */}
      <div className="bg-slate-900/90 border-t border-slate-800 p-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Comparison Scope:</span>
          <span>v{versionA}.0</span>
          <span>→</span>
          <span className="text-emerald-400 font-semibold">v{versionB}.0</span>
          <span className="text-slate-500">·</span>
          <span>{currentObjB?.changeSummary || 'Specification advancement'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            Powered by Zod Schema Diff Engine
          </span>
        </div>
      </div>
    </div>
  );
};
