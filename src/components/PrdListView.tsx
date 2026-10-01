import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Download, 
  Copy, 
  Check,
  ShieldCheck,
  Search,
  Filter,
  GitCompare,
  ArrowRightLeft,
  Plus,
  Layers,
  History,
  Tag,
  FileDown
} from 'lucide-react';
import { Product, GeneratedArtifact } from '../types.js';
import { ArtifactDiffViewer, VersionOption } from './ArtifactDiffViewer.js';
import { exportArtifactPdf, exportToMarkdown } from '../utils/exportUtils.js';

interface PrdListViewProps {
  selectedProductId: string;
  products: Product[];
  onSelectProduct: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const PrdListView: React.FC<PrdListViewProps> = ({
  selectedProductId,
  products,
  onSelectProduct,
  onNavigateTab
}) => {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Interactive Version History Switcher State (artifactId -> versionNumber)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});

  // Diff View State
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffVersionA, setDiffVersionA] = useState<number>(1);
  const [diffVersionB, setDiffVersionB] = useState<number>(2);
  const [selectedPrdId, setSelectedPrdId] = useState<string | null>(null);

  // New revision modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const fetchPrds = () => {
    setLoading(true);
    fetch(`/api/products/${selectedProductId}`)
      .then(res => res.json())
      .then(data => {
        const prds = (data.artifacts || []).filter((a: any) => a.taskType === 'PRD');
        setArtifacts(prds);
        if (prds.length > 0 && !selectedPrdId) {
          setSelectedPrdId(prds[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPrds();
  }, [selectedProductId]);

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];
  const activePrd = artifacts.find(a => a.id === selectedPrdId) || artifacts[0];

  // Convert active PRD versions into VersionOptions for diff viewer
  const availableVersions: VersionOption[] = React.useMemo(() => {
    if (!activePrd) return [];

    if (activePrd.versionHistory && activePrd.versionHistory.length > 0) {
      return activePrd.versionHistory.map(vh => ({
        version: vh.version,
        label: vh.changeSummary || `Version v${vh.version}.0`,
        status: vh.status,
        date: vh.createdAt,
        author: vh.createdBy || 'PM Team',
        changeSummary: vh.changeSummary,
        schemaData: vh.schemaData,
        renderedMarkdown: vh.renderedMarkdown,
        id: activePrd.id
      }));
    }

    // Fallback: If only active version exists
    return [
      {
        version: activePrd.version,
        label: `Active Version v${activePrd.version}.0`,
        status: activePrd.status,
        date: activePrd.metadata?.createdAt || new Date().toISOString(),
        author: activePrd.metadata?.approvedBy || 'PM Lead',
        changeSummary: 'Current active specification',
        schemaData: activePrd.schemaData,
        renderedMarkdown: activePrd.renderedMarkdown,
        id: activePrd.id
      }
    ];
  }, [activePrd]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenDiff = (prd: GeneratedArtifact, vA?: number, vB?: number) => {
    setSelectedPrdId(prd.id);
    const history = prd.versionHistory || [];
    if (history.length >= 2) {
      setDiffVersionA(vA ?? history[history.length - 2].version);
      setDiffVersionB(vB ?? history[history.length - 1].version);
    } else {
      setDiffVersionA(vA ?? 1);
      setDiffVersionB(vB ?? prd.version);
    }
    setIsDiffOpen(true);
  };

  const handleExportPdf = (prd: GeneratedArtifact) => {
    exportArtifactPdf(prd, activeProduct?.name || 'Active Product');
  };

  const handleExportMarkdown = (prd: GeneratedArtifact) => {
    const title = prd.schemaData?.title || 'prd_specification';
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${prd.version}.md`;
    exportToMarkdown(filename, prd.renderedMarkdown || '', {
      title: prd.schemaData?.title || 'PRD Specification',
      productName: activeProduct?.name,
      taskType: 'PRD',
      version: prd.version,
      status: prd.status,
      approvedBy: prd.metadata?.approvedBy,
      approvedAt: prd.metadata?.approvedAt
    });
  };

  const handleCreateRevision = async () => {
    if (!activePrd) return;
    setIsSubmittingRevision(true);
    try {
      const summaryText = revisionSummary.trim() || `Draft Revision v${activePrd.version + 1}.0`;
      
      // Clone existing schemaData and add a simulated high-value revision item
      const clonedSchema = JSON.parse(JSON.stringify(activePrd.schemaData || {}));
      const newReqId = `FR-${Date.now().toString().slice(-3)}`;
      
      if (!clonedSchema.functionalRequirements) {
        clonedSchema.functionalRequirements = [];
      }
      
      clonedSchema.functionalRequirements.push({
        id: newReqId,
        priority: 'MUST',
        requirement: `Enterprise Compliance & Observability Telemetry Hook: ${summaryText}`
      });

      if (!clonedSchema.mvpScope) clonedSchema.mvpScope = [];
      clonedSchema.mvpScope.push(`Automated Compliance Hook (${newReqId})`);

      const res = await fetch(`/api/artifacts/${activePrd.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeSummary: summaryText,
          schemaData: clonedSchema,
          author: 'Lead Product Manager'
        })
      });

      if (res.ok) {
        setIsRevisionModalOpen(false);
        setRevisionSummary('');
        fetchPrds();
      }
    } catch (err) {
      console.error('Failed to create revision', err);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Product Requirements Documents (PRDs)</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Official specifications, MoSCoW functional requirements, SLA boundaries, and multi-version changelogs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedProductId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Export Approved PRD Action */}
          {activePrd && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => handleExportPdf(activePrd)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/80 transition-colors shadow-xs"
                title="Export Official Specification as PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={() => handleExportMarkdown(activePrd)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                title="Export Specification as Markdown"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export .md</span>
              </button>
            </div>
          )}

          {/* Quick Side-by-Side Diff Trigger Button */}
          {artifacts.length > 0 && (
            <button
              onClick={() => {
                if (isDiffOpen) {
                  setIsDiffOpen(false);
                } else if (activePrd) {
                  handleOpenDiff(activePrd);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all border ${
                isDiffOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20'
                  : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border-indigo-800/80'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isDiffOpen ? 'Close Diff View' : 'Compare Versions (Diff)'}</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate New PRD</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Diff Section (Toggled) */}
      {isDiffOpen && activePrd && availableVersions.length > 0 && (
        <div className="transition-all animate-in fade-in duration-300">
          <ArtifactDiffViewer
            taskType="PRD"
            productName={activeProduct?.name || 'Active Product'}
            versions={availableVersions}
            initialVersionA={diffVersionA}
            initialVersionB={diffVersionB}
            onClose={() => setIsDiffOpen(false)}
            onCreateRevision={() => setIsRevisionModalOpen(true)}
          />
        </div>
      )}

      {/* PRD Card / List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading specifications...</div>
        ) : artifacts.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No PRD generated for this workspace yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Run the autonomous 19-artifact pipeline or single PRD generator to generate a complete spec in seconds.
            </p>
            <button
              onClick={() => onNavigateTab('ai-workspace')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate PRD Now</span>
            </button>
          </div>
        ) : (
          artifacts.map((art) => {
            const versionHistory = art.versionHistory && art.versionHistory.length > 0 
              ? art.versionHistory 
              : [{
                  version: art.version,
                  status: art.status,
                  createdAt: art.metadata?.createdAt || new Date().toISOString(),
                  createdBy: art.metadata?.approvedBy || 'PM Lead',
                  changeSummary: 'Initial active specification',
                  schemaData: art.schemaData,
                  renderedMarkdown: art.renderedMarkdown
                }];

            const selectedVersionNum = selectedVersions[art.id] ?? art.version;
            const currentIteration = versionHistory.find(v => v.version === selectedVersionNum) || versionHistory[versionHistory.length - 1];

            const schema = currentIteration.schemaData || (currentIteration as any).parsedContent || art.schemaData || {};
            const title = schema.title || activeProduct?.name + ' PRD';
            const objective = schema.objective || schema.problemStatement || activeProduct?.vision;
            const functionalReqs = schema.functionalRequirements || [];
            const versionCount = versionHistory.length;
            const isHistorical = selectedVersionNum !== art.version;

            return (
              <div key={art.id} className={`p-6 rounded-2xl border transition-all space-y-5 shadow-sm ${
                isHistorical ? 'bg-slate-900 border-indigo-500/50 shadow-indigo-950/20 ring-1 ring-indigo-500/30' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-100">{title}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        currentIteration.status === 'APPROVED' 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {currentIteration.status} v{selectedVersionNum}.0
                      </span>

                      {/* Multi-Version Badge */}
                      {versionCount > 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          <History className="w-3 h-3 text-indigo-400" />
                          <span>{versionCount} Iterations Available</span>
                        </span>
                      )}

                      {isHistorical && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          Viewing Historical Iteration
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed max-w-3xl">
                      {objective}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Compare Versions Action */}
                    <button
                      onClick={() => handleOpenDiff(art, selectedVersionNum, art.version)}
                      className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      title="Open Side-by-Side Version Diff"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Compare Versions</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPrdId(art.id);
                        setIsRevisionModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-semibold flex items-center gap-1.5"
                      title="Create a new revision snapshot"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Revision</span>
                    </button>

                    <button
                      onClick={() => handleExportPdf(art)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                        currentIteration.status === 'APPROVED'
                          ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title={currentIteration.status === 'APPROVED' ? "Export Official Approved Specification PDF" : "Export Draft Specification PDF"}
                    >
                      <FileDown className="w-3.5 h-3.5 text-rose-400" />
                      <span>Export PDF</span>
                    </button>

                    <button
                      onClick={() => handleExportMarkdown(art)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-semibold flex items-center gap-1.5"
                      title="Export Specification as Markdown"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>.md</span>
                    </button>

                    <button
                      onClick={() => handleCopy(art.id, currentIteration.renderedMarkdown || (currentIteration as any).markdown || art.renderedMarkdown || '')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1"
                      title="Copy Markdown Prose"
                    >
                      {copiedId === art.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === art.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => onNavigateTab('ai-workspace')}
                      className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-950 text-emerald-300 border border-emerald-800/60 transition-colors text-xs flex items-center gap-1 font-semibold"
                    >
                      <span>Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* INTERACTIVE VERSION HISTORY TOGGLE BAR */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Iteration Selector:</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {versionHistory.map((vh) => {
                        const isSelected = selectedVersionNum === vh.version;
                        const isLive = vh.version === art.version;
                        return (
                          <button
                            key={vh.version}
                            onClick={() => setSelectedVersions(prev => ({ ...prev, [art.id]: vh.version }))}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                              isSelected 
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm scale-105' 
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                            title={vh.changeSummary || `Version v${vh.version}.0`}
                          >
                            <span>v{vh.version}.0</span>
                            {isLive && (
                              <span className="text-[9px] font-sans px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                                Live
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Historical Iteration Notice & Switcher */}
                  <div className="flex items-center gap-2.5 text-xs">
                    {isHistorical ? (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300 font-medium text-[11px]">
                          Note: {currentIteration.changeSummary || `Iteration v${selectedVersionNum}.0`}
                        </span>
                        <button
                          onClick={() => setSelectedVersions(prev => ({ ...prev, [art.id]: art.version }))}
                          className="px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 font-semibold transition-colors"
                        >
                          Switch to Live (v{art.version}.0)
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Viewing active production iteration
                      </span>
                    )}
                  </div>
                </div>

                {/* Functional Requirements Summary */}
                {functionalReqs.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Functional Requirements ({functionalReqs.length})
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        MoSCoW Prioritized
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {functionalReqs.slice(0, 4).map((req: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                              <span className="font-mono text-[11px] text-slate-400">{req.id}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                req.priority === 'MUST' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                                req.priority === 'SHOULD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {req.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                              {req.requirement || req.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Revision Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Create PRD Revision v{(activePrd?.version || 1) + 1}.0
                </h3>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Create a new version snapshot for <strong className="text-slate-200">{activeProduct?.name}</strong>. Previous versions will remain preserved in the Side-by-Side Diff history.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Revision Changelog / Summary Note:
              </label>
              <textarea
                value={revisionSummary}
                onChange={(e) => setRevisionSummary(e.target.value)}
                placeholder="e.g. Add Biometric Step-Up authentication, tighten API latency SLA to 400ms, expand SOC2 compliance"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRevision}
                disabled={isSubmittingRevision}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmittingRevision ? 'Creating...' : 'Save New Revision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
