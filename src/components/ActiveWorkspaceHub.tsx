import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Activity,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  ArrowRight,
  Download,
  Flame,
  Zap,
  ShieldCheck,
  Layers,
  Users,
  AlertTriangle,
  FileText,
  Filter,
  Check,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Bot
} from 'lucide-react';
import {
  Product,
  GeneratedArtifact,
  SprintStory,
  WorkspaceActivity,
  Problem,
  Persona,
  ARTIFACT_19_CATALOG,
  ArtifactType
} from '../types.js';

interface ActiveWorkspaceHubProps {
  product: Product;
  artifacts: GeneratedArtifact[];
  onOpenArtifact: (artifact: GeneratedArtifact) => void;
  onNavigateTab: (tab: string) => void;
  onOpenGenerateModal: () => void;
}

export const ActiveWorkspaceHub: React.FC<ActiveWorkspaceHubProps> = ({
  product,
  artifacts,
  onOpenArtifact,
  onNavigateTab,
  onOpenGenerateModal
}) => {
  const [sprintStories, setSprintStories] = useState<SprintStory[]>([]);
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [stats, setStats] = useState({
    completedPoints: 18,
    totalPoints: 26,
    burndownPercent: 69,
    pulseScore: 98,
    eventsPerHour: 24,
    onlineMembers: [
      { name: 'Elena Rostova', role: 'Staff Backend Eng', status: 'coding' },
      { name: 'Marcus Chen', role: 'Senior Risk Eng', status: 'reviewing' },
      { name: 'Sarah Jenkins', role: 'Lead Product Designer', status: 'designing' },
      { name: 'Navigator Copilot', role: 'AI Strategy Engine', status: 'monitoring' }
    ]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [superActiveMode, setSuperActiveMode] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [recentToast, setRecentToast] = useState<string | null>(null);

  const pulseIntervalRef = useRef<any>(null);

  // Fetch active state from server
  const fetchActiveState = async () => {
    try {
      const res = await fetch(`/api/workspace/${product.id}/active-state`);
      if (res.ok) {
        const data = await res.json();
        if (data.sprintStories) setSprintStories(data.sprintStories);
        if (data.activities) setActivities(data.activities);
        if (data.problems) setProblems(data.problems);
        if (data.personas) setPersonas(data.personas);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to load workspace active state', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveState();
  }, [product.id]);

  // Super Active Mode interval
  useEffect(() => {
    if (superActiveMode && product.id) {
      pulseIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/workspace/${product.id}/pulse-tick`, {
            method: 'POST'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.activity) {
              setActivities(prev => [data.activity, ...prev]);
              setRecentToast(`Live event: ${data.activity.title}`);
              setTimeout(() => setRecentToast(null), 4000);
            }
          }
        } catch {}
      }, 8000); // Pulse every 8 seconds
    }

    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    };
  }, [superActiveMode, product.id]);

  // Manually trigger a pulse tick
  const handleTriggerPulse = async () => {
    setIsPulsing(true);
    try {
      const res = await fetch(`/api/workspace/${product.id}/pulse-tick`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activity) {
          setActivities(prev => [data.activity, ...prev]);
          setRecentToast(`Simulated: ${data.activity.title}`);
          setTimeout(() => setRecentToast(null), 4000);
        }
      }
    } finally {
      setIsPulsing(false);
    }
  };

  // Move or advance story status
  const handleAdvanceStory = async (story: SprintStory) => {
    const nextStatusMap: Record<string, 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'IN_REVIEW',
      IN_REVIEW: 'DONE',
      DONE: 'TODO'
    };
    const nextStatus = nextStatusMap[story.status] || 'IN_PROGRESS';

    try {
      const res = await fetch(`/api/workspace/${product.id}/sprint-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, status: nextStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setSprintStories(prev =>
          prev.map(s => (s.id === story.id ? { ...s, status: nextStatus } : s))
        );
        if (data.activities) setActivities(data.activities);
      }
    } catch (e) {
      console.error('Failed to advance story', e);
    }
  };

  // Post PM directive
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/workspace/${product.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newComment.trim(),
          type: 'COMMENT',
          authorName: 'Lead Product Manager',
          authorRole: 'Product Lead'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.activity) {
          setActivities(prev => [data.activity, ...prev]);
          setNewComment('');
        }
      }
    } finally {
      setIsPostingComment(false);
    }
  };

  // Export full workspace bundle as JSON
  const handleExportWorkspaceBundle = () => {
    const bundle = {
      product,
      generatedAt: new Date().toISOString(),
      artifactsCount: artifacts.length,
      artifacts,
      sprintStories,
      problems,
      personas,
      activities
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${product.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_workspace_bundle.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter artifacts by category
  const categories = ['All', 'Strategy', 'Discovery', 'Definition', 'Prioritization', 'Metrics', 'Execution'];
  const filteredArtifacts = selectedCategory === 'All'
    ? artifacts
    : artifacts.filter(art => {
        const descriptor = ARTIFACT_19_CATALOG.find(d => d.type === art.taskType);
        return descriptor?.category === selectedCategory;
      });

  // Calculate story points completed
  const completedPoints = sprintStories.filter(s => s.status === 'DONE').reduce((acc, s) => acc + s.points, 0);
  const totalPoints = sprintStories.reduce((acc, s) => acc + s.points, 0) || 26;
  const burndown = Math.round((completedPoints / totalPoints) * 100);

  return (
    <div id="active-workspace-hub" className="space-y-8 animate-fadeIn pb-12">
      {/* Toast Notification Banner */}
      {recentToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-slate-900/95 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl shadow-2xl backdrop-blur flex items-center gap-2.5 animate-slideUp">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium">{recentToast}</span>
        </div>
      )}

      {/* 1. Command Header Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Product Workspace
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2.5 py-0.5 rounded border border-slate-700/60">
                {product.industry || 'B2B SaaS'}
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {product.id}</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
              <span>{product.name}</span>
            </h1>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {product.vision || product.description}
            </p>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportWorkspaceBundle}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Download full JSON bundle of 19 specs and sprint state"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Bundle</span>
            </button>

            <button
              onClick={handleTriggerPulse}
              disabled={isPulsing}
              className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-800/60 flex items-center gap-1.5 transition-all active:scale-95"
              title="Trigger a real-time team activity simulation"
            >
              <Zap className={`w-3.5 h-3.5 text-emerald-400 ${isPulsing ? 'animate-spin' : ''}`} />
              <span>Simulate Pulse</span>
            </button>

            <button
              onClick={onOpenGenerateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Generate Workspace</span>
            </button>
          </div>
        </div>

        {/* Live Pulse Ticker & Telemetry Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-200 font-bold">LIVE PULSE: SUPER ACTIVE</span>
            </div>
            <span className="text-slate-600">•</span>
            <div>
              <span className="text-slate-400">Events: </span>
              <span className="text-emerald-400 font-bold">{activities.length} recorded</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>4 Team Members Online</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <span className={superActiveMode ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                ⚡ Super Active Mode
              </span>
              <input
                type="checkbox"
                checked={superActiveMode}
                onChange={(e) => setSuperActiveMode(e.target.checked)}
                className="accent-emerald-500 h-3.5 w-3.5 rounded"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Sprint Board & Real-Time Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sprint 1 Execution Board & Artifacts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sprint 1 Header & Burndown Bar */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Sprint 1 Execution Board</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      Active Sprint
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autonomous task decomposition from PRD and User Stories specifications.
                </p>
              </div>

              <div className="text-right font-mono">
                <div className="text-sm font-bold text-emerald-400">{completedPoints} / {totalPoints} pts</div>
                <div className="text-[10px] text-slate-500">{burndown}% Burndown</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(burndown, 100)}%` }}
              />
            </div>
          </div>

          {/* Kanban Columns (4 Statuses) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((statusKey) => {
              const storiesInCol = sprintStories.filter(s => s.status === statusKey);
              const colLabels: Record<string, { title: string; color: string; bg: string }> = {
                TODO: { title: 'To Do', color: 'text-slate-300', bg: 'bg-slate-800/40' },
                IN_PROGRESS: { title: 'In Progress', color: 'text-amber-300', bg: 'bg-amber-500/10' },
                IN_REVIEW: { title: 'In Review', color: 'text-purple-300', bg: 'bg-purple-500/10' },
                DONE: { title: 'Completed', color: 'text-emerald-300', bg: 'bg-emerald-500/10' }
              };
              const colInfo = colLabels[statusKey];

              return (
                <div key={statusKey} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1.5 border-b border-slate-800">
                    <span className={colInfo.color}>{colInfo.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {storiesInCol.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {storiesInCol.map((story) => (
                      <div
                        key={story.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2 group shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                            {story.priority}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            {story.points} pts
                          </span>
                        </div>

                        <div className="font-semibold text-slate-200 leading-snug group-hover:text-emerald-300 transition-colors">
                          {story.title}
                        </div>

                        <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-4 h-4 rounded-full ${story.assignee?.avatarBg || 'bg-slate-700'} flex items-center justify-center text-[9px] text-white font-bold`}>
                              {story.assignee?.name?.charAt(0) || 'U'}
                            </div>
                            <span className="truncate max-w-[85px]">{story.assignee?.name?.split(' ')[0] || 'Team'}</span>
                          </div>

                          <button
                            onClick={() => handleAdvanceStory(story)}
                            className="px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-emerald-300 bg-slate-800/80 hover:bg-slate-800 rounded border border-slate-700 transition-colors flex items-center gap-1"
                            title="Advance to next sprint stage"
                          >
                            <span>Move</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {storiesInCol.length === 0 && (
                      <div className="py-6 text-center text-slate-600 text-xs italic">
                        No stories
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Generated 19-Artifacts Gallery Matrix */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>19-Artifact Specification Suite</span>
                  <span className="text-xs text-slate-500 font-mono">({artifacts.length} ready)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Every product artifact is schema-validated and synchronized with your codebase and roadmaps.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredArtifacts.map((artifact) => {
                const descriptor = ARTIFACT_19_CATALOG.find(d => d.type === artifact.taskType);
                const isApproved = artifact.status === 'APPROVED';

                return (
                  <div
                    key={artifact.id}
                    onClick={() => onOpenArtifact(artifact)}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer group text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                        {descriptor?.label || artifact.taskType}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        isApproved
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                      }`}>
                        {artifact.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {descriptor?.shortDesc || 'Generated structured PM document.'}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>v{artifact.version || 1}.0</span>
                      <span className="group-hover:translate-x-0.5 transition-transform text-emerald-400 flex items-center gap-1 font-semibold">
                        View Spec <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Super Active Real-Time Live Feed & Customer Insights */}
        <div className="space-y-6">
          {/* Live Activity Feed Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100">Super Active Live Feed</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                Real-Time
              </span>
            </div>

            {/* Quick Comment / PM Directive Input */}
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Post team directive or comment..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isPostingComment || !newComment.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Stream of Activities */}
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {activities.map((act) => {
                const isCopilot = act.type === 'COPILOT_SUGGESTION';
                const isApproval = act.type === 'PRD_APPROVED';
                const isTest = act.type === 'TEST_PASSED';

                return (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-1.5 text-xs hover:border-slate-700 transition-colors animate-fadeIn"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full ${act.author?.avatarBg || 'bg-slate-700'} flex items-center justify-center text-[10px] text-white font-bold`}>
                          {isCopilot ? <Bot className="w-3 h-3 text-emerald-300" /> : act.author?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="font-semibold text-slate-200 truncate max-w-[120px]">
                          {act.author?.name || 'Collaborator'}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="font-medium text-slate-300 text-xs">
                      {act.title}
                    </div>

                    {act.description && (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {act.description}
                      </p>
                    )}

                    {act.tag && (
                      <div className="pt-1 flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {act.tag}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {activities.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  Initializing live feed...
                </div>
              )}
            </div>
          </div>

          {/* Validated Problems & Personas Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Validated Problem Statements</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Quantified Pain</span>
            </div>

            <div className="space-y-2.5">
              {problems.map((prob) => (
                <div key={prob.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 truncate max-w-[200px]">{prob.title}</span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                      Impact: {prob.impactScore}/10
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {prob.description}
                  </p>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Frequency: {prob.frequency}
                  </div>
                </div>
              ))}

              {problems.length === 0 && (
                <div className="text-xs text-slate-500 italic py-2">
                  No problem statements recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
