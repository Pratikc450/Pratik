import React, { useState, useEffect } from 'react';
import {
  Map,
  Sparkles,
  Calendar,
  Layers,
  Flag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  Tag,
  Target,
  RefreshCw,
  Users,
  ListTodo
} from 'lucide-react';
import { Product, GeneratedArtifact } from '../types.js';

interface RoadmapGeneratorProps {
  productId: string;
  product?: Product;
  onRoadmapCommitted?: (artifact: GeneratedArtifact) => void;
  onNavigateTab?: (tab: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

interface Initiative {
  title: string;
  description: string;
  targetOutcome: string;
  priority: 'P0' | 'P1' | 'P2';
  dependencies: string[];
  estimatedEffortWeeks: number;
}

interface QuarterHorizon {
  quarter: string;
  theme: string;
  initiatives: Initiative[];
}

interface GeneratedRoadmapData {
  vision: string;
  strategicPillars: string[];
  quarterHorizons: QuarterHorizon[];
  risksAndMitigations: Array<{ risk: string; mitigation: string }>;
  openQuestions: string[];
}

export const RoadmapGenerator: React.FC<RoadmapGeneratorProps> = ({
  productId,
  product,
  onRoadmapCommitted,
  onNavigateTab,
  isModal = false,
  onClose
}) => {
  // Input settings
  const [quarterCount, setQuarterCount] = useState<number>(4);
  const [strategicTheme, setStrategicTheme] = useState<string>('Automated Core Operations & Enterprise Velocity');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  
  // Context state
  const [detectedStoriesCount, setDetectedStoriesCount] = useState<number>(0);
  const [detectedPersonasCount, setDetectedPersonasCount] = useState<number>(0);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);

  // Generation & display state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgressStage, setGenerationProgressStage] = useState<string>('');
  const [generatedData, setGeneratedData] = useState<GeneratedRoadmapData | null>(null);
  const [renderedMarkdown, setRenderedMarkdown] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<'VISUAL' | 'PROSE'>('VISUAL');
  const [commitSummary, setCommitSummary] = useState<string>('Quarter-by-quarter strategic roadmap synthesized via Gemini API');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing workspace context (stories and personas)
  useEffect(() => {
    setLoadingContext(true);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        const storiesArt = (data.artifacts || []).find((a: any) => a.taskType === 'USER_STORIES');
        const personasArt = (data.artifacts || []).find((a: any) => a.taskType === 'USER_PERSONAS' || a.taskType === 'PERSONAS');
        const countStories = storiesArt?.schemaData?.stories?.length || 0;
        const countPersonas = (personasArt?.schemaData?.personas?.length || data.personas?.length || 0);
        setDetectedStoriesCount(countStories);
        setDetectedPersonasCount(countPersonas);
        setLoadingContext(false);
      })
      .catch(() => setLoadingContext(false));
  }, [productId]);

  // Execute Gemini API Roadmap Generation
  const handleGenerateRoadmap = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setCommitSuccess(false);
    setGenerationProgressStage('Querying user stories and persona friction points...');

    try {
      setTimeout(() => {
        setGenerationProgressStage('Prompting Gemini 3.8 Flash model with quarterHorizons schema...');
      }, 700);

      const targetQuarters = quarterCount === 2 
        ? ['Q1 2025', 'Q2 2025'] 
        : quarterCount === 3 
          ? ['Q1 2025', 'Q2 2025', 'Q3 2025'] 
          : ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

      const res = await fetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quarterCount,
          strategicTheme,
          targetQuarters,
          customInstructions
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate roadmap via Gemini API');
      }

      const data = await res.json();
      setGeneratedData(data.roadmapData);
      setRenderedMarkdown(data.renderedMarkdown || '');
      setGenerationProgressStage('Roadmap successfully synthesized!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Generation error encountered');
    } finally {
      setIsGenerating(false);
    }
  };

  // Commit Roadmap into Active Workspace
  const handleCommitRoadmap = async () => {
    if (!generatedData) return;
    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/products/${productId}/roadmap/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapData: generatedData,
          renderedMarkdown,
          changeSummary: commitSummary,
          author: 'Lead Product Manager'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to commit roadmap');
      }

      const data = await res.json();
      setCommitSuccess(true);
      if (onRoadmapCommitted && data.artifact) {
        onRoadmapCommitted(data.artifact);
      }
      setTimeout(() => {
        setCommitSuccess(false);
        if (onClose) onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save roadmap to workspace');
    } finally {
      setIsCommitting(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!generatedData) return;
    const headers = ['Quarter', 'Theme', 'Initiative', 'Priority', 'EffortWeeks', 'TargetOutcome', 'Dependencies'];
    const rows: string[] = [headers.join(',')];

    for (const q of generatedData.quarterHorizons) {
      for (const init of q.initiatives) {
        rows.push([
          `"${q.quarter}"`,
          `"${q.theme.replace(/"/g, '""')}"`,
          `"${init.title.replace(/"/g, '""')}"`,
          `"${init.priority}"`,
          init.estimatedEffortWeeks,
          `"${init.targetOutcome.replace(/"/g, '""')}"`,
          `"${(init.dependencies || []).join('; ')}"`
        ].join(','));
      }
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(product?.name || 'product').toLowerCase().replace(/\s+/g, '_')}_quarterly_roadmap.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const content = (
    <div className="space-y-6">
      {/* Configuration & Generator Controls */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>AI Quarter-by-Quarter Roadmap Synthesis</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                gemini-3.8-flash
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reads your active user story backlog and persona pain points to automatically schedule milestones across strategic quarterly horizons.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
              <span><strong>{detectedStoriesCount}</strong> Stories</span>
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span><strong>{detectedPersonasCount}</strong> Personas</span>
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quarters selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Planning Horizon</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuarterCount(num)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    quarterCount === num
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {num} Quarters
                </button>
              ))}
            </div>
          </div>

          {/* Strategic Theme */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>Primary Strategic Theme</span>
            </label>
            <input
              type="text"
              value={strategicTheme}
              onChange={(e) => setStrategicTheme(e.target.value)}
              placeholder="e.g. Automated Core Operations & Enterprise Velocity"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Custom Prioritization Directives (Optional)</span>
          </label>
          <input
            type="text"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Prioritize P0 high-RICE checkout stories in Q1, schedule API partner ecosystem in Q3/Q4"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Generate Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 italic">
            {isGenerating && (
              <span className="flex items-center gap-2 text-indigo-300">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                <span>{generationProgressStage || 'Synthesizing with Gemini API...'}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateRoadmap}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Synthesizing Roadmap...' : `Generate ${quarterCount}-Quarter Roadmap`}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Generated Roadmap Preview */}
      {generatedData && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Action & View Mode Toolbar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">View Mode:</span>
              <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('VISUAL')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    activeViewMode === 'VISUAL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quarterly Board
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('PROSE')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    activeViewMode === 'PROSE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Markdown Prose
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Download CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCommitRoadmap}
                disabled={isCommitting || commitSuccess}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {commitSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Committed to Workspace!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>{isCommitting ? 'Committing...' : 'Commit as Official Roadmap'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Strategic Horizon Statement */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Flag className="w-3.5 h-3.5 text-indigo-400" />
              <span>12-Month Strategic Roadmap Vision:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-indigo-500/60 pl-3">
              "{generatedData.vision}"
            </p>

            {/* Strategic Pillars */}
            {generatedData.strategicPillars && generatedData.strategicPillars.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {generatedData.strategicPillars.map((pillar, pIdx) => (
                  <span
                    key={pIdx}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1.5"
                  >
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>{pillar}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visual Quarterly Horizons Board */}
          {activeViewMode === 'VISUAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {generatedData.quarterHorizons.map((qh, qIdx) => {
                const p0Count = qh.initiatives.filter(i => i.priority === 'P0').length;
                const totalWeeks = qh.initiatives.reduce((acc, i) => acc + (i.estimatedEffortWeeks || 0), 0);

                return (
                  <div
                    key={qIdx}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col shadow-md hover:border-slate-700 transition-colors"
                  >
                    {/* Horizon Header */}
                    <div className="p-3.5 bg-slate-950 border-b border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {qh.quarter}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>~{totalWeeks} wks</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
                        {qh.theme}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
                        <span className="text-emerald-400 font-bold">{p0Count} P0 Critical</span>
                        <span>·</span>
                        <span>{qh.initiatives.length} Initiatives</span>
                      </div>
                    </div>

                    {/* Initiatives List */}
                    <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[460px]">
                      {qh.initiatives.map((init, iIdx) => {
                        const isP0 = init.priority === 'P0';
                        return (
                          <div
                            key={iIdx}
                            className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                              isP0
                                ? 'bg-slate-950/90 border-emerald-500/40 shadow-sm'
                                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-slate-200 leading-snug">
                                {init.title}
                              </h5>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                                  isP0
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                    : init.priority === 'P1'
                                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {init.priority}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {init.description}
                            </p>

                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300">
                                <Target className="w-3 h-3 text-emerald-400" />
                                <span>Target Outcome</span>
                              </div>
                              <p className="text-[10px] text-emerald-300/90 leading-tight">
                                {init.targetOutcome}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                              <span>Effort: {init.estimatedEffortWeeks} wks</span>
                              {init.dependencies && init.dependencies.length > 0 && (
                                <span className="truncate max-w-[120px]" title={init.dependencies.join(', ')}>
                                  Dep: {init.dependencies.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Markdown Prose View */}
          {activeViewMode === 'PROSE' && (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[600px]">
              {renderedMarkdown}
            </div>
          )}

          {/* Risks & Mitigations */}
          {generatedData.risksAndMitigations && generatedData.risksAndMitigations.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Quarterly Governance, Risks & Strategic Mitigations</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedData.risksAndMitigations.map((rm, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{rm.risk}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] pl-5 leading-relaxed">
                      <strong className="text-emerald-300">Defense:</strong> {rm.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <Map className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Quarter-by-Quarter Roadmap Generator</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Gemini AI
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically map stories and persona friction across strategic quarterly milestones.
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
};
