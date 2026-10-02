import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map, 
  Sparkles, 
  Calendar, 
  Layers, 
  Flag,
  GitCompare,
  History,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Tag,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  FileDown,
  Download,
  CheckCircle2,
  X,
  Sliders,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { Product, GeneratedArtifact } from '../types.js';
import { ArtifactDiffViewer, VersionOption } from './ArtifactDiffViewer.js';
import { exportArtifactPdf, exportToMarkdown } from '../utils/exportUtils.js';

interface RoadmapListViewProps {
  selectedProductId: string;
  products: Product[];
  onSelectProduct: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const RoadmapListView: React.FC<RoadmapListViewProps> = ({
  selectedProductId,
  products,
  onSelectProduct,
  onNavigateTab
}) => {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Diff View State
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffVersionA, setDiffVersionA] = useState<number>(1);
  const [diffVersionB, setDiffVersionB] = useState<number>(2);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);

  // New revision modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // AI Roadmap Visualizer (Gantt-Style Timeline) State
  const [roadmapViewMode, setRoadmapViewMode] = useState<'HORIZONS' | 'GANTT_TIMELINE'>('HORIZONS');

  // AI Sprint Scheduler State
  const [isSprintSchedulerOpen, setIsSprintSchedulerOpen] = useState(false);
  const [developerVelocity, setDeveloperVelocity] = useState<number>(24); // story points per 2-week sprint
  const [sprintBacklogStories, setSprintBacklogStories] = useState<any[]>([]);
  const [schedulerSuccess, setSchedulerSuccess] = useState<string | null>(null);

  const fetchRoadmaps = () => {
    setLoading(true);
    fetch(`/api/products/${selectedProductId}`)
      .then(res => res.json())
      .then(data => {
        const rms = (data.artifacts || []).filter((a: any) => a.taskType === 'ROADMAP');
        setArtifacts(rms);
        if (rms.length > 0 && !selectedRoadmapId) {
          setSelectedRoadmapId(rms[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoadmaps();
  }, [selectedProductId]);

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];
  const activeRoadmap = artifacts.find(a => a.id === selectedRoadmapId) || artifacts[0];

  // Convert active Roadmap versions into VersionOptions for diff viewer
  const availableVersions: VersionOption[] = useMemo(() => {
    if (!activeRoadmap) return [];

    if (activeRoadmap.versionHistory && activeRoadmap.versionHistory.length > 0) {
      return activeRoadmap.versionHistory.map(vh => ({
        version: vh.version,
        label: vh.changeSummary || `Version v${vh.version}.0`,
        status: vh.status,
        date: vh.createdAt,
        author: vh.createdBy || 'PM Team',
        changeSummary: vh.changeSummary,
        schemaData: vh.schemaData,
        renderedMarkdown: vh.renderedMarkdown,
        id: activeRoadmap.id
      }));
    }

    return [
      {
        version: activeRoadmap.version,
        label: `Active Version v${activeRoadmap.version}.0`,
        status: activeRoadmap.status,
        date: activeRoadmap.metadata?.createdAt || new Date().toISOString(),
        author: activeRoadmap.metadata?.approvedBy || 'PM Lead',
        changeSummary: 'Current active roadmap specification',
        schemaData: activeRoadmap.schemaData,
        renderedMarkdown: activeRoadmap.renderedMarkdown,
        id: activeRoadmap.id
      }
    ];
  }, [activeRoadmap]);

  const handleOpenDiff = (rm: GeneratedArtifact, vA?: number, vB?: number) => {
    setSelectedRoadmapId(rm.id);
    const history = rm.versionHistory || [];
    if (history.length >= 2) {
      setDiffVersionA(vA ?? history[history.length - 2].version);
      setDiffVersionB(vB ?? history[history.length - 1].version);
    } else {
      setDiffVersionA(vA ?? 1);
      setDiffVersionB(vB ?? rm.version);
    }
    setIsDiffOpen(true);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportPdf = (rm: GeneratedArtifact) => {
    exportArtifactPdf(rm, activeProduct?.name || 'Active Product');
  };

  const handleExportMarkdown = (rm: GeneratedArtifact) => {
    const title = `${activeProduct?.name || 'product'}_roadmap`;
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${rm.version}.md`;
    exportToMarkdown(filename, rm.renderedMarkdown || '', {
      title: `${activeProduct?.name} Delivery Horizon Roadmap`,
      productName: activeProduct?.name,
      taskType: 'ROADMAP',
      version: rm.version,
      status: rm.status,
      approvedBy: rm.metadata?.approvedBy,
      approvedAt: rm.metadata?.approvedAt
    });
  };

  const handleCreateRevision = async () => {
    if (!activeRoadmap) return;
    setIsSubmittingRevision(true);
    try {
      const summaryText = revisionSummary.trim() || `Roadmap Revision v${activeRoadmap.version + 1}.0`;
      
      const clonedSchema = JSON.parse(JSON.stringify(activeRoadmap.schemaData || {}));
      
      // Add a simulated revision initiative or quarter
      if (!clonedSchema.quarterHorizons) clonedSchema.quarterHorizons = [];
      const targetQuarter = clonedSchema.quarterHorizons[clonedSchema.quarterHorizons.length - 1];
      if (targetQuarter && targetQuarter.initiatives) {
        targetQuarter.initiatives.push({
          id: `INIT-${Date.now().toString().slice(-3)}`,
          title: `Autonomous Optimization: ${summaryText.slice(0, 40)}`,
          description: summaryText,
          targetOutcome: 'Accelerate velocity and reduce technical debt',
          priority: 'P1',
          dependencies: [],
          estimatedEffortWeeks: 5
        });
      }

      const res = await fetch(`/api/artifacts/${activeRoadmap.id}/revisions`, {
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
        fetchRoadmaps();
      }
    } catch (err) {
      console.error('Failed to create roadmap revision', err);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Quarters data to render
  const schema = activeRoadmap?.schemaData || (activeRoadmap as any)?.parsedContent || {};
  const quarters = schema.quarterHorizons || [
    {
      quarter: 'Q1 2027',
      theme: 'Instant Underwriting Foundation & Checkout Conversion',
      initiatives: [
        { id: 'INIT-1', title: 'Instant Net-30 Checkout Modal', description: 'Embed dynamic credit verification in checkout flow with < 60s approval decision.', priority: 'P0', estimatedEffortWeeks: 6, targetOutcome: 'Increase B2B cart conversion from 22% to 35%' },
        { id: 'INIT-2', title: 'Automated Digital Terms Signing', description: 'In-iframe legally binding digital promissory note signing.', priority: 'P1', estimatedEffortWeeks: 3, targetOutcome: '100% compliant paperless audit trail' }
      ]
    },
    {
      quarter: 'Q2 2027',
      theme: 'Enterprise ERP Sync & Bi-Directional Requisitioning',
      initiatives: [
        { id: 'INIT-3', title: 'NetSuite & SAP ERP Connector Suite', description: 'Automate two-way purchase order, receipt, and invoice sync.', priority: 'P0', estimatedEffortWeeks: 8, targetOutcome: 'Zero manual data entry for 80% of wholesale orders' },
        { id: 'INIT-4', title: 'Multi-Signer Approval Workflows', description: 'Dynamic routing for orders exceeding corporate spend limits.', priority: 'P1', estimatedEffortWeeks: 4, targetOutcome: 'Support Fortune 500 tiered hierarchies' }
      ]
    },
    {
      quarter: 'Q3 2027',
      theme: 'Cross-Border Settlement & Dynamic Credit Lines',
      initiatives: [
        { id: 'INIT-5', title: 'Multi-Currency Trade Credit Syndication', description: 'Dynamic credit syndication across regional lending syndicates.', priority: 'P2', estimatedEffortWeeks: 10, targetOutcome: 'Expand available GMV volume by 4x' }
      ]
    }
  ];

  const versionCount = activeRoadmap?.versionHistory ? activeRoadmap.versionHistory.length : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Map className="w-6 h-6 text-blue-400" />
            <span>Product Roadmaps</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Multi-quarter delivery horizons, strategic initiative themes, priority outcomes, and version changelogs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedProductId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Export Approved Roadmap Action */}
          {activeRoadmap && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => handleExportPdf(activeRoadmap)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/80 transition-colors shadow-xs"
                title="Export Official Roadmap as PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={() => handleExportMarkdown(activeRoadmap)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                title="Export Roadmap as Markdown"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export .md</span>
              </button>
            </div>
          )}

          {/* Quick Side-by-Side Diff Trigger Button */}
          {activeRoadmap && (
            <button
              onClick={() => {
                if (isDiffOpen) {
                  setIsDiffOpen(false);
                } else {
                  handleOpenDiff(activeRoadmap);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all border ${
                isDiffOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                  : 'bg-blue-950/80 hover:bg-blue-900 text-blue-300 border-blue-800/80'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isDiffOpen ? 'Close Diff View' : 'Compare Versions (Diff)'}</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Roadmap</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Diff Section (Toggled) */}
      {isDiffOpen && activeRoadmap && availableVersions.length > 0 && (
        <div className="transition-all animate-in fade-in duration-300">
          <ArtifactDiffViewer
            taskType="ROADMAP"
            productName={activeProduct?.name || 'Active Product'}
            versions={availableVersions}
            initialVersionA={diffVersionA}
            initialVersionB={diffVersionB}
            onClose={() => setIsDiffOpen(false)}
            onCreateRevision={() => setIsRevisionModalOpen(true)}
          />
        </div>
      )}

      {/* Active Roadmap Overview Bar */}
      {activeRoadmap && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-100">
                {activeProduct?.name} Delivery Horizon Roadmap
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                activeRoadmap.status === 'APPROVED' 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {activeRoadmap.status} v{activeRoadmap.version}.0
              </span>

              {versionCount > 1 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  <History className="w-3 h-3 text-blue-400" />
                  <span>{versionCount} Versions Available</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              {schema.vision || activeProduct?.vision}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenDiff(activeRoadmap)}
              className="px-3.5 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              title="Open Side-by-Side Version Diff"
            >
              <GitCompare className="w-3.5 h-3.5 text-blue-400" />
              <span>Compare Versions</span>
            </button>

            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Create a new revision snapshot"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Revision</span>
            </button>

            <button
              onClick={() => handleExportPdf(activeRoadmap)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                activeRoadmap.status === 'APPROVED'
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={activeRoadmap.status === 'APPROVED' ? "Export Official Approved Roadmap PDF" : "Export Draft Roadmap PDF"}
            >
              <FileDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => handleExportMarkdown(activeRoadmap)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Export Roadmap as Markdown"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>.md</span>
            </button>

            <button
              onClick={() => handleCopy(activeRoadmap.id, activeRoadmap.renderedMarkdown || '')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1"
              title="Copy Markdown"
            >
              {copiedId === activeRoadmap.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === activeRoadmap.id ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Version Lineage Quick Bar */}
      {activeRoadmap?.versionHistory && activeRoadmap.versionHistory.length > 1 && (
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Version Lineage:</span>
          </span>
          {activeRoadmap.versionHistory.map((vh) => (
            <button
              key={vh.version}
              onClick={() => handleOpenDiff(activeRoadmap, vh.version, activeRoadmap.version)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
                vh.version === activeRoadmap.version
                  ? 'bg-blue-950 text-blue-300 border-blue-800 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={vh.changeSummary || `Version v${vh.version}.0`}
            >
              <span>v{vh.version}.0</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-800/80 text-slate-400">{vh.status}</span>
            </button>
          ))}
          <span className="text-[11px] text-slate-500 italic ml-2">
            (Click any version to compare against current spec)
          </span>
        </div>
      )}

      {/* Quarter Horizons Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quarters.map((q: any, idx: number) => (
          <div key={idx} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-1 rounded-md bg-blue-950/60 border border-blue-800/60">
                  {q.quarter}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {q.initiatives ? q.initiatives.length : 0} Initiatives
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-bold text-slate-200 leading-snug">{q.theme}</h3>
              </div>

              <div className="mt-4 space-y-3">
                {(q.initiatives || []).map((init: any, iIdx: number) => (
                  <div key={iIdx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{init.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        init.priority === 'P0' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        init.priority === 'P1' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {init.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{init.description}</p>
                    <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 font-mono">
                      <span>{init.estimatedEffortWeeks} weeks</span>
                      <span className="text-blue-400/90 truncate max-w-[140px]">{init.targetOutcome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Revision Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Create Roadmap Revision v{(activeRoadmap?.version || 1) + 1}.0
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
              Create a new version snapshot for <strong className="text-slate-200">{activeProduct?.name}</strong> roadmap. Previous versions will remain preserved in the Side-by-Side Diff history.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Revision Changelog / Summary Note:
              </label>
              <textarea
                value={revisionSummary}
                onChange={(e) => setRevisionSummary(e.target.value)}
                placeholder="e.g. Accelerated Q1 Open Banking delivery from 6w to 4w, promoted daily balance reconciliation to P0, added Q4 AI Copilot horizon"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
