import React, { useState, useMemo } from 'react';
import {
  Kanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  User,
  Plus,
  Search,
  Filter,
  Check,
  MoreHorizontal,
  Flame,
  Target,
  Sliders,
  CheckSquare,
  HelpCircle,
  ExternalLink,
  Layers
} from 'lucide-react';

// Priority tier helper for card styling
function getPriorityTier(score: number): { tier: 'P0' | 'P1' | 'P2' | 'P3'; label: string; badge: string; border: string; glow: string } {
  if (score >= 3000) {
    return {
      tier: 'P0',
      label: 'P0 · Critical Velocity',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-950/40'
    };
  }
  if (score >= 1500) {
    return {
      tier: 'P1',
      label: 'P1 · High Strategic Value',
      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-950/40'
    };
  }
  if (score >= 500) {
    return {
      tier: 'P2',
      label: 'P2 · Standard Backlog',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-950/40'
    };
  }
  return {
    tier: 'P3',
    label: 'P3 · Low ROI / Review',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    border: 'border-slate-700',
    glow: 'shadow-none'
  };
}

export type KanbanColumnId = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  title: string;
  subtitle: string;
  color: string;
  badgeBg: string;
  border: string;
  glow: string;
  allowedStatuses: string[];
  wipLimit?: number;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'BACKLOG',
    title: 'Backlog',
    subtitle: 'Prioritized & ready for grooming',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    border: 'border-slate-800',
    glow: 'hover:border-slate-700',
    allowedStatuses: ['BACKLOG', 'READY_FOR_DEV', 'TODO'],
    wipLimit: 15
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    subtitle: 'Active engineering execution',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    border: 'border-amber-500/30',
    glow: 'hover:border-amber-500/60',
    allowedStatuses: ['IN_PROGRESS', 'INPROGRESS'],
    wipLimit: 6
  },
  {
    id: 'IN_REVIEW',
    title: 'Review',
    subtitle: 'QA, PR review & verification',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    border: 'border-purple-500/30',
    glow: 'hover:border-purple-500/60',
    allowedStatuses: ['IN_REVIEW', 'IN_TESTING', 'REVIEW'],
    wipLimit: 6
  },
  {
    id: 'DONE',
    title: 'Done',
    subtitle: 'Approved & released to production',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    border: 'border-emerald-500/30',
    glow: 'hover:border-emerald-500/60',
    allowedStatuses: ['DONE', 'APPROVED', 'COMPLETED']
  }
];

