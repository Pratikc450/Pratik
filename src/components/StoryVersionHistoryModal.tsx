import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  X, 
  Clock, 
  User, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  FileText, 
  CheckSquare, 
  Sparkles,
  GitCommit,
  Layers,
  Flag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export interface StoryRevisionSnapshot {
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  priority?: string;
  status?: string;
  approvalStatus?: string;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  riceScore?: number;
  estimationJustification?: string;
  epicTitle?: string;
  persona?: string;
}

export interface StoryRevision {
  version: number;
  timestamp: string;
  author: string;
  changeSummary: string;
  fieldsChanged?: string[];
  snapshot: StoryRevisionSnapshot;
}

interface StoryVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: any | null;
  productName?: string;
  onRevert: (storyId: string, targetVersion: number) => Promise<void> | void;
  isReverting?: boolean;
}

export const StoryVersionHistoryModal: React.FC<StoryVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  story,
  productName,
  onRevert,
  isReverting = false
}) => {
  const [selectedCompareVersion, setSelectedCompareVersion] = useState<number | null>(null);
  const [revertingVersion, setRevertingVersion] = useState<number | null>(null);

  if (!isOpen || !story) return null;

  const currentVersion = story.version || (story.history ? story.history.length : 1);
  const revisions: StoryRevision[] = story.history && story.history.length > 0
    ? [...story.history].sort((a, b) => b.version - a.version)
    : [
        {
          version: 1,
          timestamp: new Date().toISOString(),
          author: 'AI Spec Generator',
          changeSummary: 'Initial story creation and baseline scoping',
          fieldsChanged: ['asA', 'iWant', 'soThat', 'acceptanceCriteria'],
          snapshot: {
            asA: story.asA,
            iWant: story.iWant,
            soThat: story.soThat,
            acceptanceCriteria: story.acceptanceCriteria || [],
            priority: story.priority || 'P1',
            status: story.status || 'READY_FOR_DEV',
            reach: story.reach || 2500,
            impact: story.impact || 2,
            confidence: story.confidence || 0.8,
            effort: story.effort || 2,
            riceScore: story.riceScore || 2000,
            epicTitle: story.epicTitle,
            persona: story.persona
          }
        }
      ];

  const handleRevertClick = async (targetVersion: number) => {
    setRevertingVersion(targetVersion);
    try {
      await onRevert(story.id, targetVersion);
    } finally {
      setRevertingVersion(null);
    }
  };

  const comparedRevision = selectedCompareVersion !== null
    ? revisions.find(r => r.version === selectedCompareVersion) || null
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  {story.id}
                </span>
                <h2 id="version-history-title" className="text-base sm:text-lg font-bold text-slate-100">
                  Story Version History & Rollback
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  v{currentVersion} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail of previous iterations for <strong className="text-slate-200">{story.persona}</strong> · {productName || 'Product Backlog'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close Version History"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
          
          {/* Quick Context Summary Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <GitCommit className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-200 text-xs sm:text-sm">
                  {revisions.length} Total {revisions.length === 1 ? 'Iteration' : 'Iterations'} Tracked
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  PMs can inspect past Gherkin statements, RICE formula shifts, and revert to any stable baseline at any time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">Current Specification:</span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 font-mono font-bold text-slate-200 text-xs">
                v{currentVersion}.0
              </span>
            </div>
          </div>

          {/* Compared Diff Viewer (if user selected a version to compare with current) */}
          {comparedRevision && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-purple-500/60 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    <span>Comparing: v{comparedRevision.version} vs Current (v{currentVersion})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRevertClick(comparedRevision.version)}
                    disabled={isReverting || revertingVersion === comparedRevision.version}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/60 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{revertingVersion === comparedRevision.version ? 'Reverting...' : `Revert to v${comparedRevision.version}`}</span>
                  </button>
                  <button
                    onClick={() => setSelectedCompareVersion(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Close Diff
                  </button>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Historical Snapshot (vX) */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">
                      Iteration v{comparedRevision.version} ({new Date(comparedRevision.timestamp).toLocaleDateString()})
                    </span>
                    <span className="text-[10px] text-slate-500">{comparedRevision.author}</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p><strong className="text-purple-400">As a:</strong> {comparedRevision.snapshot.asA}</p>
                    <p><strong className="text-purple-400">I want:</strong> {comparedRevision.snapshot.iWant}</p>
                    <p><strong className="text-purple-400">So that:</strong> {comparedRevision.snapshot.soThat}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      RICE: {comparedRevision.snapshot.riceScore?.toLocaleString() || 'N/A'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      Reach: {comparedRevision.snapshot.reach?.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      Priority: {comparedRevision.snapshot.priority || 'P1'}
                    </span>
                  </div>
                </div>

                {/* Current Active State (vCurrent) */}
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 text-[11px] uppercase tracking-wider">
                      Current Version v{currentVersion} (Active)
                    </span>
                    <span className="text-[10px] text-purple-400 font-bold">LIVE SPEC</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <p><strong className="text-purple-400">As a:</strong> {story.asA}</p>
                    <p><strong className="text-purple-400">I want:</strong> {story.iWant}</p>
                    <p><strong className="text-purple-400">So that:</strong> {story.soThat}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-800">
                      RICE: {story.riceScore?.toLocaleString() || 'N/A'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-800">
                      Reach: {story.reach?.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-800">
                      Priority: {story.priority || 'P0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline List of Iterations */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Chronological Iterations Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-4 border-l-2 border-slate-800">
              {revisions.map((rev) => {
                const isCurrent = rev.version === currentVersion;
                const isSelectedForCompare = selectedCompareVersion === rev.version;
                const snap = rev.snapshot || story;

                return (
                  <div 
                    key={rev.version}
                    className={`relative p-4 sm:p-5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-slate-900/90 border-purple-500/70 shadow-lg shadow-purple-950/30'
                        : isSelectedForCompare
                        ? 'bg-purple-950/30 border-purple-500 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Timeline Node Bullet */}
                    <div className={`absolute -left-[31px] top-5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isCurrent
                        ? 'bg-purple-600 border-purple-300 ring-4 ring-purple-900/40'
                        : 'bg-slate-900 border-slate-700'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-slate-500'}`} />
                    </div>

                    {/* Top Row: Version, Author, Timestamp, Status & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-1 rounded font-mono text-xs font-bold border ${
                          isCurrent
                            ? 'bg-purple-900 text-purple-200 border-purple-600'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}>
                          v{rev.version}.0
                        </span>

                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>CURRENT SPEC</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                            Historical Iteration
                          </span>
                        )}

                        <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                          <span>{rev.author || 'Product Lead'}</span>
                        </span>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(rev.timestamp).toLocaleString()}</span>
                        </span>
                      </div>

                      {/* Action Buttons: Compare vs Revert */}
                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <>
                            <button
                              onClick={() => setSelectedCompareVersion(isSelectedForCompare ? null : rev.version)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                isSelectedForCompare
                                  ? 'bg-purple-900 text-purple-200 border-purple-600'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {isSelectedForCompare ? 'Hide Diff' : 'Compare Diff'}
                            </button>

                            <button
                              onClick={() => handleRevertClick(rev.version)}
                              disabled={isReverting || revertingVersion === rev.version}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                              title={`Rollback user story ${story.id} to this specification`}
                            >
                              <RotateCcw className={`w-3.5 h-3.5 text-emerald-100 ${revertingVersion === rev.version ? 'animate-spin' : ''}`} />
                              <span>{revertingVersion === rev.version ? 'Reverting...' : `Revert to v${rev.version}`}</span>
                            </button>
                          </>
                        )}
                        {isCurrent && (
                          <span className="text-[11px] text-slate-500 font-mono italic">
                            Live specification
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Change Summary & Field Badges */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-purple-200 font-medium">
                          {rev.changeSummary}
                        </span>
                        {rev.fieldsChanged && rev.fieldsChanged.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {rev.fieldsChanged.map(field => (
                              <span key={field} className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/60">
                                {field}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Story Snapshot Details */}
                      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 space-y-1 text-xs text-slate-300 leading-relaxed font-sans">
                        <p><strong className="text-purple-400 font-semibold">As a</strong> {snap.asA}</p>
                        <p><strong className="text-purple-400 font-semibold">I want</strong> {snap.iWant}</p>
                        <p><strong className="text-purple-400 font-semibold">So that</strong> {snap.soThat}</p>
                      </div>

                      {/* Snapshot Metrics Bar */}
                      <div className="flex items-center justify-between gap-3 pt-1 text-[11px] font-mono flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-400 font-sans">RICE Score:</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/60">
                            {snap.riceScore?.toLocaleString() || '1,000'}
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 font-sans">Reach:</span>
                          <span className="text-slate-200 font-bold">{snap.reach?.toLocaleString()}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 font-sans">Effort:</span>
                          <span className="text-slate-200 font-bold">{snap.effort || 2}w</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 font-sans">Priority:</span>
                          <span className="text-purple-300 font-bold">{snap.priority || 'P1'}</span>
                        </div>

                        {snap.acceptanceCriteria && snap.acceptanceCriteria.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {snap.acceptanceCriteria.length} Acceptance Criteria defined
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Reversions are recorded into the artifact audit log with complete rollback tracking.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
