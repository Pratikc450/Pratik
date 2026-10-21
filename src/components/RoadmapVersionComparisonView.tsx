import React, { useState, useMemo } from 'react';
import { GeneratedArtifact, Product, ArtifactStatus } from '../types.js';
import {
  computeRoadmapDiff,
  computeProseLineDiff,
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
  Check,
  Copy,
  Download,
  Filter,
  Map,
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
  Calendar,
  Zap,
  BarChart2,
  FileText,
  X
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

interface RoadmapVersionComparisonViewProps {
  product: Product;
  artifacts: GeneratedArtifact[];
  initialArtifactId?: string;
  initialVersionA?: number;
  initialVersionB?: number;
  onClose?: () => void;
  onCreateRevision?: (artifactId: string) => void;
}

export const RoadmapVersionComparisonView: React.FC<RoadmapVersionComparisonViewProps> = ({
  product,
  artifacts,
  initialArtifactId,
  initialVersionA,
  initialVersionB,
  onClose,
  onCreateRevision
}) => {
  // Select active Roadmap artifact
  const roadmapArtifacts = useMemo(() => {
    return artifacts.filter(a => a.taskType === 'ROADMAP');
  }, [artifacts]);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string>(
    initialArtifactId || roadmapArtifacts[0]?.id || ''
  );

  const activeArtifact = useMemo(() => {
    return roadmapArtifacts.find(a => a.id === selectedArtifactId) || roadmapArtifacts[0];
  }, [roadmapArtifacts, selectedArtifactId]);

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
        label: `Active v${activeArtifact.version}.0`,
        status: activeArtifact.status,
        date: activeArtifact.metadata?.createdAt || new Date().toISOString(),
        author: activeArtifact.metadata?.approvedBy || 'PM Lead',
        changeSummary: 'Baseline roadmap snapshot',
        schemaData: activeArtifact.schemaData,
        renderedMarkdown: activeArtifact.renderedMarkdown,
        id: activeArtifact.id
      }
    ];
  }, [activeArtifact]);

  // Comparison version states
  const [versionA, setVersionA] = useState<number>(() => {
    if (initialVersionA !== undefined) return initialVersionA;
    if (availableVersions.length >= 2) return availableVersions[availableVersions.length - 2].version;
    return availableVersions[0]?.version ?? 1;
  });

  const [versionB, setVersionB] = useState<number>(() => {
    if (initialVersionB !== undefined) return initialVersionB;
    return availableVersions[availableVersions.length - 1]?.version ?? 2;
  });

  const [diffMode, setDiffMode] = useState<'structured' | 'prose' | 'visual'>('structured');
  const [filterMode, setFilterMode] = useState<'all' | 'changes-only' | 'additions' | 'modifications'>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Keep version selections valid when artifact changes
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
  const roadmapDiff: RoadmapStructuredDiff | null = useMemo(() => {
    if (!objA?.schemaData || !objB?.schemaData) return null;
    return computeRoadmapDiff(objA.schemaData, objB.schemaData);
  }, [objA, objB]);

  // Compute prose line diff
  const proseDiff = useMemo(() => {
    return computeProseLineDiff(objA?.renderedMarkdown || '', objB?.renderedMarkdown || '');
  }, [objA, objB]);

  const summary = useMemo(() => {
    if (roadmapDiff?.summary) {
      return roadmapDiff.summary;
    }
    return {
      addedCount: proseDiff.filter(l => l.type === 'added').length,
      modifiedCount: proseDiff.filter(l => l.type === 'modified').length,
      removedCount: proseDiff.filter(l => l.type === 'removed').length,
      unchangedCount: proseDiff.filter(l => l.type === 'unchanged').length
    };
  }, [roadmapDiff, proseDiff]);

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
    const text = `Roadmap Version Comparison Report: ${product.name}
Base: v${objA?.version}.0 (${objA?.status})
Target: v${objB?.version}.0 (${objB?.status})
Summary: +${summary.addedCount} additions, ~${summary.modifiedCount} modifications, -${summary.removedCount} removals
Changelog: ${objB?.changeSummary || 'Iterative delivery progression'}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const content = `# Roadmap Version Comparison: ${product.name}
**Base Version:** v${objA?.version}.0 (${objA?.status}) - ${new Date(objA?.date).toLocaleDateString()}  
**Target Version:** v${objB?.version}.0 (${objB?.status}) - ${new Date(objB?.date).toLocaleDateString()}  
**Changelog / Note:** ${objB?.changeSummary || 'Roadmap Delivery Progression'}

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
    element.download = `${product.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_roadmap_diff_v${objA?.version}_to_v${objB?.version}.md`;
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

  // Count shifted initiatives (quarter or priority change)
  const shiftedInitiativesCount = useMemo(() => {
    if (!roadmapDiff) return 0;
    let count = 0;
    for (const q of roadmapDiff.quarters) {
      for (const init of q.initiatives) {
        if (init.type === 'modified') count++;
      }
    }
    return count;
  }, [roadmapDiff]);

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">
                  Roadmap Structural Version Diff
                </h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {product.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect structural differences between delivery iterations: timeline shifts, priority updates, effort deltas, and strategic vision adjustments.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onCreateRevision && activeArtifact && (
              <button
                onClick={() => onCreateRevision(activeArtifact.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Create a new roadmap revision"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Revision</span>
              </button>
            )}

            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              title="Copy diff summary report"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              title="Export complete diff markdown report"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Report</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors ml-1 cursor-pointer"
                title="Return to Delivery Horizons View"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Version Selectors & Comparison Control Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          {/* Base Version (A) */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Base (A):
            </span>
            <div className="relative flex-1">
              <select
                value={versionA}
                onChange={(e) => setVersionA(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availableVersions.map((v) => (
                  <option key={`a-${v.version}`} value={v.version}>
                    v{v.version}.0 — {v.label} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              objA?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {objA?.status}
            </span>
          </div>

          {/* Swap Button & Quick Actions */}
          <div className="lg:col-span-4 flex items-center justify-center gap-2">
            <button
              onClick={handleSwap}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Swap Base and Target Versions"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            {versionB > 1 && (
              <button
                onClick={handleCompareWithPrevious}
                className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 text-[11px] font-medium transition-colors cursor-pointer"
                title="Compare Target against Immediate Predecessor"
              >
                ← Compare with Prev (v{versionB - 1})
              </button>
            )}

            {/* Change Metrics Summary Badges */}
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availableVersions.map((v) => (
                  <option key={`b-${v.version}`} value={v.version}>
                    v{v.version}.0 — {v.label} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              objB?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {objB?.status}
            </span>
          </div>
        </div>

        {/* 3. Mode Switcher & Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* View Modes */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDiffMode('structured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                diffMode === 'structured'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Structured Roadmap Diff</span>
            </button>
            <button
              onClick={() => setDiffMode('visual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                diffMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horizons Board Diff</span>
            </button>
            <button
              onClick={() => setDiffMode('prose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                diffMode === 'prose'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Prose Markdown Split</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>
            {(['all', 'changes-only', 'additions', 'modifications'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  filterMode === mode
                    ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'all' && 'All Initiatives'}
                {mode === 'changes-only' && `Changes Only (${summary.addedCount + summary.modifiedCount + summary.removedCount})`}
                {mode === 'additions' && `Additions (+${summary.addedCount})`}
                {mode === 'modifications' && `Modifications (~${summary.modifiedCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Metadata Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Base Iteration v{objA?.version}.0</span>
            <span className="text-slate-500 text-[11px] font-mono">{new Date(objA?.date).toLocaleDateString()}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {objA?.changeSummary || 'Baseline roadmap milestone release'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>Target Iteration v{objB?.version}.0</span>
              <span className="text-[10px] text-blue-400 font-mono">(Active Comparison Target)</span>
            </span>
            <span className="text-slate-500 text-[11px] font-mono">{new Date(objB?.date).toLocaleDateString()}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {objB?.changeSummary || 'Official approved delivery horizon and initiative adjustments'}
          </p>
        </div>
      </div>

      {/* 5. Main Diff Display */}
      {diffMode === 'structured' && roadmapDiff && (
        <div className="space-y-6">
          {/* Strategic Vision Diff */}
          {shouldShowItem(roadmapDiff.vision.type) && (
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
              <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Map className="w-4 h-4 text-blue-400" />
                  <span>Strategic Vision & Long-Term Transformation</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  roadmapDiff.vision.type === 'modified'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {roadmapDiff.vision.type === 'modified' ? `Adjusted in v${versionB}.0` : 'Unchanged'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                <div className="p-4 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-500">v{versionA}.0 Baseline Vision</div>
                  <div className="text-xs text-slate-300 leading-relaxed font-sans">{roadmapDiff.vision.oldValue}</div>
                </div>
                <div className={`p-4 space-y-1 ${roadmapDiff.vision.type === 'modified' ? 'bg-amber-950/20' : ''}`}>
                  <div className="text-[10px] font-mono uppercase text-blue-400">v{versionB}.0 Target Vision</div>
                  <div className="text-xs text-slate-100 font-medium leading-relaxed font-sans">{roadmapDiff.vision.value}</div>
                </div>
              </div>
            </div>
          )}

          {/* Strategic Pillars Diff */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Strategic Pillars ({roadmapDiff.strategicPillars.length})</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {roadmapDiff.strategicPillars
                .filter(p => shouldShowItem(p.type))
                .map((p, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      p.type === 'added' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-xs' :
                      p.type === 'removed' ? 'bg-rose-950/80 text-rose-300 border-rose-700 line-through' :
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

          {/* Quarter Horizons & Delivery Timeline Comparison */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Quarter Horizons & Initiative Shifts</span>
              </h3>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>{roadmapDiff.quarters.length} Quarters Compared</span>
                {shiftedInitiativesCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {shiftedInitiativesCount} Modified Initiatives
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {roadmapDiff.quarters.map((q, qIdx) => {
                const isQuarterAdded = q.type === 'added';
                const isQuarterRemoved = q.type === 'removed';
                const isQuarterModified = q.type === 'modified';

                const visibleInitiatives = q.initiatives.filter(init => shouldShowItem(init.type));

                return (
                  <div
                    key={qIdx}
                    className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between space-y-4 ${
                      isQuarterAdded ? 'bg-emerald-950/20 border-emerald-700/60' :
                      isQuarterRemoved ? 'bg-rose-950/20 border-rose-700/60 opacity-70' :
                      isQuarterModified ? 'bg-slate-900/90 border-slate-800 shadow-sm' :
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
                        {visibleInitiatives.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                            No initiatives match filter.
                          </div>
                        ) : (
                          visibleInitiatives.map((init, iIdx) => {
                            const isInitAdded = init.type === 'added';
                            const isInitRemoved = init.type === 'removed';
                            const isInitModified = init.type === 'modified';
                            const isPriorityChanged = init.priorityA && init.priorityB && init.priorityA !== init.priorityB;
                            const isEffortChanged = init.effortWeeksA !== undefined && init.effortWeeksB !== undefined && init.effortWeeksA !== init.effortWeeksB;

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
                                  <div className="font-semibold text-slate-200">
                                    <span className="font-mono text-[10px] text-slate-500 mr-1.5">{init.id}</span>
                                    <span>{init.title}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                    isInitAdded ? 'bg-emerald-500/20 text-emerald-300' :
                                    isInitRemoved ? 'bg-rose-500/20 text-rose-300' :
                                    isInitModified ? 'bg-amber-500/20 text-amber-300' :
                                    'bg-slate-800 text-slate-400'
                                  }`}>
                                    {isInitAdded ? '+ ADD' : isInitRemoved ? '- REM' : isInitModified ? '~ MOD' : '='}
                                  </span>
                                </div>

                                {/* Priority & Effort Diff Line */}
                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                                  {isPriorityChanged ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500 line-through px-1 py-0.2 rounded bg-slate-900">{init.priorityA}</span>
                                      <span className="text-slate-400">→</span>
                                      <span className="font-bold text-amber-400 px-1 py-0.2 rounded bg-amber-950/80 border border-amber-800/60">{init.priorityB}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 px-1 py-0.2 rounded bg-slate-900 border border-slate-800">
                                      Priority: {init.priorityB || init.priorityA}
                                    </span>
                                  )}

                                  {isEffortChanged ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500 line-through">{init.effortWeeksA}w</span>
                                      <span className="text-slate-400">→</span>
                                      <span className="font-bold text-blue-400">{init.effortWeeksB}w</span>
                                    </div>
                                  ) : (
                                    (init.effortWeeksB || init.effortWeeksA) && (
                                      <span className="text-slate-400">
                                        Effort: {init.effortWeeksB || init.effortWeeksA}w
                                      </span>
                                    )
                                  )}
                                </div>

                                {init.targetOutcomeB && (
                                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans pt-1 border-t border-slate-900">
                                    <strong className="text-slate-400 font-mono text-[10px]">Outcome: </strong>
                                    {init.targetOutcomeB}
                                  </p>
                                )}

                                {init.dependenciesB && init.dependenciesB.length > 0 && (
                                  <div className="pt-1 flex flex-wrap items-center gap-1">
                                    <span className="text-[10px] text-slate-500 font-mono">Deps:</span>
                                    {init.dependenciesB.map((dep, dIdx) => (
                                      <span key={dIdx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                        {dep}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risks & Mitigations Diff */}
          {roadmapDiff.risks && roadmapDiff.risks.length > 0 && (
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Delivery Risks & Governance Mitigations</span>
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {roadmapDiff.risks.length} Risks Evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {roadmapDiff.risks
                  .filter(r => shouldShowItem(r.type))
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        r.type === 'added' ? 'bg-emerald-950/20 border-emerald-800/60' :
                        r.type === 'removed' ? 'bg-rose-950/20 border-rose-800/60 line-through' :
                        r.type === 'modified' ? 'bg-amber-950/20 border-amber-800/60' :
                        'bg-slate-950 border-slate-800'
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
            </div>
          )}
        </div>
      )}

      {/* Visual Horizons Side-by-Side Diff */}
      {diffMode === 'visual' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Base Version Visual Board */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Base: v{objA?.version}.0 Horizons Board
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{objA?.changeSummary || 'Baseline'}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {objA?.status}
                </span>
              </div>

              <div className="space-y-4">
                {((objA?.schemaData?.quarterHorizons || objA?.schemaData?.quarters || []) as any[]).map((q: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {q.quarter}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{q.theme}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {(q.initiatives || []).map((init: any, iIdx: number) => (
                        <div key={iIdx} className="p-2 rounded-lg bg-slate-950 text-xs flex items-center justify-between border border-slate-850">
                          <span className="text-slate-300 font-medium">{init.title}</span>
                          <span className="text-[10px] font-mono px-1.5 rounded bg-slate-800 text-slate-400">{init.priority || 'P1'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Version Visual Board */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-blue-900/50 space-y-4 shadow-lg shadow-blue-950/20">
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
                <div>
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                    Target: v{objB?.version}.0 Horizons Board
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{objB?.changeSummary || 'Target Specification'}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300">
                  {objB?.status}
                </span>
              </div>

              <div className="space-y-4">
                {((objB?.schemaData?.quarterHorizons || objB?.schemaData?.quarters || []) as any[]).map((q: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-900/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-300 px-2 py-0.5 rounded bg-blue-950 border border-blue-800">
                        {q.quarter}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-200">{q.theme}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {(q.initiatives || []).map((init: any, iIdx: number) => (
                        <div key={iIdx} className="p-2 rounded-lg bg-slate-950 text-xs flex items-center justify-between border border-slate-800">
                          <span className="text-slate-100 font-medium">{init.title}</span>
                          <span className="text-[10px] font-mono px-1.5 rounded bg-blue-950 text-blue-300 border border-blue-800">{init.priority || 'P1'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prose Markdown Split View */}
      {diffMode === 'prose' && (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950 font-mono text-xs divide-y divide-slate-800 max-h-[70vh] overflow-y-auto">
          <div className="p-2.5 bg-slate-900 font-bold text-slate-400 flex items-center justify-between">
            <span>Line-by-Line Markdown Prose Diff</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Comparing {proseDiff.length} lines
            </span>
          </div>
          {proseDiff.map((line, idx) => (
            <div
              key={idx}
              className={`flex items-start px-3 py-1 ${
                line.type === 'added' ? 'bg-emerald-950/40 text-emerald-300' :
                line.type === 'removed' ? 'bg-rose-950/40 text-rose-300' :
                line.type === 'modified' ? 'bg-amber-950/40 text-amber-300' :
                'text-slate-400'
              }`}
            >
              <span className="w-12 text-slate-600 select-none text-[10px] shrink-0">
                {line.lineB || line.lineA || idx + 1}
              </span>
              <span className="w-6 font-bold select-none text-[10px] shrink-0">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified' ? '~' : ' '}
              </span>
              <span className="whitespace-pre-wrap break-all flex-1">
                {line.contentB || line.contentA || ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
