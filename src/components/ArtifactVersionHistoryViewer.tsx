import React, { useState, useMemo, useEffect } from 'react';
import {
  GeneratedArtifact,
  ArtifactStatus,
  ArtifactVersionRecord,
  AuditLogEntry
} from '../types.js';
import {
  History,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  User,
  ShieldCheck,
  FileText,
  Code2,
  GitCompare,
  Copy,
  Check,
  Download,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  AlertCircle,
  FileDown,
  ArrowUpRight,
  Plus,
  Minus,
  Search,
  Filter,
  CheckCircle,
  Calendar,
  Zap,
  Tag
} from 'lucide-react';
import { exportToMarkdown, exportToJson } from '../utils/exportUtils.js';
import { InlinePrdStructuralDiff } from './InlinePrdStructuralDiff.js';
import { InlineRoadmapStructuralDiff } from './InlineRoadmapStructuralDiff.js';

export interface ArtifactVersionHistoryViewerProps {
  artifact: GeneratedArtifact;
  productName?: string;
  onRevertArtifact?: (artifactId: string, targetVersion: number) => Promise<void> | void;
  onApproveArtifact?: (artifactId: string) => Promise<void> | void;
  isReverting?: boolean;
  isApproving?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  onSelectIterationForSpecView?: (iteration: ArtifactVersionRecord) => void;
}

