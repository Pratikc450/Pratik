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
  Zap,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { Product, GeneratedArtifact } from '../types.js';
import { ArtifactDiffViewer, VersionOption } from './ArtifactDiffViewer.js';
import { RoadmapVersionComparisonView } from './RoadmapVersionComparisonView.js';
import { InlineRoadmapStructuralDiff } from './InlineRoadmapStructuralDiff.js';
import { exportArtifactPdf, exportToMarkdown, exportRoadmapToCsv, RoadmapCsvFormat } from '../utils/exportUtils.js';
import { RoadmapGenerator } from './RoadmapGenerator.js';

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

  // CSV Export state
  const [csvFormat, setCsvFormat] = useState<RoadmapCsvFormat>('universal');
  const [isCsvMenuOpen, setIsCsvMenuOpen] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState(false);

  // Diff View State
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffVersionA, setDiffVersionA] = useState<number>(1);
  const [diffVersionB, setDiffVersionB] = useState<number>(2);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [isInlineDiffOpen, setIsInlineDiffOpen] = useState(false);

  // Interactive Version History Switcher State (artifactId -> versionNumber)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});

  // New revision modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // AI Roadmap Visualizer (Gantt-Style Timeline) & Version Diff State
  const [roadmapViewMode, setRoadmapViewMode] = useState<'HORIZONS' | 'GANTT_TIMELINE' | 'VERSION_DIFF'>('HORIZONS');

  // AI Roadmap Generator Modal State
  const [isRoadmapGeneratorOpen, setIsRoadmapGeneratorOpen] = useState(false);
  const [generatorToast, setGeneratorToast] = useState<string | null>(null);

  // AI Sprint Scheduler State
  const [isSprintSchedulerOpen, setIsSprintSchedulerOpen] = useState(false);
  const [developerVelocity, setDeveloperVelocity] = useState<number>(24); // story points per 2-week sprint
  const [sprintBacklogStories, setSprintBacklogStories] = useState<any[]>([]);
  const [schedulerSuccess, setSchedulerSuccess] = useState<string | null>(null);

  const fetchRoadmaps = () => {
    if (!selectedProductId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/products/${selectedProductId}`)
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type');
        return ct && ct.includes('application/json') ? res.json() : null;
      })
      .then(data => {
        if (data) {
          const rms = (data.artifacts || []).filter((a: any) => a.taskType === 'ROADMAP');
          setArtifacts(rms);
          if (rms.length > 0 && !selectedRoadmapId) {
            setSelectedRoadmapId(rms[0].id);
          }
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

  const handleExportCsv = (rm: GeneratedArtifact, format: RoadmapCsvFormat = csvFormat) => {
    exportRoadmapToCsv(rm, activeProduct?.name || 'Active Product', format);
    setIsCsvMenuOpen(false);
    setCsvDownloaded(true);
    setTimeout(() => setCsvDownloaded(false), 2500);
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

  // Version lineage & selected iteration
  const versionHistory = activeRoadmap?.versionHistory && activeRoadmap.versionHistory.length > 0 
    ? activeRoadmap.versionHistory 
    : [{
        version: activeRoadmap?.version || 1,
        status: activeRoadmap?.status || 'DRAFT',
        createdAt: activeRoadmap?.metadata?.createdAt || new Date().toISOString(),
        createdBy: activeRoadmap?.metadata?.approvedBy || 'PM Lead',
        changeSummary: 'Baseline roadmap snapshot',
        schemaData: activeRoadmap?.schemaData,
        renderedMarkdown: activeRoadmap?.renderedMarkdown
      }];

  const selectedVersionNum = selectedVersions[activeRoadmap?.id || ''] ?? activeRoadmap?.version ?? 1;
  const currentIteration = versionHistory.find(v => v.version === selectedVersionNum) || versionHistory[versionHistory.length - 1];
  const isHistorical = activeRoadmap && selectedVersionNum !== activeRoadmap.version;

  // Quarters data to render for the currently selected iteration
  const schema = currentIteration?.schemaData || (currentIteration as any)?.parsedContent || activeRoadmap?.schemaData || {};
  const quarters = schema.quarterHorizons || schema.quarters || [
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

  const versionCount = versionHistory.length;

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
            className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Export Approved Roadmap Action */}
          {activeRoadmap && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {/* Download as CSV (Jira / Asana import) Button with quick format dropdown */}
              <div className="relative">
                <div className="inline-flex rounded-lg shadow-xs">
                  <button
                    onClick={() => handleExportCsv(activeRoadmap, csvFormat)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 text-xs font-semibold border border-emerald-800/80 transition-colors cursor-pointer"
                    title="Download Roadmap as CSV formatted for Jira / Asana import"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{csvDownloaded ? 'Downloaded!' : 'Download as CSV'}</span>
                  </button>
                  <button
                    onClick={() => setIsCsvMenuOpen(!isCsvMenuOpen)}
                    className="px-1.5 py-1.5 rounded-r-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs border border-l-0 border-emerald-800/80 transition-colors cursor-pointer"
                    title="Select CSV format (Universal, Jira, or Asana)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isCsvMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-30 p-1.5 space-y-1 animate-in fade-in">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Choose CSV Import Target
                    </div>
                    <button
                      onClick={() => {
                        setCsvFormat('universal');
                        handleExportCsv(activeRoadmap, 'universal');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        csvFormat === 'universal'
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Universal (Jira & Asana)</div>
                        <div className="text-[10px] text-slate-400">Auto-detected by Jira & Asana wizards</div>
                      </div>
                      {csvFormat === 'universal' && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setCsvFormat('jira');
                        handleExportCsv(activeRoadmap, 'jira');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        csvFormat === 'jira'
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Jira Import Format</div>
                        <div className="text-[10px] text-slate-400">Summary, Fix Version, Epic, Estimate</div>
                      </div>
                      {csvFormat === 'jira' && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setCsvFormat('asana');
                        handleExportCsv(activeRoadmap, 'asana');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        csvFormat === 'asana'
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Asana Import Format</div>
                        <div className="text-[10px] text-slate-400">Section/Horizon, Task Name, Priority</div>
                      </div>
                      {csvFormat === 'asana' && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleExportPdf(activeRoadmap)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/80 transition-colors shadow-xs cursor-pointer"
                title="Export Official Roadmap as PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={() => handleExportMarkdown(activeRoadmap)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                title="Export Roadmap as Markdown"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export .md</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsRoadmapGeneratorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-950/50 transition-all transform active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Roadmap Generator</span>
          </button>

          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Full Workspace Suite</span>
          </button>
        </div>
      </div>

      {generatorToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{generatorToast}</span>
        </div>
      )}

      {/* Primary Sub-Tab Switcher: Horizons Board | Execution Timeline | Structural Version Diff */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setRoadmapViewMode('HORIZONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
              roadmapViewMode === 'HORIZONS'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-blue-400" />
            <span>Delivery Horizons Board</span>
          </button>
          <button
            onClick={() => setRoadmapViewMode('GANTT_TIMELINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
              roadmapViewMode === 'GANTT_TIMELINE'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Execution Timeline (Gantt)</span>
          </button>
          <button
            onClick={() => setRoadmapViewMode('VERSION_DIFF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
              roadmapViewMode === 'VERSION_DIFF'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Structural Version Diff</span>
            {availableVersions.length > 1 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-200 border border-blue-700">
                {availableVersions.length} iterations
              </span>
            )}
          </button>
        </div>

        {roadmapViewMode === 'VERSION_DIFF' && (
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 px-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Synchronized Diff: Base Iteration vs. Comparison Iteration</span>
          </div>
        )}
      </div>

      {/* Main View: Either Dedicated Structural Version Diff View OR Roadmap Board / Gantt */}
      {roadmapViewMode === 'VERSION_DIFF' && activeProduct ? (
        <div className="animate-in fade-in duration-300">
          <RoadmapVersionComparisonView
            product={activeProduct}
            artifacts={artifacts}
            initialArtifactId={selectedRoadmapId || activeRoadmap?.id}
            initialVersionA={diffVersionA}
            initialVersionB={diffVersionB}
            onClose={() => setRoadmapViewMode('HORIZONS')}
            onCreateRevision={(artId) => {
              setSelectedRoadmapId(artId);
              setIsRevisionModalOpen(true);
            }}
          />
        </div>
      ) : (
        /* Standard Detail Views: Horizons or Gantt Timeline */
        <div className="space-y-5">
          {/* Active Roadmap Overview Bar */}
          {activeRoadmap && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">
                    {activeProduct?.name} Delivery Horizon Roadmap
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    currentIteration.status === 'APPROVED' 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}>
                    {currentIteration.status} v{selectedVersionNum}.0
                  </span>

                  {versionCount > 1 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                      <History className="w-3 h-3 text-blue-400" />
                      <span>{versionCount} Versions Available</span>
                    </span>
                  )}

                  {isHistorical && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      Viewing Historical Iteration
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-3xl">
                  {schema.vision || activeProduct?.vision}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Inline Structural Diff Trigger */}
                {versionCount > 1 && (
                  <button
                    onClick={() => setIsInlineDiffOpen(!isInlineDiffOpen)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm border cursor-pointer ${
                      isInlineDiffOpen
                        ? 'bg-blue-600 text-white border-blue-500 shadow-blue-950/40'
                        : 'bg-blue-950/80 hover:bg-blue-900 text-blue-300 border-blue-800/80'
                    }`}
                    title="Toggle inline structural diff viewer showing differences between saved iterations"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isInlineDiffOpen ? 'Close Inline Diff' : 'Inline Structural Diff'}</span>
                  </button>
                )}

                {/* Compare Versions in Full Comparison View */}
                <button
                  onClick={() => {
                    setDiffVersionA(selectedVersionNum > 1 ? selectedVersionNum - 1 : 1);
                    setDiffVersionB(selectedVersionNum);
                    setRoadmapViewMode('VERSION_DIFF');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Open Dedicated Structural Version Diff View"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Full Diff View</span>
                </button>

                <button
                  onClick={() => setIsRevisionModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Create a new revision snapshot"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Revision</span>
                </button>

                <button
                  onClick={() => handleExportPdf(activeRoadmap)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                    currentIteration.status === 'APPROVED'
                      ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={currentIteration.status === 'APPROVED' ? "Export Official Approved Roadmap PDF" : "Export Draft Roadmap PDF"}
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>Export PDF</span>
                </button>

                <button
                  onClick={() => handleExportMarkdown(activeRoadmap)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Export Roadmap as Markdown"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>.md</span>
                </button>

                <button
                  onClick={() => handleCopy(activeRoadmap.id, currentIteration.renderedMarkdown || activeRoadmap.renderedMarkdown || '')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy Markdown"
                >
                  {copiedId === activeRoadmap.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === activeRoadmap.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* INTERACTIVE ROADMAP ITERATION SELECTOR BAR */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Iteration Selector:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {versionHistory.map((vh) => {
                  const isSelected = selectedVersionNum === vh.version;
                  const isLive = vh.version === activeRoadmap.version;
                  return (
                    <button
                      key={vh.version}
                      onClick={() => setSelectedVersions(prev => ({ ...prev, [activeRoadmap.id]: vh.version }))}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm scale-105' 
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
                    onClick={() => setSelectedVersions(prev => ({ ...prev, [activeRoadmap.id]: activeRoadmap.version }))}
                    className="px-2 py-0.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/60 font-semibold transition-colors cursor-pointer"
                  >
                    Switch to Live (v{activeRoadmap.version}.0)
                  </button>
                  <button
                    onClick={() => {
                      setDiffVersionA(selectedVersionNum);
                      setDiffVersionB(activeRoadmap.version);
                      setRoadmapViewMode('VERSION_DIFF');
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 font-semibold transition-colors cursor-pointer"
                  >
                    Compare against Live Diff
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  Viewing active production roadmap iteration
                </span>
              )}
            </div>
          </div>

          {/* INLINE ROADMAP STRUCTURAL DIFF VIEWER */}
          {isInlineDiffOpen && (
            <InlineRoadmapStructuralDiff
              artifact={activeRoadmap}
              versionHistory={versionHistory}
              currentSelectedVersion={selectedVersionNum}
              productName={activeProduct?.name || 'Product'}
              onOpenFullComparison={(vA, vB) => {
                setDiffVersionA(vA);
                setDiffVersionB(vB);
                setRoadmapViewMode('VERSION_DIFF');
              }}
              onClose={() => setIsInlineDiffOpen(false)}
            />
          )}

          {/* VIEW MODE 1: GANTT EXECUTION TIMELINE */}
          {roadmapViewMode === 'GANTT_TIMELINE' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Quarterly Execution Gantt Timeline (v{selectedVersionNum}.0)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Delivery sequencing and duration across {quarters.length} strategic horizons.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Total Initiatives: {quarters.reduce((acc: number, q: any) => acc + (q.initiatives?.length || 0), 0)}
                </span>
              </div>

              <div className="space-y-6">
                {quarters.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950 border border-blue-800">
                          {q.quarter}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{q.theme}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(q.initiatives || []).reduce((acc: number, i: any) => acc + (i.estimatedEffortWeeks || 0), 0)} Weeks Allocated
                      </span>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                      {(q.initiatives || []).map((init: any, iIdx: number) => {
                        const effort = init.estimatedEffortWeeks || 4;
                        const widthPct = Math.min(100, Math.max(20, effort * 10));

                        return (
                          <div key={iIdx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 font-semibold text-slate-200">
                                <span className="font-mono text-[10px] text-slate-500">{init.id}</span>
                                <span>{init.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                  init.priority === 'P0' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                  init.priority === 'P1' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {init.priority}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">{effort}w duration</span>
                              </div>
                            </div>

                            {/* Gantt Bar Visualization */}
                            <div className="h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                              <div
                                style={{ width: `${widthPct}%` }}
                                className={`h-full rounded-full transition-all ${
                                  init.priority === 'P0' ? 'bg-gradient-to-r from-rose-500 to-amber-500' :
                                  init.priority === 'P1' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                  'bg-gradient-to-r from-slate-600 to-slate-500'
                                }`}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                              <p className="line-clamp-1">{init.description}</p>
                              <span className="font-mono text-blue-400 text-[10px] shrink-0 ml-2">{init.targetOutcome}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: QUARTER HORIZONS BOARD */}
          {roadmapViewMode === 'HORIZONS' && (
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
          )}
        </div>
      )}

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

      {/* AI Roadmap Generator Modal */}
      {isRoadmapGeneratorOpen && (
        <RoadmapGenerator
          productId={selectedProductId}
          product={activeProduct}
          isModal={true}
          onClose={() => setIsRoadmapGeneratorOpen(false)}
          onRoadmapCommitted={(art) => {
            setGeneratorToast(`Quarterly Roadmap v${art.version} committed to active workspace!`);
            setTimeout(() => setGeneratorToast(null), 4000);
            fetchRoadmaps();
            setIsRoadmapGeneratorOpen(false);
          }}
          onNavigateTab={onNavigateTab}
        />
      )}
    </div>
  );
};