interface KanbanBoardProps {
  stories: any[];
  onUpdateStoryStatus: (storyId: string, updates: { status?: string; priority?: string }) => void;
  onSelectStory?: (story: any) => void;
  productName?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stories,
  onUpdateStoryStatus,
  onSelectStory,
  productName = 'Product'
}) => {
  // Local UI filters & view preferences
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [cardDensity, setCardDensity] = useState<'DETAILED' | 'COMPACT'>('DETAILED');
  const [showWipWarnings, setShowWipWarnings] = useState<boolean>(true);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedStoryId, setDraggedStoryId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);

  // Extract distinct personas
  const distinctPersonas = useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) {
      if (s.persona) set.add(s.persona);
      else if (s.asA) set.add(s.asA);
    }
    return Array.from(set);
  }, [stories]);

  // Map story to canonical column
  const getStoryColumn = (story: any): KanbanColumnId => {
    const status = (story.status || 'READY_FOR_DEV').toUpperCase();
    if (['DONE', 'APPROVED', 'COMPLETED'].includes(status)) return 'DONE';
    if (['IN_REVIEW', 'IN_TESTING', 'REVIEW'].includes(status)) return 'IN_REVIEW';
    if (['IN_PROGRESS', 'INPROGRESS'].includes(status)) return 'IN_PROGRESS';
    return 'BACKLOG';
  };

  // Filtered stories
  const filteredStories = useMemo(() => {
    return stories.filter(story => {
      // Persona filter
      if (selectedPersona !== 'ALL') {
        const p = story.persona || story.asA || '';
        if (p !== selectedPersona) return false;
      }

      // Priority tier filter
      if (selectedTier !== 'ALL') {
        const score = story.riceScore || 1000;
        const tier = story.priority || getPriorityTier(score).tier;
        if (tier !== selectedTier) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = story.id?.toLowerCase().includes(q);
        const matchesTitle = (story.title || story.iWant || '').toLowerCase().includes(q);
        const matchesPersona = (story.persona || story.asA || '').toLowerCase().includes(q);
        const matchesSoThat = (story.soThat || '').toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesPersona && !matchesSoThat) return false;
      }

      return true;
    });
  }, [stories, selectedPersona, selectedTier, searchQuery]);

  // Group stories by column
  const columnStoriesMap = useMemo(() => {
    const map: Record<KanbanColumnId, any[]> = {
      BACKLOG: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: []
    };

    for (const story of filteredStories) {
      const col = getStoryColumn(story);
      map[col].push(story);
    }

    return map;
  }, [filteredStories]);

  // Overall metrics
  const totalPoints = useMemo(() => {
    return stories.reduce((sum, s) => sum + (s.effort || s.points || 3), 0);
  }, [stories]);

  const donePoints = useMemo(() => {
    return (columnStoriesMap.DONE || []).reduce((sum, s) => sum + (s.effort || s.points || 3), 0);
  }, [columnStoriesMap.DONE]);

  const progressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    setDraggedStoryId(storyId);
    e.dataTransfer.setData('text/plain', storyId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: KanbanColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const storyId = draggedStoryId || e.dataTransfer.getData('text/plain');
    if (!storyId) return;

    // Map column to exact status string
    let newStatus = 'BACKLOG';
    if (targetCol === 'IN_PROGRESS') newStatus = 'IN_PROGRESS';
    else if (targetCol === 'IN_REVIEW') newStatus = 'IN_REVIEW';
    else if (targetCol === 'DONE') newStatus = 'DONE';

    onUpdateStoryStatus(storyId, { status: newStatus });
    setDraggedStoryId(null);
  };

  const handleMoveStory = (storyId: string, targetCol: KanbanColumnId) => {
    let newStatus = 'BACKLOG';
    if (targetCol === 'IN_PROGRESS') newStatus = 'IN_PROGRESS';
    else if (targetCol === 'IN_REVIEW') newStatus = 'IN_REVIEW';
    else if (targetCol === 'DONE') newStatus = 'DONE';

    onUpdateStoryStatus(storyId, { status: newStatus });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Board Controls & Filter Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Kanban className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  User Stories Kanban Board
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  {filteredStories.length} of {stories.length} stories
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visual lifecycle workflow with drag-and-drop status transitions across Backlog, In Progress, Review, and Done.
              </p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Progress:</span>
              <span className="text-emerald-400 font-bold">{donePoints} / {totalPoints} pts ({progressPercent}%)</span>
              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setCardDensity('DETAILED')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  cardDensity === 'DETAILED'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Detailed
              </button>
              <button
                type="button"
                onClick={() => setCardDensity('COMPACT')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  cardDensity === 'COMPACT'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories by keyword, ID, or persona..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Persona Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 shrink-0">Persona:</span>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Personas ({distinctPersonas.length})</option>
              {distinctPersonas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Priority Tier Filter */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs text-slate-400 shrink-0">Priority:</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              {(['ALL', 'P0', 'P1', 'P2'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    selectedTier === tier
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {KANBAN_COLUMNS.map((column, colIdx) => {
          const colStories = columnStoriesMap[column.id] || [];
          const colPoints = colStories.reduce((acc, s) => acc + (s.effort || s.points || 3), 0);
          const colRice = colStories.reduce((acc, s) => acc + (s.riceScore || 1000), 0);
          const isOverWip = showWipWarnings && column.wipLimit && colStories.length > column.wipLimit;
          const isDropTarget = dragOverColumn === column.id;

          const prevCol = colIdx > 0 ? KANBAN_COLUMNS[colIdx - 1] : null;
          const nextCol = colIdx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[colIdx + 1] : null;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`rounded-2xl border transition-all duration-200 flex flex-col min-h-[580px] ${
                isDropTarget
                  ? 'bg-purple-950/20 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 rounded-t-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      column.id === 'DONE' ? 'bg-emerald-400' :
                      column.id === 'IN_REVIEW' ? 'bg-purple-400' :
                      column.id === 'IN_PROGRESS' ? 'bg-amber-400 animate-pulse' :
                      'bg-slate-400'
                    }`} />
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{column.title}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded border ${column.badgeBg}`}>
                        {colStories.length}
                      </span>
                    </h4>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400">
                    <span>{colPoints} pts</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate">{column.subtitle}</span>
                  {column.wipLimit && (
                    <span className={isOverWip ? 'text-rose-400 font-bold' : ''}>
                      WIP: {colStories.length}/{column.wipLimit}
                    </span>
                  )}
                </div>

                {isOverWip && (
                  <div className="p-1 rounded bg-rose-950/60 border border-rose-800 text-[10px] text-rose-300 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>WIP limit exceeded! Resolve items before pulling more.</span>
                  </div>
                )}
              </div>

              {/* Column Cards Drop Area */}
              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[720px]">
                {colStories.length === 0 ? (
                  <div className={`py-12 px-4 rounded-xl border border-dashed text-center text-xs text-slate-500 transition-colors ${
                    isDropTarget ? 'border-purple-500 bg-purple-950/20 text-purple-300' : 'border-slate-800/80'
                  }`}>
                    <p className="font-medium">No stories in {column.title}</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      Drag stories here or use card transition arrows.
                    </p>
                  </div>
                ) : (
                  colStories.map((story) => {
                    const riceScore = story.riceScore || 1000;
                    const tierInfo = getPriorityTier(riceScore);
                    const effortPoints = story.effort || story.points || 3;
                    const isExpanded = expandedStoryId === story.id;
                    const isDraggingThis = draggedStoryId === story.id;

                    return (
                      <div
                        key={story.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, story.id)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing group select-none shadow-sm ${
                          isDraggingThis
                            ? 'opacity-40 scale-95 border-purple-500 bg-purple-950/40'
                            : 'bg-slate-950/90 border-slate-850 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        {/* Top Badge Row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                              {story.id}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${tierInfo.badge}`}>
                              {story.priority || tierInfo.tier}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                              RICE: {riceScore}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {effortPoints}p
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h5 
                          onClick={() => onSelectStory && onSelectStory(story)}
                          className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors leading-snug cursor-pointer mb-1.5"
                        >
                          {story.title || story.iWant || 'User Story'}
                        </h5>

                        {/* Detailed Narrative Section */}
                        {cardDensity === 'DETAILED' && (
                          <div className="space-y-1.5 mb-2">
                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                              <strong className="text-amber-300">As a</strong> {story.asA || story.persona || 'user'}{' '}
                              <strong className="text-cyan-300">I want</strong> {story.iWant || story.title}
                            </p>

                            {story.soThat && isExpanded && (
                              <p className="text-[11px] text-emerald-300/90 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                                <strong>So that:</strong> {story.soThat}
                              </p>
                            )}

                            {/* Acceptance criteria preview if expanded */}
                            {isExpanded && Array.isArray(story.acceptanceCriteria) && story.acceptanceCriteria.length > 0 && (
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-[10px]">
                                <span className="font-bold uppercase text-slate-400">Acceptance Criteria ({story.acceptanceCriteria.length}):</span>
                                <ul className="space-y-0.5 text-slate-300">
                                  {story.acceptanceCriteria.map((ac: string, acIdx: number) => (
                                    <li key={acIdx} className="flex items-start gap-1">
                                      <CheckSquare className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                      <span className="line-clamp-2">{ac}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Persona & Expand Trigger */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-900">
                          <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                            <User className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="truncate font-medium">{story.persona || story.asA || 'General'}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {Array.isArray(story.acceptanceCriteria) && story.acceptanceCriteria.length > 0 && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {story.acceptanceCriteria.length} ac
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedStoryId(isExpanded ? null : story.id);
                              }}
                              className="text-slate-500 hover:text-slate-300 p-0.5 rounded"
                              title={isExpanded ? 'Collapse card' : 'Expand full details'}
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* 1-Click Column Transition Toolbar */}
                        <div className="pt-2 mt-1 border-t border-slate-900 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {prevCol ? (
                            <button
                              type="button"
                              onClick={() => handleMoveStory(story.id, prevCol.id)}
                              className="text-[10px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                              title={`Move left to ${prevCol.title}`}
                            >
                              <ArrowLeft className="w-3 h-3" />
                              <span>{prevCol.title}</span>
                            </button>
                          ) : <div />}

                          {nextCol && (
                            <button
                              type="button"
                              onClick={() => handleMoveStory(story.id, nextCol.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
                                nextCol.id === 'DONE'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                                  : nextCol.id === 'IN_REVIEW'
                                    ? 'bg-purple-950 text-purple-300 border-purple-700 hover:bg-purple-900'
                                    : 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900'
                              }`}
                              title={`Move right to ${nextCol.title}`}
                            >
                              <span>{nextCol.title}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
