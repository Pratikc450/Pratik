import React, { useState, useEffect, useMemo } from 'react';
import {
  ArtifactType,
  GeneratedArtifact,
  ProductBrief,
  ARTIFACT_19_CATALOG,
  ArtifactCategory,
  BatchQueueItem,
  BatchActionType
} from '../types.js';
import { PipelineStepper, PipelineStep } from './PipelineStepper.js';
import { DocumentViewer } from './DocumentViewer.js';
import { TokenCostEstimator } from './TokenCostEstimator.js';
import { BatchProcessingQueue } from './BatchProcessingQueue.js';
import {
  Sparkles,
  Layers,
  FileText,
  Compass,
  AlertCircle,
  Users,
  ListTodo,
  CheckSquare,
  FileCheck2,
  Milestone,
  Target,
  Swords,
  Grid,
  Footprints,
  SlidersHorizontal,
  BarChart3,
  Calendar,
  Rocket,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Copy,
  Zap,
  ChevronRight,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Clock,
  Send,
  History,
  RotateCcw,
  X,
  Plus,
  Maximize2
} from 'lucide-react';
import { ArtifactVersionHistoryModal } from './ArtifactVersionHistoryModal.js';
import { ArtifactVersionHistoryViewer } from './ArtifactVersionHistoryViewer.js';

interface GenerationWorkbenchProps {
  selectedProductId: string;
  onApproveArtifact: (id: string) => Promise<void>;
  isApproving: boolean;
  onSelectProduct?: (id: string) => void;
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: 1, label: 'Context Gather', description: 'Filtered DB records', status: 'IDLE' },
  { id: 2, label: 'Prompt Build', description: 'Versioned template', status: 'IDLE' },
  { id: 3, label: 'Model Stream', description: 'Structured JSON', status: 'IDLE' },
  { id: 4, label: 'Zod Validation', description: 'Falsifiable check', status: 'IDLE' },
  { id: 5, label: 'Repair Pass', description: 'Single repair attempt', status: 'IDLE' },
  { id: 6, label: 'Persist Draft', description: 'DRAFT state & telemetry', status: 'IDLE' },
  { id: 7, label: 'Render Prose', description: 'Validated output', status: 'IDLE' },
];

const PRESETS: Array<{ label: string; icon: string; brief: ProductBrief }> = [
  {
    label: 'Fintech B2B Trade Credit',
    icon: '💳',
    brief: {
      productName: 'PayFlow: Instant B2B Trade Credit Checkout',
      problemStatement: 'Wholesale buyers wait 3-5 business days for manual trade credit approval, causing 42% cart abandonment and massive cash flow friction for SMB suppliers.',
      targetAudience: 'Wholesale Buyers, Procurement Managers, Enterprise B2B Merchants, Credit Risk Officers',
      proposedSolution: 'Instant pre-approved Net-30 trade credit checkout modal with real-time EIN risk scoring, one-click disbursement, and automated ERP reconciliation.',
      strategicContext: 'Become the default checkout standard for high-ticket B2B e-commerce transactions; compress approval latency to sub-second.',
      industry: 'Fintech / B2B Payments'
    }
  },
  {
    label: 'AI Telehealth Triage',
    icon: '🩺',
    brief: {
      productName: 'MedPulse: Autonomous Remote Patient Intake & Triage',
      problemStatement: 'Rural clinics and urgent cares suffer 6+ hour patient wait times and severe clinician burnout due to repetitive manual symptom intake and administrative EHR charting.',
      targetAudience: 'Triage Nurses, ER Attending Physicians, Rural Clinic Patients, Hospital Operations Directors',
      proposedSolution: 'Voice-first multimodal conversational intake tablet with automated vitals severity scoring, EHR clinical summary drafting, and high-risk physician paging.',
      strategicContext: 'Reduce ER non-emergent intake time from 45 min to under 3 min while guaranteeing zero missed acute cardiac or sepsis indicators.',
      industry: 'Healthcare / MedTech'
    }
  },
  {
    label: 'DevOps Telemetry Mesh',
    icon: '⚡',
    brief: {
      productName: 'TraceGrid: Distributed Microservice Observability Mesh',
      problemStatement: 'Engineering teams take an average of 4.2 hours to diagnose silent cascading microservice failures and latency regressions across hybrid multi-cloud Kubernetes clusters.',
      targetAudience: 'Site Reliability Engineers, Platform Architects, Backend Leads, VP of Infrastructure',
      proposedSolution: 'Kernel eBPF auto-instrumentation telemetry agent, real-time causal graph mapping, probabilistic root-cause localization, and automated canary rollback.',
      strategicContext: 'Reduce Mean Time to Detection (MTTD) to sub-15 seconds with zero manual code instrumentation or telemetry sampling degradation.',
      industry: 'Developer Tools / Infrastructure'
    }
  },
  {
    label: 'Autonomous Freight Logistics',
    icon: '🚚',
    brief: {
      productName: 'LogiRoute: Dynamic Real-Time Freight Dispatch',
      problemStatement: 'Long-haul freight carriers lose 28% gross margin due to empty return backhauls, volatile diesel toll routing, and manual phone broker haggling.',
      targetAudience: 'Fleet Dispatchers, Independent Owner-Operators, Freight Brokers, Logistics Operations VPs',
      proposedSolution: 'Algorithmic spot-load matching engine, real-time dynamic weather & toll route optimization, and digital geofenced bill-of-lading checkout.',
      strategicContext: 'Eliminate 85% of empty backhaul miles and increase fleet asset utilization to 98.5%.',
      industry: 'Logistics & Supply Chain'
    }
  }
];

