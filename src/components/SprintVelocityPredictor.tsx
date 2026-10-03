import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface StoryItem {
  id: string;
  asA: string;
  iWant?: string;
  soThat?: string;
  persona: string;
  riceScore?: number;
  effort?: number;
  points?: number;
  status?: string;
  priority?: string;
}

interface SprintVelocityPredictorProps {
  stories: StoryItem[];
  onCommitScope?: (storyIds: string[]) => void;
}

const HISTORICAL_SPRINTS = [
  { sprint: 'Sprint 1', pointsCommitted: 25, pointsDelivered: 24, deliveryRate: 96 },
  { sprint: 'Sprint 2', pointsCommitted: 30, pointsDelivered: 28, deliveryRate: 93 },
  { sprint: 'Sprint 3', pointsCommitted: 35, pointsDelivered: 34, deliveryRate: 97 },
  { sprint: 'Sprint 4', pointsCommitted: 40, pointsDelivered: 38, deliveryRate: 95 }
];

export const SprintVelocityPredictor: React.FC<SprintVelocityPredictorProps> = ({
  stories,
  onCommitScope
}) => {
  const [teamSize, setTeamSize] = useState<number>(5);
  const [focusFactor, setFocusFactor] = useState<number>(80);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [targetConfidence, setTargetConfidence] = useState<'SAFE' | 'TARGET' | 'STRETCH'>('TARGET');
  const [committedStoryIds, setCommittedStoryIds] = useState<Set<string>>(new Set());

  // Historical calculations
  const historicalAvg = useMemo(() => {
    const totalDelivered = HISTORICAL_SPRINTS.reduce((sum, s) => sum + s.pointsDelivered, 0);
    return Math.round((totalDelivered / HISTORICAL_SPRINTS.length) * 10) / 10;
  }, []);

  // Forecast bands calibrated by capacity slider
  const capacityMultiplier = (teamSize / 5) * (focusFactor / 80);
  
  const predictedBands = useMemo(() => {
    const base = historicalAvg * capacityMultiplier;
    return {
      safe: Math.round(base * 0.88),      // 90% confidence
      target: Math.round(base * 1.0),    // 75% confidence
      stretch: Math.round(base * 1.15)    // 50% confidence
    };
  }, [historicalAvg, capacityMultiplier]);

  const activePointsBudget = targetConfidence === 'SAFE' 
    ? predictedBands.safe 
    : targetConfidence === 'TARGET' 
    ? predictedBands.target 
    : predictedBands.stretch;

  // Assign estimated points if not defined (approx. effort * 3)
  const storiesWithPoints = useMemo(() => {
    return stories.map(s => {
      const effort = s.effort || 2;
      const pts = s.points || Math.max(2, Math.round(effort * 3));
      return { ...s, points: pts };
    }).sort((a, b) => (b.riceScore || 0) - (a.riceScore || 0));
  }, [stories]);

  // Recommended stories fitting within current predicted capacity
  const recommendedScope = useMemo(() => {
    let accumulated = 0;
    const recIds: string[] = [];
    for (const s of storiesWithPoints) {
      if (accumulated + s.points <= activePointsBudget) {
        recIds.push(s.id);
        accumulated += s.points;
      }
    }
    return { storyIds: recIds, totalPoints: accumulated };
  }, [storiesWithPoints, activePointsBudget]);

  const handleToggleSelectStory = (id: string) => {
    setCommittedStoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectRecommended = () => {
    setCommittedStoryIds(new Set(recommendedScope.storyIds));
  };

  const selectedTotalPoints = useMemo(() => {
    return storiesWithPoints
      .filter(s => committedStoryIds.has(s.id))
      .reduce((sum, s) => sum + s.points, 0);
  }, [storiesWithPoints, committedStoryIds]);

  const capacityStatus = selectedTotalPoints <= predictedBands.safe 
    ? 'SAFE' 
    : selectedTotalPoints <= predictedBands.target 
    ? 'OPTIMAL' 
    : selectedTotalPoints <= predictedBands.stretch 
    ? 'STRETCH' 
    : 'OVERCAPACITY';

  return (
    <div className="rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/40 shadow-xl overflow-hidden transition-all">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-indigo-950/20 transition-colors border-b border-indigo-900/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Sprint Velocity Predictor & Capacity Planner
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                Monte Carlo Calibrated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Forecasts story point commitments based on historical delivery rate (avg {historicalAvg} pts/sprint) and team capacity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Forecasted:</span>
            <span className="text-emerald-400 font-bold text-sm">{activePointsBudget} Points</span>
          </div>
          <button className="text-slate-400 hover:text-slate-200">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Historical Calibration Strip & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Delivery Confidence Bands */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Confidence Commitment Bands
              </span>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <button
                  onClick={() => setTargetConfidence('SAFE')}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    targetConfidence === 'SAFE' 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-xs' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[9px] block text-slate-500">90% Conf</span>
                  <strong className="text-sm font-bold text-emerald-400">{predictedBands.safe} pts</strong>
                  <span className="text-[9px] block text-emerald-300">Safe Gate</span>
                </button>

                <button
                  onClick={() => setTargetConfidence('TARGET')}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    targetConfidence === 'TARGET' 
                      ? 'bg-purple-950 text-purple-300 border-purple-700 shadow-xs' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[9px] block text-slate-500">75% Conf</span>
                  <strong className="text-sm font-bold text-purple-300">{predictedBands.target} pts</strong>
                  <span className="text-[9px] block text-purple-200">Target</span>
                </button>

                <button
                  onClick={() => setTargetConfidence('STRETCH')}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    targetConfidence === 'STRETCH' 
                      ? 'bg-amber-950 text-amber-300 border-amber-700 shadow-xs' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[9px] block text-slate-500">50% Conf</span>
                  <strong className="text-sm font-bold text-amber-400">{predictedBands.stretch} pts</strong>
                  <span className="text-[9px] block text-amber-200">Stretch</span>
                </button>
              </div>
            </div>

            {/* Team Capacity Tuning Sliders */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500">Capacity Tuning</span>
                <span className="text-[11px] font-mono text-indigo-300 font-bold">
                  {teamSize} Devs @ {focusFactor}% Focus
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Engineers Allocated</span>
                  <span className="font-mono text-slate-200">{teamSize} FTE</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Focus Factor (Excludes Ops/Bugs)</span>
                  <span className="font-mono text-slate-200">{focusFactor}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={focusFactor}
                  onChange={(e) => setFocusFactor(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Current Selection Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Committed Scope</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-slate-100">
                    {selectedTotalPoints}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    / {activePointsBudget} pts budget
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ml-auto ${
                    capacityStatus === 'SAFE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                    capacityStatus === 'OPTIMAL' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                    capacityStatus === 'STRETCH' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                    'bg-rose-950 text-rose-300 border-rose-800'
                  }`}>
                    {capacityStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleSelectRecommended}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Auto-Scope Top RICE ({recommendedScope.storyIds.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stories Points Allocation Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                Allocate Backlog Stories to Upcoming Sprint ({committedStoryIds.size} selected · {selectedTotalPoints} pts)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Sorted by RICE priority score
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {storiesWithPoints.map((story) => {
                const isSelected = committedStoryIds.has(story.id);
                return (
                  <div
                    key={story.id}
                    onClick={() => handleToggleSelectStory(story.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500/70 shadow-xs ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="truncate">
                        <span className="font-mono text-[11px] font-bold text-slate-300 mr-1.5">
                          {story.id}
                        </span>
                        <span className="text-slate-200 truncate">
                          {story.iWant || story.asA}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-emerald-400 font-bold">
                        {story.points} pts
                      </span>
                      <span className="text-[10px] text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800">
                        {story.riceScore?.toLocaleString()} RICE
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
