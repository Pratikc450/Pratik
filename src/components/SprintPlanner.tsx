import React, { useState, useEffect, useMemo } from 'react';
import {
  ListTodo,
  Sparkles,
  Zap,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Download,
  FileSpreadsheet,
  Check,
  Sliders,
  Calendar,
  Users,
  Layers,
  Target,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  TrendingDown,
  GitBranch
} from 'lucide-react';
import { Product, SprintStory, GeneratedArtifact } from '../types.js';
import { CapacityPlanner } from './CapacityPlanner.js';

interface SprintPlannerProps {
  selectedProductId: string;
  products?: Product[];
  onSelectProduct?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  onSprintCommitted?: () => void;
}

export const SprintPlanner: React.FC<SprintPlannerProps> = ({
  selectedProductId,
  products = [],
  onSelectProduct,
  onNavigateTab,
  onSprintCommitted
}) => {
  const [velocity, setVelocity] = useState<number>(24); // default 24 story points
  const [sprintName, setSprintName] = useState<string>('Sprint 1 · Core Delivery');
  const [sprintViewTab, setSprintViewTab] = useState<'backlog' | 'capacity'>('backlog');
  const [allBacklogStories, setAllBacklogStories] = useState<any[]>([]);
  const [sprintStories, setSprintStories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<boolean>(false);
  const [activeRoadmapThemes, setActiveRoadmapThemes] = useState<string[]>([]);

  // Fetch stories and active state
  const loadStoriesAndRoadmap = async () => {
    if (!selectedProductId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, activeRes] = await Promise.all([
        fetch(`/api/products/${selectedProductId}`),
        fetch(`/api/workspace/${selectedProductId}/active-state`)
      ]);

      let availableStories: any[] = [];
      let currentSprint: any[] = [];

      if (prodRes.ok) {
        const ct = prodRes.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const prodData = await prodRes.json();
          const storiesArt = (prodData.artifacts || []).find((a: any) => a.taskType === 'USER_STORIES');
          const rmArt = (prodData.artifacts || []).find((a: any) => a.taskType === 'ROADMAP');

        if (storiesArt?.schemaData?.stories) {
          availableStories = storiesArt.schemaData.stories.map((s: any, idx: number) => ({
            id: s.id || `US-${idx + 101}`,
            title: s.title || s.iWant || 'User Story',
            asA: s.asA || s.persona || 'User',
            iWant: s.iWant || s.title || '',
            soThat: s.soThat || '',
            persona: s.persona || s.asA || 'General User',
            points: Number(s.effort || s.points || (idx % 3 === 0 ? 5 : idx % 2 === 0 ? 3 : 2)),
            riceScore: Number(s.riceScore || 1200),
            priority: (s.tier || s.priority || 'P1') as 'P0' | 'P1' | 'P2',
            acceptanceCriteria: s.acceptanceCriteria || []
          }));
        }

        if (rmArt?.schemaData?.quarterHorizons) {
          const themes = rmArt.schemaData.quarterHorizons.map((q: any) => `${q.quarter}: ${q.theme}`);
          setActiveRoadmapThemes(themes);
        }
      }
    }

    if (activeRes.ok) {
      const ct = activeRes.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const activeData = await activeRes.json();
        if (activeData.sprintStories && activeData.sprintStories.length > 0) {
          currentSprint = activeData.sprintStories;
        }
      }
    }

      // If no sprint stories exist yet, pre-populate using RICE-optimized selection
      if (currentSprint.length === 0 && availableStories.length > 0) {
        const sorted = [...availableStories].sort((a, b) => (b.riceScore || 0) - (a.riceScore || 0));
        let sum = 0;
        const initialSprint: any[] = [];
        const remaining: any[] = [];

        for (const st of sorted) {
          if (sum + st.points <= velocity) {
            initialSprint.push(st);
            sum += st.points;
          } else {
            remaining.push(st);
          }
        }
        setSprintStories(initialSprint);
        setAllBacklogStories(remaining);
      } else if (currentSprint.length > 0) {
        // Filter out stories already in current sprint
        const sprintIds = new Set(currentSprint.map(s => s.id));
        const remaining = availableStories.filter(s => !sprintIds.has(s.id));
        setSprintStories(currentSprint);
        setAllBacklogStories(remaining);
      } else {
        setAllBacklogStories(availableStories);
        setSprintStories([]);
      }
    } catch (err) {
      console.warn('Failed to load sprint stories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoriesAndRoadmap();
  }, [selectedProductId]);

  // Compute metrics
  const committedPoints = useMemo(() => {
    return sprintStories.reduce((sum, s) => sum + (s.points || 0), 0);
  }, [sprintStories]);

  const totalRiceScore = useMemo(() => {
    return sprintStories.reduce((sum, s) => sum + (s.riceScore || 0), 0);
  }, [sprintStories]);

  const p0Count = useMemo(() => {
    return sprintStories.filter(s => s.priority === 'P0').length;
  }, [sprintStories]);

  const personaCoverage = useMemo(() => {
    const set = new Set(sprintStories.map(s => s.persona || s.asA).filter(Boolean));
    return Array.from(set);
  }, [sprintStories]);

  const capacityPercentage = Math.round((committedPoints / (velocity || 1)) * 100);

  // Capacity status
  const capacityStatus = useMemo(() => {
    if (capacityPercentage > 100) {
      return {
        label: 'Over Capacity',
        color: 'text-rose-400',
        barBg: 'bg-rose-500',
        badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40'
      };
    }
    if (capacityPercentage >= 85) {
      return {
        label: 'Optimal Capacity',
        color: 'text-emerald-400',
        barBg: 'bg-emerald-500',
        badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
      };
    }
    return {
      label: 'Under Capacity',
      color: 'text-amber-400',
      barBg: 'bg-amber-500',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40'
    };
  }, [capacityPercentage]);

  // Add Story to Sprint
  const handleAddToSprint = (story: any) => {
    setAllBacklogStories(allBacklogStories.filter(s => s.id !== story.id));
    setSprintStories([...sprintStories, story]);
  };

  // Remove Story from Sprint
  const handleRemoveFromSprint = (story: any) => {
    setSprintStories(sprintStories.filter(s => s.id !== story.id));
    setAllBacklogStories([...allBacklogStories, story]);
  };

  // Automated RICE Optimization Generator
  const handleAiAutoBalance = () => {
    const pool = [...sprintStories, ...allBacklogStories];
    // Sort pool by RICE score descending, prioritizing P0 first
    const sorted = pool.sort((a, b) => {
      if (a.priority === 'P0' && b.priority !== 'P0') return -1;
      if (b.priority === 'P0' && a.priority !== 'P0') return 1;
      return (b.riceScore || 0) - (a.riceScore || 0);
    });

    let currentTotal = 0;
    const selected: any[] = [];
    const remaining: any[] = [];

    for (const story of sorted) {
      const pts = story.points || 3;
      if (currentTotal + pts <= velocity) {
        selected.push(story);
        currentTotal += pts;
      } else {
        remaining.push(story);
      }
    }

    setSprintStories(selected);
    setAllBacklogStories(remaining);
  };

  // Commit Sprint to Workspace API
  const handleCommitSprint = async () => {
    if (sprintStories.length === 0) return;
    setIsCommitting(true);

    try {
      const res = await fetch(`/api/workspace/${selectedProductId}/sprint-backlog/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintName,
          velocityPoints: velocity,
          stories: sprintStories
        })
      });

      if (res.ok) {
        setCommitSuccess(true);
        if (onSprintCommitted) onSprintCommitted();
        setTimeout(() => setCommitSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to commit sprint backlog', err);
    } finally {
      setIsCommitting(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['StoryId', 'Title', 'Persona', 'Priority', 'Points', 'RICEScore', 'Status'];
    const rows = sprintStories.map(s => [
      `"${s.id}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${(s.persona || s.asA || '').replace(/"/g, '""')}"`,
      `"${s.priority}"`,
      s.points,
      s.riceScore,
      `"${s.status || 'TODO'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sprintName.toLowerCase().replace(/\s+/g, '_')}_backlog.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Assign story member
  const handleAssignStoryMember = (storyId: string, member: { name: string; role: string; avatarBg: string }) => {
    setSprintStories(prev =>
      prev.map(s => (s.id === storyId ? { ...s, assignee: member } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-emerald-400" />
            <span>2-Week Sprint Planner</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Generate balanced sprint backlogs by evaluating story point capacity against RICE prioritization scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {products.length > 0 && onSelectProduct && (
            <select
              value={selectedProductId}
              onChange={(e) => onSelectProduct(e.target.value)}
              className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCommitSprint}
            disabled={isCommitting || sprintStories.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {commitSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Sprint Committed!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>{isCommitting ? 'Committing...' : 'Commit Sprint to Workspace'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Switcher: Backlog Pool vs Capacity Planner & Burn-down */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setSprintViewTab('backlog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              sprintViewTab === 'backlog'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Sprint Backlog Board</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-mono">
              {sprintStories.length} Stories · {committedPoints} pts
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSprintViewTab('capacity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              sprintViewTab === 'capacity'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-300" />
            <span>Capacity Planner & Resource Allocation</span>
            <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/80 font-mono">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
              <span>Burn-Down</span>
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2 px-3 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Target Velocity:</span>
          <span className="font-mono font-bold text-emerald-400">{velocity} pts</span>
          <span className="text-slate-600">·</span>
          <span>{capacityPercentage}% Allocated</span>
        </div>
      </div>

      {sprintViewTab === 'capacity' ? (
        <CapacityPlanner
          selectedProductId={selectedProductId}
          sprintStories={sprintStories}
          committedPoints={committedPoints}
          currentVelocity={velocity}
          onApplyVelocity={(newVel) => setVelocity(newVel)}
          onAssignStoryMember={handleAssignStoryMember}
          onNavigateTab={onNavigateTab}
        />
      ) : (
        <>

      {/* Capacity & Control Dashboard */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Velocity Controller */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span>Developer Team Velocity:</span>
              </label>
              <span className="font-mono text-sm font-black text-emerald-400">
                {velocity} pts / 2 wks
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={2}
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10 pts (Lean)</span>
              <span>24 pts (Standard)</span>
              <span>60 pts (Scale)</span>
            </div>
          </div>

          {/* Capacity Meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Capacity Allocation:</span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${capacityStatus.badge}`}>
                {committedPoints} / {velocity} pts ({capacityPercentage}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${capacityStatus.barBg}`}
                style={{ width: `${Math.min(100, capacityPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span className={capacityStatus.color}>{capacityStatus.label}</span>
              <span>{Math.max(0, velocity - committedPoints)} pts available</span>
            </div>
          </div>

          {/* Actions & Capacity Planner Link */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 md:justify-end">
            <button
              type="button"
              onClick={() => setSprintViewTab('capacity')}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-700/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tune Squad Capacity & Burn-Down →</span>
            </button>

            <button
              type="button"
              onClick={handleAiAutoBalance}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>AI Auto-Balance (RICE)</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cumulative RICE: <strong className="text-emerald-400 font-mono">{totalRiceScore.toLocaleString()}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>P0 Critical Stories: <strong className="text-slate-100">{p0Count}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Persona Coverage: <strong className="text-slate-100">{personaCoverage.length} archetypes</strong></span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Available Backlog vs Planned Sprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Stories Column */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-100">Product Backlog Pool</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {allBacklogStories.length} available
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[550px] flex-1 pr-1">
            {allBacklogStories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                All backlog stories have been assigned to sprint!
              </div>
            ) : (
              allBacklogStories.map((story) => (
                <div
                  key={story.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-3 text-xs group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {story.id}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        story.priority === 'P0'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      }`}>
                        {story.priority}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        RICE: {story.riceScore}
                      </span>
                    </div>

                    <h4 className="font-semibold text-slate-200 leading-snug">
                      {story.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {story.persona ? `For: ${story.persona}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {story.points} pts
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToSprint(story)}
                      className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Add</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Planned 2-Week Sprint Backlog Column */}
        <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4 space-y-3 flex flex-col shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">{sprintName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400">
                {sprintStories.length} stories · {committedPoints} pts
              </span>
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[550px] flex-1 pr-1">
            {sprintStories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Sprint backlog is empty. Click "Add" on any backlog item or use "AI Auto-Balance".
              </div>
            ) : (
              sprintStories.map((story) => (
                <div
                  key={story.id}
                  className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex items-start justify-between gap-3 text-xs shadow-sm"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        {story.id}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {story.priority}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        RICE: {story.riceScore}
                      </span>
                    </div>

                    <h4 className="font-semibold text-slate-100 leading-snug">
                      {story.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {story.description || (story.persona ? `For: ${story.persona}` : '')}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60">
                      {story.points} pts
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromSprint(story)}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