export const ArtifactVersionHistoryViewer: React.FC<ArtifactVersionHistoryViewerProps> = ({
  artifact,
  productName,
  onRevertArtifact,
  onApproveArtifact,
  isReverting = false,
  isApproving = false,
  onClose,
  embedded = false,
  onSelectIterationForSpecView
}) => {
  // Currently selected version to inspect
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  // View mode for inspecting the selected iteration
  const [activeTab, setActiveTab] = useState<'prose' | 'json' | 'diff' | 'audit'>('prose');
  const [copied, setCopied] = useState(false);
  const [diffBaseVersion, setDiffBaseVersion] = useState<number | null>(null);
  const [diffFormat, setDiffFormat] = useState<'structured' | 'prose'>('structured');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'DRAFT'>('ALL');
  const [approvalFeedbackMsg, setApprovalFeedbackMsg] = useState<string | null>(null);

  // Compile full version list from artifact.versionHistory or construct baseline
  const versionList: ArtifactVersionRecord[] = useMemo(() => {
    if (!artifact) return [];
    if (artifact.versionHistory && artifact.versionHistory.length > 0) {
      return [...artifact.versionHistory].sort((a, b) => b.version - a.version);
    }
    // Fallback baseline if versionHistory was not previously populated
    return [
      {
        version: artifact.version || 1,
        status: artifact.status || 'DRAFT',
        createdAt: artifact.metadata?.createdAt || new Date().toISOString(),
        createdBy: artifact.metadata?.approvedBy ? 'AI Generator · Promoted by PM' : 'AI Spec Generator (Gemini 3.5 Flash)',
        changeSummary: artifact.status === 'APPROVED'
          ? `Official Specification v${artifact.version}: Approved and governed by ${artifact.metadata?.approvedBy || 'Senior PM'}`
          : 'Baseline specification draft',
        schemaData: artifact.schemaData,
        renderedMarkdown: artifact.renderedMarkdown,
        metadata: artifact.metadata
      }
    ];
  }, [artifact]);

  // Set default selected version when artifact changes
  useEffect(() => {
    if (versionList.length > 0) {
      // Default to the latest/active version
      const current = versionList.find(v => v.version === artifact?.version) || versionList[0];
      setSelectedVersionNum(current.version);
      // Diff base defaults to previous version if exists
      if (versionList.length > 1) {
        const nextOlder = versionList.find(v => v.version < current.version) || versionList[versionList.length - 1];
        setDiffBaseVersion(nextOlder.version);
      } else {
        setDiffBaseVersion(current.version);
      }
    }
  }, [artifact?.id, artifact?.version, versionList]);

  // Fetch relevant audit logs and approval history for this artifact
  useEffect(() => {
    if (!artifact?.id) return;
    setIsLoadingLogs(true);
    fetch(`/api/artifacts/${artifact.id}/approval-history`)
      .then(res => {
        if (!res.ok) throw new Error('Fallback to audit logs');
        return res.json();
      })
      .then(data => {
        if (data.auditLogs && Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
      })
      .catch(() => {
        // Fallback to /api/audit-logs
        fetch('/api/audit-logs')
          .then(res => res.json())
          .then(data => {
            if (data.logs && Array.isArray(data.logs)) {
              const relevant = data.logs.filter((l: AuditLogEntry) => l.artifactId === artifact.id);
              setAuditLogs(relevant);
            }
          })
          .catch(() => {});
      })
      .finally(() => setIsLoadingLogs(false));
  }, [artifact?.id, artifact?.version]);

  const filteredVersions = useMemo(() => {
    return versionList.filter(ver => {
      if (statusFilter !== 'ALL' && ver.status !== statusFilter) {
        return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesSummary = ver.changeSummary?.toLowerCase().includes(q);
        const matchesAuthor = ver.createdBy?.toLowerCase().includes(q);
        const matchesVer = `v${ver.version}`.includes(q);
        return matchesSummary || matchesAuthor || matchesVer;
      }
      return true;
    });
  }, [versionList, statusFilter, searchFilter]);

  const activeRecord = versionList.find(v => v.version === selectedVersionNum) || versionList[0];
  const compareRecord = versionList.find(v => v.version === diffBaseVersion) || versionList[versionList.length - 1];

  // Helper to format timestamps
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Timestamp unavailable';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Compute prose line-by-line diff between compareRecord and activeRecord
  const proseDiffLines = useMemo(() => {
    if (!compareRecord || !activeRecord) return [];
    const linesA = (compareRecord.renderedMarkdown || '').split('\n');
    const linesB = (activeRecord.renderedMarkdown || '').split('\n');

    const result: Array<{ type: 'same' | 'added' | 'removed'; text: string; lineNumA?: number; lineNumB?: number }> = [];
    let idxA = 0;
    let idxB = 0;

    while (idxA < linesA.length || idxB < linesB.length) {
      const textA = linesA[idxA];
      const textB = linesB[idxB];

      if (textA === textB) {
        result.push({ type: 'same', text: textA || '', lineNumA: idxA + 1, lineNumB: idxB + 1 });
        idxA++;
        idxB++;
      } else if (textA !== undefined && !linesB.includes(textA)) {
        result.push({ type: 'removed', text: textA, lineNumA: idxA + 1 });
        idxA++;
      } else if (textB !== undefined && !linesA.includes(textB)) {
        result.push({ type: 'added', text: textB, lineNumB: idxB + 1 });
        idxB++;
      } else {
        if (textA !== undefined) {
          result.push({ type: 'removed', text: textA, lineNumA: idxA + 1 });
          idxA++;
        }
        if (textB !== undefined) {
          result.push({ type: 'added', text: textB, lineNumB: idxB + 1 });
          idxB++;
        }
      }
      if (result.length > 800) break; // guard against massive files
    }

    return result;
  }, [compareRecord, activeRecord]);

  const diffCounts = useMemo(() => {
    const added = proseDiffLines.filter(l => l.type === 'added').length;
    const removed = proseDiffLines.filter(l => l.type === 'removed').length;
    return { added, removed };
  }, [proseDiffLines]);

  const handleCopy = () => {
    if (!activeRecord) return;
    const text = activeTab === 'json'
      ? JSON.stringify(activeRecord.schemaData, null, 2)
      : activeRecord.renderedMarkdown;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!activeRecord) return;
    const filename = `${artifact.taskType.toLowerCase()}_v${activeRecord.version}.md`;
    exportToMarkdown(filename, activeRecord.renderedMarkdown, {
      title: `${artifact.taskType.replace(/_/g, ' ')} v${activeRecord.version}`,
      productName: productName || 'Product Specification',
      taskType: artifact.taskType,
      version: activeRecord.version,
      status: activeRecord.status,
      approvedBy: activeRecord.metadata?.approvedBy || artifact.metadata?.approvedBy,
      approvedAt: activeRecord.metadata?.approvedAt || artifact.metadata?.approvedAt
    });
  };

  const handleDownloadJson = () => {
    if (!activeRecord) return;
    const filename = `${artifact.taskType.toLowerCase()}_v${activeRecord.version}.json`;
    exportToJson(filename, {
      artifactId: artifact.id,
      taskType: artifact.taskType,
      version: activeRecord.version,
      status: activeRecord.status,
      createdAt: activeRecord.createdAt,
      createdBy: activeRecord.createdBy,
      changeSummary: activeRecord.changeSummary,
      metadata: activeRecord.metadata,
      schemaData: activeRecord.schemaData,
      renderedMarkdown: activeRecord.renderedMarkdown
    });
  };

  const handleTriggerRevert = async (targetVersion: number) => {
    if (onRevertArtifact) {
      await onRevertArtifact(artifact.id, targetVersion);
      setRevertConfirmOpen(false);
      setApprovalFeedbackMsg(`✨ Successfully restored v${targetVersion} as the active specification.`);
      setTimeout(() => setApprovalFeedbackMsg(null), 4000);
    }
  };

  const handleTriggerApprove = async () => {
    if (onApproveArtifact) {
      await onApproveArtifact(artifact.id);
      setApprovalFeedbackMsg(`🎉 Promoted to Official Approved Specification v${artifact.version + 1}!`);
      setTimeout(() => setApprovalFeedbackMsg(null), 4000);
    }
  };

  const activeRecordAuditLogs = useMemo(() => {
    if (!activeRecord) return [];
    return auditLogs.filter(log =>
      log.details?.includes(`v${activeRecord.version}`) ||
      (activeRecord.version === artifact.version && log.action === 'APPROVED')
    );
  }, [activeRecord, artifact.version, auditLogs]);

  return (
    <div className={`w-full bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
      embedded ? 'h-[750px]' : 'h-[92vh] max-h-[920px]'
    }`}>
      {/* ================================================================= */}
      {/* 1. TOP HEADER & METADATA BAR                                     */}
      {/* ================================================================= */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-600/25 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-inner shrink-0">
            <History className="w-5 h-5 text-purple-400" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight truncate">
                Artifact Version History & Approval Gate
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                {artifact.taskType.replace(/_/g, ' ')}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                {versionList.length} {versionList.length === 1 ? 'Iteration' : 'Iterations'} Tracked
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center space-x-2">
              <span>{productName ? `${productName} · ` : ''}Artifact ID: <span className="font-mono text-slate-300">{artifact.id}</span></span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400/90 font-medium">Live Audit Trail Synchronized</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick status pill of active version */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border flex items-center space-x-1.5 hidden sm:flex ${
            artifact.status === 'APPROVED'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-xs'
              : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
          }`}>
            {artifact.status === 'APPROVED' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Active: v{artifact.version}.0 ({artifact.status})</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Version History Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {approvalFeedbackMsg && (
        <div className="p-3 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{approvalFeedbackMsg}</span>
          </div>
          <button onClick={() => setApprovalFeedbackMsg(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. MAIN BODY (LEFT: ITERATIONS TIMELINE, RIGHT: INSPECTOR)        */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* --------------------------------------------------------------- */}
        {/* LEFT COLUMN: ITERATION TIMELINE & APPROVAL RECORDS (WIDTH 380px)*/}
        {/* --------------------------------------------------------------- */}
        <div className="w-full md:w-96 flex flex-col bg-slate-950/80 shrink-0 min-h-0">
          {/* Timeline Header & Filter Controls */}
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-950 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Iteration Timeline</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredVersions.length} of {versionList.length} shown
              </span>
            </div>

            {/* Search and Status Filters */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter versions..."
                  className="w-full pl-8 pr-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px]">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setStatusFilter('DRAFT')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    statusFilter === 'DRAFT' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Draft
                </button>
              </div>
            </div>
          </div>

          {/* Timeline List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {filteredVersions.map((ver) => {
              const isSelected = selectedVersionNum === ver.version;
              const isCurrentActive = artifact.version === ver.version;
              const isApproved = ver.status === 'APPROVED';
              const approvedBy = ver.metadata?.approvedBy || (isApproved ? artifact.metadata?.approvedBy : undefined);
              const approvedAt = ver.metadata?.approvedAt || (isApproved ? artifact.metadata?.approvedAt : undefined);

              return (
                <div
                  key={ver.version}
                  onClick={() => setSelectedVersionNum(ver.version)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/50 ring-1 ring-purple-500/50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Row: Version Badge & Approval Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded font-mono text-xs font-black border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-purple-950 text-purple-300 border-purple-800'
                      }`}>
                        v{ver.version}.0
                      </span>

                      {isCurrentActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center space-x-1 border ${
                      isApproved
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-xs'
                        : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                    }`}>
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>APPROVED</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>DRAFT</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Change Summary / Iteration Note */}
                  <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug mb-2">
                    {ver.changeSummary || 'Iteration specification snapshot'}
                  </p>

                  {/* Approval Attribution Badge (If Approved) */}
                  {isApproved && (
                    <div className="mb-2 p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-200 flex items-start space-x-1.5 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="font-bold">Governance Gate Passed</span>
                        <div className="text-[10px] text-emerald-300/80 truncate">
                          {approvedBy ? `By ${approvedBy}` : 'Official Specification'}
                          {approvedAt && ` · ${formatDate(approvedAt)}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Info: Author & Date */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center space-x-1 truncate pr-2">
                      <User className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{ver.createdBy || 'AI Generator'}</span>
                    </div>
                    <span className="shrink-0">{formatDate(ver.createdAt)}</span>
                  </div>
                </div>
              );
            })}

            {filteredVersions.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No iterations match the selected filter.
              </div>
            )}
          </div>

          {/* Approval Gate Quick-Action (if active artifact is still DRAFT) */}
          {artifact.status !== 'APPROVED' && onApproveArtifact && (
            <div className="p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Pending PM Approval Gate</span>
                </span>
              </div>
              <button
                onClick={handleTriggerApprove}
                disabled={isApproving}
                className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 border border-emerald-400/40"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>{isApproving ? 'Approving...' : `Approve & Lock v${artifact.version} as Official`}</span>
              </button>
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------- */}
        {/* RIGHT COLUMN: ITERATION INSPECTOR & COMPARISON (FLEX-1)         */}
        {/* --------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col bg-slate-900 min-h-0 overflow-hidden">
          {/* Inspector Tab Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
            {/* Tab Selector */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('prose')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeTab === 'prose'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Rendered Prose</span>
              </button>

              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeTab === 'json'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Schema JSON</span>
              </button>

              <button
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeTab === 'diff'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Comparative Diff</span>
                {versionList.length > 1 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-950 text-purple-200 font-mono">
                    +{diffCounts.added}/-{diffCounts.removed}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approval & Audit</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {auditLogs.length}
                </span>
              </button>
            </div>

            {/* Action Buttons for the active tab */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
                title="Copy content to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
                title="Download Markdown file"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>.MD</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
                title="Download JSON schema"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>.JSON</span>
              </button>

              {onSelectIterationForSpecView && (
                <button
                  onClick={() => onSelectIterationForSpecView(activeRecord)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Open this historical version in Main Document Viewer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Spec</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Header: Iteration Metadata & Diff Version Picker */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-slate-200">
                Viewing Iteration: <span className="text-purple-300 font-mono font-bold">v{activeRecord.version}.0</span>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">
                Created: {formatDate(activeRecord.createdAt)}
              </span>
              {activeRecord.status === 'APPROVED' && (
                <>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-medium flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Approved by {activeRecord.metadata?.approvedBy || artifact.metadata?.approvedBy || 'Senior PM'}</span>
                  </span>
                </>
              )}
            </div>

            {/* Version Comparison Selector in Diff Mode */}
            {activeTab === 'diff' && (
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-xs">Compare against:</span>
                <select
                  value={diffBaseVersion ?? ''}
                  onChange={(e) => setDiffBaseVersion(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                >
                  {versionList.map(v => (
                    <option key={v.version} value={v.version} disabled={v.version === selectedVersionNum}>
                      v{v.version}.0 ({v.status}) {v.version === artifact.version ? '— Active' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 leading-relaxed text-sm">
            {/* TAB 1: RENDERED PROSE */}
            {activeTab === 'prose' && (
              <div className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-100 prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-xs sm:prose-p:text-sm prose-li:text-xs sm:prose-li:text-sm">
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                  {activeRecord.renderedMarkdown || 'No rendered markdown captured for this iteration.'}
                </div>
              </div>
            )}

            {/* TAB 2: SCHEMA JSON */}
            {activeTab === 'json' && (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 font-mono text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(activeRecord.schemaData, null, 2)}
              </pre>
            )}

            {/* TAB 3: COMPARATIVE DIFF */}
            {activeTab === 'diff' && (
              <div className="space-y-4">
                {/* Mode Selector for PRD / Roadmap */}
                {(artifact.taskType === 'PRD' || artifact.taskType === 'ROADMAP') && (
                  <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
                    <button
                      onClick={() => setDiffFormat('structured')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        diffFormat === 'structured'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Structured Specifications Diff</span>
                    </button>
                    <button
                      onClick={() => setDiffFormat('prose')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        diffFormat === 'prose'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Line-by-Line Prose Diff</span>
                    </button>
                  </div>
                )}

                {diffFormat === 'structured' && artifact.taskType === 'PRD' && (
                  <InlinePrdStructuralDiff
                    artifact={artifact}
                    versionHistory={versionList}
                    currentSelectedVersion={activeRecord.version}
                    productName={productName || 'Product'}
                    onOpenFullComparison={() => {}}
                  />
                )}

                {diffFormat === 'structured' && artifact.taskType === 'ROADMAP' && (
                  <InlineRoadmapStructuralDiff
                    artifact={artifact}
                    versionHistory={versionList}
                    currentSelectedVersion={activeRecord.version}
                    productName={productName || 'Product'}
                    onOpenFullComparison={() => {}}
                  />
                )}

                {(diffFormat === 'prose' || (artifact.taskType !== 'PRD' && artifact.taskType !== 'ROADMAP')) && (
                  <>
                    {/* Diff Summary Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <GitCompare className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-slate-200">
                          Comparing v{compareRecord.version} (Baseline) → v{activeRecord.version} (Inspected Iteration)
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 font-mono font-bold">
                        <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                          +{diffCounts.added} lines added
                        </span>
                        <span className="text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">
                          -{diffCounts.removed} lines removed
                        </span>
                      </div>
                    </div>

                    {/* Diff Line-by-Line Viewer */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs overflow-hidden divide-y divide-slate-850">
                      {proseDiffLines.map((line, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-1 flex items-start space-x-3 transition-colors ${
                            line.type === 'added'
                              ? 'bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500'
                              : line.type === 'removed'
                              ? 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-500'
                              : 'text-slate-400 hover:bg-slate-900/40'
                          }`}
                        >
                          <span className="w-5 shrink-0 text-center select-none font-bold">
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                          </span>
                          <span className="w-8 shrink-0 text-right select-none text-slate-600 text-[10px]">
                            {line.lineNumB || line.lineNumA || idx + 1}
                          </span>
                          <span className="whitespace-pre-wrap break-words flex-1 font-sans text-xs">
                            {line.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 4: APPROVAL & AUDIT */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                {/* Active Iteration Approval Card */}
                <div className={`p-4 rounded-xl border ${
                  activeRecord.status === 'APPROVED'
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-amber-950/30 border-amber-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {activeRecord.status === 'APPROVED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-400" />
                      )}
                      <h4 className="font-bold text-sm text-slate-100">
                        {activeRecord.status === 'APPROVED'
                          ? `Version v${activeRecord.version} Governance Sign-Off Passed`
                          : `Version v${activeRecord.version} Working Draft`}
                      </h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                      activeRecord.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {activeRecord.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">
                    {activeRecord.changeSummary || 'Iteration baseline specification snapshot.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Approver</div>
                      <div className="text-slate-200 font-bold truncate">
                        {activeRecord.metadata?.approvedBy || artifact.metadata?.approvedBy || 'Pending Human PM'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Approval Date</div>
                      <div className="text-slate-200 font-bold truncate">
                        {formatDate(activeRecord.metadata?.approvedAt || artifact.metadata?.approvedAt)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Tokens & Latency</div>
                      <div className="text-slate-200 font-bold truncate">
                        {activeRecord.metadata?.outputTokens || 1850} tok · {activeRecord.metadata?.latencyMs || 1200}ms
                      </div>
                    </div>
                  </div>

                  {/* Governance Gate Checklist */}
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approval Gate Verification Matrix</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Product Strategy Alignment Confirmed</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Security, SOC-2 & PCI SLA Validated</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Engineering Scope & Acceptance Criteria Locked</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Eligible for Roadmap & Sprint Planner Rollups</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Trail Events List */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Iteration Audit Trail Event Stream</span>
                  </h5>

                  {isLoadingLogs ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading audit trail records...</div>
                  ) : auditLogs.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start justify-between text-xs">
                          <div className="space-y-1 pr-3">
                            <div className="flex items-center space-x-2">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                log.action === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                log.action === 'GENERATED' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                                'bg-blue-950 text-cyan-300 border border-blue-800'
                              }`}>
                                {log.action}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">{log.userId}</span>
                            </div>
                            <p className="text-slate-300 text-xs">{log.details}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-400 text-center">
                      No distinct audit trail events logged yet. Approvals and modifications will populate here.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inspector Footer Actions */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>Selected: <span className="font-mono text-slate-200 font-bold">v{activeRecord.version}.0</span></span>
              {activeRecord.version === artifact.version && (
                <span className="text-emerald-400 font-semibold">(Current Active Iteration)</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Rollback / Restore Button if selected version is not active */}
              {activeRecord.version !== artifact.version && onRevertArtifact && (
                <>
                  {!revertConfirmOpen ? (
                    <button
                      onClick={() => setRevertConfirmOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-bold border border-purple-600/80 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Rollback active specification to this iteration"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
                      <span>Restore v{activeRecord.version} as Active</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5 animate-in fade-in">
                      <span className="text-xs text-amber-300 font-semibold">Confirm Rollback to v{activeRecord.version}?</span>
                      <button
                        onClick={() => handleTriggerRevert(activeRecord.version)}
                        disabled={isReverting}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isReverting ? 'Restoring...' : 'Yes, Restore'}
                      </button>
                      <button
                        onClick={() => setRevertConfirmOpen(false)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
