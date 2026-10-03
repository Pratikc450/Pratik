import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Zap,
  Target,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';

interface StoryItem {
  id: string;
  asA: string;
  iWant?: string;
  persona: string;
  riceScore?: number;
  effort?: number;
  reach?: number;
  impact?: number;
}

interface FinancialImpactScatterPlotProps {
  stories: StoryItem[];
  productName?: string;
  onSelectStory?: (id: string) => void;
}

export const FinancialImpactScatterPlot: React.FC<FinancialImpactScatterPlotProps> = ({
  stories,
  productName = 'Product Backlog',
  onSelectStory
}) => {
  const [activeQuadrantFilter, setActiveQuadrantFilter] = useState<'ALL' | 'QUICK_WINS' | 'STRATEGIC' | 'FILL_INS' | 'TIME_SINKS'>('ALL');
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  // Calibrate financial impact data from story reach, impact and persona
  const scatterData = useMemo(() => {
    return stories.map((s, idx) => {
      const effort = s.effort || 2;
      const reach = s.reach || 1000;
      const impact = s.impact || 2;
      const rice = s.riceScore || Math.round(((reach * impact * 0.8) / effort) * 10) / 10;

      // Financial value calculation (ARR in thousands $)
      const valueMultiplier = (s.asA || '').toLowerCase().includes('treasurer') ? 120 :
                              (s.asA || '').toLowerCase().includes('buyer') ? 95 :
                              (s.asA || '').toLowerCase().includes('finance') ? 70 : 50;
      
      const financialValueK = Math.round((reach / 100) * impact * (valueMultiplier / 100));
      const financialValueDollars = financialValueK * 1000;

      // Quadrant classification:
      // Threshold: Effort median = 2.5w, Financial Value median = $150k
      const isHighValue = financialValueK >= 150;
      const isLowEffort = effort <= 2.5;

      let quadrant: 'QUICK_WIN' | 'STRATEGIC_BET' | 'TACTICAL_FILL_IN' | 'TIME_SINK';
      let quadrantLabel = '';
      let color = '';

      if (isHighValue && isLowEffort) {
        quadrant = 'QUICK_WIN';
        quadrantLabel = 'Quick Win (High ROI)';
        color = '#10b981'; // emerald
      } else if (isHighValue && !isLowEffort) {
        quadrant = 'STRATEGIC_BET';
        quadrantLabel = 'Strategic Bet';
        color = '#a855f7'; // purple
      } else if (!isHighValue && isLowEffort) {
        quadrant = 'TACTICAL_FILL_IN';
        quadrantLabel = 'Tactical Fill-In';
        color = '#06b6d4'; // cyan
      } else {
        quadrant = 'TIME_SINK';
        quadrantLabel = 'Time Sink (Low ROI)';
        color = '#f59e0b'; // amber
      }

      // Value-to-Effort Ratio ($k per week of dev)
      const valueToEffortRatio = Math.round((financialValueK / effort) * 10) / 10;

      return {
        id: s.id,
        title: s.iWant ? s.iWant.slice(0, 45) + '...' : s.id,
        asA: s.asA,
        persona: s.persona,
        effort,                  // X-Axis (weeks)
        financialValueK,         // Y-Axis ($k ARR)
        financialValueDollars,
        rice,
        z: Math.max(100, Math.min(800, rice / 4)), // Z-Axis (Bubble size)
        quadrant,
        quadrantLabel,
        color,
        valueToEffortRatio
      };
    });
  }, [stories]);

  const filteredData = useMemo(() => {
    if (activeQuadrantFilter === 'QUICK_WINS') return scatterData.filter(d => d.quadrant === 'QUICK_WIN');
    if (activeQuadrantFilter === 'STRATEGIC') return scatterData.filter(d => d.quadrant === 'STRATEGIC_BET');
    if (activeQuadrantFilter === 'FILL_INS') return scatterData.filter(d => d.quadrant === 'TACTICAL_FILL_IN');
    if (activeQuadrantFilter === 'TIME_SINKS') return scatterData.filter(d => d.quadrant === 'TIME_SINK');
    return scatterData;
  }, [scatterData, activeQuadrantFilter]);

  const quickWins = useMemo(() => {
    return scatterData
      .filter(d => d.quadrant === 'QUICK_WIN')
      .sort((a, b) => b.valueToEffortRatio - a.valueToEffortRatio);
  }, [scatterData]);

  const totalFinancialOpportunity = useMemo(() => {
    return scatterData.reduce((sum, d) => sum + d.financialValueDollars, 0);
  }, [scatterData]);

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-bold text-slate-100 font-mono">{d.id}</span>
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
              style={{ backgroundColor: `${d.color}20`, color: d.color, border: `1px solid ${d.color}40` }}
            >
              {d.quadrantLabel}
            </span>
          </div>
          <div className="text-slate-300 font-bold">{d.title}</div>
          <div className="text-[11px] text-slate-400 font-mono">{d.persona}</div>
          
          <div className="pt-1.5 border-t border-slate-800 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Financial Value (ARR):</span>
              <span>${d.financialValueK.toLocaleString()}k</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>Engineering Effort:</span>
              <span>{d.effort} person-weeks</span>
            </div>
            <div className="flex justify-between text-purple-300 font-bold">
              <span>Value/Effort Ratio:</span>
              <span>${d.valueToEffortRatio}k / week</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800/80">
              <span>RICE Priority Score:</span>
              <span>{d.rice.toLocaleString()} pts</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                AI Financial Impact vs. Effort Correlation Matrix
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                ROI Quadrant Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Plots projected ARR revenue opportunity against engineering effort to surface high-yield Quick Wins and flag Time Sinks.
            </p>
          </div>
        </div>

        {/* Quadrant Filters */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold flex-wrap">
          <button
            onClick={() => setActiveQuadrantFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeQuadrantFilter === 'ALL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Stories ({scatterData.length})
          </button>
          <button
            onClick={() => setActiveQuadrantFilter('QUICK_WINS')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              activeQuadrantFilter === 'QUICK_WINS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quick Wins ({quickWins.length})</span>
          </button>
          <button
            onClick={() => setActiveQuadrantFilter('STRATEGIC')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeQuadrantFilter === 'STRATEGIC' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Strategic Bets
          </button>
          <button
            onClick={() => setActiveQuadrantFilter('TIME_SINKS')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeQuadrantFilter === 'TIME_SINKS' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Time Sinks
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Financial Pipeline</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            ${(totalFinancialOpportunity / 1000).toFixed(0)}k ARR
          </div>
          <span className="text-[10px] text-slate-400">Cumulative value across backlog</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Identified Quick Wins</span>
          <div className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>{quickWins.length} Stories</span>
          </div>
          <span className="text-[10px] text-slate-400">High financial value, ≤2.5w effort</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Highest ROI Multiplier</span>
          <div className="text-xl font-bold font-mono text-purple-300">
            ${quickWins[0]?.valueToEffortRatio || 0}k / week
          </div>
          <span className="text-[10px] text-slate-400 truncate block">
            {quickWins[0]?.id || 'US-101'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Engineering Sizing</span>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {scatterData.reduce((acc, d) => acc + d.effort, 0).toFixed(1)} wks
          </div>
          <span className="text-[10px] text-slate-400">Backlog execution capacity</span>
        </div>
      </div>

      {/* Main Scatter Plot Section */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-slate-200">
              Value vs. Effort Quadrant Plot (Bubble size proportional to RICE score)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Quick Wins
            </span>
            <span className="text-purple-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Strategic Bets
            </span>
            <span className="text-cyan-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Tactical Fill-Ins
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Time Sinks
            </span>
          </div>
        </div>

        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="effort"
                name="Effort (Weeks)"
                unit="w"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                domain={[0, 8]}
              />
              <YAxis
                type="number"
                dataKey="financialValueK"
                name="Financial Value"
                unit="k"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                domain={[0, 500]}
                tickFormatter={(v) => `$${v}k`}
              />
              <ZAxis type="number" dataKey="z" range={[80, 400]} />
              <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />

              {/* Quadrant Divider Reference Lines */}
              <ReferenceLine x={2.5} stroke="#334155" strokeDasharray="4 4" label={{ value: 'Effort Gate (2.5w)', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={150} stroke="#334155" strokeDasharray="4 4" label={{ value: 'Value Threshold ($150k)', fill: '#64748b', fontSize: 10, position: 'insideBottomRight' }} />

              <Scatter
                name="Stories"
                data={filteredData}
                onClick={(e: any) => {
                  if (e && e.id) {
                    setSelectedStory(e);
                    if (onSelectStory) onSelectStory(e.id);
                  }
                }}
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={0.85}
                    stroke="#ffffff"
                    strokeWidth={1}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Wins Spotlight Callout */}
      {quickWins.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Recommended Quick Wins (Immediate Execution Priority):</span>
            </div>
            <span className="font-mono text-emerald-400 text-[11px] font-bold">
              Top Yield / Week
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickWins.slice(0, 3).map((qw) => (
              <div
                key={qw.id}
                onClick={() => onSelectStory && onSelectStory(qw.id)}
                className="p-3 rounded-xl bg-slate-900/90 border border-emerald-900/50 hover:border-emerald-700/80 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                    {qw.id}
                  </span>
                  <span className="font-bold text-emerald-400">
                    ${qw.valueToEffortRatio}k / week
                  </span>
                </div>
                <div className="text-slate-200 text-xs font-bold line-clamp-1">
                  {qw.title}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Effort: {qw.effort}w</span>
                  <span className="text-emerald-300 font-semibold">${qw.financialValueK}k Value</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
