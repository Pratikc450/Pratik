import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  GitMerge, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  BrainCircuit, 
  RefreshCw,
  Workflow,
  Check,
  ShieldCheck,
  Zap,
  BookmarkPlus
} from 'lucide-react';

interface StoryNextBestActionsProps {
  stories: any[];
  productName?: string;
  productContext?: string;
  onAddStoryToBacklog?: (newStory: any) => void;
}

export const StoryNextBestActions: React.FC<StoryNextBestActionsProps> = ({
  stories,
  productName = 'ProductPilot',
  productContext = '',
  onAddStoryToBacklog
}) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [thematicClusters, setThematicClusters] = useState<any[]>([]);
  const [gapAnalysisSummary, setGapAnalysisSummary] = useState<string>('');
  const [addedStoryIds, setAddedStoryIds] = useState<string[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/story-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories,
          productName,
          productContext
        })
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setRecommendations(data.recommendations || []);
        setThematicClusters(data.thematicClusters || []);
        setGapAnalysisSummary(data.gapAnalysisSummary || '');
        setHasFetched(true);
      }
    } catch (err) {
      console.warn('Failed to fetch recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched && stories.length > 0) {
      fetchRecommendations();
    }
  }, [stories.length]);

  const handleAddStory = (rec: any) => {
    if (!rec.suggestedStory || !onAddStoryToBacklog) return;
    onAddStoryToBacklog(rec.suggestedStory);
    setAddedStoryIds(prev => [...prev, rec.suggestedStory.id]);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/30 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                AI Next Best Action & Semantic Dependency System
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates semantic similarity across existing stories to recommend missing architectural dependencies, follow-up enhancements, and high-ROI sprint additions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing Graph...' : 'Re-analyze Dependencies'}</span>
        </button>
      </div>

      {/* Strategic Gap Summary Banner */}
      {gapAnalysisSummary && (
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3 text-xs animate-in fade-in">
          <Workflow className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-300 block mb-0.5">Semantic Backlog Architecture Assessment:</span>
            <p className="text-purple-200/90 leading-relaxed text-[11px]">{gapAnalysisSummary}</p>
          </div>
        </div>
      )}

      {/* Main Recommendations Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Recommended Story Dependencies & Actions ({recommendations.length})</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Derived from semantic graph analysis
          </span>
        </div>

        {loading && recommendations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>Evaluating semantic relationships across backlog stories...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
              const isAdded = addedStoryIds.includes(rec.suggestedStory?.id) || stories.some(s => s.id === rec.suggestedStory?.id);
              const strengthPct = Math.round((rec.dependencyStrength || 0.85) * 100);

              return (
                <div 
                  key={rec.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-3 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Top Type & Strength Badges */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        rec.type === 'DEPENDENCY_PREREQUISITE' 
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                          : rec.type === 'ARCHITECTURAL_SAFEGUARD'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                      }`}>
                        {rec.type.replace(/_/g, ' ')}
                      </span>

                      <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                        {strengthPct}% Semantic Match
                      </span>
                    </div>

                    {/* Source -> Target link */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-purple-300">
                        {rec.sourceStoryId}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-emerald-300">
                        {rec.targetStoryId || 'Backlog Architecture'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        · {rec.title}
                      </span>
                    </div>

                    {/* Reasoning */}
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      "{rec.reasoning}"
                    </p>

                    {/* Suggested Story Preview Card */}
                    {rec.suggestedStory && (
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-purple-300 font-mono">{rec.suggestedStory.id}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            Est. RICE: {rec.suggestedStory.riceScore?.toLocaleString() || 2400}
                          </span>
                        </div>
                        <div className="text-slate-200 text-[11px]">
                          <strong>As a</strong> {rec.suggestedStory.asA}
                        </div>
                        <div className="text-slate-300 text-[11px] line-clamp-2">
                          <strong>I want</strong> {rec.suggestedStory.iWant}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add to Backlog Action Button */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Target Persona: {rec.suggestedStory?.persona || 'User'}
                    </span>
                    <button
                      onClick={() => handleAddStory(rec)}
                      disabled={isAdded}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isAdded
                          ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Added to Backlog</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Backlog</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Thematic Semantic Clusters Section */}
      {thematicClusters.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Thematic Semantic Clusters & Roadmap Coverage</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {thematicClusters.map((cluster, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <span className="font-bold text-purple-300 block">{cluster.clusterName}</span>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {cluster.stories?.map((st: string) => (
                    <span key={st} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-300 font-semibold">
                      {st}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  <strong className="text-slate-300">Gap:</strong> {cluster.identifiedGap}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
