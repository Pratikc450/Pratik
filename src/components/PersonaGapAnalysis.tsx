import React, { useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Layers,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface StoryItem {
  id: string;
  asA: string;
  iWant?: string;
  persona: string;
  riceScore?: number;
  effort?: number;
}

interface PersonaGapAnalysisProps {
  stories: StoryItem[];
  productName?: string;
  onNavigateTab?: (tab: string) => void;
}

const DEFAULT_DEFINED_PERSONAS = [
  {
    name: 'Wholesale Buyer / Procurement Lead',
    role: 'Primary Buyer',
    strategicWeight: 40,
    targetCoverageMin: 35,
    painPoint: 'Cart abandonment due to manual tax and credit validation bottlenecks.'
  },
  {
    name: 'Operations & Finance Manager',
    role: 'Operational Integrator',
    strategicWeight: 35,
    targetCoverageMin: 30,
    painPoint: 'Dual ledger reconciliation and disjointed invoice matching.'
  },
  {
    name: 'Accounts Receivable & Risk Analyst',
    role: 'Risk Guardian',
    strategicWeight: 25,
    targetCoverageMin: 25,
    painPoint: 'High false-positive fraud declines and manual D&B background checks.'
  }
];

export const PersonaGapAnalysis: React.FC<PersonaGapAnalysisProps> = ({
  stories,
  productName = 'Product Backlog',
  onNavigateTab
}) => {
  const personaStats = useMemo(() => {
    const totalStories = stories.length || 1;
    
    // Group stories by persona
    const countMap: Record<string, { stories: StoryItem[]; effort: number }> = {};
    stories.forEach(s => {
      const p = s.persona || 'General User';
      if (!countMap[p]) countMap[p] = { stories: [], effort: 0 };
      countMap[p].stories.push(s);
      countMap[p].effort += (s.effort || 2);
    });

    return DEFAULT_DEFINED_PERSONAS.map(def => {
      // Find matching group or fuzzily match
      const matchedKey = Object.keys(countMap).find(k => 
        k.toLowerCase().includes(def.name.toLowerCase().split(' ')[0]) ||
        def.name.toLowerCase().includes(k.toLowerCase().split(' ')[0])
      );

      const matched = matchedKey ? countMap[matchedKey] : { stories: [], effort: 0 };
      const storyCount = matched.stories.length;
      const coveragePct = Math.round((storyCount / totalStories) * 100);
      const deficitDelta = coveragePct - def.targetCoverageMin;
      
      const gapSeverity: 'CRITICAL' | 'MODERATE' | 'SUFFICIENT' = 
        deficitDelta <= -15 ? 'CRITICAL' :
        deficitDelta < 0 ? 'MODERATE' : 'SUFFICIENT';

      return {
        name: def.name,
        shortName: def.name.split('/')[0].trim(),
        role: def.role,
        storyCount,
        effort: Math.round(matched.effort * 10) / 10,
        coveragePct,
        targetCoverageMin: def.targetCoverageMin,
        deficitDelta,
        gapSeverity,
        painPoint: def.painPoint,
        storiesList: matched.stories
      };
    });
  }, [stories]);

  const criticalGaps = personaStats.filter(p => p.gapSeverity === 'CRITICAL');
  const moderateGaps = personaStats.filter(p => p.gapSeverity === 'MODERATE');

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Persona Gap & Coverage Analysis
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                Coverage Deficit Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates user story distribution across defined personas to highlight neglected customer segments requiring development focus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {criticalGaps.length > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{criticalGaps.length} Critical Deficit Segment</span>
            </span>
          )}
        </div>
      </div>

      {/* Persona Coverage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {personaStats.map((item, idx) => (
          <div 
            key={idx}
            className={`p-4 rounded-xl border transition-all space-y-3 ${
              item.gapSeverity === 'CRITICAL'
                ? 'bg-rose-950/20 border-rose-900/60 shadow-lg shadow-rose-950/20'
                : item.gapSeverity === 'MODERATE'
                ? 'bg-amber-950/20 border-amber-900/60'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  {item.role}
                </span>
                <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                  {item.name}
                </h4>
              </div>

              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                item.gapSeverity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                item.gapSeverity === 'MODERATE' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {item.gapSeverity === 'CRITICAL' ? 'CRITICAL GAP' :
                 item.gapSeverity === 'MODERATE' ? 'MODERATE DEFICIT' : 'WELL COVERED'}
              </span>
            </div>

            {/* Coverage vs Target Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Backlog Coverage</span>
                <span className={`font-bold ${item.coveragePct < item.targetCoverageMin ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {item.coveragePct}% (Target: {item.targetCoverageMin}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full rounded-full transition-all ${
                    item.gapSeverity === 'CRITICAL' ? 'bg-rose-500' :
                    item.gapSeverity === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, item.coveragePct * 2)}%` }}
                />
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Mapped Stories</span>
                <span className="font-bold text-slate-200">{item.storyCount} of {stories.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Engineering Sizing</span>
                <span className="font-bold text-cyan-300">{item.effort} person-weeks</span>
              </div>
            </div>

            {/* Pain Point Context */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 leading-snug">
              <span className="font-bold text-slate-400 block text-[10px] uppercase">Unresolved Friction:</span>
              {item.painPoint}
            </div>
          </div>
        ))}
      </div>

      {/* Coverage Comparison Chart */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-slate-200">
              Story Allocation vs. Strategic Benchmark Target (%)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Target benchmark: Minimum 25–35% coverage
          </span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={personaStats}
              margin={{ top: 15, right: 25, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="shortName" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-1 font-mono">
                        <div className="font-bold text-slate-200 font-sans border-b border-slate-800 pb-1">{d.name}</div>
                        <div className="text-purple-300">Coverage: {d.coveragePct}% ({d.storyCount} stories)</div>
                        <div className="text-emerald-400">Target Minimum: {d.targetCoverageMin}%</div>
                        <div className="text-cyan-300">Engineering Effort: {d.effort} weeks</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="coveragePct" name="Actual Coverage (%)" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="targetCoverageMin" name="Target Minimum Benchmark (%)" fill="#334155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
