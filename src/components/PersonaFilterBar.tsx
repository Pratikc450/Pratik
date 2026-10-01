import React, { useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Sparkles, 
  Filter, 
  Eye, 
  X, 
  Check, 
  PieChart, 
  SlidersHorizontal 
} from 'lucide-react';

interface Story {
  id: string;
  persona: string;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  riceScore?: number;
}

interface PersonaFilterBarProps {
  stories: Story[];
  selectedPersona: string;
  onSelectPersona: (persona: string) => void;
  displayMode: 'FILTER' | 'HIGHLIGHT';
  onChangeDisplayMode: (mode: 'FILTER' | 'HIGHLIGHT') => void;
}

export const PersonaFilterBar: React.FC<PersonaFilterBarProps> = ({
  stories,
  selectedPersona,
  onSelectPersona,
  displayMode,
  onChangeDisplayMode
}) => {
  // Aggregate stats per persona
  const personaStats = useMemo(() => {
    const stats: Record<string, { count: number; totalRice: number }> = {};
    
    stories.forEach(s => {
      const p = s.persona || 'General User';
      const rice = s.riceScore ?? Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2));
      
      if (!stats[p]) {
        stats[p] = { count: 0, totalRice: 0 };
      }
      stats[p].count += 1;
      stats[p].totalRice += rice;
    });

    return stats;
  }, [stories]);

  const uniquePersonas = useMemo(() => {
    return Object.keys(personaStats).sort();
  }, [personaStats]);

  const activeStats = selectedPersona !== 'ALL' ? personaStats[selectedPersona] : null;
  const totalBacklogStories = stories.length;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-md space-y-3">
      {/* Top Header of Persona Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-200">
                Customer Persona & Segment Filter
              </h4>
              {selectedPersona !== 'ALL' && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {displayMode === 'FILTER' ? 'Filtered' : 'Highlighted'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Isolate or dynamically spotlight stories mapped to specific enterprise customer roles.
            </p>
          </div>
        </div>

        {/* View Mode Toggle: FILTER (hide others) vs HIGHLIGHT (spotlight in context) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] text-slate-400 hidden md:inline">Mode:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => onChangeDisplayMode('FILTER')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                displayMode === 'FILTER' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Only show stories for this persona"
            >
              <Filter className="w-3 h-3" />
              <span>Filter View</span>
            </button>
            <button
              onClick={() => onChangeDisplayMode('HIGHLIGHT')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                displayMode === 'HIGHLIGHT' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Keep all stories visible, but highlight matching customer segment"
            >
              <Eye className="w-3 h-3" />
              <span>Highlight View</span>
            </button>
          </div>

          {selectedPersona !== 'ALL' && (
            <button
              onClick={() => onSelectPersona('ALL')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset persona filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Persona Pill Toggles */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* All Personas Button */}
        <button
          onClick={() => onSelectPersona('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedPersona === 'ALL'
              ? 'bg-purple-600 text-white border-purple-500 shadow-sm shadow-purple-950/40 font-bold'
              : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800'
          }`}
        >
          <span>All Segments</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedPersona === 'ALL' ? 'bg-purple-800/80 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {totalBacklogStories}
          </span>
        </button>

        {/* Individual Persona Pills */}
        {uniquePersonas.map((persona) => {
          const isSelected = selectedPersona === persona;
          const stats = personaStats[persona];

          return (
            <button
              key={persona}
              onClick={() => onSelectPersona(persona)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-950/50 font-bold ring-1 ring-purple-400/50'
                  : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border-slate-800'
              }`}
            >
              <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
              <span>{persona}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isSelected ? 'bg-purple-900 text-white font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {stats.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Customer Segment Insight Strip if a persona is selected */}
      {selectedPersona !== 'ALL' && activeStats && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <PieChart className="w-3.5 h-3.5 text-purple-400" />
              <span>Segment Coverage:</span>
              <strong className="text-purple-300 font-mono">
                {activeStats.count} of {totalBacklogStories} stories ({Math.round((activeStats.count / totalBacklogStories) * 100)}%)
              </strong>
            </span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span>Combined Segment RICE:</span>
              <strong className="text-emerald-400 font-mono">
                {activeStats.totalRice.toLocaleString()} pts
              </strong>
            </span>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            {displayMode === 'FILTER' 
              ? `Displaying only stories designed for ${selectedPersona}` 
              : `Spotlighting ${selectedPersona} stories; remaining backlog dimmed for cross-sprint context`}
          </span>
        </div>
      )}
    </div>
  );
};
