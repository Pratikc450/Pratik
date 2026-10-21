import React, { useState, useMemo } from 'react';
import { GeneratedArtifact, Product, ArtifactStatus } from '../types.js';
import {
  computePrdDiff,
  computeProseLineDiff,
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
  Download,
  Filter,
  FileText,
  ShieldCheck,
  Sparkles,
  Search,
  Layers,
  TrendingUp,
  ArrowRight,
  Eye,
  ChevronRight,
  History,
  Target,
  FileDown,
  ArrowUpRight,
  Sliders,
  CheckCircle
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

interface PrdVersionComparisonViewProps {
  product: Product;
  artifacts: GeneratedArtifact[];
  initialArtifactId?: string;
  initialVersionA?: number;
  initialVersionB?: number;
  onClose?: () => void;
  onCreateRevision?: (artifactId: string) => void;
}

export const PrdVersionComparisonView: React.FC<PrdVersionComparisonViewProps> = ({
  product,
  artifacts,
  initialArtifactId,
  initialVersionA,
  initialVersionB,
  onClose,
  onCreateRevision
}) => {
  // Select active PRD artifact
  const prdArtifacts = useMemo(() => {
    return artifacts.filter(a => a.taskType === 'PRD');
  }, [artifacts]);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string>(
    initialArtifactId || prdArtifacts[0]?.id || ''
  );

  const activeArtifact = useMemo(() => {
    return prdArtifacts.find(a => a.id === selectedArtifactId) || prdArtifacts[0];
  }, [prdArtifacts, selectedArtifactId]);

  // Extract versions for the active artifact
  const availableVersions: VersionOption[] = useMemo(() => {
    if (!activeArtifact) return [];

    if (activeArtifact.versionHistory && activeArtifact.versionHistory.length > 0) {
      return [...activeArtifact.versionHistory]
        .sort((a, b) => a.version - b.version)
        .map(vh => ({
          version: vh.version,
          label: vh.changeSummary || `Version v${vh.version}.0`,
          status: vh.status,
          date: vh.createdAt,
          author: vh.createdBy || 'PM Team',
          changeSummary: vh.changeSummary,
          schemaData: vh.schemaData,
          renderedMarkdown: vh.renderedMarkdown,
          id: activeArtifact.id
        }));
    }

    return [
      {
        version: activeArtifact.version,
        label: 'Active specification snapshot',
        status: activeArtifact.status,
        date: activeArtifact.metadata?.createdAt || new Date().toISOString(),
        author: activeArtifact.metadata?.approvedBy || 'PM Lead',
        changeSummary: 'Current active version',
        schemaData: activeArtifact.schemaData,
        renderedMarkdown: activeArtifact.renderedMarkdown,
        id: activeArtifact.id
      }
    ];
  }, [activeArtifact]);

  // Default versions to compare
  const defaultVersionA = useMemo(() => {
    if (initialVersionA && availableVersions.some(v => v.version === initialVersionA)) {
      return initialVersionA;
    }
    if (availableVersions.length >= 2) {
      return availableVersions[availableVersions.length - 2].version;
    }
    return availableVersions[0]?.version || 1;
  }, [availableVersions, initialVersionA]);

  const defaultVersionB = useMemo(() => {
    if (initialVersionB && availableVersions.some(v => v.version === initialVersionB)) {
      return initialVersionB;
    }
    return availableVersions[availableVersions.length - 1]?.version || 2;
  }, [availableVersions, initialVersionB]);

  const [versionA, setVersionA] = useState<number>(defaultVersionA);
  const [versionB, setVersionB] = useState<number>(defaultVersionB);
  const [viewMode, setViewMode] = useState<'structured' | 'prose' | 'unified'>('structured');
  const [filterMode, setFilterMode] = useState<'all' | 'changes-only' | 'additions' | 'modifications'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Sync version selections if artifact changes
  React.useEffect(() => {
    if (availableVersions.length >= 2) {
      const targetA = availableVersions[availableVersions.length - 2].version;
      const targetB = availableVersions[availableVersions.length - 1].version;
      setVersionA(prev => prev === targetA ? prev : targetA);
      setVersionB(prev => prev === targetB ? prev : targetB);
    } else if (availableVersions.length === 1) {
      const target = availableVersions[0].version;
      setVersionA(prev => prev === target ? prev : target);
      setVersionB(prev => prev === target ? prev : target);
    }
  }, [selectedArtifactId, availableVersions.length]);

  const objA = useMemo(() => {
    return availableVersions.find(v => v.version === versionA) || availableVersions[0];
  }, [availableVersions, versionA]);

  const objB = useMemo(() => {
    return availableVersions.find(v => v.version === versionB) || availableVersions[availableVersions.length - 1] || availableVersions[0];
  }, [availableVersions, versionB]);

  // Compute structured diff
  const prdDiff: PrdStructuredDiff | null = useMemo(() => {
    if (!objA?.schemaData || !objB?.schemaData) return null;
    return computePrdDiff(objA.schemaData, objB.schemaData);
  }, [objA, objB]);

  // Compute prose line diff
  const proseDiff = useMemo(() => {
    return computeProseLineDiff(objA?.renderedMarkdown || '', objB?.renderedMarkdown || '');
  }, [objA, objB]);

  const summary = useMemo(() => {
    if (prdDiff?.summary) {
      return prdDiff.summary;
    }
    return {
      addedCount: proseDiff.filter(l => l.type === 'added').length,
      modifiedCount: proseDiff.filter(l => l.type === 'modified').length,
      removedCount: proseDiff.filter(l => l.type === 'removed').length,
      unchangedCount: proseDiff.filter(l => l.type === 'unchanged').length
    };
  }, [prdDiff, proseDiff]);

  const handleSwap = () => {
    const temp = versionA;
    setVersionA(versionB);
    setVersionB(temp);
  };

  const handleCompareWithPrevious = () => {
    if (versionB > 1) {
      const prev = availableVersions
        .filter(v => v.version < versionB)
        .sort((a, b) => b.version - a.version)[0];
      if (prev) {
        setVersionA(prev.version);
      }
    }
  };

  const handleCopySummary = () => {
    const text = `PRD Version Comparison Report: ${product.name}
Base: v${objA?.version}.0 (${objA?.status})
Target: v${objB?.version}.0 (${objB?.status})
Summary: +${summary.addedCount} additions, ~${summary.modifiedCount} modifications, -${summary.removedCount} removals
Changelog: ${objB?.changeSummary || 'Iterative refinement'}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const content = `# PRD Version Comparison: ${product.name}
**Base Version:** v${objA?.version}.0 (${objA?.status}) - ${new Date(objA?.date).toLocaleDateString()}  
**Target Version:** v${objB?.version}.0 (${objB?.status}) - ${new Date(objB?.date).toLocaleDateString()}  
**Changelog / Note:** ${objB?.changeSummary || 'Official Version Progression'}

## Changes Breakdown
- **Additions (+):** ${summary.addedCount}
- **Modifications (~):** ${summary.modifiedCount}
- **Removals (-):** ${summary.removedCount}
- **Unchanged:** ${summary.unchangedCount}

---

## Target Version (v${objB?.version}.0) Full Prose Specification
${objB?.renderedMarkdown || ''}
`;
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${product.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_prd_diff_v${objA?.version}_to_v${objB?.version}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper filter for diff items
  const shouldShowItem = (type: DiffChangeType) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'changes-only') return type !== 'unchanged';
    if (filterMode === 'additions') return type === 'added';
    if (filterMode === 'modifications') return type === 'modified';
    return true;
  };

  const filteredRequirements = useMemo(() => {
    if (!prdDiff) return [];
    return prdDiff.functionalRequirements.filter(fr => {
      if (!shouldShowItem(fr.type)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = fr.id.toLowerCase().includes(query);
        const matchesReqA = fr.requirementA?.toLowerCase().includes(query);
        const matchesReqB = fr.requirementB?.toLowerCase().includes(query);
        return matchesId || matchesReqA || matchesReqB;
      }
      return true;
    });
  }, [prdDiff, filterMode, searchQuery]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-0">
      {/* 1. Header & Navigation Controls */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Side-by-Side PRD Version Comparison
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Multi-Version Diff
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Workspace: <span className="text-slate-200 font-semibold">{product.name}</span> · Inspect side-by-side MoSCoW functional requirements, SLA shifts, and scope diffs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {prdArtifacts.length > 1 && (
              <select
                value={selectedArtifactId}
                onChange={(e) => setSelectedArtifactId(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {prdArtifacts.map(art => (
                  <option key={art.id} value={art.id}>
                    {art.schemaData?.title || 'PRD Document'} (v{art.version}.0)
                  </option>
                ))}
              </select>
            )}

            {onCreateRevision && activeArtifact && (
              <button
                onClick={() => onCreateRevision(activeArtifact.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                title="Create a new version revision snapshot"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Revision</span>
              </button>
            )}

            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              title="Copy comparison summary to clipboard"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              title="Download comparison report markdown"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Report</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Back to Document
              </button>
            )}
          </div>
        </div>

        {/* 2. Version Picker Split Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          {/* Base Version Column (Left) */}
          <div className="lg:col-span-5 flex items-center gap-2.5">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Base Version (A)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Previous Iteration</span>
            </div>
            <div className="relative flex-1">
              <select
                value={versionA}
                onChange={(e) => setVersionA(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableVersions.map((v) => (
                  <option key={`a-${v.version}`} value={v.version}>
                    v{v.version}.0 — {v.label} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border shrink-0 ${
              objA?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {objA?.status}
            </span>
          </div>

          {/* Central Controls (Swap & Quick Compare) */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSwap}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Swap Base and Comparison Versions"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              {availableVersions.length > 2 && (
                <button
                  onClick={handleCompareWithPrevious}
                  className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 transition-colors"
                  title="Quick-set Base Version to immediate prior version"
                >
                  Prior Iteration
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">v{versionA}.0 vs v{versionB}.0</span>
          </div>

          {/* Target Version Column (Right) */}
          <div className="lg:col-span-5 flex items-center gap-2.5 justify-end">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Target Version (B)
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">Active / Comparison</span>
            </div>
            <div className="relative flex-1">
              <select
                value={versionB}
                onChange={(e) => setVersionB(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableVersions.map((v) => (
                  <option key={`b-${v.version}`} value={v.version}>
                    v{v.version}.0 — {v.label} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border shrink-0 ${
              objB?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {objB?.status}
            </span>
          </div>
        </div>

        {/* 3. Metrics & Mode Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('structured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'structured'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>MoSCoW Matrix Diff</span>
            </button>
            <button
              onClick={() => setViewMode('prose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'prose'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Prose Markdown Split</span>
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'unified'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Unified Audit</span>
            </button>
          </div>

          {/* Change Delta Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-emerald-300" title="Added requirements / lines">
                <Plus className="w-3 h-3" />
                <span>+{summary.addedCount} Added</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-800/80 text-amber-300" title="Modified / priority shifts">
                <Edit3 className="w-3 h-3" />
                <span>~{summary.modifiedCount} Modified</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-800/80 text-rose-300" title="Dropped / deleted requirements">
                <Minus className="w-3 h-3" />
                <span>-{summary.removedCount} Removed</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                <span>={summary.unchangedCount} Unchanged</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Comparison Body */}
      <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh]">
        {/* Version Context & Changelog Note Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Base Version v{objA?.version}.0</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">{new Date(objA?.date).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-slate-300 italic">
              "{objA?.changeSummary || 'Baseline specification snapshot'}"
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Author: {objA?.author || 'Product Manager'} · Status: {objA?.status}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Target Version v{objB?.version}.0</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">{new Date(objB?.date).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              "{objB?.changeSummary || 'Official specification iteration with refined scope'}"
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Author: {objB?.author || 'Product Lead'} · Status: {objB?.status}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: STRUCTURED MOSCOW SPECIFICATIONS DIFF                 */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'structured' && prdDiff && (
          <div className="space-y-6">
            {/* Filter & Search Bar for Requirements */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-1 text-xs">
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
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                  >
                    {mode === 'all' && 'All Requirements'}
                    {mode === 'changes-only' && `Changed Only (${summary.addedCount + summary.modifiedCount + summary.removedCount})`}
                    {mode === 'additions' && `Additions (+${summary.addedCount})`}
                    {mode === 'modifications' && `Modifications (~${summary.modifiedCount})`}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search requirement or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-56"
                />
              </div>
            </div>

            {/* 1. Side-by-Side Objective Comparison */}
            {shouldShowItem(prdDiff.objective.type) && (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Strategic Objective & Intent</span>
                  </span>
                  {prdDiff.objective.type === 'modified' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Modified in v{versionB}.0
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">Unchanged</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-500">v{versionA}.0 Baseline</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{prdDiff.objective.oldValue}</p>
                  </div>
                  <div className={`p-4 space-y-1 ${prdDiff.objective.type === 'modified' ? 'bg-amber-950/20' : ''}`}>
                    <span className="text-[10px] font-mono uppercase text-slate-500">v{versionB}.0 Target</span>
                    <p className="text-xs text-slate-100 font-medium leading-relaxed">{prdDiff.objective.value}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Side-by-Side Functional Requirements MoSCoW Grid */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Functional Requirements (MoSCoW Comparison Matrix)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Side-by-side priority escalations (e.g. SHOULD → MUST), newly added capabilities, and dropped items.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  {filteredRequirements.length} Requirements Shown
                </span>
              </div>

              {filteredRequirements.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No functional requirements match the active filter or search.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {filteredRequirements.map((fr) => {
                    const isAdded = fr.type === 'added';
                    const isRemoved = fr.type === 'removed';
                    const isModified = fr.type === 'modified';

                    return (
                      <div
                        key={fr.id}
                        className={`p-4 transition-colors ${
                          isAdded
                            ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500'
                            : isRemoved
                            ? 'bg-rose-950/20 border-l-4 border-l-rose-500 opacity-75'
                            : isModified
                            ? 'bg-amber-950/20 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Status Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                              {fr.id}
                            </span>
                            {isAdded && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                + NEW REQUIREMENT (v{versionB}.0)
                              </span>
                            )}
                            {isRemoved && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                - DEPRECATED / REMOVED
                              </span>
                            )}
                            {isModified && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ~ SCOPE / PRIORITY UPDATED
                              </span>
                            )}
                          </div>

                          {/* Priority Shift Indicator */}
                          {isModified && fr.priorityA !== fr.priorityB && (
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                              <span className="text-slate-400">{fr.priorityA}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300 underline">{fr.priorityB}</span>
                            </div>
                          )}
                        </div>

                        {/* Dual Column Side-by-Side Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: Base Version */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span>v{versionA}.0 Baseline</span>
                              {fr.priorityA && (
                                <span className={`font-bold px-1.5 py-0.5 rounded ${
                                  fr.priorityA === 'MUST' ? 'bg-rose-950 text-rose-300' :
                                  fr.priorityA === 'SHOULD' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {fr.priorityA}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs leading-relaxed ${isRemoved ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {fr.requirementA || <span className="italic text-slate-600">Not present in v{versionA}.0</span>}
                            </p>
                          </div>

                          {/* Right: Target Version */}
                          <div className={`space-y-1 ${isAdded ? 'bg-emerald-950/30 p-2 rounded-lg' : isModified ? 'bg-amber-950/20 p-2 rounded-lg' : ''}`}>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span>v{versionB}.0 Target</span>
                              {fr.priorityB && (
                                <span className={`font-bold px-1.5 py-0.5 rounded ${
                                  fr.priorityB === 'MUST' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                                  fr.priorityB === 'SHOULD' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {fr.priorityB}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-100 font-medium leading-relaxed">
                              {fr.requirementB || <span className="italic text-slate-600">Dropped in v{versionB}.0</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Side-by-Side Success Metrics & Target KPIs */}
            {prdDiff.successMetrics.length > 0 && (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    <span>Success Metrics & Target KPI Benchmarks</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {prdDiff.successMetrics.length} Metrics
                  </span>
                </div>

                <div className="divide-y divide-slate-800">
                  {prdDiff.successMetrics.map((met, idx) => (
                    <div
                      key={idx}
                      className={`p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${
                        met.type === 'modified' ? 'bg-amber-950/15' : met.type === 'added' ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">{met.metric}</span>
                          <span className="text-[10px] font-mono text-slate-500">v{versionA}.0</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Target: <span className="font-mono text-slate-200">{met.targetA || 'N/A'}</span> (Baseline: {met.baselineA || 'unknown'})
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                            <span>{met.metric}</span>
                            {met.type === 'modified' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                Target Updated
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">v{versionB}.0</span>
                        </div>
                        <div className="text-xs text-slate-200">
                          Target: <span className="font-mono font-bold text-emerald-300">{met.targetB || 'N/A'}</span> (Baseline: {met.baselineB || 'unknown'})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Non-Functional Requirements & Performance SLAs */}
            {prdDiff.nonFunctionalRequirements.length > 0 && (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Non-Functional Requirements & Performance SLAs</span>
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {prdDiff.nonFunctionalRequirements.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                        item.type === 'added' ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200' :
                        item.type === 'removed' ? 'bg-rose-950/30 border-rose-800/80 text-rose-200 line-through' :
                        'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{item.value}</span>
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. MVP Scope & Boundaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>MVP In-Scope Diff</span>
                </h4>
                <div className="space-y-1.5">
                  {prdDiff.mvpScope.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-xs flex items-center justify-between ${
                        item.type === 'added' ? 'bg-emerald-950/40 text-emerald-200 font-semibold' :
                        item.type === 'removed' ? 'bg-rose-950/40 text-rose-300 line-through' :
                        'bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span>{item.value}</span>
                      <span className="text-[9px] font-mono uppercase">{item.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Out-of-Scope Shifts</span>
                </h4>
                <div className="space-y-1.5">
                  {prdDiff.outOfScope.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-xs flex items-center justify-between ${
                        item.type === 'added' ? 'bg-amber-950/40 text-amber-200' :
                        item.type === 'removed' ? 'bg-rose-950/40 text-rose-300 line-through' :
                        'bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span>{item.value}</span>
                      <span className="text-[9px] font-mono uppercase">{item.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: PROSE MARKDOWN SPLIT VIEW (LINE-BY-LINE)              */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'prose' && (
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
            <div className="grid grid-cols-2 bg-slate-900 border-b border-slate-800 divide-x divide-slate-800 text-xs font-mono font-bold text-slate-300 p-2.5">
              <div className="flex items-center justify-between px-3">
                <span>Base Specification (v{versionA}.0)</span>
                <span className="text-[10px] text-slate-500 font-normal">{objA?.renderedMarkdown.split('\n').length} Lines</span>
              </div>
              <div className="flex items-center justify-between px-3">
                <span>Comparison Specification (v{versionB}.0)</span>
                <span className="text-[10px] text-emerald-400 font-normal">{objB?.renderedMarkdown.split('\n').length} Lines</span>
              </div>
            </div>

            <div className="font-mono text-xs divide-y divide-slate-900 overflow-x-auto max-h-[60vh]">
              {proseDiff.map((line, idx) => {
                const isAdded = line.type === 'added';
                const isRemoved = line.type === 'removed';
                const isModified = line.type === 'modified';

                return (
                  <div key={idx} className="grid grid-cols-2 divide-x divide-slate-800/80 hover:bg-slate-900/50">
                    {/* Left Column: Version A */}
                    <div
                      className={`p-2 flex items-start space-x-2 ${
                        isRemoved
                          ? 'bg-rose-950/30 text-rose-300'
                          : isModified
                          ? 'bg-amber-950/20 text-slate-400'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] text-slate-600 select-none w-8 text-right shrink-0">
                        {line.lineA || ''}
                      </span>
                      <span className="break-all whitespace-pre-wrap">{line.contentA || ''}</span>
                    </div>

                    {/* Right Column: Version B */}
                    <div
                      className={`p-2 flex items-start space-x-2 ${
                        isAdded
                          ? 'bg-emerald-950/30 text-emerald-300 font-medium'
                          : isModified
                          ? 'bg-amber-950/30 text-amber-200 font-medium'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] text-slate-600 select-none w-8 text-right shrink-0">
                        {line.lineB || ''}
                      </span>
                      <span className="break-all whitespace-pre-wrap">{line.contentB || ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: UNIFIED AUDIT LOG & REVISION TIMELINE                 */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'unified' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>PRD Version Evolution & Governance Trail</span>
              </h3>
              <p className="text-xs text-slate-400">
                Full chronological lineage of all generated iterations, peer sign-offs, and requirement shifts.
              </p>

              <div className="space-y-3 pt-2">
                {availableVersions.map((v, i) => (
                  <div
                    key={v.version}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                      v.version === versionB
                        ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/40'
                        : v.version === versionA
                        ? 'bg-slate-900 border-slate-700'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-200">v{v.version}.0</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          v.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                          {v.status}
                        </span>
                        {v.version === versionB && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Target View
                          </span>
                        )}
                        {v.version === versionA && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Base View
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(v.date).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-300 font-medium">{v.changeSummary || 'Iteration generated by AI pipeline'}</p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Author: {v.author || 'Product Lead'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
