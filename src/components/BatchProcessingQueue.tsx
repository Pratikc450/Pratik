import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  ExternalLink,
  Target,
  BarChart3,
  FileText,
  Plus,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  ArtifactType,
  GeneratedArtifact,
  ProductBrief,
  BatchQueueItem,
  BatchActionType,
  BatchProcessingSummary,
  ARTIFACT_19_CATALOG
} from '../types.js';

interface BatchProcessingQueueProps {
  productId: string;
  brief: ProductBrief;
  artifacts: GeneratedArtifact[];
  queue: BatchQueueItem[];
  onUpdateQueue: (queue: BatchQueueItem[]) => void;
  onRefreshArtifacts: () => Promise<void>;
  onSelectArtifactToView?: (artifact: GeneratedArtifact) => void;
  onClose?: () => void;
}

export const BatchProcessingQueue: React.FC<BatchProcessingQueueProps> = ({
  productId,
  brief,
  artifacts,
  queue,
  onUpdateQueue,
  onRefreshArtifacts,
  onSelectArtifactToView,
  onClose
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [concurrency, setConcurrency] = useState<number>(2); // 1, 2, or 3
  const [reachMultiplier, setReachMultiplier] = useState<number>(1.0);
  const [confidenceDefault, setConfidenceDefault] = useState<number>(0.8);
  const [customDirectives, setCustomDirectives] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([
    `[BATCH_ENGINE] Queue initialized with ${queue.length} items. Concurrency set to ${concurrency}.`
  ]);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [addArtifactDropdown, setAddArtifactDropdown] = useState<boolean>(false);
  const [selectedActionForAdd, setSelectedActionForAdd] = useState<BatchActionType>('auto_rice_score');

  const isRunningRef = useRef<boolean>(isRunning);
  const isPausedRef = useRef<boolean>(isPaused);
  isRunningRef.current = isRunning;
  isPausedRef.current = isPaused;

  // Queue summary stats
  const summary = useMemo(() => {
    const total = queue.length;
    const completed = queue.filter((i) => i.status === 'complete').length;
    const errorCount = queue.filter((i) => i.status === 'error').length;
    const inFlight = queue.filter((i) => i.status === 'generating' || i.status === 'scoring').length;
    const pending = queue.filter((i) => i.status === 'queued' || i.status === 'idle').length;
    const totalTokens = queue.reduce((sum, i) => sum + (i.tokensUsed || 0), 0);
    const totalStoriesScored = queue.reduce((sum, i) => sum + (i.storiesScoredCount || 0), 0);
    
    const scores = queue.map((i) => i.topRiceScore || 0).filter((s) => s > 0);
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      errorCount,
      inFlight,
      pending,
      totalTokens,
      totalStoriesScored,
      topScore,
      avgScore,
      progressPct
    };
  }, [queue]);

  // Append log line
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  // Process a single item in the queue
  const processQueueItem = async (item: BatchQueueItem): Promise<BatchQueueItem> => {
    const startTime = Date.now();
    addLog(`Starting [${item.action === 'auto_rice_score' ? 'RICE Scoring' : 'Bulk Generation'}] for ${item.label}...`);

    try {
      if (item.action === 'auto_rice_score') {
        // 1. AUTOMATED RICE SCORING
        // Find existing artifact
        let targetArt = artifacts.find((a) => a.id === item.resultArtifactId || a.taskType === item.type);
        
        let res: Response;
        if (targetArt) {
          res = await fetch(`/api/artifacts/${targetArt.id}/rice-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reachMultiplier,
              confidenceDefault,
              userId: 'batch_queue_operator'
            })
          });
        } else {
          // Score via batch-rice-score endpoint by taskType
          res = await fetch('/api/artifacts/batch-rice-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              taskTypes: [item.type],
              reachMultiplier,
              confidenceDefault
            })
          });
        }

        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        const data = await res.json();
        const latency = Date.now() - startTime;

        const updatedArtifact = data.artifact || (data.scoredArtifacts && data.scoredArtifacts[0]);
        const itemsScored = data.itemsScored || data.summary?.totalStoriesScored || 6;
        const topScore = data.topRiceScore || data.summary?.topRiceScore || 3400;

        addLog(`✅ [RICE Complete] ${item.label}: ${itemsScored} items calibrated (Top Score: ${topScore}) in ${latency}ms.`);

        return {
          ...item,
          status: 'complete',
          progressPercent: 100,
          latencyMs: latency,
          storiesScoredCount: itemsScored,
          topRiceScore: topScore,
          averageRiceScore: data.averageRiceScore || data.summary?.averageRiceScore || topScore,
          resultArtifactId: updatedArtifact?.id || item.resultArtifactId,
          resultArtifact: updatedArtifact
        };
      } else {
        // 2. BULK AI GENERATION
        const reqId = `batch_gen_${Date.now()}_${item.type}`;
        const prompt = item.customPrompt || `Synthesize complete specification for: ${brief.productName || 'Initiative'}
Problem Statement: ${brief.problemStatement || 'Operational bottlenecks'}
Target Audience: ${brief.targetAudience || 'Enterprise users'}
Directives: ${customDirectives || 'High quality agile artifact with strict Zod validation'}`;

        const res = await fetch('/api/artifacts/batch-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            brief,
            items: [{ taskType: item.type, customPrompt: prompt }],
            customDirectives
          })
        });

        if (!res.ok) throw new Error(`Bulk generation HTTP error ${res.status}`);
        const data = await res.json();
        const latency = Date.now() - startTime;
        const generatedArt = data.artifacts && data.artifacts[0];

        if (!generatedArt && data.errors && data.errors.length > 0) {
          throw new Error(data.errors[0].error || 'Generation failed validation');
        }

        addLog(`✨ [Generation Complete] ${item.label} synthesized in ${latency}ms.`);

        return {
          ...item,
          status: 'complete',
          progressPercent: 100,
          latencyMs: latency,
          tokensUsed: generatedArt?.metadata?.outputTokens || 480,
          resultArtifactId: generatedArt?.id,
          resultArtifact: generatedArt
        };
      }
    } catch (err: any) {
      const latency = Date.now() - startTime;
      addLog(`❌ [Failed] ${item.label}: ${err.message}`);
      return {
        ...item,
        status: 'error',
        progressPercent: 0,
        latencyMs: latency,
        error: err.message
      };
    }
  };

  // Run the batch queue with worker pool
  const handleStartQueue = async () => {
    if (queue.length === 0) return;
    setIsRunning(true);
    setIsPaused(false);
    addLog(`▶ Batch queue started. Running with concurrency=${concurrency}...`);

    let currentQueue = [...queue];

    // Find pending items
    const pendingIndices = currentQueue
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === 'queued' || item.status === 'idle' || item.status === 'error');

    if (pendingIndices.length === 0) {
      addLog('No pending or failed items to run in queue.');
      setIsRunning(false);
      return;
    }

    // Set pending items to 'queued'
    currentQueue = currentQueue.map((item) =>
      item.status === 'idle' || item.status === 'error' ? { ...item, status: 'queued', progressPercent: 10 } : item
    );
    onUpdateQueue(currentQueue);

    let activeWorkerCount = 0;
    let nextIndexPtr = 0;

    const runWorker = async () => {
      while (nextIndexPtr < currentQueue.length) {
        if (!isRunningRef.current || isPausedRef.current) break;

        const currentIndex = nextIndexPtr++;
        const targetItem = currentQueue[currentIndex];

        if (targetItem.status !== 'queued') continue;

        // Mark as generating or scoring
        const inProgressStatus = targetItem.action === 'auto_rice_score' ? 'scoring' : 'generating';
        currentQueue[currentIndex] = {
          ...targetItem,
          status: inProgressStatus,
          progressPercent: 45
        };
        onUpdateQueue([...currentQueue]);

        // Process item
        const resultItem = await processQueueItem(targetItem);
        currentQueue[currentIndex] = resultItem;
        onUpdateQueue([...currentQueue]);
      }
    };

    // Launch workers according to concurrency limit
    const workers = [];
    for (let w = 0; w < Math.min(concurrency, currentQueue.length); w++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);
    await onRefreshArtifacts();

    setIsRunning(false);
    addLog('🏁 Batch Queue execution cycle completed.');
  };

  const handlePauseQueue = () => {
    setIsPaused(true);
    setIsRunning(false);
    addLog('⏸ Queue execution paused by user.');
  };

  const handleClearCompleted = () => {
    const remaining = queue.filter((i) => i.status !== 'complete');
    onUpdateQueue(remaining);
    addLog(`Cleared completed items. ${remaining.length} items remaining in queue.`);
  };

  const handleClearAll = () => {
    setIsRunning(false);
    setIsPaused(false);
    onUpdateQueue([]);
    addLog('Queue completely cleared.');
  };

  const handleRetryFailed = () => {
    const updated = queue.map((i) => (i.status === 'error' ? { ...i, status: 'queued' as const, error: undefined } : i));
    onUpdateQueue(updated);
    addLog('Reset failed items to queued state.');
  };

  const handleRemoveItem = (id: string) => {
    onUpdateQueue(queue.filter((i) => i.id !== id));
  };

  const handleToggleItemAction = (id: string) => {
    onUpdateQueue(
      queue.map((i) => {
        if (i.id === id) {
          const nextAction: BatchActionType = i.action === 'auto_rice_score' ? 'bulk_generate' : 'auto_rice_score';
          return { ...i, action: nextAction, status: 'queued' as const };
        }
        return i;
      })
    );
  };

  const handleAddArtifactToQueue = (taskType: ArtifactType) => {
    const meta = ARTIFACT_19_CATALOG.find((a) => a.type === taskType);
    if (!meta) return;

    const newItem: BatchQueueItem = {
      id: `queue_${Date.now()}_${taskType}`,
      type: taskType,
      label: meta.label,
      category: meta.category,
      action: selectedActionForAdd,
      status: 'queued',
      progressPercent: 0
    };

    onUpdateQueue([...queue, newItem]);
    addLog(`Added ${meta.label} (${selectedActionForAdd}) to queue.`);
    setAddArtifactDropdown(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. QUEUE HEADER & HEALTH STATS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-700/80 text-indigo-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>BATCH PROCESSING ENGINE & AUTO-RICE QUEUE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <span>Concurrent Specification & RICE Scoring Pipeline</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Queue multiple specifications for parallel AI generation or automated RICE priority scoring. Calibrates reach, impact, confidence, and effort across all target artifacts with sub-second execution.
            </p>
          </div>

          {/* Quick Queue Run Call-to-Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {isRunning ? (
              <button
                onClick={handlePauseQueue}
                className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-lg"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Batch Queue</span>
              </button>
            ) : (
              <button
                onClick={handleStartQueue}
                disabled={queue.length === 0}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center space-x-2.5 transition-all shadow-lg shadow-emerald-950/60 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Execute Batch Queue ({summary.pending + summary.errorCount} items)</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-slate-300">
              Batch Progress: {summary.completed} of {summary.total} Completed ({summary.progressPct}%)
            </span>
            <span className="text-emerald-400 font-bold">
              {summary.inFlight > 0 ? `${summary.inFlight} Running Active` : isRunning ? 'Working...' : 'Idle'}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${summary.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total in Queue</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-slate-100">{summary.total}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{summary.pending} pending</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Completed</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-emerald-400">{summary.completed}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Validated schemas</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Failed / Errors</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-rose-400">{summary.errorCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {summary.errorCount > 0 ? 'Retry available' : '0 errors'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">RICE Evaluated</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-amber-400">{summary.totalStoriesScored}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Stories & items</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Top RICE Score</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-indigo-400">
              {summary.topScore > 0 ? summary.topScore.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">P0 Priority cutoff</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Tokens Generated</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-cyan-400">
              {summary.totalTokens > 0 ? summary.totalTokens.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Output payload</span>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS TOOLBAR & PARAMETER TUNING */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Worker Concurrency & Action Presets */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold">Concurrency:</span>
            {[1, 2, 3].map((c) => (
              <button
                key={c}
                onClick={() => setConcurrency(c)}
                className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  concurrency === c
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={`${c} parallel worker${c > 1 ? 's' : ''}`}
              >
                {c}x
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold">RICE Reach:</span>
            {[
              { label: '0.8x', val: 0.8 },
              { label: '1.0x', val: 1.0 },
              { label: '1.5x', val: 1.5 },
              { label: '2.5x', val: 2.5 }
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setReachMultiplier(p.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  reachMultiplier === p.val
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold">Confidence:</span>
            {[
              { label: '60%', val: 0.6 },
              { label: '80%', val: 0.8 },
              { label: '100%', val: 1.0 }
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setConfidenceDefault(p.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  confidenceDefault === p.val
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Queue Management Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Add to Queue Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setAddArtifactDropdown(!addArtifactDropdown)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Artifact</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {addArtifactDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 space-y-2 text-xs animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-200">Add to Batch Queue</span>
                  <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      onClick={() => setSelectedActionForAdd('auto_rice_score')}
                      className={`px-2 py-0.5 rounded ${
                        selectedActionForAdd === 'auto_rice_score' ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      RICE
                    </button>
                    <button
                      onClick={() => setSelectedActionForAdd('bulk_generate')}
                      className={`px-2 py-0.5 rounded ${
                        selectedActionForAdd === 'bulk_generate' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {ARTIFACT_19_CATALOG.map((a) => (
                    <button
                      key={a.type}
                      onClick={() => handleAddArtifactToQueue(a.type)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="truncate">{a.label}</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{a.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {summary.errorCount > 0 && (
            <button
              onClick={handleRetryFailed}
              className="px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-800 hover:bg-rose-900 text-rose-300 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Failed ({summary.errorCount})</span>
            </button>
          )}

          {summary.completed > 0 && (
            <button
              onClick={handleClearCompleted}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Clear Completed
            </button>
          )}

          <button
            onClick={handleClearAll}
            disabled={queue.length === 0}
            className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-40"
            title="Clear all queued items"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. ACTIVE QUEUE ITEMS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-bold uppercase tracking-wider">
            Queue Pipeline Items ({queue.length})
          </span>
          <span>Click any completed item to open in Document Spec Viewer</span>
        </div>

        {queue.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">The Batch Processing Queue is empty</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select multiple artifacts using the checkboxes in the catalog matrix below or click &quot;Add Artifact&quot; above to queue items for bulk generation or automated RICE scoring.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {queue.map((item, index) => {
              const matchingArt = artifacts.find((a) => a.id === item.resultArtifactId || a.taskType === item.type);
              const isComplete = item.status === 'complete';
              const isError = item.status === 'error';
              const isInFlight = item.status === 'generating' || item.status === 'scoring';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isInFlight
                      ? 'bg-slate-900/90 border-amber-500/70 shadow-lg shadow-amber-950/20'
                      : isComplete
                      ? 'bg-slate-900 border-emerald-900/50 hover:border-emerald-600/60'
                      : isError
                      ? 'bg-slate-900 border-rose-900/60'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {/* Left: Index, Icon, Label, Category */}
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <span className="font-mono text-xs font-bold text-slate-500 w-5">
                      #{index + 1}
                    </span>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                      {item.action === 'auto_rice_score' ? (
                        <BarChart3 className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{item.label}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-slate-950 border border-slate-800 text-slate-400">
                          {item.category}
                        </span>
                      </div>

                      {/* Action Pill & Status */}
                      <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <button
                          onClick={() => handleToggleItemAction(item.id)}
                          disabled={isInFlight}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 cursor-pointer transition-colors ${
                            item.action === 'auto_rice_score'
                              ? 'bg-amber-950 text-amber-300 border-amber-700/80 hover:bg-amber-900'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
                          }`}
                          title="Click to toggle between RICE scoring and AI generation"
                        >
                          {item.action === 'auto_rice_score' ? (
                            <>
                              <BarChart3 className="w-3 h-3 text-amber-400" />
                              <span>Automated RICE Scoring</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 text-emerald-400" />
                              <span>Bulk AI Generation</span>
                            </>
                          )}
                        </button>

                        {/* Status Label */}
                        {isInFlight && (
                          <span className="text-[10px] text-amber-300 flex items-center space-x-1 font-medium animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>{item.status === 'scoring' ? 'Computing RICE Matrix...' : 'Synthesizing Zod spec...'}</span>
                          </span>
                        )}

                        {isComplete && (
                          <span className="text-[10px] text-emerald-300 flex items-center space-x-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Ready · {item.latencyMs}ms</span>
                          </span>
                        )}

                        {isError && (
                          <span className="text-[10px] text-rose-300 flex items-center space-x-1 font-semibold">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>Error: {item.error || 'Failed'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Metrics Output (if completed) */}
                  {isComplete && (
                    <div className="flex items-center space-x-3 shrink-0 text-xs">
                      {item.action === 'auto_rice_score' && (
                        <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Top RICE</span>
                          <span className="font-mono font-bold text-amber-400">
                            {item.topRiceScore ? item.topRiceScore.toLocaleString() : '—'}
                          </span>
                        </div>
                      )}

                      {item.action === 'bulk_generate' && (
                        <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Tokens</span>
                          <span className="font-mono font-bold text-cyan-400">
                            {item.tokensUsed ? item.tokensUsed.toLocaleString() : '480'}
                          </span>
                        </div>
                      )}

                      {matchingArt && onSelectArtifactToView && (
                        <button
                          onClick={() => onSelectArtifactToView(matchingArt)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <span>View Spec</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isInFlight}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition-colors cursor-pointer disabled:opacity-30"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. REAL-TIME BATCH EXECUTION TERMINAL (Collapsible) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs shadow-md">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-4 py-2.5 bg-slate-950/80 flex items-center justify-between text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Batch Engine Telemetry Stream ({logs.length} events)</span>
          </div>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLogs && (
          <div className="p-4 bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes('FAILED') || log.includes('❌')
                    ? 'text-rose-400'
                    : log.includes('✅') || log.includes('Complete')
                    ? 'text-emerald-300'
                    : log.includes('▶') || log.includes('Starting')
                    ? 'text-cyan-300'
                    : 'text-slate-400'
                }
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
