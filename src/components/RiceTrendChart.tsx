import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  Sparkles, 
  Layers, 
  Sliders, 
  Calendar,
  Maximize2,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react';
import { getPriorityTier } from './UserStoryListView.js';

export interface StorySummary {
  id: string;
  epicTitle?: string;
  asA: string;
  persona: string;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  riceScore?: number;
  history?: Array<{
    milestone: string;
    date: string;
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    riceScore: number;
  }>;
}

interface RiceTrendChartProps {
  stories: StorySummary[];
  activeStoryId?: string;
  onSelectStory?: (id: string) => void;
  productName?: string;
}

const STORY_COLORS: Record<string, { stroke: string; fill: string; bg: string; text: string }> = {
  'US-101': { stroke: '#a855f7', fill: '#c084fc', bg: 'bg-purple-950/70 border-purple-800/60', text: 'text-purple-300' },
  'US-102': { stroke: '#06b6d4', fill: '#22d3ee', bg: 'bg-cyan-950/70 border-cyan-800/60', text: 'text-cyan-300' },
  'US-103': { stroke: '#10b981', fill: '#34d399', bg: 'bg-emerald-950/70 border-emerald-800/60', text: 'text-emerald-300' },
  'US-104': { stroke: '#f59e0b', fill: '#fbbf24', bg: 'bg-amber-950/70 border-amber-800/60', text: 'text-amber-300' },
  'US-105': { stroke: '#ec4899', fill: '#f472b6', bg: 'bg-pink-950/70 border-pink-800/60', text: 'text-pink-300' }
};

const DEFAULT_COLOR = { stroke: '#818cf8', fill: '#a5b4fc', bg: 'bg-indigo-950/70 border-indigo-800/60', text: 'text-indigo-300' };

// Baseline historical milestones for stories to illustrate realistic PM evolution over sprints
const DEFAULT_HISTORICAL_MILESTONES = [
  {
    milestone: 'Sprint 1 (Initial Draft)',
    date: 'Aug 12',
    factors: {
      'US-101': { reach: 2500, impact: 2.0, confidence: 0.5, effort: 3.5 }, // Score: 714
      'US-102': { reach: 800, impact: 1.5, confidence: 0.6, effort: 4.0 },  // Score: 180
      'US-103': { reach: 1500, impact: 1.5, confidence: 0.5, effort: 2.5 }  // Score: 450
    }
  },
  {
    milestone: 'Sprint 2 (Discovery Interviews)',
    date: 'Aug 26',
    factors: {
      'US-101': { reach: 3500, impact: 2.5, confidence: 0.7, effort: 3.0 }, // Score: 2041
      'US-102': { reach: 1000, impact: 2.0, confidence: 0.7, effort: 3.5 }, // Score: 400
      'US-103': { reach: 2400, impact: 2.0, confidence: 0.7, effort: 2.0 }  // Score: 1680
    }
  },
  {
    milestone: 'Sprint 3 (Telemetry Validation)',
    date: 'Sep 09',
    factors: {
      'US-101': { reach: 4200, impact: 3.0, confidence: 0.85, effort: 2.5 }, // Score: 4284
      'US-102': { reach: 1200, impact: 2.0, confidence: 0.8, effort: 3.0 },  // Score: 640
      'US-103': { reach: 3200, impact: 2.0, confidence: 0.8, effort: 1.8 }  // Score: 2844
    }
  },
  {
    milestone: 'Sprint 4 (Arch Refinement)',
    date: 'Sep 23',
    factors: {
      'US-101': { reach: 4500, impact: 3.0, confidence: 0.9, effort: 2.5 }, // Score: 4860
      'US-102': { reach: 1200, impact: 2.0, confidence: 0.85, effort: 3.0 }, // Score: 680
      'US-103': { reach: 3800, impact: 2.0, confidence: 0.8, effort: 1.5 }  // Score: 4053
    }
  }
];