export const GenerationWorkbench: React.FC<GenerationWorkbenchProps> = ({
  selectedProductId,
  onApproveArtifact,
  isApproving,
}) => {
  // Mode toggle: 19-Artifact Autonomous Suite vs. Single-Artifact Lab vs. Batch Processing Queue
  const [workbenchMode, setWorkbenchMode] = useState<'suite' | 'single' | 'batch'>('suite');

  // Multi-selection in Catalog & Batch Processing Queue states
  const [selectedCatalogCards, setSelectedCatalogCards] = useState<Set<ArtifactType>>(new Set());
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);

  // Product Brief state (initialized with first rich preset)
  const [brief, setBrief] = useState<ProductBrief>(PRESETS[0].brief);

  // Selected artifact types to generate (defaults to all 19)
  const [selectedTypes, setSelectedTypes] = useState<ArtifactType[]>(
    ARTIFACT_19_CATALOG.map((a) => a.type)
  );

  // Suite generation states
  const [isSuiteGenerating, setIsSuiteGenerating] = useState(false);
  const [suiteProgress, setSuiteProgress] = useState<{
    completed: number;
    total: number;
    currentTask?: ArtifactType;
    statusMap: Record<ArtifactType, 'idle' | 'generating' | 'validating' | 'complete' | 'error'>;
  }>({
    completed: 0,
    total: 19,
    statusMap: ARTIFACT_19_CATALOG.reduce((acc, a) => ({ ...acc, [a.type]: 'idle' }), {} as any)
  });

  // Loaded artifacts in the workspace
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<GeneratedArtifact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Single-artifact lab states
  const [singleTaskType, setSingleTaskType] = useState<ArtifactType>('PRD');
  const [singlePrompt, setSinglePrompt] = useState(
    'Generate comprehensive PRD for our B2B instant trade credit underwriting checkout modal and risk-scoring engine.'
  );
  const [isSingleGenerating, setIsSingleGenerating] = useState(false);
  const [singlePipelineSteps, setSinglePipelineSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [singleStepIndex, setSingleStepIndex] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Version History & Spec Viewer states
  const [workbenchViewerTab, setWorkbenchViewerTab] = useState<'spec' | 'history'>('spec');
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [historyTargetArtifact, setHistoryTargetArtifact] = useState<GeneratedArtifact | null>(null);
  const [isRevertingArtifact, setIsRevertingArtifact] = useState(false);
  const [workbenchNotification, setWorkbenchNotification] = useState<string | null>(null);

  // Fetch product artifacts
  const loadArtifacts = async () => {
    if (!selectedProductId) return;
    try {
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setArtifacts(data.artifacts || []);
          if (data.artifacts && data.artifacts.length > 0 && !activeArtifact) {
            // Default to latest PRD or first artifact
            const prd = data.artifacts.find((a: GeneratedArtifact) => a.taskType === 'PRD');
            setActiveArtifact(prd || data.artifacts[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load artifacts', err);
    }
  };

  // Handle reverting artifact to previous version iteration
  const handleRevertArtifact = async (artifactId: string, targetVersion: number) => {
    setIsRevertingArtifact(true);
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetVersion,
          userId: 'senior_pm',
          reason: `Rollback to iteration v${targetVersion} via GenerationWorkbench version history viewer`
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.artifact) {
          // Update local artifacts list
          setArtifacts((prev) => prev.map((a) => (a.id === artifactId ? data.artifact : a)));
          if (activeArtifact?.id === artifactId) {
            setActiveArtifact(data.artifact);
          }
          if (historyTargetArtifact?.id === artifactId) {
            setHistoryTargetArtifact(data.artifact);
          }
          setWorkbenchNotification(`✨ Successfully restored ${data.artifact.taskType.replace(/_/g, ' ')} to Version v${targetVersion} (now v${data.newVersion})!`);
          setTimeout(() => setWorkbenchNotification(null), 5000);
        }
      }
    } catch (err) {
      console.error('Failed to revert artifact', err);
    } finally {
      setIsRevertingArtifact(false);
    }
  };

  useEffect(() => {
    loadArtifacts();
  }, [selectedProductId]);

  // Handle preset selection
  const handleSelectPreset = (presetBrief: ProductBrief) => {
    setBrief(presetBrief);
    setSinglePrompt(`Generate specification for ${presetBrief.productName}: ${presetBrief.problemStatement}`);
  };

  // Toggle single artifact selection for suite generation
  const handleToggleArtifactSelection = (type: ArtifactType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSelectAll = () => {
    setSelectedTypes(ARTIFACT_19_CATALOG.map((a) => a.type));
  };

  const handleDeselectAll = () => {
    setSelectedTypes([]);
  };

  // Batch Multi-Select Handlers
  const handleToggleCardSelection = (type: ArtifactType) => {
    setSelectedCatalogCards((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleSelectAllCatalog = () => {
    setSelectedCatalogCards(new Set(ARTIFACT_19_CATALOG.map((a) => a.type)));
  };

  const handleClearCatalogSelection = () => {
    setSelectedCatalogCards(new Set());
  };

  const handleSelectUngenerated = () => {
    const generatedTypes = new Set(artifacts.map((a) => a.taskType));
    const ungen = ARTIFACT_19_CATALOG.filter((a) => !generatedTypes.has(a.type)).map((a) => a.type);
    setSelectedCatalogCards(new Set(ungen));
  };

  const handleSelectRiceTargets = () => {
    const targets: ArtifactType[] = ['FEATURE_PRIORITIZATION', 'USER_STORIES', 'EPICS', 'FEATURES', 'ROADMAP', 'PRD'];
    setSelectedCatalogCards(new Set(targets));
  };

  const handleEnqueueSelected = (action: BatchActionType, switchToQueue: boolean = true) => {
    if (selectedCatalogCards.size === 0) return;
    const newItems: BatchQueueItem[] = [];

    selectedCatalogCards.forEach((taskType) => {
      const meta = ARTIFACT_19_CATALOG.find((a) => a.type === taskType);
      const existingArt = artifacts.find((a) => a.taskType === taskType);
      if (meta) {
        newItems.push({
          id: `queue_${Date.now()}_${taskType}_${Math.random().toString(36).substring(2, 6)}`,
          type: taskType,
          label: meta.label,
          category: meta.category,
          action,
          status: 'queued',
          progressPercent: 0,
          resultArtifactId: existingArt?.id
        });
      }
    });

    setBatchQueue((prev) => [...prev, ...newItems]);
    setWorkbenchNotification(`✨ Added ${newItems.length} artifacts to Batch Queue (${action === 'auto_rice_score' ? 'Automated RICE Scoring' : 'Bulk Generation'})!`);
    setTimeout(() => setWorkbenchNotification(null), 4000);

    if (switchToQueue) {
      setWorkbenchMode('batch');
    }
  };

  // ==========================================
  // RUN 19-ARTIFACT AUTONOMOUS GENERATION SUITE
  // ==========================================
  const handleGenerateSuite = async () => {
    if (!brief.productName || !brief.problemStatement) return;
    if (selectedTypes.length === 0) return;

    setIsSuiteGenerating(true);
    setErrorMsg(null);
    setExecutionLogs([`[NAVIGATOR] Initiating 19-Artifact Autonomous Generation for: "${brief.productName}"`]);

    const newStatusMap: Record<ArtifactType, 'idle' | 'generating' | 'validating' | 'complete' | 'error'> = {} as any;
    ARTIFACT_19_CATALOG.forEach((a) => {
      newStatusMap[a.type] = selectedTypes.includes(a.type) ? 'idle' : 'idle';
    });

    setSuiteProgress({
      completed: 0,
      total: selectedTypes.length,
      statusMap: newStatusMap
    });

    try {
      // Use SSE streaming endpoint for real-time artifact progress updates
      const response = await fetch('/api/brief/generate-suite/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: {
            ...brief,
            productId: selectedProductId
          },
          selectedArtifacts: selectedTypes
        })
      });

      if (!response.ok || !response.body) {
        // Fallback to non-streaming POST
        const res = await fetch('/api/brief/generate-suite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief: {
              ...brief,
              productId: selectedProductId
            },
            selectedArtifacts: selectedTypes
          })
        });
        if (!res.ok) throw new Error(`Suite generation failed with status ${res.status}`);
        const data = await res.json();
        setArtifacts(data.artifacts || []);
        if (data.artifacts?.length > 0) setActiveArtifact(data.artifacts[0]);
        setSuiteProgress((p) => ({
          ...p,
          completed: selectedTypes.length,
          statusMap: selectedTypes.reduce((acc, t) => ({ ...acc, [t]: 'complete' }), {} as any)
        }));
        setIsSuiteGenerating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const [eventPart, dataPart] = line.split('\n');
          const eventType = eventPart ? eventPart.replace('event: ', '').trim() : '';
          const eventData = dataPart ? JSON.parse(dataPart.replace('data: ', '').trim()) : {};

          if (eventType === 'suite_start') {
            setExecutionLogs((prev) => [
              ...prev,
              `[ENGINE] Starting synthesis of ${eventData.totalArtifacts} artifacts for ${eventData.productName}...`
            ]);
          } else if (eventType === 'artifact_start') {
            const task = eventData.taskType as ArtifactType;
            setSuiteProgress((prev) => ({
              ...prev,
              currentTask: task,
              statusMap: { ...prev.statusMap, [task]: 'generating' }
            }));
            setExecutionLogs((prev) => [
              ...prev,
              `[${task}] Synthesizing schema payload (${eventData.index}/${eventData.total})...`
            ]);
          } else if (eventType === 'artifact_stage') {
            const task = eventData.taskType as ArtifactType;
            if (eventData.stage === 'validating') {
              setSuiteProgress((prev) => ({
                ...prev,
                statusMap: { ...prev.statusMap, [task]: 'validating' }
              }));
            }
          } else if (eventType === 'artifact_complete') {
            const task = eventData.taskType as ArtifactType;
            const completedArtifact = eventData.artifact as GeneratedArtifact;

            setSuiteProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              statusMap: { ...prev.statusMap, [task]: 'complete' }
            }));

            // Upsert into local artifacts list
            setArtifacts((prev) => {
              const existingIdx = prev.findIndex((a) => a.id === completedArtifact.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = completedArtifact;
                return next;
              }
              return [completedArtifact, ...prev];
            });

            // If no active artifact is selected yet, make this active
            setActiveArtifact((prev) => prev || completedArtifact);

            setExecutionLogs((prev) => [
              ...prev,
              `[${task}] Schema validated & rendered! (${eventData.latencyMs}ms)`
            ]);
          } else if (eventType === 'artifact_error') {
            const task = eventData.taskType as ArtifactType;
            setSuiteProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              statusMap: { ...prev.statusMap, [task]: 'error' }
            }));
            setExecutionLogs((prev) => [
              ...prev,
              `[${task}] Generation error: ${eventData.error}`
            ]);
          } else if (eventType === 'suite_complete') {
            setExecutionLogs((prev) => [
              ...prev,
              `[COMPLETE] Full 19-Artifact Suite successfully synthesized and validated.`
            ]);
            setIsSuiteGenerating(false);
          }
        }
      }

      await loadArtifacts();
    } catch (err: any) {
      console.error('Suite generation error:', err);
      setErrorMsg(err.message || 'Generation suite failed.');
    } finally {
      setIsSuiteGenerating(false);
    }
  };

  // ==========================================
  // RUN SINGLE ARTIFACT PIPELINE
  // ==========================================
  const handleGenerateSingle = async () => {
    if (!singlePrompt.trim()) return;
    setIsSingleGenerating(true);
    setErrorMsg(null);
    setExecutionLogs([`[CLIENT] Initiating generation pipeline for single artifact: ${singleTaskType}`]);

    const initial = INITIAL_STEPS.map((s) => ({ ...s, status: 'IDLE' as const }));
    setSinglePipelineSteps(initial);

    const requestId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      setSinglePipelineSteps((prev) =>
        prev.map((s, idx) => (idx === 0 ? { ...s, status: 'ACTIVE' } : s))
      );

      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          productId: selectedProductId,
          taskType: singleTaskType,
          userRequest: singlePrompt
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const [eventPart, dataPart] = line.split('\n');
          const eventType = eventPart ? eventPart.replace('event: ', '').trim() : '';
          const eventData = dataPart ? JSON.parse(dataPart.replace('data: ', '').trim()) : {};

          if (eventType === 'stage') {
            const { stage, message } = eventData;
            setExecutionLogs((prev) => [...prev, `[${stage.toUpperCase()}] ${message}`]);

            setSinglePipelineSteps((prev) =>
              prev.map((step) => {
                const stageMap: Record<string, number> = {
                  context_gathering: 1,
                  prompt_building: 2,
                  model_streaming: 3,
                  validating: 4,
                  repairing: 5,
                  persisting: 6,
                  rendering: 7
                };
                const activeId = stageMap[stage];
                if (!activeId) return step;

                if (step.id < activeId) return { ...step, status: 'COMPLETED' };
                if (step.id === activeId) return { ...step, status: 'ACTIVE' };
                return step;
              })
            );
          } else if (eventType === 'complete') {
            const resultArtifact = eventData.artifact as GeneratedArtifact;
            setActiveArtifact(resultArtifact);
            setSinglePipelineSteps((prev) => prev.map((s) => ({ ...s, status: 'COMPLETED' })));
            setExecutionLogs((prev) => [
              ...prev,
              `[SUCCESS] Artifact ${resultArtifact.taskType} v${resultArtifact.version} generated & validated in ${eventData.latencyMs}ms.`
            ]);
            await loadArtifacts();
          } else if (eventType === 'error') {
            setErrorMsg(eventData.error || 'Generation failed validation check.');
            setSinglePipelineSteps((prev) =>
              prev.map((s) => (s.status === 'ACTIVE' ? { ...s, status: 'FAILED' } : s))
            );
            if (eventData.logs) {
              setExecutionLogs((prev) => [...prev, ...eventData.logs]);
            }
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Pipeline network failure.');
    } finally {
      setIsSingleGenerating(false);
    }
  };

  // Helper to map artifact type to Lucide icon
  const getIconForType = (type: ArtifactType) => {
    switch (type) {
      case 'PRD': return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'PRODUCT_VISION': return <Compass className="w-4 h-4 text-sky-400" />;
      case 'PROBLEM_STATEMENT': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'USER_PERSONAS':
      case 'PERSONAS': return <Users className="w-4 h-4 text-amber-400" />;
      case 'USER_STORIES': return <ListTodo className="w-4 h-4 text-emerald-400" />;
      case 'EPICS': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'FEATURES': return <Sparkles className="w-4 h-4 text-teal-400" />;
      case 'ACCEPTANCE_CRITERIA': return <CheckSquare className="w-4 h-4 text-cyan-400" />;
      case 'PRODUCT_REQUIREMENTS': return <FileCheck2 className="w-4 h-4 text-blue-400" />;
      case 'ROADMAP': return <Milestone className="w-4 h-4 text-orange-400" />;
      case 'MVP_SCOPE': return <Target className="w-4 h-4 text-rose-400" />;
      case 'COMPETITOR_ANALYSIS': return <Swords className="w-4 h-4 text-purple-400" />;
      case 'SWOT': return <Grid className="w-4 h-4 text-fuchsia-400" />;
      case 'USER_JOURNEY': return <Footprints className="w-4 h-4 text-amber-400" />;
      case 'FEATURE_PRIORITIZATION': return <SlidersHorizontal className="w-4 h-4 text-emerald-400" />;
      case 'OKRS': return <Target className="w-4 h-4 text-sky-400" />;
      case 'KPIS': return <BarChart3 className="w-4 h-4 text-violet-400" />;
      case 'RELEASE_PLAN': return <Calendar className="w-4 h-4 text-yellow-400" />;
      case 'GTM_PLAN': return <Rocket className="w-4 h-4 text-emerald-400" />;
      default: return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  // Filtered artifact catalog
  const filteredCatalog = useMemo(() => {
    return ARTIFACT_19_CATALOG.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === 'ALL' || item.category.toUpperCase() === categoryFilter.toUpperCase();

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, categoryFilter]);

  // Categories list
  const categories: ArtifactCategory[] = [
    'Strategy',
    'Discovery',
    'Definition',
    'Prioritization',
    'Metrics',
    'Execution'
  ];

  return (
    <div className="space-y-8">
      {/* 1. HERO POSITIONING & PROMISE BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold tracking-wide">
              <Zap className="w-3.5 h-3.5" />
              <span>NAVIGATOR AI PRODUCT MANAGEMENT PLATFORM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Turn strategy into structured artifacts in seconds.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Enter one comprehensive product brief to autonomously synthesize and validate the complete{' '}
              <span className="font-semibold text-emerald-400">19-artifact agile specification suite</span>{' '}
              with zero hallucinations, strict Zod schemas, and dual-pass self-repair.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-center shrink-0 gap-1">
            <button
              onClick={() => setWorkbenchMode('suite')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                workbenchMode === 'suite'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>19-Artifact Autonomous Suite</span>
            </button>

            <button
              onClick={() => setWorkbenchMode('single')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                workbenchMode === 'single'
                  ? 'bg-slate-800 text-slate-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Single Artifact Lab</span>
            </button>

            <button
              onClick={() => setWorkbenchMode('batch')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                workbenchMode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Batch Queue</span>
              {batchQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                  {batchQueue.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOKEN COST ESTIMATOR & GEMINI PRICING PROJECTION */}
      <TokenCostEstimator
        artifacts={artifacts}
        currentArtifact={activeArtifact}
      />

      {/* 3. PRODUCT BRIEF INGESTION CARD (SUITE MODE) */}
      {workbenchMode === 'suite' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Product Brief Ingestion</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The single source of truth for generating PRDs, Epics, Stories, Roadmaps, OKRs, and 14 other artifacts.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-medium text-slate-400 mr-1 shrink-0">Try Preset:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSelectPreset(p.brief)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors shrink-0 flex items-center space-x-1 ${
                    brief.productName === p.brief.productName
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Product Name & Initiative Title</span>
                <span className="text-slate-400 text-[11px]">Required</span>
              </label>
              <input
                type="text"
                value={brief.productName}
                onChange={(e) => setBrief({ ...brief, productName: e.target.value })}
                placeholder="e.g. PayFlow Instant Trade Credit"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Target Audience & Primary Roles</span>
                <span className="text-slate-400 text-[11px]">Required</span>
              </label>
              <input
                type="text"
                value={brief.targetAudience}
                onChange={(e) => setBrief({ ...brief, targetAudience: e.target.value })}
                placeholder="e.g. Wholesale Buyers, B2B Merchants, Credit Officers"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Core Problem Statement & Market Friction</span>
                <span className="text-slate-400 text-[11px]">Detailed context produces sharper specs</span>
              </label>
              <textarea
                rows={2}
                value={brief.problemStatement}
                onChange={(e) => setBrief({ ...brief, problemStatement: e.target.value })}
                placeholder="What is the painful, expensive problem your users are facing today?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-normal leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Proposed Solution & Key Features</label>
              <textarea
                rows={2}
                value={brief.proposedSolution}
                onChange={(e) => setBrief({ ...brief, proposedSolution: e.target.value })}
                placeholder="Key capabilities, workflows, or algorithmic innovations..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Strategic Vision & North Star Context</label>
              <textarea
                rows={2}
                value={brief.strategicContext || ''}
                onChange={(e) => setBrief({ ...brief, strategicContext: e.target.value })}
                placeholder="High-level business objective, OKR alignment, or SLA constraints..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Artifact Selector Section */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200">
                  Target Artifact Suite ({selectedTypes.length} / 19 selected):
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Select which specifications to autonomously generate from this brief
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  onClick={handleSelectAll}
                  className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                >
                  Select All (19)
                </button>
                <span className="text-slate-400">·</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-slate-400 hover:text-slate-300 font-medium cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* 19 Artifact Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {ARTIFACT_19_CATALOG.map((item) => {
                const isSelected = selectedTypes.includes(item.type);
                const status = suiteProgress.statusMap[item.type];
                return (
                  <button
                    key={item.type}
                    onClick={() => handleToggleArtifactSelection(item.type)}
                    className={`px-3 py-2 rounded-xl text-left border text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-slate-950 border-emerald-600/60 text-slate-100 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {getIconForType(item.type)}
                      <span className="truncate font-medium">{item.label}</span>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 ml-1">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-800 pt-5">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Strict Zod Validation · Dual-Pass Self-Repair · Sub-Second Caching</span>
            </div>

            <button
              onClick={handleGenerateSuite}
              disabled={isSuiteGenerating || selectedTypes.length === 0}
              className={`px-6 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2.5 transition-all shadow-lg ${
                isSuiteGenerating || selectedTypes.length === 0
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer active:scale-98'
              }`}
            >
              {isSuiteGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Synthesizing Suite ({suiteProgress.completed} / {suiteProgress.total})...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ Generate {selectedTypes.length} Artifacts in Seconds</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : workbenchMode === 'batch' ? (
        <BatchProcessingQueue
          productId={selectedProductId}
          brief={brief}
          artifacts={artifacts}
          queue={batchQueue}
          onUpdateQueue={setBatchQueue}
          onRefreshArtifacts={loadArtifacts}
          onSelectArtifactToView={(art) => {
            setActiveArtifact(art);
            setWorkbenchViewerTab('spec');
          }}
          onClose={() => setWorkbenchMode('suite')}
        />
      ) : (
        /* SINGLE ARTIFACT LAB MODE */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Single Artifact Deep-Dive Lab</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Isolate individual specifications, test custom prompts, and monitor the 7-step execution pipeline.
              </p>
            </div>

            {/* Task Type Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">Artifact:</span>
              <select
                value={singleTaskType}
                onChange={(e) => setSingleTaskType(e.target.value as ArtifactType)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {ARTIFACT_19_CATALOG.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label} ({item.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Prompt & Specific Directives</label>
            <textarea
              rows={3}
              value={singlePrompt}
              onChange={(e) => setSinglePrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerateSingle}
              disabled={isSingleGenerating || !singlePrompt.trim()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSingleGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Streaming Pipeline...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute Single Generation Pipeline</span>
                </>
              )}
            </button>
          </div>

          {/* Stepper */}
          <PipelineStepper steps={singlePipelineSteps} currentStepIndex={singleStepIndex} />
        </div>
      )}

      {/* 3. REAL-TIME SUITE GENERATION PROGRESS MONITOR */}
      {isSuiteGenerating && (
        <div className="bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-6 space-y-4 shadow-2xl animate-pulse">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="font-bold text-slate-200">
                Generating Specification Suite: {suiteProgress.completed} of {suiteProgress.total} artifacts complete
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-semibold">
              {Math.round((suiteProgress.completed / suiteProgress.total) * 100)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-emerald-500 h-2 transition-all duration-300"
              style={{ width: `${(suiteProgress.completed / suiteProgress.total) * 100}%` }}
            />
          </div>

          {/* Mini active grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
            {selectedTypes.map((type) => {
              const st = suiteProgress.statusMap[type];
              return (
                <div
                  key={type}
                  className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                    st === 'complete'
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : st === 'generating' || st === 'validating'
                      ? 'bg-amber-950/40 border-amber-800 text-amber-300 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="truncate">{type.replace('_', ' ')}</span>
                  {st === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {(st === 'generating' || st === 'validating') && (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. EXECUTION TERMINAL LOGS (Collapsible) */}
      {executionLogs.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden text-xs shadow-md">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-4 py-2.5 bg-slate-950/80 flex items-center justify-between text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <div className="flex items-center space-x-2 font-mono">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Pipeline Execution Log ({executionLogs.length} events)</span>
            </div>
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showLogs && (
            <div className="p-4 bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
              {executionLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('ERROR') || log.includes('FAILED')
                      ? 'text-rose-400'
                      : log.includes('REPAIR') || log.includes('CASCADE')
                      ? 'text-amber-400'
                      : log.includes('PASSED') || log.includes('COMPLETE') || log.includes('SUCCESS')
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. ERROR ALERT */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-200 rounded-xl flex items-start space-x-3 text-xs shadow-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-100">Generation Blocked / Failed Validation</div>
            <p className="mt-1 opacity-90">{errorMsg}</p>
            <p className="mt-1 text-[11px] text-rose-300/80">
              §1 Standard: A half-broken draft is never committed to the database. Adjust your request or review the logs above.
            </p>
          </div>
        </div>
      )}

      {/* 6. 19-ARTIFACT VISUAL SPECIFICATION MATRIX & CATALOG */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Specification Suite Catalog</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold ml-2">
                {artifacts.length} generated
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Click on any artifact below to open the full specification viewer, copy prose, or promote to official status.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artifacts..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-44"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Selection Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5 mr-1">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Select Batch ({selectedCatalogCards.size} selected):</span>
            </span>

            <button
              onClick={handleSelectAllCatalog}
              className="text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
            >
              Select All (19)
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={handleSelectUngenerated}
              className="text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
            >
              Select Un-generated
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={handleSelectRiceTargets}
              className="text-slate-400 hover:text-amber-300 font-medium hover:underline cursor-pointer"
            >
              Select RICE Targets
            </button>
            {selectedCatalogCards.size > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <button
                  onClick={handleClearCatalogSelection}
                  className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>

          {selectedCatalogCards.size > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEnqueueSelected('auto_rice_score', true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
              >
                <BarChart3 className="w-3 h-3" />
                <span>Auto RICE Score ({selectedCatalogCards.size})</span>
              </button>

              <button
                onClick={() => handleEnqueueSelected('bulk_generate', true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
              >
                <Zap className="w-3 h-3" />
                <span>Bulk AI Generate ({selectedCatalogCards.size})</span>
              </button>

              <button
                onClick={() => handleEnqueueSelected('auto_rice_score', false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                + Add to Queue
              </button>
            </div>
          )}
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCatalog.map((item) => {
            const artifact = artifacts.find((a) => a.taskType === item.type);
            const isSelected = activeArtifact?.taskType === item.type;
            const isCardChecked = selectedCatalogCards.has(item.type);
            const isApproved = artifact?.status === 'APPROVED';

            return (
              <div
                key={item.type}
                onClick={() => artifact && setActiveArtifact(artifact)}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCardChecked
                    ? 'ring-2 ring-indigo-500 bg-slate-900 border-indigo-500/80 shadow-md shadow-indigo-950/30'
                    : isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                    : artifact
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCardSelection(item.type);
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          isCardChecked
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-700 hover:border-slate-500 text-transparent'
                        }`}
                        title={`Select ${item.label} for batch processing`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {item.category}
                      </span>
                    </div>

                    {artifact ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                          isApproved
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {isApproved ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        <span>v{artifact.version} {artifact.status}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">Not Generated</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      {getIconForType(item.type)}
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 tracking-tight truncate">
                      {item.label}
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {item.shortDesc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  {artifact ? (
                    <>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {artifact.metadata?.outputTokens || 450} tok · {artifact.metadata?.latencyMs || 210}ms
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveArtifact(artifact);
                            setHistoryTargetArtifact(artifact);
                            setWorkbenchViewerTab('history');
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-purple-300 hover:text-purple-100 bg-purple-950/70 hover:bg-purple-900 border border-purple-800/80 flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                          title="View previous iterations & approval history"
                        >
                          <History className="w-2.5 h-2.5 text-purple-400" />
                          <span>v{artifact.version} ({artifact.versionHistory?.length || 1})</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveArtifact(artifact);
                            setWorkbenchViewerTab('spec');
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-0.5 cursor-pointer"
                        >
                          <span>View Spec</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSingleTaskType(item.type);
                        setWorkbenchMode('single');
                      }}
                      className="text-slate-400 hover:text-slate-300 font-medium text-[11px] flex items-center space-x-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Synthesize Now</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. ACTIVE ARTIFACT DOCUMENT VIEWER */}
      {activeArtifact ? (
        <div className="space-y-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ACTIVE SPECIFICATION VIEWER:
              </span>
              <span className="text-xs font-extrabold text-emerald-400">
                {activeArtifact.schemaData?.title || activeArtifact.taskType.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                activeArtifact.status === 'APPROVED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-xs'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
              }`}>
                {activeArtifact.status === 'APPROVED' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <Clock className="w-2.5 h-2.5 text-amber-400" />}
                <span>v{activeArtifact.version}.0 · {activeArtifact.status}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Artifact ID: {activeArtifact.id}
              </span>

              {/* View Mode Tabs: Document Spec vs Version History Viewer */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setWorkbenchViewerTab('spec')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    workbenchViewerTab === 'spec'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Inspect document prose and schema"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Document Spec</span>
                </button>

                <button
                  onClick={() => setWorkbenchViewerTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    workbenchViewerTab === 'history'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-300 hover:text-purple-100 hover:bg-purple-950/40'
                  }`}
                  title="View previous iterations and approval history"
                >
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>Version History ({activeArtifact.versionHistory?.length || 1} Iterations)</span>
                </button>
              </div>

              {/* Expand to Modal Button */}
              <button
                onClick={() => {
                  setHistoryTargetArtifact(activeArtifact);
                  setIsVersionHistoryOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold border border-slate-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Expand Version History to Full Modal"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Expand Modal</span>
              </button>
            </div>
          </div>

          {workbenchNotification && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in shadow-md">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{workbenchNotification}</span>
              </div>
              <button onClick={() => setWorkbenchNotification(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Conditional Rendering between Document Spec and Version History Viewer */}
          {workbenchViewerTab === 'history' ? (
            <ArtifactVersionHistoryViewer
              artifact={activeArtifact}
              productName={brief.productName}
              onRevertArtifact={handleRevertArtifact}
              onApproveArtifact={onApproveArtifact}
              isReverting={isRevertingArtifact}
              isApproving={isApproving}
              embedded={true}
              onClose={() => setWorkbenchViewerTab('spec')}
              onSelectIterationForSpecView={(iteration) => {
                setActiveArtifact({
                  ...activeArtifact,
                  version: iteration.version,
                  status: iteration.status,
                  schemaData: iteration.schemaData,
                  renderedMarkdown: iteration.renderedMarkdown
                });
                setWorkbenchViewerTab('spec');
              }}
            />
          ) : (
            <DocumentViewer
              artifact={activeArtifact}
              onApprove={onApproveArtifact}
              isApproving={isApproving}
              onRefreshArtifact={(updated) => setActiveArtifact(updated)}
              onOpenVersionHistory={() => {
                setWorkbenchViewerTab('history');
              }}
            />
          )}
        </div>
      ) : (
        <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
          <h3 className="text-sm font-bold text-slate-200">No Specification Currently Selected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &quot;Generate 19 Artifacts in Seconds&quot; above or select any generated artifact card to inspect its verified Markdown prose and raw schema data.
          </p>
        </div>
      )}

      {/* 8. ARTIFACT VERSION HISTORY & APPROVAL GATE MODAL */}
      <ArtifactVersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        artifact={historyTargetArtifact || activeArtifact}
        productName={brief.productName}
        onRevertArtifact={handleRevertArtifact}
        onApproveArtifact={onApproveArtifact}
        isReverting={isRevertingArtifact}
        isApproving={isApproving}
        onSelectIterationForSpecView={(iteration) => {
          const target = historyTargetArtifact || activeArtifact;
          if (target) {
            setActiveArtifact({
              ...target,
              version: iteration.version,
              status: iteration.status,
              schemaData: iteration.schemaData,
              renderedMarkdown: iteration.renderedMarkdown
            });
          }
          setIsVersionHistoryOpen(false);
          setWorkbenchViewerTab('spec');
        }}
      />

      {/* 9. FLOATING BATCH ACTION BAR (Triggered on catalog multi-select) */}
      {selectedCatalogCards.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ring-1 ring-indigo-500/30">
          <div className="flex items-center space-x-2 px-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100 font-mono">
              {selectedCatalogCards.size} Artifacts Selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <button
            onClick={() => handleEnqueueSelected('auto_rice_score', true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Auto RICE Score ({selectedCatalogCards.size})</span>
          </button>

          <button
            onClick={() => handleEnqueueSelected('bulk_generate', true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Bulk AI Generate ({selectedCatalogCards.size})</span>
          </button>

          <button
            onClick={() => handleEnqueueSelected('auto_rice_score', false)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add to Queue</span>
          </button>

          <button
            onClick={handleClearCatalogSelection}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
