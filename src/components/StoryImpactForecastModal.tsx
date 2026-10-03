import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  DollarSign,
  Users,
  Clock,
  Layers,
  X,
  RotateCcw,
  Zap,
  Flame,
  ShieldAlert
} from 'lucide-react';

interface ImpactForecastData {
  storyId: string;
  storyTitle: string;
  persona: string;
  netStrategicScore: number;
  riskOfInaction: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  ifImplemented: {
    projectedRevenueLift: string;
    retentionLift: string;
    userFrictionReduction: string;
    timeToValueWeeks: string;
    strategicUpside: string;
  };
  ifIgnored: {
    annualCostOfInaction: string;
    churnRiskPercent: string;
    teamFrictionHours: string;
    competitiveExposure: string;
  };
  counterfactualSummary: string;
}

interface StoryImpactForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: any;
  allStories?: any[];
  productId: string;
  productName?: string;
  onSelectStory?: (story: any) => void;
}

export const StoryImpactForecastModal: React.FC<StoryImpactForecastModalProps> = ({
  isOpen,
  onClose,
  story,
  allStories = [],
  productId,
  productName = 'Product',
  onSelectStory
}) => {
  const [forecast, setForecast] = useState<ImpactForecastData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeStoryId, setActiveStoryId] = useState<string>(story?.id || '');

  useEffect(() => {
    if (story) {
      setActiveStoryId(story.id);
      fetchForecast(story);
    }
  }, [story]);

  const fetchForecast = async (targetStory: any) => {
    if (!targetStory) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/impact-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: targetStory,
          productId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.forecast) {
          setForecast(data.forecast);
        }
      }
    } catch (err) {
      console.warn('Failed to load impact forecast', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchStory = (sId: string) => {
    setActiveStoryId(sId);
    const target = allStories.find(s => s.id === sId);
    if (target) {
      if (onSelectStory) onSelectStory(target);
      fetchForecast(target);
    }
  };

  if (!isOpen || !story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-rose-950/40 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  AI Product Impact Forecast: Implemented vs. Ignored
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Counterfactual Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulates potential product trajectory and business outcomes if this capability is prioritized vs. left on the backlog.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Selector Strip if multiple stories exist */}
        {allStories.length > 1 && (
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Select Story:</span>
            {allStories.slice(0, 8).map(s => (
              <button
                key={s.id}
                onClick={() => handleSwitchStory(s.id)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs shrink-0 transition-colors ${
                  activeStoryId === s.id
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        )}

        {/* Active Story Overview Strip */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                {story.id}
              </span>
              <span className="text-sm font-bold text-slate-100">
                {story.asA ? `As a ${story.asA}` : story.id}
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-1">
              <strong>I want</strong> {story.iWant} · <strong className="text-purple-300">So that</strong> {story.soThat}
            </p>
          </div>

          {forecast && (
            <div className="flex items-center gap-3 shrink-0 font-mono">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Net Strategic Score</span>
                <span className="text-lg font-bold text-emerald-400">{forecast.netStrategicScore} / 100</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Risk of Inaction</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  forecast.riskOfInaction === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                  forecast.riskOfInaction === 'HIGH' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                  'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {forecast.riskOfInaction}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Side-by-Side Dual Future View */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="p-16 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-slate-200">
                Simulating economic trajectories for {story.id}...
              </p>
              <p className="text-xs text-slate-400">
                Projecting revenue lift, customer retention, operational friction, and opportunity cost of inaction.
              </p>
            </div>
          ) : forecast ? (
            <div className="space-y-5">
              {/* Dual Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IF IMPLEMENTED (GREEN) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-950/30 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-emerald-200 uppercase tracking-wider">
                        Future A: If Implemented
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Positive Lift
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Projected Revenue / ARR Lift</span>
                        </span>
                        <strong className="text-emerald-400 font-mono text-sm">
                          {forecast.ifImplemented.projectedRevenueLift}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Net Retention Boost</span>
                        </span>
                        <strong className="text-emerald-300 font-mono">
                          {forecast.ifImplemented.retentionLift}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Friction Reduction</span>
                        </span>
                        <strong className="text-emerald-300 font-mono">
                          {forecast.ifImplemented.userFrictionReduction}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Time to Realized Value</span>
                        </span>
                        <strong className="text-slate-200 font-mono">
                          {forecast.ifImplemented.timeToValueWeeks}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-100 text-xs leading-relaxed">
                      <strong className="text-emerald-300 block mb-1">Strategic Upside:</strong>
                      {forecast.ifImplemented.strategicUpside}
                    </div>
                  </div>
                </div>

                {/* IF IGNORED (ROSE / RED) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-rose-950/30 via-slate-900 to-slate-950 border border-rose-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-rose-200 uppercase tracking-wider">
                        Future B: If Ignored
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      Cost of Inaction
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>Annual Cost of Inaction</span>
                        </span>
                        <strong className="text-rose-400 font-mono text-sm">
                          {forecast.ifIgnored.annualCostOfInaction}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span>Customer Churn Risk</span>
                        </span>
                        <strong className="text-rose-300 font-mono">
                          {forecast.ifIgnored.churnRiskPercent}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/30 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Team Manual Workaround Drag</span>
                        </span>
                        <strong className="text-rose-300 font-mono">
                          {forecast.ifIgnored.teamFrictionHours}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-100 text-xs leading-relaxed">
                      <strong className="text-rose-300 block mb-1">Competitive Vulnerability:</strong>
                      {forecast.ifIgnored.competitiveExposure}
                    </div>
                  </div>
                </div>
              </div>

              {/* Counterfactual Summary Card */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-purple-300 font-bold">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Strategic Takeaway:</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {forecast.counterfactualSummary}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Opportunity Cost Simulator · Backlog Telemetry Calibrated
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close Forecast
          </button>
        </div>
      </div>
    </div>
  );
};
