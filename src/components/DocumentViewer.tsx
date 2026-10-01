import React, { useState } from 'react';
import { GeneratedArtifact } from '../types.js';
import {
  CheckCircle,
  Clock,
  Shield,
  AlertTriangle,
  FileText,
  Code2,
  Copy,
  Check,
  Info,
  Download,
  Sliders,
  ListTodo,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Share2,
  GitCompare,
  FileDown
} from 'lucide-react';
import { ArtifactDiffViewer } from './ArtifactDiffViewer.js';
import { exportArtifactPdf, exportToMarkdown } from '../utils/exportUtils.js';

interface DocumentViewerProps {
  artifact: GeneratedArtifact;
  onApprove: (id: string) => Promise<void>;
  isApproving: boolean;
  onChainTask?: (nextTask: 'USER_STORIES' | 'KPIS' | 'ROADMAP' | 'EXPERIMENTS', seedPrompt: string) => void;
  onRefreshArtifact?: (updatedArtifact: GeneratedArtifact) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  artifact,
  onApprove,
  isApproving,
  onChainTask,
  onRefreshArtifact
}) => {
  const [viewMode, setViewMode] = useState<'prose' | 'json' | 'rice' | 'diff'>('prose');
  const [copied, setCopied] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [riceValues, setRiceValues] = useState<Record<string, { reach: number; impact: number; confidence: number; effort: number }>>({});
  const [isUpdatingRice, setIsUpdatingRice] = useState(false);
  const [jiraModalOpen, setJiraModalOpen] = useState(false);

  const isApproved = artifact.status === 'APPROVED';
  const isStoriesArtifact = artifact.taskType === 'USER_STORIES' && artifact.schemaData?.stories;

  const handleCopy = () => {
    const textToCopy = viewMode === 'prose' ? artifact.renderedMarkdown : JSON.stringify(artifact.schemaData, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    exportArtifactPdf(artifact, artifact.schemaData?.title || 'Product Specification');
  };

  const handleDownloadMarkdown = () => {
    const sanitizedTitle = (artifact.schemaData?.title || artifact.taskType).toLowerCase().replace(/[^a-z0-9]/g, '_');
    exportToMarkdown(`${sanitizedTitle}_v${artifact.version}.md`, artifact.renderedMarkdown, {
      title: artifact.schemaData?.title || artifact.taskType,
      productName: artifact.schemaData?.title || 'Product Specification',
      taskType: artifact.taskType,
      version: artifact.version,
      status: artifact.status,
      approvedBy: artifact.metadata?.approvedBy,
      approvedAt: artifact.metadata?.approvedAt
    });
  };

  // Initialize or update RICE editor values
  const startEditingRice = (story: any) => {
    setEditingStoryId(story.id);
    setRiceValues((prev) => ({
      ...prev,
      [story.id]: {
        reach: story.reach || 1000,
        impact: story.impact || 2,
        confidence: story.confidence || 0.8,
        effort: story.effort || 2
      }
    }));
  };

  const handleSaveRice = async (storyId: string) => {
    const current = riceValues[storyId];
    if (!current) return;
    setIsUpdatingRice(true);

    try {
      const res = await fetch(`/api/artifacts/${artifact.id}/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.artifact && onRefreshArtifact) {
          onRefreshArtifact(data.artifact);
        }
        setEditingStoryId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingRice(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* 1. Approval Gate Banner (§7 Requirement) */}
      <div
        className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isApproved
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
            : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          {isApproved ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">
                {isApproved ? `OFFICIAL SPECIFICATION (v${artifact.version})` : 'AI-GENERATED DRAFT (Human Review Required)'}
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded ${
                  isApproved
                    ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-900/80 text-amber-300 border border-amber-700'
                }`}
              >
                {artifact.status}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              {isApproved
                ? `Approved by ${artifact.metadata.approvedBy || 'Senior PM'}. Official source-of-truth active in roadmap rollups.`
                : 'Section 7 Gate: Generated drafts are not source-of-truth until approved by a human PM.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {!isApproved && (
            <button
              onClick={() => onApprove(artifact.id)}
              disabled={isApproving}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isApproving ? 'Promoting...' : 'Approve & Promote Spec'}</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            title={isApproved ? "Download Official Approved PDF" : "Download Draft PDF"}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
              isApproved
                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border-rose-800/80'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <FileDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            title="Download as structured Markdown file"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export .md</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* 2. Consistency Checks Banner (§5) */}
      {artifact.consistencyIssues && artifact.consistencyIssues.length > 0 && (
        <div className="px-5 py-2.5 bg-amber-950/30 border-b border-amber-800/40 text-xs text-amber-300 flex items-start space-x-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Consistency Check Notice:</span>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {artifact.consistencyIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. Metadata & Document Header */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Template:</span>
            <code className="text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">
              {artifact.metadata.promptVersion}
            </code>
          </div>

          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Latency:</span>
            <span className="text-slate-200 font-mono font-medium">{artifact.metadata.latencyMs}ms</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span>Tokens:</span>
            <span className="text-slate-200 font-mono">
              In: {artifact.metadata.inputTokens} / Out: {artifact.metadata.outputTokens}
            </span>
          </div>

          {artifact.metadata.repaired && (
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-mono text-[10px] font-semibold">
              REPAIRED IN PASS 2
            </span>
          )}
        </div>

        {/* View Switcher: Prose vs Validated JSON vs Interactive RICE */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('prose')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              viewMode === 'prose'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rendered Prose</span>
          </button>

          {isStoriesArtifact && (
            <button
              onClick={() => setViewMode('rice')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                viewMode === 'rice'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>RICE Priority Matrix</span>
            </button>
          )}

          <button
            onClick={() => setViewMode('json')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              viewMode === 'json'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Validated Schema (JSON)</span>
          </button>

          {(artifact.taskType === 'PRD' || artifact.taskType === 'ROADMAP') && (
            <button
              onClick={() => setViewMode('diff')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                viewMode === 'diff'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-indigo-400 hover:text-indigo-200'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Version Diff</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Document Content */}
      <div className="p-6 overflow-y-auto max-h-[650px] text-slate-200 leading-relaxed font-sans">
        {viewMode === 'diff' && (artifact.taskType === 'PRD' || artifact.taskType === 'ROADMAP') ? (
          <ArtifactDiffViewer
            taskType={artifact.taskType as 'PRD' | 'ROADMAP'}
            productName={artifact.schemaData?.title || 'Product Spec'}
            versions={artifact.versionHistory && artifact.versionHistory.length > 0 ? artifact.versionHistory.map(vh => ({
              version: vh.version,
              label: vh.changeSummary || `Version v${vh.version}.0`,
              status: vh.status,
              date: vh.createdAt,
              changeSummary: vh.changeSummary,
              schemaData: vh.schemaData,
              renderedMarkdown: vh.renderedMarkdown
            })) : [
              {
                version: artifact.version,
                label: `v${artifact.version}.0 Active`,
                status: artifact.status,
                date: artifact.metadata?.createdAt || new Date().toISOString(),
                changeSummary: 'Active specification',
                schemaData: artifact.schemaData,
                renderedMarkdown: artifact.renderedMarkdown
              }
            ]}
          />
        ) : viewMode === 'prose' ? (
          <div className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-100 prose-h1:text-2xl prose-h2:text-lg prose-h3:text-sm prose-p:text-sm prose-li:text-sm prose-table:text-xs">
            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {artifact.renderedMarkdown}
            </div>
          </div>
        ) : viewMode === 'rice' && isStoriesArtifact ? (
          /* Interactive RICE Story Board */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <ListTodo className="w-4 h-4 text-emerald-400" />
                  <span>Interactive RICE Score Prioritization Matrix</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formula: <code className="text-emerald-400">RICE = (Reach × Impact × Confidence) / Effort</code>. Sorted deterministically by highest priority score.
                </p>
              </div>

              <button
                onClick={() => setJiraModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center space-x-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Export for Jira / Linear</span>
              </button>
            </div>

            <div className="space-y-3">
              {artifact.schemaData.stories.map((story: any, idx: number) => {
                const isEditing = editingStoryId === story.id;
                const currentVals = riceValues[story.id] || {
                  reach: story.reach || 1000,
                  impact: story.impact || 2,
                  confidence: story.confidence || 0.8,
                  effort: story.effort || 2
                };

                return (
                  <div
                    key={story.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center font-bold text-xs">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-slate-100">{story.id}</span>
                          <span className="text-xs text-slate-500 ml-2">Persona: {story.persona}</span>
                        </div>
                      </div>

                      {/* RICE Score Badge */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase">RICE Score</span>
                          <span className="text-base font-bold font-mono text-emerald-400">
                            {story.riceScore !== undefined ? story.riceScore.toFixed(1) : 'Calculated'}
                          </span>
                        </div>

                        {!isEditing ? (
                          <button
                            onClick={() => startEditingRice(story)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-xs flex items-center space-x-1 cursor-pointer"
                          >
                            <Sliders className="w-3 h-3 text-emerald-400" />
                            <span>Adjust</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveRice(story.id)}
                            disabled={isUpdatingRice}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {isUpdatingRice ? 'Recalculating...' : 'Save & Re-sort'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Story Statement */}
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                      <strong>As a</strong> {story.asA} <strong>I want</strong> {story.iWant} <strong>so that</strong> {story.soThat}
                    </div>

                    {/* Inline RICE Tuning Sliders when editing */}
                    {isEditing && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/90 rounded-lg border border-emerald-500/30 text-xs">
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">
                            Reach (Users/mo): {currentVals.reach}
                          </label>
                          <input
                            type="range"
                            min={100}
                            max={10000}
                            step={100}
                            value={currentVals.reach}
                            onChange={(e) =>
                              setRiceValues((prev) => ({
                                ...prev,
                                [story.id]: { ...currentVals, reach: Number(e.target.value) }
                              }))
                            }
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">
                            Impact (1-3): {currentVals.impact}x
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={3}
                            step={0.5}
                            value={currentVals.impact}
                            onChange={(e) =>
                              setRiceValues((prev) => ({
                                ...prev,
                                [story.id]: { ...currentVals, impact: Number(e.target.value) }
                              }))
                            }
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">
                            Confidence: {Math.round(currentVals.confidence * 100)}%
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={1.0}
                            step={0.05}
                            value={currentVals.confidence}
                            onChange={(e) =>
                              setRiceValues((prev) => ({
                                ...prev,
                                [story.id]: { ...currentVals, confidence: Number(e.target.value) }
                              }))
                            }
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">
                            Effort (wks): {currentVals.effort}
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={8}
                            step={0.5}
                            value={currentVals.effort}
                            onChange={(e) =>
                              setRiceValues((prev) => ({
                                ...prev,
                                [story.id]: { ...currentVals, effort: Number(e.target.value) }
                              }))
                            }
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Acceptance Criteria */}
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Testable Acceptance Criteria:</span>
                      {story.acceptanceCriteria?.map((ac: string, cIdx: number) => (
                        <div key={cIdx} className="flex items-start space-x-2 text-slate-400 text-[11px]">
                          <span className="text-emerald-500">✓</span>
                          <span>{ac}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {JSON.stringify(artifact.schemaData, null, 2)}
            </pre>
          </div>
        )}

        {/* 5. Artifact Chaining & Next Action Suggestions */}
        {isApproved && onChainTask && (
          <div className="mt-8 pt-6 border-t border-slate-800 bg-slate-950/40 p-5 rounded-xl border">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Specification Approved — Next Product Actions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {artifact.taskType === 'PRD' && (
                <>
                  <button
                    onClick={() =>
                      onChainTask(
                        'USER_STORIES',
                        `Decompose approved PRD "${artifact.schemaData?.title}" into prioritized user stories with testable acceptance criteria and RICE scoring.`
                      )
                    }
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-left rounded-lg border border-slate-800 text-xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">Decompose into Stories</div>
                      <div className="text-[10px] text-slate-400">MoSCoW & RICE scoring</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() =>
                      onChainTask(
                        'KPIS',
                        `Define telemetry and measurement framework for approved initiative "${artifact.schemaData?.title}".`
                      )
                    }
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-left rounded-lg border border-slate-800 text-xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">Derive KPI Framework</div>
                      <div className="text-[10px] text-slate-400">North Star & Leading metrics</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    onClick={() =>
                      onChainTask(
                        'ROADMAP',
                        `Integrate approved initiative "${artifact.schemaData?.title}" into the strategic 3-quarter product roadmap.`
                      )
                    }
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-left rounded-lg border border-slate-800 text-xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">Integrate into Roadmap</div>
                      <div className="text-[10px] text-slate-400">Horizons & dependencies</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-400" />
                  </button>
                </>
              )}

              {artifact.taskType === 'USER_STORIES' && (
                <>
                  <button
                    onClick={() =>
                      onChainTask(
                        'EXPERIMENTS',
                        `Design growth experiments to validate core assumptions in story backlog "${artifact.schemaData?.epicTitle}".`
                      )
                    }
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-left rounded-lg border border-slate-800 text-xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">Design Experiment Plan</div>
                      <div className="text-[10px] text-slate-400">A/B test hypotheses & MDE</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() =>
                      onChainTask(
                        'ROADMAP',
                        `Schedule approved epic "${artifact.schemaData?.epicTitle}" into delivery horizons.`
                      )
                    }
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-left rounded-lg border border-slate-800 text-xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">Map onto Roadmap</div>
                      <div className="text-[10px] text-slate-400">Effort estimation & milestones</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Jira Export Modal */}
      {jiraModalOpen && isStoriesArtifact && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Jira / Linear Markdown Export</h3>
              <button
                onClick={() => setJiraModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            <textarea
              readOnly
              rows={12}
              value={artifact.schemaData.stories
                .map(
                  (s: any) =>
                    `*${s.id}: As a ${s.persona} I want ${s.iWant}*\n` +
                    `*RICE Score:* ${s.riceScore} (Reach: ${s.reach}, Impact: ${s.impact}, Conf: ${s.confidence * 100}%, Effort: ${s.effort}w)\n` +
                    `h4. Acceptance Criteria\n` +
                    s.acceptanceCriteria.map((ac: string) => `* [ ] ${ac}`).join('\n')
                )
                .join('\n\n---\n\n')}
              className="w-full bg-slate-950 font-mono text-xs text-slate-300 p-3 rounded-lg border border-slate-800 focus:outline-none"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  const text = artifact.schemaData.stories
                    .map(
                      (s: any) =>
                        `*${s.id}: As a ${s.persona} I want ${s.iWant}*\n` +
                        `*RICE Score:* ${s.riceScore}\n` +
                        s.acceptanceCriteria.map((ac: string) => `* [ ] ${ac}`).join('\n')
                    )
                    .join('\n\n---\n\n');
                  navigator.clipboard.writeText(text);
                  setJiraModalOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Copy to Clipboard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
