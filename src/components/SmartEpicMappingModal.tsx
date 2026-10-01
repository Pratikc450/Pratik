import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Target, 
  Check, 
  CheckSquare, 
  Square,
  HelpCircle,
  TrendingUp,
  FolderSync
} from 'lucide-react';

interface EpicItem {
  id: string;
  title: string;
  strategicTheme: string;
  horizon: string;
  color: string;
  rationale: string;
}

interface MappingItem {
  storyId: string;
  currentEpicTitle: string;
  suggestedEpicId: string;
  suggestedEpicTitle: string;
  reasoning: string;
  confidence: number;
  isChanged: boolean;
}

interface SmartEpicMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: any[];
  productName?: string;
  productContext?: string;
  onApplyMappings: (mappings: Array<{ storyId: string; newEpicTitle: string }>) => Promise<void> | void;
}

export const SmartEpicMappingModal: React.FC<SmartEpicMappingModalProps> = ({
  isOpen,
  onClose,
  stories,
  productName = 'ProductPilot',
  productContext = '',
  onApplyMappings
}) => {
  const [loading, setLoading] = useState(false);
  const [epics, setEpics] = useState<EpicItem[]>([]);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const fetchEpicSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/suggest-epic-mapping', {
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
        const suggestedEpics: EpicItem[] = data.epics || [];
        const suggestedMappings: MappingItem[] = data.mappings || [];
        
        setEpics(suggestedEpics);
        setMappings(suggestedMappings);
        setSummary(data.summary || '');
        
        // Select all stories that have proposed changes by default
        setSelectedStoryIds(suggestedMappings.map(m => m.storyId));
      }
    } catch (err) {
      console.warn('Failed to fetch epic suggestions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (mappings.length === 0 || stories.length > 0)) {
      fetchEpicSuggestions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSelect = (storyId: string) => {
    setSelectedStoryIds(prev => 
      prev.includes(storyId) ? prev.filter(id => id !== storyId) : [...prev, storyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStoryIds.length === mappings.length) {
      setSelectedStoryIds([]);
    } else {
      setSelectedStoryIds(mappings.map(m => m.storyId));
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const payload = mappings
        .filter(m => selectedStoryIds.includes(m.storyId))
        .map(m => ({
          storyId: m.storyId,
          newEpicTitle: m.suggestedEpicTitle
        }));

      await onApplyMappings(payload);
      setApplySuccess(true);
      setTimeout(() => {
        setApplySuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to apply epic mappings', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  AI Smart Suggest: Epic Mapping System
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini 3.8 Flash Narrative Analysis
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Clusters user stories into cohesive strategic Epics based on user persona intent, acceptance criteria, and system architectural boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEpicSuggestions}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Re-run narrative clustering"
            >
              <RefreshCw className={`w-4 h-4 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
              <p className="text-xs font-medium text-slate-300">
                Evaluating narrative context across {stories.length} stories...
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Gemini is parsing user personas, Gherkin criteria, and architectural dependencies into strategic release epics.
              </p>
            </div>
          ) : (
            <>
              {/* Strategic Summary Banner */}
              {summary && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-purple-300">
                    <Target className="w-3.5 h-3.5" />
                    <span>Strategic Synthesis:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed text-purple-200/90">{summary}</p>
                </div>
              )}

              {/* Identified Strategic Epics Strip */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Proposed Strategic Epics ({epics.length})</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {epics.map((epic) => (
                    <div 
                      key={epic.id} 
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-purple-800/60">
                            {epic.id}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/40">
                            {epic.horizon}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 leading-snug">
                          {epic.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                          "{epic.rationale}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                        Theme: <span className="text-slate-300 font-medium">{epic.strategicTheme}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Story-to-Epic Mappings Table / List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Story-to-Epic Mappings ({mappings.length})</span>
                  </span>

                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {selectedStoryIds.length === mappings.length ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Select All ({mappings.length})</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {mappings.map((m) => {
                    const isSelected = selectedStoryIds.includes(m.storyId);
                    const story = stories.find(s => s.id === m.storyId);
                    const confidencePct = Math.round(m.confidence * 100);

                    return (
                      <div 
                        key={m.storyId}
                        onClick={() => handleToggleSelect(m.storyId)}
                        className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer space-y-2 ${
                          isSelected 
                            ? 'bg-slate-950/90 border-purple-500/50 shadow-xs' 
                            : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(m.storyId)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="font-mono font-bold text-purple-300 text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-850">
                              {m.storyId}
                            </span>
                            <span className="font-semibold text-slate-200">
                              {story?.persona || 'User'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-bold">
                              {confidencePct}% Narrative Fit
                            </span>
                          </div>
                        </div>

                        {/* Current vs Suggested Epic Flow */}
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                          <div className="p-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
                            {m.currentEpicTitle}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <div className="p-1.5 px-2.5 rounded-lg bg-purple-950/60 border border-purple-600/70 text-purple-200 font-bold font-mono text-[11px] shadow-xs">
                            {m.suggestedEpicTitle}
                          </div>
                        </div>

                        {/* Reasoning Narrative */}
                        <p className="text-[11px] text-slate-400 leading-relaxed italic pt-0.5">
                          "{m.reasoning}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            {selectedStoryIds.length} of {mappings.length} story mappings selected to apply
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={isApplying || selectedStoryIds.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-purple-950/60 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {applySuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Epics Applied!</span>
                </>
              ) : isApplying ? (
                <span>Updating Epics...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Apply Suggested Mappings ({selectedStoryIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