export const RiceTrendChart: React.FC<RiceTrendChartProps> = ({
  stories,
  activeStoryId,
  onSelectStory,
  productName = 'Product'
}) => {
  const [selectedStoryFilter, setSelectedStoryFilter] = useState<string>('ALL');
  const [showThresholds, setShowThresholds] = useState<boolean>(true);
  const [showAverage, setShowAverage] = useState<boolean>(true);

  // Build complete historical timeline data points including the live current score
  const chartData = useMemo(() => {
    // 1. Process historical milestone checkpoints
    const milestonePoints = DEFAULT_HISTORICAL_MILESTONES.map((m) => {
      const point: any = {
        milestone: m.milestone,
        shortLabel: m.date,
        fullMilestone: `${m.milestone} (${m.date})`
      };

      let sumScore = 0;
      let count = 0;

      stories.forEach((story) => {
        // If story has explicit custom history, lookup point
        const customPoint = story.history?.find(h => h.milestone === m.milestone);
        let score = 0;

        if (customPoint) {
          score = customPoint.riceScore;
        } else if ((m.factors as any)[story.id]) {
          const f = (m.factors as any)[story.id];
          score = Math.round(((f.reach * f.impact * f.confidence) / f.effort) * 10) / 10;
        } else {
          // Approximate historical score based on ratio
          const curScore = story.riceScore || Math.round(((story.reach || 1000) * (story.impact || 2) * (story.confidence || 0.8)) / (story.effort || 2));
          const discount = m.date === 'Aug 12' ? 0.35 : m.date === 'Aug 26' ? 0.55 : 0.85;
          score = Math.round(curScore * discount);
        }

        point[story.id] = score;
        sumScore += score;
        count++;
      });

      point.average = count > 0 ? Math.round(sumScore / count) : 0;
      return point;
    });

    // 2. Add current dynamic live point (incorporates user's live tweaks in RICE calculator)
    const currentPoint: any = {
      milestone: 'Current (Live)',
      shortLabel: 'Current',
      fullMilestone: 'Current Active Model (Live)'
    };

    let curSum = 0;
    let curCount = 0;

    stories.forEach((story) => {
      const liveScore = story.riceScore !== undefined
        ? story.riceScore
        : Math.round(((story.reach || 1000) * (story.impact || 2) * (story.confidence || 0.8)) / (story.effort || 1.5));

      currentPoint[story.id] = liveScore;
      curSum += liveScore;
      curCount++;
    });

    currentPoint.average = curCount > 0 ? Math.round(curSum / curCount) : 0;

    return [...milestonePoints, currentPoint];
  }, [stories]);

  // Compute stats for current snapshot
  const stats = useMemo(() => {
    if (!stories || stories.length === 0) return { highest: null, avgScore: 0, growthPct: 0 };

    const currentScores = stories.map(s => ({
      id: s.id,
      persona: s.persona,
      score: s.riceScore || Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2))
    }));

    currentScores.sort((a, b) => b.score - a.score);
    const highest = currentScores[0];
    const avgScore = Math.round(currentScores.reduce((acc, c) => acc + c.score, 0) / currentScores.length);

    // Calculate growth from Sprint 1 to Current for top story
    const sprint1TopScore = chartData[0]?.[highest.id] || 1;
    const growthPct = Math.round(((highest.score - sprint1TopScore) / sprint1TopScore) * 100);

    return { highest, avgScore, growthPct };
  }, [stories, chartData]);

  // Custom Dark Mode Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-2.5 min-w-[210px]">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>{dataPoint?.milestone || label}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{dataPoint?.shortLabel}</span>
          </div>

          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              if (entry.dataKey === 'average') {
                return (
                  <div key={index} className="flex items-center justify-between gap-3 text-slate-300 font-mono text-[11px] pt-1 border-t border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-0.5 bg-slate-400" />
                      <span>Backlog Average:</span>
                    </span>
                    <strong className="text-white">{entry.value.toLocaleString()}</strong>
                  </div>
                );
              }

              const storyObj = stories.find(s => s.id === entry.dataKey);
              const tier = getPriorityTier(entry.value);

              return (
                <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: entry.color }} 
                    />
                    <span className="font-bold text-slate-200">{entry.dataKey}</span>
                    {storyObj && (
                      <span className="text-slate-400 text-[10px] hidden sm:inline">
                        ({storyObj.persona})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-slate-100">{entry.value.toLocaleString()}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${tier.badge}`}>
                      {tier.tier}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-md space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>RICE Score Historical Trajectory</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Sprint 1 → Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Track how continuous discovery and architectural refinement have shaped user story prioritization.
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Story Filter Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedStoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedStoryFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Stories
            </button>
            {stories.map(s => {
              const colorInfo = STORY_COLORS[s.id] || DEFAULT_COLOR;
              const isSelected = selectedStoryFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStoryFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors ${
                    isSelected
                      ? `${colorInfo.bg} ${colorInfo.text} font-bold border`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.id}
                </button>
              );
            })}
          </div>

          {/* Toggle Average Line */}
          <button
            onClick={() => setShowAverage(!showAverage)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showAverage 
                ? 'bg-slate-800 text-slate-200 border-slate-700' 
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Toggle Backlog Average Benchmark"
          >
            Avg Trend
          </button>

          {/* Toggle Thresholds */}
          <button
            onClick={() => setShowThresholds(!showThresholds)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showThresholds 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' 
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Toggle P0/P1 Priority Threshold Guides"
          >
            P0/P1 Gates
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] font-bold uppercase text-slate-500">Top Prioritized Story</span>
          <div className="text-sm font-bold text-purple-300 mt-0.5 flex items-center gap-1.5">
            <span>{stats.highest?.id || 'US-101'}</span>
            <span className="text-xs text-slate-400 font-normal">({stats.highest?.persona || 'Lead'})</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
            Score: {stats.highest?.score.toLocaleString()} (P0 Tier)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] font-bold uppercase text-slate-500">Avg Backlog RICE</span>
          <div className="text-sm font-bold text-slate-200 mt-0.5 font-mono">
            {stats.avgScore.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Cross-team average return
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] font-bold uppercase text-slate-500">Confidence Calibration</span>
          <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>+{stats.growthPct}% ROI Lift</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Telemetry grounding effect
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] font-bold uppercase text-slate-500">Active Modeling State</span>
          <div className="text-sm font-bold text-cyan-300 mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Live Interactive</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Syncs with RICE Calculator
          </div>
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis 
              dataKey="shortLabel" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}`}
              domain={[0, 'dataMax + 800']}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Threshold Reference Lines */}
            {showThresholds && (
              <>
                <ReferenceLine 
                  y={3000} 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  label={{ value: 'P0 Threshold (3,000)', fill: '#10b981', fontSize: 10, position: 'right' }} 
                />
                <ReferenceLine 
                  y={1500} 
                  stroke="#06b6d4" 
                  strokeDasharray="4 4" 
                  label={{ value: 'P1 Strategic (1,500)', fill: '#06b6d4', fontSize: 10, position: 'right' }} 
                />
              </>
            )}

            {/* Backlog Average Trend Line */}
            {showAverage && (selectedStoryFilter === 'ALL') && (
              <Line
                type="monotone"
                dataKey="average"
                name="Backlog Average"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#94a3b8' }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Individual Story Lines */}
            {stories.map((story) => {
              // If filtering by specific story, skip others
              if (selectedStoryFilter !== 'ALL' && selectedStoryFilter !== story.id) {
                return null;
              }

              const colorInfo = STORY_COLORS[story.id] || DEFAULT_COLOR;
              const isHighlight = activeStoryId === story.id || selectedStoryFilter === story.id;

              return (
                <Line
                  key={story.id}
                  type="monotone"
                  dataKey={story.id}
                  name={`${story.id}: ${story.persona}`}
                  stroke={colorInfo.stroke}
                  strokeWidth={isHighlight ? 3.5 : 2.5}
                  dot={{ r: isHighlight ? 5 : 4, fill: colorInfo.stroke, strokeWidth: 1.5, stroke: '#0f172a' }}
                  activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={750}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend / Story Quick Focus Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 font-semibold text-[11px]">Series:</span>
          {stories.map(s => {
            const colorInfo = STORY_COLORS[s.id] || DEFAULT_COLOR;
            const currentScore = s.riceScore || Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2));
            const isSelected = selectedStoryFilter === s.id;

            return (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStoryFilter(selectedStoryFilter === s.id ? 'ALL' : s.id);
                  if (onSelectStory) onSelectStory(s.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  isSelected 
                    ? `${colorInfo.bg} ${colorInfo.text} font-bold shadow-xs scale-105` 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorInfo.stroke }} />
                <span className="font-mono font-bold">{s.id}</span>
                <span className="text-slate-400">({s.persona})</span>
                <span className="font-mono text-slate-200 font-bold ml-1">
                  {currentScore.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Interactive line updates live when tweaking parameters in the RICE Calculator above.</span>
        </div>
      </div>
    </div>
  );
};
