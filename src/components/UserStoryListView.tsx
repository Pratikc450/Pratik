import React, { useState, useEffect, useMemo } from 'react';
import { 
  ListTodo, 
  Sparkles, 
  User, 
  Calculator, 
  CheckCircle2, 
  FileDown, 
  Download, 
  Copy, 
  Check, 
  Eye, 
  X, 
  Sliders,
  TrendingUp,
  ArrowUpDown,
  RotateCcw,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  BarChart3,
  BrainCircuit,
  UserCheck,
  CheckSquare,
  Square,
  Flag,
  Layers,
  Target,
  Boxes,
  FolderTree,
  Activity,
  ShieldCheck,
  GitBranch,
  Gauge,
  History
} from 'lucide-react';
import { Product, GeneratedArtifact } from '../types.js';
import { 
  exportArtifactPdf, 
  exportToMarkdown, 
  exportSingleStoryPdf, 
  exportSingleStoryMarkdown,
  exportMultipleStoriesMarkdown,
  exportRiceAlignmentReportPdf
} from '../utils/exportUtils.js';
import { RiceTrendChart } from './RiceTrendChart.js';
import { RiceScoreAnalytics } from './RiceScoreAnalytics.js';
import { StoryNextBestActions } from './StoryNextBestActions.js';
import { RiceFormulaCalculatorModal } from './RiceFormulaCalculatorModal.js';
import { SmartEpicMappingModal } from './SmartEpicMappingModal.js';
import { PersonaFilterBar } from './PersonaFilterBar.js';
import { ConfidenceAuditModal } from './ConfidenceAuditModal.js';
import { StoryImpactForecastModal } from './StoryImpactForecastModal.js';
import { SprintVelocityPredictor } from './SprintVelocityPredictor.js';
import { StoryDependencyMapperModal } from './StoryDependencyMapperModal.js';
import { AiRiceSuggestionEngineModal } from './AiRiceSuggestionEngineModal.js';
import { StoryVersionHistoryModal } from './StoryVersionHistoryModal.js';

interface UserStoryListViewProps {
  selectedProductId: string;
  products: Product[];
  onSelectProduct: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

// RICE Priority Tier Helper
export function getPriorityTier(score: number): { tier: 'P0' | 'P1' | 'P2' | 'P3'; label: string; badge: string; border: string; glow: string } {
  if (score >= 3000) {
    return {
      tier: 'P0',
      label: 'P0 · Critical Velocity',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-950/40'
    };
  }
  if (score >= 1500) {
    return {
      tier: 'P1',
      label: 'P1 · High Strategic Value',
      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-950/40'
    };
  }
  if (score >= 500) {
    return {
      tier: 'P2',
      label: 'P2 · Standard Backlog',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-950/40'
    };
  }
  return {
    tier: 'P3',
    label: 'P3 · Low ROI / Review',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    border: 'border-slate-700',
    glow: 'shadow-none'
  };
}

// Ease Metric calculation from Effort (Person-Weeks)
export function effortToEase(effort: number): { score: number; label: string; description: string; badge: string } {
  if (effort <= 1) {
    return {
      score: 10,
      label: 'Very High Ease (10/10)',
      description: 'Quick win · 0.5–1 week effort',
      badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
    };
  }
  if (effort <= 2) {
    return {
      score: 8,
      label: 'High Ease (8/10)',
      description: 'Low complexity · 1.5–2 weeks effort',
      badge: 'bg-teal-950/60 text-teal-300 border-teal-800/60'
    };
  }
  if (effort <= 3.5) {
    return {
      score: 6,
      label: 'Moderate Ease (6/10)',
      description: 'Standard sprint unit · 2.5–3.5 weeks effort',
      badge: 'bg-blue-950/60 text-blue-300 border-blue-800/60'
    };
  }
  if (effort <= 6) {
    return {
      score: 4,
      label: 'Low Ease (4/10)',
      description: 'Significant cross-team lift · 4–6 weeks effort',
      badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60'
    };
  }
  return {
    score: 2,
    label: 'Very Low Ease (2/10)',
    description: 'Architectural initiative · 7+ weeks effort',
    badge: 'bg-rose-950/60 text-rose-300 border-rose-800/60'
  };
}

// Convert Ease score (1-10) to person-weeks effort
export function easeToEffort(ease: number): number {
  if (ease >= 9) return 1.0;
  if (ease >= 7) return 2.0;
  if (ease >= 5) return 3.5;
  if (ease >= 3) return 5.0;
  return 8.0;
}

export const UserStoryListView: React.FC<UserStoryListViewProps> = ({
  selectedProductId,
  products,
  onSelectProduct,
  onNavigateTab
}) => {
  const [storiesArtifact, setStoriesArtifact] = useState<GeneratedArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting & Filtering
  const [sortByRice, setSortByRice] = useState<boolean>(true);
  const [filterTier, setFilterTier] = useState<'ALL' | 'P0' | 'P1' | 'P2' | 'P3'>('ALL');
  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');
  const [personaDisplayMode, setPersonaDisplayMode] = useState<'FILTER' | 'HIGHLIGHT'>('FILTER');

  // Standalone Formula Modal State
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [modalTargetStoryId, setModalTargetStoryId] = useState<string>('US-101');
  const [isSmartEpicModalOpen, setIsSmartEpicModalOpen] = useState<boolean>(false);

  // Calculator, Trend Chart & Analytics Widget State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(true);
  const [showTrendChart, setShowTrendChart] = useState<boolean>(true);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState<boolean>(true);
  const [showNextBestActions, setShowNextBestActions] = useState<boolean>(true);
  const [selectedCalcStoryId, setSelectedCalcStoryId] = useState<string>('US-101');
  const [inlineCalculatorStoryId, setInlineCalculatorStoryId] = useState<string | null>(null);

  // Dynamic Calculator Metrics
  const [calcReach, setCalcReach] = useState<number>(4500);
  const [calcImpact, setCalcImpact] = useState<number>(3.0);
  const [calcConfidence, setCalcConfidence] = useState<number>(0.9);
  const [calcEffort, setCalcEffort] = useState<number>(2.5);
  const [calcEaseScore, setCalcEaseScore] = useState<number>(8);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // AI Quick Auto-fill state
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillingStoryId, setAutoFillingStoryId] = useState<string | null>(null);
  const [aiAnalysisDetails, setAiAnalysisDetails] = useState<{
    storyId: string;
    justification: string;
    model: string;
    reachReasoning?: string;
    impactReasoning?: string;
    confidenceReasoning?: string;
    effortReasoning?: string;
  } | null>(null);

  // Bulk Selection State for Merged Markdown Export
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);

  // View Mode: Standard Flat List vs Functional Modules (AI Clustered)
  const [viewMode, setViewMode] = useState<'FLAT' | 'MODULES'>('FLAT');
  const [functionalModules, setFunctionalModules] = useState<any[]>([]);
  const [isClustering, setIsClustering] = useState<boolean>(false);

  // Inline AI KPI Impact Preview State
  const [kpiEstimates, setKpiEstimates] = useState<Record<string, {
    primaryKpi: string;
    metricType: 'Conversion' | 'Efficiency' | 'Revenue' | 'Risk Reduction';
    estimatedImpact: string;
    confidenceScore: number;
    rationale: string;
    secondaryMetrics?: string[];
  }>>({});
  const [isLoadingKpis, setIsLoadingKpis] = useState<boolean>(false);

  // AI Confidence Audit State
  const [isConfidenceAuditOpen, setIsConfidenceAuditOpen] = useState<boolean>(false);

  // AI Impact Forecast State
  const [isImpactForecastOpen, setIsImpactForecastOpen] = useState<boolean>(false);
  const [forecastTargetStory, setForecastTargetStory] = useState<any | null>(null);

  // AI Dependency Mapper State
  const [isDependencyMapperOpen, setIsDependencyMapperOpen] = useState<boolean>(false);

  // Sprint Velocity Predictor State
  const [showSprintPredictor, setShowSprintPredictor] = useState<boolean>(true);

  // AI Suggestion Engine State
  const [isSuggestionEngineOpen, setIsSuggestionEngineOpen] = useState<boolean>(false);
  const [workspacePersonas, setWorkspacePersonas] = useState<any[]>([]);

  // Bulk Approval Gate State
  const [isBulkApproving, setIsBulkApproving] = useState<boolean>(false);

  // Version History State
  const [historyModalStory, setHistoryModalStory] = useState<any | null>(null);
  const [expandedHistoryStoryIds, setExpandedHistoryStoryIds] = useState<string[]>([]);
  const [isRevertingStory, setIsRevertingStory] = useState<boolean>(false);

  const ensureStoryHistory = (story: any): any => {
    if (story.history && story.history.length > 0) {
      return story;
    }
    const v1Date = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const v2Date = new Date(Date.now() - 14 * 3600 * 1000).toISOString();
    const v3Date = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

    const v1Snapshot = {
      asA: story.asA,
      iWant: (story.iWant || '').replace(/ in under \d+ seconds/i, '').replace(/ without waiting \d+ hours.*/i, ''),
      soThat: story.soThat,
      acceptanceCriteria: story.acceptanceCriteria && story.acceptanceCriteria.length > 0 
        ? [story.acceptanceCriteria[0]] 
        : ['Draft Given/When/Then acceptance criteria'],
      reach: Math.round((story.reach || 2500) * 0.7),
      impact: Math.max(1, (story.impact || 2) - 1),
      confidence: 0.6,
      effort: (story.effort || 2) + 1,
      riceScore: Math.round(((Math.round((story.reach || 2500) * 0.7) * Math.max(1, (story.impact || 2) - 1) * 0.6) / ((story.effort || 2) + 1))),
      priority: 'P2',
      status: 'BACKLOG',
      epicTitle: story.epicTitle,
      persona: story.persona
    };

    const v2Snapshot = {
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      acceptanceCriteria: story.acceptanceCriteria || [],
      reach: story.reach || 3000,
      impact: story.impact || 2,
      confidence: Math.max(0.65, (story.confidence || 0.8) - 0.1),
      effort: story.effort || 2,
      riceScore: Math.round((story.riceScore || 2500) * 0.85),
      priority: story.priority || 'P1',
      status: 'READY_FOR_DEV',
      epicTitle: story.epicTitle,
      persona: story.persona
    };

    const v3Snapshot = {
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      acceptanceCriteria: story.acceptanceCriteria || [],
      reach: story.reach,
      impact: story.impact,
      confidence: story.confidence,
      effort: story.effort,
      riceScore: story.riceScore,
      priority: story.priority || 'P0',
      status: story.status || 'READY_FOR_DEV',
      approvalStatus: story.approvalStatus,
      epicTitle: story.epicTitle,
      persona: story.persona
    };

    return {
      ...story,
      version: story.version || 3,
      history: [
        {
          version: 1,
          timestamp: v1Date,
          author: 'AI Spec Generator (Gemini 3.5 Pro)',
          changeSummary: 'Initial story generation and baseline scoping from Discovery Brief',
          fieldsChanged: ['asA', 'iWant', 'soThat', 'acceptanceCriteria'],
          snapshot: v1Snapshot
        },
        {
          version: 2,
          timestamp: v2Date,
          author: 'Alex Rivera (VP of Product)',
          changeSummary: 'Added strict Gherkin acceptance criteria and calibrated initial RICE parameters',
          fieldsChanged: ['acceptanceCriteria', 'confidence', 'riceScore', 'status'],
          snapshot: v2Snapshot
        },
        {
          version: 3,
          timestamp: v3Date,
          author: 'Lead Product Manager',
          changeSummary: 'Finalized RICE Reach & Confidence metrics and committed to sprint scope',
          fieldsChanged: ['priority', 'riceScore', 'reach', 'confidence'],
          snapshot: v3Snapshot
        }
      ]
    };
  };

  const defaultStories = [
    {
      id: 'US-101',
      epicTitle: 'Checkout & Underwriting',
      asA: 'Wholesale Procurement Director',
      iWant: 'to verify business credit eligibility directly inside the checkout screen in under 30 seconds',
      soThat: 'I can submit purchase orders on Net-30 terms without waiting 48 hours for offline credit approval',
      persona: 'Director of Procurement',
      reach: 4500,
      impact: 3,
      confidence: 0.9,
      effort: 2.5,
      riceScore: 4860,
      estimationJustification: 'Highest impact on cart checkout drop-off rates on purchases above $10,000.',
      acceptanceCriteria: [
        'Given a cart value over $2,500, when selecting Trade Credit, prompt for corporate EIN.',
        'Decision returned in under 30 seconds with instant zero-upfront total.'
      ]
    },
    {
      id: 'US-102',
      epicTitle: 'Automated Accounting Reconciliation',
      asA: 'Merchant Finance Administrator',
      iWant: 'automated invoice generation and webhook dispatch to our ERP upon credit order completion',
      soThat: 'our finance team does not have to manually key receivables records into NetSuite',
      persona: 'Finance Admin',
      reach: 1200,
      impact: 2,
      confidence: 0.85,
      effort: 3,
      riceScore: 680,
      estimationJustification: 'Eliminates 2 hours daily of manual double-entry bookkeeping across customer accounts.',
      acceptanceCriteria: [
        'Invoice PDF generated with payment due date OrderDate + 30 days.',
        'Idempotent webhook dispatched to ERP endpoint within 5 seconds with HMAC SHA-256 signature.'
      ]
    },
    {
      id: 'US-103',
      epicTitle: 'Trade Line Transparency',
      asA: 'Corporate Account Buyer',
      iWant: 'a transparent breakdown of credit line utilization and upcoming payment deadlines',
      soThat: 'my procurement team avoids late penalties and maintains good standing for larger orders',
      persona: 'Corporate Buyer',
      reach: 3800,
      impact: 2,
      confidence: 0.8,
      effort: 1.5,
      riceScore: 4053,
      estimationJustification: 'Directly improves on-time trade payables compliance by 35%.',
      acceptanceCriteria: [
        'Dashboard displays Approved Line, Available Line, and Outstanding Invoices.',
        'Automated email notifications sent 7 days and 2 days prior to invoice due date.'
      ]
    }
  ].map(ensureStoryHistory);

  const [localStories, setLocalStories] = useState<any[]>(defaultStories);

  useEffect(() => {
    fetch(`/api/products/${selectedProductId}`)
      .then(res => res.json())
      .then(data => {
        const storiesArt = (data.artifacts || []).find((a: any) => a.taskType === 'USER_STORIES');
        setStoriesArtifact(storiesArt || null);
        if (data.personas && Array.isArray(data.personas)) {
          setWorkspacePersonas(data.personas);
        }
        if (storiesArt?.schemaData?.stories && storiesArt.schemaData.stories.length > 0) {
          const enriched = storiesArt.schemaData.stories.map(ensureStoryHistory);
          setLocalStories(enriched);
          setSelectedCalcStoryId(enriched[0].id);
          const first = enriched[0];
          setCalcReach(first.reach || 4500);
          setCalcImpact(first.impact || 3);
          setCalcConfidence(first.confidence || 0.9);
          setCalcEffort(first.effort || 2.5);
          setCalcEaseScore(effortToEase(first.effort || 2.5).score);
        } else {
          setLocalStories(defaultStories);
          setSelectedCalcStoryId('US-101');
        }
        setLoading(false);
      })
      .catch(() => {
        setLocalStories(defaultStories);
        setLoading(false);
      });
  }, [selectedProductId]);

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];
  const isApproved = storiesArtifact?.status === 'APPROVED';

  // AI KPI Impact Preview Estimation Handler
  const fetchKpiEstimations = async (storiesToEstimate = localStories) => {
    if (storiesToEstimate.length === 0) return;
    setIsLoadingKpis(true);
    try {
      const res = await fetch('/api/ai/estimate-kpi-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: storiesToEstimate,
          productName: activeProduct?.name,
          productId: selectedProductId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.estimates) {
          const map: Record<string, any> = {};
          data.estimates.forEach((est: any) => {
            map[est.storyId] = est;
          });
          setKpiEstimates(map);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch KPI estimations', err);
    } finally {
      setIsLoadingKpis(false);
    }
  };

  // AI Functional Modules Clustering Handler
  const clusterStories = async (storiesToCluster = localStories) => {
    if (storiesToCluster.length === 0) return;
    setIsClustering(true);
    try {
      const res = await fetch('/api/ai/cluster-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: storiesToCluster,
          productName: activeProduct?.name,
          productId: selectedProductId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.modules) {
          setFunctionalModules(data.modules);
        }
      }
    } catch (err) {
      console.warn('Failed to cluster stories', err);
    } finally {
      setIsClustering(false);
    }
  };

  // AI Confidence Audit Batch Update Handler
  const handleApplyAuditUpdates = async (updates: Array<{ id: string; confidence: number; riceScore: number; priority?: string }>) => {
    if (!storiesArtifact) return;
    try {
      const res = await fetch(`/api/artifacts/${storiesArtifact.id}/stories-bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.artifact?.schemaData?.stories) {
          setStoriesArtifact(data.artifact);
        }
      }
    } catch (err) {
      console.warn('Failed to apply confidence audit updates', err);
    }
  };

  // AI Suggestion Engine Batch Update Handler
  const handleApplyScoreSuggestions = async (updates: Array<{ id: string; impact?: number; effort?: number; confidence?: number; riceScore?: number; priority?: string }>) => {
    if (!storiesArtifact) return;
    try {
      const res = await fetch(`/api/artifacts/${storiesArtifact.id}/stories-bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.artifact?.schemaData?.stories) {
          setStoriesArtifact(data.artifact);
          setLocalStories(data.artifact.schemaData.stories);
        }
      }
    } catch (err) {
      console.warn('Failed to apply score suggestions', err);
    }
  };

  // Auto-fetch KPI estimates and initial clusters on stories ready
  useEffect(() => {
    if (localStories.length > 0) {
      fetchKpiEstimations(localStories);
      clusterStories(localStories);
    }
  }, [selectedProductId, localStories.length]);

  // Synchronize calculator form inputs when selected story changes
  const handleSelectStoryForCalc = (storyId: string) => {
    setSelectedCalcStoryId(storyId);
    const target = localStories.find(s => s.id === storyId);
    if (target) {
      setCalcReach(target.reach ?? 1000);
      setCalcImpact(target.impact ?? 2);
      setCalcConfidence(target.confidence ?? 0.8);
      const eff = target.effort ?? 2;
      setCalcEffort(eff);
      setCalcEaseScore(effortToEase(eff).score);
    }
  };

  // Handle Ease Slider Change -> converts to Effort
  const handleEaseChange = (newEase: number) => {
    setCalcEaseScore(newEase);
    const mappedEffort = easeToEffort(newEase);
    setCalcEffort(mappedEffort);
  };

  // Handle Effort Slider Change -> converts to Ease Score
  const handleEffortChange = (newEffort: number) => {
    setCalcEffort(newEffort);
    setCalcEaseScore(effortToEase(newEffort).score);
  };

  // Calculated dynamic RICE score
  const computedRiceScore = useMemo(() => {
    const eff = Math.max(calcEffort, 0.5);
    return Math.round(((calcReach * calcImpact * calcConfidence) / eff) * 10) / 10;
  }, [calcReach, calcImpact, calcConfidence, calcEffort]);

  // Apply Calculated Metrics to Story
  const handleApplyCalculatedMetrics = async (storyIdToUpdate?: string) => {
    const targetId = storyIdToUpdate || selectedCalcStoryId;
    setIsSavingScore(true);

    const newScore = computedRiceScore;

    // Update in local state
    setLocalStories(prev => {
      const updated = prev.map(s => {
        if (s.id === targetId) {
          return {
            ...s,
            reach: calcReach,
            impact: calcImpact,
            confidence: calcConfidence,
            effort: calcEffort,
            riceScore: newScore
          };
        }
        return s;
      });
      return updated;
    });

    // If modal is currently inspecting this story, update it as well
    if (selectedStory && selectedStory.id === targetId) {
      setSelectedStory((prev: any) => ({
        ...prev,
        reach: calcReach,
        impact: calcImpact,
        confidence: calcConfidence,
        effort: calcEffort,
        riceScore: newScore
      }));
    }

    // Persist to backend if artifact exists
    if (storiesArtifact?.id) {
      try {
        await fetch(`/api/artifacts/${storiesArtifact.id}/stories/${targetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reach: calcReach,
            impact: calcImpact,
            confidence: calcConfidence,
            effort: calcEffort
          })
        });
      } catch (err) {
        console.warn('Could not persist to server', err);
      }
    }

    setIsSavingScore(false);
    setSaveSuccessMsg(`RICE Score ${newScore.toLocaleString()} applied to ${targetId}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Reset to Baseline
  const handleResetCalculator = () => {
    const original = defaultStories.find(s => s.id === selectedCalcStoryId);
    if (original) {
      setCalcReach(original.reach);
      setCalcImpact(original.impact);
      setCalcConfidence(original.confidence);
      setCalcEffort(original.effort);
      setCalcEaseScore(effortToEase(original.effort).score);
    } else {
      setCalcReach(2500);
      setCalcImpact(2.0);
      setCalcConfidence(0.8);
      setCalcEffort(2.0);
      setCalcEaseScore(8);
    }
  };

  // AI Quick Auto-fill RICE suggestions based on story description
  const handleAiAutoFill = async (targetId?: string) => {
    const storyId = targetId || selectedCalcStoryId;
    const story = localStories.find(s => s.id === storyId);
    if (!story) return;

    setIsAutoFilling(true);
    setAutoFillingStoryId(storyId);

    try {
      const res = await fetch('/api/ai/suggest-rice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story,
          productName: activeProduct?.name,
          productContext: activeProduct?.description
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          const { 
            reach, 
            impact, 
            confidence, 
            effort, 
            easeScore, 
            riceScore, 
            justification, 
            reachReasoning, 
            impactReasoning, 
            confidenceReasoning, 
            effortReasoning 
          } = data.metrics;

          // Populate calculator parameters
          setCalcReach(reach);
          setCalcImpact(impact);
          setCalcConfidence(confidence);
          setCalcEffort(effort);
          setCalcEaseScore(easeScore || effortToEase(effort).score);
          setSelectedCalcStoryId(storyId);

          // Update story in local state with AI baseline
          setLocalStories(prev => prev.map(s => {
            if (s.id === storyId) {
              return {
                ...s,
                reach,
                impact,
                confidence,
                effort,
                riceScore,
                estimationJustification: justification || s.estimationJustification
              };
            }
            return s;
          }));

          // If detail modal is open for this story, update it
          if (selectedStory && selectedStory.id === storyId) {
            setSelectedStory((prev: any) => ({
              ...prev,
              reach,
              impact,
              confidence,
              effort,
              riceScore,
              estimationJustification: justification || prev.estimationJustification
            }));
          }

          setAiAnalysisDetails({
            storyId,
            justification: justification || 'AI suggested baseline derived from user story description.',
            model: data.model || 'gemini-3.8-flash',
            reachReasoning,
            impactReasoning,
            confidenceReasoning,
            effortReasoning
          });

          // Also persist baseline to server if artifact exists
          if (storiesArtifact?.id) {
            fetch(`/api/artifacts/${storiesArtifact.id}/stories/${storyId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reach, impact, confidence, effort })
            }).catch(() => {});
          }

          setSaveSuccessMsg(`✨ AI Auto-fill applied to ${storyId}: Score ${riceScore.toLocaleString()} (Reach: ${reach.toLocaleString()}, Impact: ${impact.toFixed(1)}x, Conf: ${(confidence * 100).toFixed(0)}%, Effort: ${effort}w)`);
          setTimeout(() => setSaveSuccessMsg(null), 4500);

          // Ensure calculator widget is open so PM can view and fine-tune
          setIsCalculatorOpen(true);
        }
      }
    } catch (err) {
      console.warn('AI suggestion request failed', err);
    } finally {
      setIsAutoFilling(false);
      setAutoFillingStoryId(null);
    }
  };

  // Filter & Sorted Stories
  const processedStories = useMemo(() => {
    let list = [...localStories];

    if (filterTier !== 'ALL') {
      list = list.filter(s => {
        const score = s.riceScore ?? Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2));
        return getPriorityTier(score).tier === filterTier;
      });
    }

    if (selectedPersona !== 'ALL' && personaDisplayMode === 'FILTER') {
      list = list.filter(s => (s.persona || 'General User') === selectedPersona);
    }

    if (sortByRice) {
      list.sort((a, b) => {
        const scoreA = a.riceScore ?? Math.round(((a.reach || 1000) * (a.impact || 2) * (a.confidence || 0.8)) / (a.effort || 2));
        const scoreB = b.riceScore ?? Math.round(((b.reach || 1000) * (b.impact || 2) * (b.confidence || 0.8)) / (b.effort || 2));
        return scoreB - scoreA;
      });
    }

    return list;
  }, [localStories, sortByRice, filterTier, selectedPersona, personaDisplayMode]);

  // Export Backlog Actions
  const handleExportBacklogPdf = () => {
    const artifactToExport: any = storiesArtifact || {
      taskType: 'USER_STORIES',
      version: 1,
      status: 'APPROVED',
      schemaData: {
        epicTitle: `${activeProduct?.name || 'Product'} User Stories Backlog`,
        stories: localStories
      },
      metadata: {
        approvedBy: 'Lead Product Manager',
        approvedAt: new Date().toISOString(),
        model: 'Gemini 3.5 Pro Engine'
      }
    };
    exportArtifactPdf(artifactToExport, activeProduct?.name || 'Active Product');
  };

  const handleExportBacklogMarkdown = () => {
    let md = `# ${activeProduct?.name} — Approved User Stories Backlog
**Status:** ${isApproved ? 'APPROVED' : 'OFFICIAL'}  
**Version:** v${storiesArtifact?.version || 1}.0  
**Export Date:** ${new Date().toLocaleDateString()}  

---

`;
    processedStories.forEach((s) => {
      const rice = s.riceScore || Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2));
      const easeInfo = effortToEase(s.effort || 2);
      md += `## ${s.id}: ${s.asA}
- **Persona:** ${s.persona}
- **RICE Score:** ${rice} (Reach: ${s.reach} | Impact: ${s.impact}x | Confidence: ${((s.confidence || 0.8)*100).toFixed(0)}% | Effort: ${s.effort}w | Ease: ${easeInfo.label})
- **As a** ${s.asA}
- **I want** ${s.iWant}
- **So that** ${s.soThat}

### Acceptance Criteria
${(s.acceptanceCriteria || []).map((ac: string) => `- [x] ${ac}`).join('\n')}

---
`;
    });

    const filename = `${(activeProduct?.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '_')}_stories_backlog_v${storiesArtifact?.version || 1}.md`;
    exportToMarkdown(filename, md, {
      title: `${activeProduct?.name} User Stories Backlog`,
      productName: activeProduct?.name,
      taskType: 'USER_STORIES',
      version: storiesArtifact?.version || 1,
      status: storiesArtifact?.status || 'APPROVED'
    });
  };

  // Bulk Selection & Merged Export Actions
  const handleToggleSelectStory = (id: string) => {
    setSelectedStoryIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStories = () => {
    const allIds = processedStories.map(s => s.id);
    setSelectedStoryIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedStoryIds([]);
  };

  // Quick Select Helpers
  const handleSelectByFilter = (filterType: 'ALL' | 'P0' | 'READY_FOR_DEV') => {
    if (filterType === 'ALL') {
      setSelectedStoryIds(processedStories.map(s => s.id));
    } else if (filterType === 'P0') {
      const p0Ids = processedStories.filter(s => {
        const score = s.riceScore ?? Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2));
        return getPriorityTier(score).tier === 'P0' || s.priority === 'P0';
      }).map(s => s.id);
      setSelectedStoryIds(p0Ids);
    } else if (filterType === 'READY_FOR_DEV') {
      const rdyIds = processedStories.filter(s => (s.status || 'READY_FOR_DEV') === 'READY_FOR_DEV').map(s => s.id);
      setSelectedStoryIds(rdyIds);
    }
  };

  // Bulk Status Update Handler
  const handleBulkUpdateStatus = async (newStatus: 'BACKLOG' | 'READY_FOR_DEV' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') => {
    if (selectedStoryIds.length === 0) return;

    setLocalStories(prev => prev.map(s => {
      if (selectedStoryIds.includes(s.id)) {
        return { ...s, status: newStatus };
      }
      return s;
    }));

    if (selectedStory && selectedStoryIds.includes(selectedStory.id)) {
      setSelectedStory((prev: any) => ({ ...prev, status: newStatus }));
    }

    if (storiesArtifact?.id) {
      try {
        await fetch(`/api/artifacts/${storiesArtifact.id}/stories-bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyIds: selectedStoryIds, status: newStatus })
        });
      } catch (err) {
        console.warn('Failed to persist bulk status update', err);
      }
    }

    setSaveSuccessMsg(`✨ Bulk updated status to "${newStatus.replace(/_/g, ' ')}" for ${selectedStoryIds.length} stories.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Bulk Priority Update Handler
  const handleBulkUpdatePriority = async (newPriority: 'P0' | 'P1' | 'P2' | 'P3') => {
    if (selectedStoryIds.length === 0) return;

    setLocalStories(prev => prev.map(s => {
      if (selectedStoryIds.includes(s.id)) {
        let score = s.riceScore || 1000;
        if (newPriority === 'P0' && score < 3000) score = 3600;
        else if (newPriority === 'P1') score = 2100;
        else if (newPriority === 'P2') score = 950;
        else if (newPriority === 'P3') score = 420;

        return { ...s, priority: newPriority, riceScore: score };
      }
      return s;
    }));

    if (selectedStory && selectedStoryIds.includes(selectedStory.id)) {
      setSelectedStory((prev: any) => ({ ...prev, priority: newPriority }));
    }

    if (storiesArtifact?.id) {
      try {
        await fetch(`/api/artifacts/${storiesArtifact.id}/stories-bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyIds: selectedStoryIds, priority: newPriority })
        });
      } catch (err) {
        console.warn('Failed to persist bulk priority update', err);
      }
    }

    setSaveSuccessMsg(`✨ Bulk updated priority to "${newPriority}" for ${selectedStoryIds.length} stories.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Update Single Story Status / Priority
  const handleUpdateSingleStory = async (storyId: string, updates: { status?: string; priority?: string }) => {
    setLocalStories(prev => prev.map(s => {
      if (s.id === storyId) {
        const updated = { ...s, ...updates };
        if (updates.priority) {
          if (updates.priority === 'P0') updated.riceScore = Math.max(updated.riceScore || 0, 3200);
          else if (updates.priority === 'P1') updated.riceScore = 2000;
          else if (updates.priority === 'P2') updated.riceScore = 900;
          else if (updates.priority === 'P3') updated.riceScore = 400;
        }
        return updated;
      }
      return s;
    }));

    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory((prev: any) => ({ ...prev, ...updates }));
    }

    if (storiesArtifact?.id) {
      try {
        await fetch(`/api/artifacts/${storiesArtifact.id}/stories-bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyIds: [storyId], ...updates })
        });
      } catch {}
    }
  };

  const isAllSelected = useMemo(() => {
    return processedStories.length > 0 && processedStories.every(s => selectedStoryIds.includes(s.id));
  }, [processedStories, selectedStoryIds]);

  const isSomeSelected = useMemo(() => {
    return selectedStoryIds.length > 0 && !isAllSelected;
  }, [selectedStoryIds.length, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStoryIds([]);
    } else {
      setSelectedStoryIds(processedStories.map(s => s.id));
    }
  };

  // Promote multiple user stories at once via the approval gate
  const handleBulkApprove = async () => {
    if (selectedStoryIds.length === 0) return;
    setIsBulkApproving(true);
    const nowIso = new Date().toISOString();

    try {
      // Optimistically update local stories with approval metadata
      setLocalStories(prev => prev.map(s => {
        if (selectedStoryIds.includes(s.id)) {
          return {
            ...s,
            approvalStatus: 'APPROVED',
            approvedAt: nowIso,
            approvedBy: 'Lead Product Manager',
            status: s.status === 'BACKLOG' || !s.status ? 'READY_FOR_DEV' : s.status
          };
        }
        return s;
      }));

      if (selectedStory && selectedStoryIds.includes(selectedStory.id)) {
        setSelectedStory((prev: any) => ({
          ...prev,
          approvalStatus: 'APPROVED',
          approvedAt: nowIso,
          approvedBy: 'Lead Product Manager',
          status: prev.status === 'BACKLOG' || !prev.status ? 'READY_FOR_DEV' : prev.status
        }));
      }

      if (storiesArtifact?.id) {
        const res = await fetch(`/api/artifacts/${storiesArtifact.id}/stories-bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyIds: selectedStoryIds,
            action: 'APPROVE',
            status: 'APPROVED',
            isApprovalGate: true,
            userId: 'lead_pm'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.artifact) {
            setStoriesArtifact(data.artifact);
            if (data.artifact.schemaData?.stories) {
              setLocalStories(data.artifact.schemaData.stories);
            }
          }
        }
      }

      setSaveSuccessMsg(`🚀 Human PM Approval Gate: Promoted ${selectedStoryIds.length} user stories to official specifications!`);
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } catch (err) {
      console.warn('Failed to bulk approve stories', err);
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Toggle inline version history for a story
  const handleToggleStoryHistory = (storyId: string) => {
    setExpandedHistoryStoryIds(prev => 
      prev.includes(storyId) ? prev.filter(id => id !== storyId) : [...prev, storyId]
    );
  };

  // Revert Story to a previous iteration
  const handleRevertStory = async (storyId: string, targetVersion: number) => {
    setIsRevertingStory(true);
    try {
      const targetStory = localStories.find(s => s.id === storyId);
      if (!targetStory) return;

      const history = targetStory.history || [];
      const targetRev = history.find((h: any) => h.version === targetVersion);
      if (!targetRev || !targetRev.snapshot) return;

      const currentVer = targetStory.version || history.length || 1;
      const nextVer = currentVer + 1;
      const nowIso = new Date().toISOString();

      const revertedSnapshot = { ...targetRev.snapshot };

      const newRev = {
        version: nextVer,
        timestamp: nowIso,
        author: 'Lead Product Manager',
        changeSummary: `Reverted to v${targetVersion} (${targetRev.changeSummary || 'previous iteration'})`,
        fieldsChanged: [`reverted_to_v${targetVersion}`],
        snapshot: revertedSnapshot
      };

      const updatedStory = {
        ...targetStory,
        ...revertedSnapshot,
        version: nextVer,
        history: [...history, newRev]
      };

      // Optimistically update local state
      setLocalStories(prev => prev.map(s => s.id === storyId ? updatedStory : s));

      if (selectedStory && selectedStory.id === storyId) {
        setSelectedStory(updatedStory);
      }

      if (historyModalStory && historyModalStory.id === storyId) {
        setHistoryModalStory(updatedStory);
      }

      // Persist to server
      if (storiesArtifact?.id) {
        const res = await fetch(`/api/artifacts/${storiesArtifact.id}/stories/${storyId}/revert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetVersion,
            userId: 'lead_pm'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.artifact?.schemaData?.stories) {
            setStoriesArtifact(data.artifact);
            setLocalStories(data.artifact.schemaData.stories.map(ensureStoryHistory));
          }
        }
      }

      setSaveSuccessMsg(`✨ Successfully reverted story ${storyId} to Version ${targetVersion}! (Now v${nextVer})`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      console.warn('Failed to revert story version', err);
    } finally {
      setIsRevertingStory(false);
    }
  };

  const handleBulkExportMarkdown = () => {
    const storiesToExport = localStories.filter(s => selectedStoryIds.includes(s.id));
    if (storiesToExport.length === 0) return;

    exportMultipleStoriesMarkdown(storiesToExport, activeProduct?.name || 'Product', {
      batchTitle: `${activeProduct?.name} — Selected User Stories Batch Specification`,
      version: storiesArtifact?.version || 1,
      status: storiesArtifact?.status || 'APPROVED'
    });

    setSaveSuccessMsg(`Exported ${storiesToExport.length} selected user stories as a merged Markdown specification!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleCopyStory = (story: any) => {
    const ease = effortToEase(story.effort || 2).label;
    const text = `${story.id} (${story.persona})
As a ${story.asA}
I want ${story.iWant}
So that ${story.soThat}

Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string) => `- ${ac}`).join('\n')}

RICE Score: ${story.riceScore || Math.round(((story.reach || 1000) * (story.impact || 2) * (story.confidence || 0.8)) / (story.effort || 2))}
Metrics: Reach=${story.reach || 1000} | Impact=${story.impact || 2}x | Confidence=${((story.confidence || 0.8) * 100).toFixed(0)}% | Effort=${story.effort || 2}w | Ease=${ease}`;

    navigator.clipboard.writeText(text);
    setCopiedId(story.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddStoryFromRec = (newStory: any) => {
    setLocalStories(prev => {
      if (prev.some(s => s.id === newStory.id)) return prev;
      return [...prev, newStory];
    });
    setSaveSuccessMsg(`✨ Added recommended story ${newStory.id} (${newStory.persona}) to backlog!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleOpenFormulaModal = (storyId?: string) => {
    if (storyId) {
      setModalTargetStoryId(storyId);
    }
    setIsFormulaModalOpen(true);
  };

  const handleSaveFromFormulaModal = async (storyId: string, metrics: {
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    riceScore: number;
    estimationJustification?: string;
  }) => {
    setLocalStories(prev => prev.map(s => {
      if (s.id === storyId) {
        return {
          ...s,
          reach: metrics.reach,
          impact: metrics.impact,
          confidence: metrics.confidence,
          effort: metrics.effort,
          riceScore: metrics.riceScore,
          estimationJustification: metrics.estimationJustification || s.estimationJustification
        };
      }
      return s;
    }));

    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory((prev: any) => ({
        ...prev,
        reach: metrics.reach,
        impact: metrics.impact,
        confidence: metrics.confidence,
        effort: metrics.effort,
        riceScore: metrics.riceScore,
        estimationJustification: metrics.estimationJustification || prev.estimationJustification
      }));
    }

    // Persist to server if stories artifact exists
    if (storiesArtifact?.id) {
      try {
        await fetch(`/api/artifacts/${storiesArtifact.id}/stories/${storyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reach: metrics.reach,
            impact: metrics.impact,
            confidence: metrics.confidence,
            effort: metrics.effort
          })
        });
      } catch (err) {
        console.warn('Could not persist to server', err);
      }
    }

    setSaveSuccessMsg(`✨ Calibrated RICE Score ${metrics.riceScore.toLocaleString()} applied to ${storyId}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleApplyEpicMappings = async (mappings: Array<{ storyId: string; newEpicTitle: string }>) => {
    setLocalStories(prev => prev.map(s => {
      const match = mappings.find(m => m.storyId === s.id);
      if (match) {
        return { ...s, epicTitle: match.newEpicTitle };
      }
      return s;
    }));

    if (storiesArtifact?.id) {
      try {
        await Promise.all(
          mappings.map(m =>
            fetch(`/api/artifacts/${storiesArtifact.id}/stories/${m.storyId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ epicTitle: m.newEpicTitle })
            })
          )
        );
      } catch (err) {
        console.warn('Could not persist epic titles to server', err);
      }
    }

    setSaveSuccessMsg(`✨ Applied AI Smart Suggest epic mappings to ${mappings.length} stories!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const activeCalcStory = localStories.find(s => s.id === selectedCalcStoryId) || localStories[0];
  const calculatedTier = getPriorityTier(computedRiceScore);
  const activeEaseInfo = effortToEase(calcEffort);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <ListTodo className="w-6 h-6 text-purple-400" />
              <span>User Stories & Backlog</span>
            </h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {storiesArtifact ? `${storiesArtifact.status} v${storiesArtifact.version}.0` : 'APPROVED SPEC'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Persona-mapped user stories with Gherkin acceptance criteria, quantified RICE prioritization, and instant PDF/Markdown exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedProductId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Toggle RICE Calculator Widget Button */}
          <button
            onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isCalculatorOpen 
                ? 'bg-purple-900/60 text-purple-200 border-purple-600/70 shadow-purple-950/50 shadow-sm' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle RICE Score Calculator Widget"
          >
            <Calculator className="w-3.5 h-3.5 text-purple-400" />
            <span>RICE Calculator</span>
            {isCalculatorOpen ? <ChevronUp className="w-3 h-3 text-purple-400 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>

          {/* Toggle RICE Historical Trend Line Chart */}
          <button
            onClick={() => setShowTrendChart(!showTrendChart)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showTrendChart 
                ? 'bg-cyan-950/80 text-cyan-200 border-cyan-600/70 shadow-cyan-950/50 shadow-sm' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle RICE Score Historical Trend Line Chart"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Trend Chart</span>
            {showTrendChart ? <ChevronUp className="w-3 h-3 text-cyan-400 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>

          {/* Toggle RICE Score Analytics Panel */}
          <button
            onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showAnalyticsPanel 
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600/70 shadow-emerald-950/50 shadow-sm' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle RICE Score Distribution & Strategic Gap Analytics"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>RICE Analytics</span>
            {showAnalyticsPanel ? <ChevronUp className="w-3 h-3 text-emerald-400 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>

          {/* Toggle AI Next Best Action Recommendations */}
          <button
            onClick={() => setShowNextBestActions(!showNextBestActions)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showNextBestActions 
                ? 'bg-purple-950/80 text-purple-200 border-purple-600/70 shadow-purple-950/50 shadow-sm' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle AI Next Best Action & Story Dependency Recommendations"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
            <span>Next Best Actions</span>
            {showNextBestActions ? <ChevronUp className="w-3 h-3 text-purple-400 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>

          {/* Export Approved Backlog Actions */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-xs">
            {selectedStoryIds.length > 0 && (
              <button
                onClick={handleBulkExportMarkdown}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                title={`Export ${selectedStoryIds.length} Selected Stories as merged Markdown`}
              >
                <FileDown className="w-3.5 h-3.5 text-white" />
                <span>Export Selected ({selectedStoryIds.length})</span>
              </button>
            )}
            <button
              onClick={handleExportBacklogPdf}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/80 transition-colors shadow-xs"
              title="Export Full Approved Backlog as PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleExportBacklogMarkdown}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              title="Export Backlog as Markdown"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export .md</span>
            </button>
          </div>

          {/* Standalone RICE Formula Calculator Modal Trigger */}
          <button
            onClick={() => handleOpenFormulaModal(selectedCalcStoryId)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all transform active:scale-95"
            title="Open standalone RICE Formula Calculator Modal"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-200" />
            <span>Formula Modal</span>
          </button>

          {/* AI-driven Smart Suggest: Epic Mapping Button */}
          <button
            onClick={() => setIsSmartEpicModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all transform active:scale-95 cursor-pointer"
            title="AI Smart Suggest: Cluster user stories into strategic Epics based on narrative context"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
            <span>Smart Suggest Epics</span>
          </button>

          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Stories</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC RICE SCORE CALCULATOR WIDGET */}
      {isCalculatorOpen && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/30 shadow-xl space-y-6 relative overflow-hidden transition-all">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-96 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-36 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Calculator Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
                <Calculator className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 tracking-tight">
                    RICE Score Prioritization Calculator
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Dynamic Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Model Reach, Impact, Confidence, and Ease metrics to quantitatively prioritize product roadmap backlog.
                </p>
              </div>
            </div>

            {/* Story Picker & Save Action */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-400">Target Story:</label>
                <select
                  value={selectedCalcStoryId}
                  onChange={(e) => handleSelectStoryForCalc(e.target.value)}
                  className="bg-slate-950 text-xs font-bold text-purple-300 border border-purple-500/40 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-400"
                >
                  {localStories.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id}: {s.persona} ({s.asA.slice(0, 32)}...)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleResetCalculator}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                title="Reset sliders to baseline values"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              {/* AI Quick Auto-fill Button */}
              <button
                onClick={() => handleAiAutoFill(selectedCalcStoryId)}
                disabled={isAutoFilling}
                className="px-3 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group"
                title="Use AI to analyze user story description and suggest baseline RICE metrics"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform ${isAutoFilling ? 'animate-spin' : ''}`} />
                <span>{isAutoFilling ? 'Analyzing...' : 'AI Auto-fill'}</span>
              </button>

              <button
                onClick={() => handleApplyCalculatedMetrics()}
                disabled={isSavingScore}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/60 flex items-center gap-1.5 transition-all transform active:scale-95"
              >
                {isSavingScore ? (
                  <span className="flex items-center gap-1.5">Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Apply to {selectedCalcStoryId}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Analysis & Baseline Recommendation Banner */}
          {aiAnalysisDetails && aiAnalysisDetails.storyId === selectedCalcStoryId && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Suggested Baseline ({aiAnalysisDetails.model})</span>
                </span>
                <span className="text-[10px] text-purple-300/80 font-mono">
                  Target: {selectedCalcStoryId}
                </span>
              </div>
              <p className="text-xs text-slate-200 italic leading-relaxed">
                "{aiAnalysisDetails.justification}"
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400 pt-1 border-t border-purple-500/20">
                <div><strong className="text-purple-300">Reach:</strong> {aiAnalysisDetails.reachReasoning || `${calcReach.toLocaleString()} users/quarter`}</div>
                <div><strong className="text-cyan-300">Impact:</strong> {aiAnalysisDetails.impactReasoning || `${calcImpact.toFixed(1)}x multiplier`}</div>
                <div><strong className="text-emerald-300">Confidence:</strong> {aiAnalysisDetails.confidenceReasoning || `${(calcConfidence * 100).toFixed(0)}% certainty`}</div>
                <div><strong className="text-amber-300">Effort:</strong> {aiAnalysisDetails.effortReasoning || `${calcEffort}w (${calcEaseScore}/10 Ease)`}</div>
              </div>
            </div>
          )}

          {/* Success Toast Banner */}
          {saveSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Interactive Calculator Formula Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            {/* 1. Reach Slider */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Reach (R)
                </span>
                <span className="font-mono font-bold text-xs text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {calcReach.toLocaleString()} users
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="25000"
                step="250"
                value={calcReach}
                onChange={(e) => setCalcReach(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              {/* Presets */}
              <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                <button 
                  onClick={() => setCalcReach(1000)}
                  className={`px-1.5 py-0.5 rounded ${calcReach === 1000 ? 'bg-purple-900 text-purple-200 font-bold' : 'hover:bg-slate-800'}`}
                >
                  1k
                </button>
                <button 
                  onClick={() => setCalcReach(3500)}
                  className={`px-1.5 py-0.5 rounded ${calcReach === 3500 ? 'bg-purple-900 text-purple-200 font-bold' : 'hover:bg-slate-800'}`}
                >
                  3.5k
                </button>
                <button 
                  onClick={() => setCalcReach(5000)}
                  className={`px-1.5 py-0.5 rounded ${calcReach === 5000 ? 'bg-purple-900 text-purple-200 font-bold' : 'hover:bg-slate-800'}`}
                >
                  5k
                </button>
                <button 
                  onClick={() => setCalcReach(10000)}
                  className={`px-1.5 py-0.5 rounded ${calcReach === 10000 ? 'bg-purple-900 text-purple-200 font-bold' : 'hover:bg-slate-800'}`}
                >
                  10k
                </button>
                <button 
                  onClick={() => setCalcReach(20000)}
                  className={`px-1.5 py-0.5 rounded ${calcReach === 20000 ? 'bg-purple-900 text-purple-200 font-bold' : 'hover:bg-slate-800'}`}
                >
                  20k
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Projected customers or workflow events affected per quarter.
              </p>
            </div>

            {/* 2. Impact Slider & Segments */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Impact (I)
                </span>
                <span className="font-mono font-bold text-xs text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {calcImpact.toFixed(1)}x multiplier
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.25"
                value={calcImpact}
                onChange={(e) => setCalcImpact(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              {/* Presets */}
              <div className="grid grid-cols-5 gap-1 text-[9px] text-center font-semibold">
                <button
                  onClick={() => setCalcImpact(0.25)}
                  className={`py-0.5 rounded ${calcImpact === 0.25 ? 'bg-cyan-900 text-cyan-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Minimal impact (0.25x)"
                >
                  0.25
                </button>
                <button
                  onClick={() => setCalcImpact(0.5)}
                  className={`py-0.5 rounded ${calcImpact === 0.5 ? 'bg-cyan-900 text-cyan-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Low impact (0.5x)"
                >
                  0.5
                </button>
                <button
                  onClick={() => setCalcImpact(1.0)}
                  className={`py-0.5 rounded ${calcImpact === 1.0 ? 'bg-cyan-900 text-cyan-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Medium impact (1.0x)"
                >
                  1.0
                </button>
                <button
                  onClick={() => setCalcImpact(2.0)}
                  className={`py-0.5 rounded ${calcImpact === 2.0 ? 'bg-cyan-900 text-cyan-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="High impact (2.0x)"
                >
                  2.0
                </button>
                <button
                  onClick={() => setCalcImpact(3.0)}
                  className={`py-0.5 rounded ${calcImpact === 3.0 ? 'bg-cyan-900 text-cyan-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Massive impact (3.0x)"
                >
                  3.0
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {calcImpact >= 3 ? 'Massive delight & enterprise unlock' : calcImpact >= 2 ? 'Major conversion or retention increase' : calcImpact >= 1 ? 'Noticeable operational improvement' : 'Minor convenience / incremental'}
              </p>
            </div>

            {/* 3. Confidence Slider */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Confidence (C)
                </span>
                <span className="font-mono font-bold text-xs text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {Math.round(calcConfidence * 100)}% certainty
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={calcConfidence}
                onChange={(e) => setCalcConfidence(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              {/* Presets */}
              <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-semibold">
                <button
                  onClick={() => setCalcConfidence(0.2)}
                  className={`py-0.5 rounded ${calcConfidence === 0.2 ? 'bg-emerald-900 text-emerald-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Moonshot (20%)"
                >
                  20%
                </button>
                <button
                  onClick={() => setCalcConfidence(0.5)}
                  className={`py-0.5 rounded ${calcConfidence === 0.5 ? 'bg-emerald-900 text-emerald-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Low confidence (50%)"
                >
                  50%
                </button>
                <button
                  onClick={() => setCalcConfidence(0.8)}
                  className={`py-0.5 rounded ${calcConfidence === 0.8 ? 'bg-emerald-900 text-emerald-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="Medium confidence (80%)"
                >
                  80%
                </button>
                <button
                  onClick={() => setCalcConfidence(1.0)}
                  className={`py-0.5 rounded ${calcConfidence === 1.0 ? 'bg-emerald-900 text-emerald-200 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  title="High certainty (100%)"
                >
                  100%
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {calcConfidence >= 0.9 ? 'Validated by production analytics & beta testing' : calcConfidence >= 0.7 ? 'Backed by customer interviews & telemetry' : 'Unvalidated hypothesis or early signal'}
              </p>
            </div>

            {/* 4. Ease & Effort Dual Metric Slider */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Ease & Effort (E)
                </span>
                <span className="font-mono font-bold text-xs text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {calcEffort} wks ({activeEaseInfo.score}/10)
                </span>
              </div>
              
              {/* Effort person-weeks slider */}
              <div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={calcEffort}
                  onChange={(e) => handleEffortChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Ease Metric Pill */}
              <div className={`p-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-between ${activeEaseInfo.badge}`}>
                <span>{activeEaseInfo.label}</span>
                <span className="font-mono">{calcEffort} person-wks</span>
              </div>

              <p className="text-[10px] text-slate-500 leading-tight">
                {activeEaseInfo.description}
              </p>
            </div>
          </div>

          {/* Mathematical RICE Scorecard Live Result */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-purple-400" />
                Live Deterministic RICE Formula
              </span>
              <div className="font-mono text-xs sm:text-sm text-slate-200 flex flex-wrap items-center gap-1.5">
                <span className="text-purple-300">({calcReach.toLocaleString()} Reach)</span>
                <span>×</span>
                <span className="text-cyan-300">({calcImpact.toFixed(1)} Impact)</span>
                <span>×</span>
                <span className="text-emerald-300">({(calcConfidence * 100).toFixed(0)}% Conf)</span>
                <span>÷</span>
                <span className="text-amber-300">({calcEffort}w Effort)</span>
                <span>=</span>
                <span className="text-lg font-black text-white px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700/60 shadow-xs">
                  {computedRiceScore.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Score Tier Badge and Instant Apply */}
            <div className="flex items-center gap-3 shrink-0">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 ${calculatedTier.badge} ${calculatedTier.glow} shadow-sm`}>
                <Zap className="w-3.5 h-3.5" />
                <span>{calculatedTier.label}</span>
              </div>

              <button
                onClick={() => handleApplyCalculatedMetrics()}
                disabled={isSavingScore}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950/50 flex items-center gap-1.5 transition-all transform active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply to Story {selectedCalcStoryId}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL RICE TREND LINE CHART COMPONENT */}
      {showTrendChart && (
        <RiceTrendChart 
          stories={localStories} 
          activeStoryId={selectedCalcStoryId} 
          onSelectStory={handleSelectStoryForCalc}
          productName={activeProduct?.name}
        />
      )}

      {/* RICE SCORE ANALYTICS & HIGH-IMPACT GAP DETECTOR */}
      {showAnalyticsPanel && (
        <RiceScoreAnalytics 
          stories={localStories}
          productName={activeProduct?.name}
          onSelectStory={handleSelectStoryForCalc}
        />
      )}

      {/* AI NEXT BEST ACTION & STORY DEPENDENCY RECOMMENDATIONS */}
      {showNextBestActions && (
        <StoryNextBestActions 
          stories={localStories}
          productName={activeProduct?.name}
          productContext={activeProduct?.description}
          onAddStoryToBacklog={handleAddStoryFromRec}
        />
      )}

      {/* FILTER & SORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Select All Checkbox */}
          <label 
            className={`flex items-center gap-2 cursor-pointer select-none px-2.5 py-1 rounded-lg border transition-all text-xs font-semibold ${
              isAllSelected 
                ? 'bg-purple-950/80 border-purple-600 text-purple-200 shadow-xs' 
                : isSomeSelected 
                ? 'bg-purple-950/40 border-purple-800 text-purple-300' 
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
            title={isAllSelected ? "Deselect all visible stories" : "Select all visible stories"}
          >
            <input
              type="checkbox"
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 accent-purple-500 cursor-pointer"
            />
            <span className="text-[11px] font-bold">Select All</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60 font-bold">
              {selectedStoryIds.length}/{processedStories.length}
            </span>
          </label>

          {/* Quick Select Buttons */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px]">Quick:</span>
            <button
              onClick={() => handleSelectByFilter('P0')}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/50 transition-colors"
            >
              + P0
            </button>
            <button
              onClick={() => handleSelectByFilter('READY_FOR_DEV')}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/50 transition-colors"
            >
              + Ready for Dev
            </button>
            {selectedStoryIds.length > 0 && (
              <button
                onClick={handleClearSelection}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-colors"
              >
                Clear ({selectedStoryIds.length})
              </button>
            )}
          </div>

          {/* Bulk Approve Button in Toolbar */}
          {selectedStoryIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 border border-emerald-400/40"
              title={`Promote all ${selectedStoryIds.length} selected stories via Human PM Approval Gate`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
              <span>{isBulkApproving ? 'Approving...' : `Bulk Approve (${selectedStoryIds.length})`}</span>
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                Approval Gate
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Backlog Prioritization:</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {processedStories.length} of {localStories.length} stories
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Flat List vs Functional Modules (AI Clustered) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold">
            <button
              onClick={() => setViewMode('FLAT')}
              className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'FLAT'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard flat backlog list"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Flat List</span>
            </button>
            <button
              onClick={() => {
                setViewMode('MODULES');
                if (functionalModules.length === 0) {
                  clusterStories();
                }
              }}
              className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'MODULES'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Group related user stories into Functional Modules based on shared theme and persona"
            >
              <Boxes className="w-3.5 h-3.5 text-purple-300" />
              <span>Functional Modules</span>
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-purple-900 text-purple-200">
                AI Clustered
              </span>
            </button>
          </div>

          {/* Version History Toggle Button */}
          <button
            onClick={() => {
              if (expandedHistoryStoryIds.length > 0) {
                setExpandedHistoryStoryIds([]);
              } else {
                setExpandedHistoryStoryIds(processedStories.map(s => s.id));
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
              expandedHistoryStoryIds.length > 0
                ? 'bg-purple-950 text-purple-200 border-purple-700 shadow-xs'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="Toggle previous iterations and revision history timeline across stories"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>{expandedHistoryStoryIds.length > 0 ? 'Hide Revisions' : 'Version History'}</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-purple-900/60 text-purple-300 border border-purple-700/60">
              Rollback
            </span>
          </button>

          {/* AI Estimate KPIs Button */}
          <button
            onClick={() => fetchKpiEstimations()}
            disabled={isLoadingKpis}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Use AI to estimate how each user story contributes to product KPIs"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isLoadingKpis ? 'Estimating...' : 'AI KPI Preview'}</span>
          </button>

          {/* AI Suggestion Engine Button */}
          <button
            onClick={() => setIsSuggestionEngineOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-900/90 to-purple-900/90 hover:from-indigo-800 hover:to-purple-800 text-indigo-100 border border-indigo-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-950/40"
            title="AI Suggestion Engine: Automatically recommends Value, Effort, and Confidence updates based on Persona data & historical RICE trends"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI Suggestion Engine</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
              Value · Effort · Conf
            </span>
          </button>

          {/* AI Confidence Audit Button */}
          <button
            onClick={() => setIsConfidenceAuditOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800/70 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="AI Confidence Audit: Analyzes rationale against historical delivery telemetry & suggests adjustments"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>Confidence Audit</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-purple-900 text-purple-200">
              Telemetry
            </span>
          </button>

          {/* AI Dependency Mapper Button */}
          <button
            onClick={() => setIsDependencyMapperOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="AI Dependency Mapper: Visualizes inter-story dependencies and critical path bottlenecks"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dependency Mapper</span>
          </button>

          {/* Sprint Velocity Predictor Toggle Button */}
          <button
            onClick={() => setShowSprintPredictor(!showSprintPredictor)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              showSprintPredictor
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700 font-bold shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Sprint Velocity Predictor & Capacity Planner"
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>Velocity Predictor</span>
          </button>

          {/* Re-cluster Modules Button if in Modules mode */}
          {viewMode === 'MODULES' && (
            <button
              onClick={() => clusterStories()}
              disabled={isClustering}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Re-cluster stories into functional modules with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isClustering ? 'Clustering...' : 'Re-Cluster'}</span>
            </button>
          )}

          {/* Priority Tier Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold">
            {(['ALL', 'P0', 'P1', 'P2', 'P3'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  filterTier === tier 
                    ? 'bg-purple-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortByRice(!sortByRice)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              sortByRice 
                ? 'bg-purple-950/80 text-purple-300 border-purple-800/80 shadow-xs' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Sort stories by RICE priority score"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortByRice ? 'Sorted by RICE (Highest ROI)' : 'Original Order'}</span>
          </button>
        </div>
      </div>

      {/* SPRINT VELOCITY PREDICTOR */}
      {showSprintPredictor && (
        <SprintVelocityPredictor
          stories={localStories}
          onCommitScope={(ids) => {
            setSelectedStoryIds(ids);
          }}
        />
      )}

      {/* BULK ACTION TOOLBAR (SELECTION & BATCH UPDATING) */}
      {selectedStoryIds.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-950 border border-purple-500/50 shadow-2xl shadow-purple-950/40 space-y-3 animate-in fade-in slide-in-from-top-2">
          
          {/* Top Row: Counter, Selection Helpers, and Export Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-purple-900/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 font-bold font-mono text-sm shadow-inner">
                {selectedStoryIds.length}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">
                    {selectedStoryIds.length} of {localStories.length} {selectedStoryIds.length === 1 ? 'Story' : 'Stories'} Selected
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Bulk Editing Ready
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Batch update lifecycle status and priority tiers, or export merged specifications.
                </p>
              </div>
            </div>

            {/* Quick Selection Helpers & Approval Gate */}
            <div className="flex flex-wrap items-center gap-2">
              <label 
                className={`flex items-center gap-2 cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-all text-xs font-semibold ${
                  isAllSelected 
                    ? 'bg-purple-900/80 border-purple-500 text-purple-200 shadow-xs' 
                    : isSomeSelected 
                    ? 'bg-purple-950/40 border-purple-800 text-purple-300' 
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
                title={isAllSelected ? "Deselect all visible stories" : "Select all visible stories"}
              >
                <input
                  type="checkbox"
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 accent-purple-500 cursor-pointer"
                />
                <span className="text-[11px] font-bold">Select All</span>
              </label>

              <button
                onClick={() => handleSelectByFilter('P0')}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-800/60 transition-colors"
                title="Select all P0 stories"
              >
                Select P0
              </button>
              <button
                onClick={() => handleSelectByFilter('READY_FOR_DEV')}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 text-xs font-semibold border border-cyan-800/60 transition-colors"
                title="Select all Ready for Dev stories"
              >
                Select Ready for Dev
              </button>
              <button
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors"
              >
                Clear
              </button>

              {/* Bulk Approve Button */}
              <button
                onClick={handleBulkApprove}
                disabled={isBulkApproving}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 border border-emerald-400/40 ml-1"
                title={`Promote all ${selectedStoryIds.length} selected stories via Human PM Approval Gate`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>{isBulkApproving ? 'Approving...' : `Bulk Approve (${selectedStoryIds.length})`}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-200 border border-emerald-700/60 font-bold">
                  Gate Pass
                </span>
              </button>

              <button
                onClick={handleBulkExportMarkdown}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                title="Export selected stories as a merged Markdown specification"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>Export Markdown ({selectedStoryIds.length})</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Bulk Updating Controls for Status and Priority */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 text-xs">
            {/* Bulk Status Updater */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bulk Status:</span>
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={isBulkApproving}
                className="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border-emerald-600/80 shadow-xs flex items-center gap-1"
                title={`Promote and approve all ${selectedStoryIds.length} selected stories via Human PM Approval Gate`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>APPROVED (GATE)</span>
              </button>
              {(['BACKLOG', 'READY_FOR_DEV', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => handleBulkUpdateStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                    st === 'READY_FOR_DEV' ? 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-700/80' :
                    st === 'IN_PROGRESS' ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700/80' :
                    st === 'IN_REVIEW' ? 'bg-purple-950/80 hover:bg-purple-900 text-purple-300 border-purple-700/80' :
                    st === 'DONE' ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/80' :
                    'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
                  }`}
                  title={`Set status to ${st.replace(/_/g, ' ')} for all ${selectedStoryIds.length} selected stories`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Bulk Priority Updater */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>Bulk Priority:</span>
              </span>
              {(['P0', 'P1', 'P2', 'P3'] as const).map((pr) => (
                <button
                  key={pr}
                  onClick={() => handleBulkUpdatePriority(pr)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                    pr === 'P0' ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/80' :
                    pr === 'P1' ? 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-700/80' :
                    pr === 'P2' ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700/80' :
                    'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-750'
                  }`}
                  title={`Set priority to ${pr} for all ${selectedStoryIds.length} selected stories`}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* CUSTOMER PERSONA FILTER & HIGHLIGHTING BAR */}
      <PersonaFilterBar
        stories={localStories}
        selectedPersona={selectedPersona}
        onSelectPersona={setSelectedPersona}
        displayMode={personaDisplayMode}
        onChangeDisplayMode={setPersonaDisplayMode}
      />

      {/* BACKLOG USER STORIES LIST: FLAT VIEW VS FUNCTIONAL MODULES (AI CLUSTERED) */}
      {(() => {
        const renderStoryCard = (story: any, idx: number) => {
          const riceScore = story.riceScore || Math.round(((story.reach || 1000) * (story.impact || 2) * (story.confidence || 0.8)) / (story.effort || 1));
          const tierInfo = getPriorityTier(riceScore);
          const easeInfo = effortToEase(story.effort || 2);
          const isInlineCalcOpen = inlineCalculatorStoryId === story.id;
          const isSelected = selectedStoryIds.includes(story.id);

          const isPersonaMatch = selectedPersona === 'ALL' || (story.persona || 'General User') === selectedPersona;
          const isPersonaHighlighted = selectedPersona !== 'ALL' && isPersonaMatch;
          const isPersonaDimmed = selectedPersona !== 'ALL' && personaDisplayMode === 'HIGHLIGHT' && !isPersonaMatch;

          // KPI Impact Estimate for this story
          const kpi = kpiEstimates[story.id] || {
            primaryKpi: (story.epicTitle || '').toLowerCase().includes('underwriting') || (story.epicTitle || '').toLowerCase().includes('checkout')
              ? 'Wholesale Cart Conversion Rate'
              : (story.epicTitle || '').toLowerCase().includes('sync') || (story.epicTitle || '').toLowerCase().includes('erp')
              ? 'ERP Webhook Sync SLA Uptime'
              : 'Credit Underwriting Decision Latency',
            metricType: (story.epicTitle || '').toLowerCase().includes('sync') ? 'Efficiency' : 'Conversion',
            estimatedImpact: (story.epicTitle || '').toLowerCase().includes('sync') ? '+99.95% SLA' : '+4.2% Lift',
            confidenceScore: 94,
            rationale: `Contributes to ${activeProduct?.name || 'product'} top-level metrics by reducing operational friction and accelerating user cycle time.`
          };

          return (
            <div 
              key={story.id} 
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 space-y-4 shadow-sm relative ${
                isPersonaHighlighted
                  ? 'bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border-purple-500 shadow-lg shadow-purple-950/50 ring-2 ring-purple-500/70 scale-[1.006]'
                  : isPersonaDimmed
                  ? 'opacity-35 bg-slate-950/60 border-slate-850 hover:opacity-75'
                  : isSelected 
                  ? 'bg-slate-900 border-purple-500/80 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/40' 
                  : isInlineCalcOpen 
                  ? 'bg-slate-900/90 border-purple-500/50 shadow-purple-950/40' 
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Selection Checkbox */}
                  <label 
                    className="flex items-center gap-1.5 cursor-pointer select-none group"
                    title={`Select ${story.id} for bulk Markdown export`}
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectStory(story.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 accent-purple-500 cursor-pointer"
                    />
                  </label>

                  {/* Rank Badge if sorted */}
                  {sortByRice && (
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      #{idx + 1}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold shadow-xs border ${
                    isSelected ? 'bg-purple-900 text-purple-200 border-purple-600' : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                  }`}>
                    {story.id}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>{story.persona}</span>
                  </span>
                  {isPersonaHighlighted && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 animate-pulse shadow-xs">
                      <UserCheck className="w-3 h-3 text-purple-400" />
                      <span>Segment Match</span>
                    </span>
                  )}
                  {story.epicTitle && (
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      · {story.epicTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Approval Gate Badge */}
                  {(story.approvalStatus === 'APPROVED' || (isApproved && story.approvalStatus !== 'REJECTED')) && (
                    <span 
                      className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80 flex items-center gap-1 shadow-xs" 
                      title={`Promoted via Human PM Approval Gate${story.approvedBy ? ` by ${story.approvedBy}` : ''}${story.approvedAt ? ` on ${new Date(story.approvedAt).toLocaleDateString()}` : ''}`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>APPROVED (GATE)</span>
                    </span>
                  )}

                  {/* Story Status Selector Badge */}
                  <div className="flex items-center">
                    <select
                      value={story.status || 'READY_FOR_DEV'}
                      onChange={(e) => handleUpdateSingleStory(story.id, { status: e.target.value })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border cursor-pointer focus:outline-none transition-colors ${
                        story.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-200 border-emerald-600' :
                        story.status === 'DONE' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' :
                        story.status === 'IN_PROGRESS' ? 'bg-amber-950/80 text-amber-300 border-amber-700' :
                        story.status === 'IN_REVIEW' ? 'bg-purple-950/80 text-purple-300 border-purple-700' :
                        story.status === 'BACKLOG' ? 'bg-slate-950 text-slate-400 border-slate-800' :
                        'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                      }`}
                      title="Update Story Status"
                    >
                      <option value="BACKLOG">Backlog</option>
                      <option value="READY_FOR_DEV">Ready for Dev</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                      <option value="APPROVED">Approved (Gate)</option>
                    </select>
                  </div>

                  {/* Priority Tier Selector Badge */}
                  <div className="flex items-center">
                    <select
                      value={story.priority || tierInfo.tier}
                      onChange={(e) => handleUpdateSingleStory(story.id, { priority: e.target.value })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border cursor-pointer focus:outline-none transition-colors ${tierInfo.badge}`}
                      title="Update Priority Tier"
                    >
                      <option value="P0">P0 (Critical)</option>
                      <option value="P1">P1 (High)</option>
                      <option value="P2">P2 (Medium)</option>
                      <option value="P3">P3 (Low)</option>
                    </select>
                  </div>

                  {/* Ease Pill */}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border hidden md:inline-flex ${easeInfo.badge}`}>
                    Ease: {easeInfo.score}/10 ({story.effort || 2}w)
                  </span>

                  {/* RICE Pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-mono font-bold shadow-xs">
                    <Sliders className="w-3 h-3 text-emerald-400" />
                    <span>RICE:</span>
                    <span className="text-emerald-200">{riceScore.toLocaleString()}</span>
                  </div>

                  {/* Actions: Inline Calculator, View Details, Export PDF, Export MD */}
                  <div className="flex items-center gap-1.5">
                    {/* AI Quick Auto-fill Button on Story Card */}
                    <button
                      onClick={() => handleAiAutoFill(story.id)}
                      disabled={isAutoFilling && autoFillingStoryId === story.id}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="AI Quick Auto-fill RICE baseline for this story"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isAutoFilling && autoFillingStoryId === story.id ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isAutoFilling && autoFillingStoryId === story.id ? 'Analyzing...' : 'Auto-fill'}</span>
                    </button>

                    {/* Inline Quick Calculator Button */}
                    <button
                      onClick={() => {
                        if (isInlineCalcOpen) {
                          setInlineCalculatorStoryId(null);
                        } else {
                          setInlineCalculatorStoryId(story.id);
                          handleSelectStoryForCalc(story.id);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        isInlineCalcOpen
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60'
                      }`}
                      title="Adjust RICE metrics for this story"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{isInlineCalcOpen ? 'Close Calc' : 'Calculate'}</span>
                    </button>

                    {/* Standalone Formula Modal Button on Story Card */}
                    <button
                      onClick={() => handleOpenFormulaModal(story.id)}
                      className="px-2 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Open standalone RICE Formula Calculator modal for this story"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden lg:inline">Calibrate Modal</span>
                    </button>

                    {/* AI Impact Forecast Button on Story Card */}
                    <button
                      onClick={() => {
                        setForecastTargetStory(story);
                        setIsImpactForecastOpen(true);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="AI Impact Forecast: Implemented vs. Ignored Simulation"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Impact Forecast</span>
                    </button>

                    {/* AI Suggest Scores Button on Story Card */}
                    <button
                      onClick={() => setIsSuggestionEngineOpen(true)}
                      className="px-2 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="AI Suggestion Engine: Recommend Value, Effort, and Confidence updates based on Persona data & historical RICE trends"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Suggest Scores</span>
                    </button>

                    {/* Version History Toggle Button */}
                    <button
                      onClick={() => handleToggleStoryHistory(story.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        expandedHistoryStoryIds.includes(story.id)
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700/80'
                      }`}
                      title={`Toggle Version History for ${story.id} (${(story.history?.length || 3)} iterations)`}
                    >
                      <History className="w-3.5 h-3.5 text-purple-400" />
                      <span>v{story.version || (story.history ? story.history.length : 3)}</span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800/60 hidden sm:inline">
                        {(story.history?.length || 3)} revs
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedStory(story)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="View Story Specification Details"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    <button
                      onClick={() => exportSingleStoryPdf(story, activeProduct?.name || 'Active Product')}
                      className="px-2 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/80 flex items-center gap-1 transition-colors"
                      title="Export this Story as PDF"
                    >
                      <FileDown className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={() => exportSingleStoryMarkdown(story, activeProduct?.name || 'Active Product')}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Export this Story as Markdown"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>.md</span>
                    </button>

                    <button
                      onClick={() => handleCopyStory(story)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Copy Story Text"
                    >
                      {copiedId === story.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Story Statement Block */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs text-slate-200 leading-relaxed font-sans">
                <p><strong className="text-purple-300 font-semibold">As a</strong> {story.asA}</p>
                <p><strong className="text-purple-300 font-semibold">I want</strong> {story.iWant}</p>
                <p><strong className="text-purple-300 font-semibold">So that</strong> {story.soThat}</p>
              </div>

              {/* INLINE VERSION HISTORY DRAWER */}
              {expandedHistoryStoryIds.includes(story.id) && (
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-purple-500/50 shadow-inner space-y-3.5 animate-in fade-in slide-in-from-top-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-slate-200 text-xs sm:text-sm">
                        Version History & Previous Iterations ({story.id})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                        v{story.version || (story.history ? story.history.length : 3)} Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistoryModalStory(story)}
                        className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-900 text-purple-200 text-xs font-semibold border border-purple-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Open detailed side-by-side diff modal"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-300" />
                        <span>Compare Diffs Modal</span>
                      </button>

                      <button
                        onClick={() => handleToggleStoryHistory(story.id)}
                        className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title="Close History Drawer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Iterations Timeline List */}
                  <div className="space-y-3">
                    {(story.history || []).slice().reverse().map((rev: any) => {
                      const isCurrent = rev.version === (story.version || 3);
                      const snap = rev.snapshot || story;

                      return (
                        <div
                          key={rev.version}
                          className={`p-3 sm:p-4 rounded-xl border text-xs transition-all ${
                            isCurrent
                              ? 'bg-purple-950/20 border-purple-600/70 shadow-xs'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-855 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                                isCurrent
                                  ? 'bg-purple-900 text-purple-200 border-purple-600'
                                  : 'bg-slate-950 text-slate-300 border-slate-800'
                              }`}>
                                v{rev.version}.0
                              </span>

                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  LIVE SPEC
                                </span>
                              )}

                              <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                                <User className="w-3 h-3 text-purple-400" />
                                <span>{rev.author || 'Product Lead'}</span>
                              </span>

                              <span className="text-[10px] text-slate-500">
                                {new Date(rev.timestamp).toLocaleString()}
                              </span>
                            </div>

                            {/* Revert Button for historical versions */}
                            {!isCurrent && (
                              <button
                                onClick={() => handleRevertStory(story.id, rev.version)}
                                disabled={isRevertingStory}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm shadow-emerald-950/50 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
                                title={`Revert ${story.id} to Version ${rev.version}`}
                              >
                                <RotateCcw className={`w-3 h-3 text-emerald-100 ${isRevertingStory ? 'animate-spin' : ''}`} />
                                <span>Revert to v{rev.version}</span>
                              </button>
                            )}
                          </div>

                          <div className="pt-2 space-y-1.5">
                            <p className="text-slate-300 font-medium text-[11px]">
                              {rev.changeSummary}
                            </p>

                            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-850 space-y-1 text-slate-300 font-sans text-[11px]">
                              <p><strong className="text-purple-400 font-semibold">As a</strong> {snap.asA}</p>
                              <p><strong className="text-purple-400 font-semibold">I want</strong> {snap.iWant}</p>
                              <p><strong className="text-purple-400 font-semibold">So that</strong> {snap.soThat}</p>
                            </div>

                            <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-400 flex-wrap">
                              <span>RICE: <strong className="text-emerald-300">{snap.riceScore?.toLocaleString() || '1,000'}</strong></span>
                              <span>·</span>
                              <span>Reach: <strong className="text-slate-200">{snap.reach?.toLocaleString()}</strong></span>
                              <span>·</span>
                              <span>Effort: <strong className="text-slate-200">{snap.effort || 2}w</strong></span>
                              <span>·</span>
                              <span>Priority: <strong className="text-purple-300">{snap.priority || 'P1'}</strong></span>
                              {snap.acceptanceCriteria && (
                                <>
                                  <span>·</span>
                                  <span>{snap.acceptanceCriteria.length} Acceptance Criteria</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* INLINE KPI IMPACT PREVIEW COLUMN */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        KPI Impact Preview:
                      </span>
                      <span className="font-bold text-slate-100">
                        {kpi.primaryKpi}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        kpi.metricType === 'Efficiency' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' :
                        kpi.metricType === 'Revenue' ? 'bg-purple-950 text-purple-300 border border-purple-800/60' :
                        kpi.metricType === 'Risk Reduction' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      }`}>
                        {kpi.metricType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {kpi.rationale}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono">
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 block">
                      {kpi.estimatedImpact}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {kpi.confidenceScore}% AI Confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* INLINE EXPANDED RICE CALCULATOR PANEL */}
              {isInlineCalcOpen && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Interactive Metrics Tuner for {story.id}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      Live RICE: {computedRiceScore.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    {/* Reach */}
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-purple-300">
                        <span>Reach</span>
                        <span className="font-mono">{calcReach.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="20000"
                        step="250"
                        value={calcReach}
                        onChange={(e) => setCalcReach(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    {/* Impact */}
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                        <span>Impact</span>
                        <span className="font-mono">{calcImpact.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="3.0"
                        step="0.25"
                        value={calcImpact}
                        onChange={(e) => setCalcImpact(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    {/* Confidence */}
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                        <span>Confidence</span>
                        <span className="font-mono">{(calcConfidence * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={calcConfidence}
                        onChange={(e) => setCalcConfidence(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Effort / Ease */}
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300">
                        <span>Effort (Ease: {activeEaseInfo.score}/10)</span>
                        <span className="font-mono">{calcEffort}w</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.5"
                        value={calcEffort}
                        onChange={(e) => handleEffortChange(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Tier: <strong className="text-slate-200">{calculatedTier.label}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAiAutoFill(story.id)}
                        disabled={isAutoFilling && autoFillingStoryId === story.id}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/50 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Use AI to suggest baseline RICE score for this story"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isAutoFilling && autoFillingStoryId === story.id ? 'animate-spin' : ''}`} />
                        <span>AI Auto-fill Baseline</span>
                      </button>

                      <button
                        onClick={() => handleApplyCalculatedMetrics(story.id)}
                        disabled={isSavingScore}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Score to {story.id}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Acceptance Criteria Preview */}
              {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Acceptance Criteria (Gherkin Verification)</span>
                    <span className="font-mono text-slate-500">{story.acceptanceCriteria.length} Criteria</span>
                  </div>
                  <ul className="space-y-1.5">
                    {story.acceptanceCriteria.map((ac: string, i: number) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{ac}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        };

        if (viewMode === 'MODULES') {
          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              {functionalModules.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <Boxes className="w-12 h-12 text-purple-400 mx-auto animate-pulse" />
                  <h3 className="text-base font-bold text-slate-200">
                    {isClustering ? 'Clustering Stories into Functional Modules with AI...' : 'No Functional Modules Clustered Yet'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Group user stories into strategic functional modules based on shared persona workflows and narrative themes.
                  </p>
                  <button
                    onClick={() => clusterStories()}
                    disabled={isClustering}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isClustering ? 'Clustering with Gemini...' : 'Cluster Backlog with AI'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {functionalModules.map((mod: any, mIdx: number) => {
                    const moduleStories = processedStories.filter((s: any) =>
                      (mod.storyIds || []).includes(s.id)
                    );
                    const modCombinedRice = moduleStories.reduce((acc: number, curr: any) => acc + (curr.riceScore || 1000), 0);
                    const modTotalEffort = moduleStories.reduce((acc: number, curr: any) => acc + (curr.effort || 2), 0);

                    return (
                      <div 
                        key={mod.id || mIdx}
                        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-purple-950/30 via-slate-900 to-slate-950 border border-purple-500/40 shadow-xl space-y-4"
                      >
                        {/* Module Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-purple-900/40 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-lg bg-purple-900 text-purple-200 font-mono text-xs font-bold border border-purple-700 shadow-xs">
                                {mod.id}
                              </span>
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
                                <User className="w-3 h-3 text-purple-400" />
                                <span>Persona: {mod.persona}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-300 bg-purple-950 border border-purple-800/60">
                                {moduleStories.length} {moduleStories.length === 1 ? 'Story' : 'Stories'}
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-purple-400" />
                              <span>{mod.title}</span>
                            </h3>
                            <p className="text-xs text-purple-200/80 leading-relaxed max-w-3xl">
                              <span className="font-semibold text-purple-300">Theme: </span>
                              {mod.theme}
                            </p>
                            {mod.strategicRationale && (
                              <p className="text-[11px] text-slate-400 italic">
                                Rationale: {mod.strategicRationale}
                              </p>
                            )}
                          </div>

                          {/* Module Aggregate Stats */}
                          <div className="flex items-center gap-3 shrink-0 font-mono text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase">Cluster RICE</span>
                              <span className="font-bold text-emerald-400 text-sm">{modCombinedRice.toLocaleString()} pts</span>
                            </div>
                            <span className="text-slate-700">|</span>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase">Total Dev</span>
                              <span className="font-bold text-amber-300 text-sm">{modTotalEffort.toFixed(1)}w</span>
                            </div>
                          </div>
                        </div>

                        {/* Module Stories List */}
                        <div className="space-y-4 pl-0 sm:pl-3 border-l-0 sm:border-l-2 sm:border-purple-900/30">
                          {moduleStories.length === 0 ? (
                            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 italic">
                              No active stories match current filters in this module.
                            </div>
                          ) : (
                            moduleStories.map((story: any, sIdx: number) => renderStoryCard(story, sIdx))
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(() => {
                    const allClusteredIds = new Set(functionalModules.flatMap((m: any) => m.storyIds || []));
                    const unclustered = processedStories.filter((s: any) => !allClusteredIds.has(s.id));
                    if (unclustered.length === 0) return null;
                    return (
                      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="space-y-1">
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold border border-slate-700">
                              MOD-EXT
                            </span>
                            <h3 className="text-base font-bold text-slate-200">Additional Unclustered Backlog Stories</h3>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{unclustered.length} Stories</span>
                        </div>
                        <div className="space-y-4">
                          {unclustered.map((story: any, idx: number) => renderStoryCard(story, idx))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          );
        }

        return (
          /* STANDARD FLAT LIST VIEW */
          <div className="space-y-4">
            {processedStories.map((story: any, idx: number) => renderStoryCard(story, idx))}
          </div>
        );
      })()}

      {/* STORY DETAIL MODAL WITH INTERACTIVE RICE METRICS */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-xs font-bold">
                  {selectedStory.id}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Story Specification Detail
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target Persona: <strong className="text-slate-200">{selectedStory.persona}</strong> · {activeProduct?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHistoryModalStory(selectedStory);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-semibold border border-purple-800/80 transition-colors shadow-xs cursor-pointer"
                  title="View Version History & Previous Iterations"
                >
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>v{selectedStory.version || (selectedStory.history ? selectedStory.history.length : 3)} History</span>
                </button>

                <button
                  onClick={() => exportSingleStoryPdf(selectedStory, activeProduct?.name || 'Active Product')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/80 transition-colors shadow-xs"
                  title="Export this Story as PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>Export PDF</span>
                </button>

                <button
                  onClick={() => exportSingleStoryMarkdown(selectedStory, activeProduct?.name || 'Active Product')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  title="Export this Story as Markdown"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export .md</span>
                </button>

                <button
                  onClick={() => setSelectedStory(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
              {/* User Story Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  User Story Statement
                </span>
                <div className="space-y-1.5 text-sm leading-relaxed text-slate-100">
                  <p><strong className="text-purple-400">As a</strong> {selectedStory.asA}</p>
                  <p><strong className="text-purple-400">I want</strong> {selectedStory.iWant}</p>
                  <p><strong className="text-purple-400">So that</strong> {selectedStory.soThat}</p>
                </div>
              </div>

              {/* RICE Breakdown Scorecard */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>RICE Prioritization Formula Breakdown</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${getPriorityTier(selectedStory.riceScore || 0).badge}`}>
                      {getPriorityTier(selectedStory.riceScore || 0).tier}
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      Score: {selectedStory.riceScore || Math.round(((selectedStory.reach || 1000) * (selectedStory.impact || 2) * (selectedStory.confidence || 0.8)) / (selectedStory.effort || 1))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Reach</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{(selectedStory.reach || 1000).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">users / quarter</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Impact</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{(selectedStory.impact || 2.0).toFixed(1)} / 3.0</div>
                    <div className="text-[10px] text-slate-400">business value</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Confidence</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{((selectedStory.confidence || 0.8) * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-400">data certainty</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Ease & Effort</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">
                      {effortToEase(selectedStory.effort || 2).score}/10 · {selectedStory.effort || 2}w
                    </div>
                    <div className="text-[10px] text-slate-400">engineering time</div>
                  </div>
                </div>

                {selectedStory.estimationJustification && (
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    Justification: {selectedStory.estimationJustification}
                  </p>
                )}
              </div>

              {/* Acceptance Criteria (Gherkin) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Acceptance Criteria (Gherkin Format)
                </span>
                <div className="space-y-2">
                  {(selectedStory.acceptanceCriteria || []).map((ac: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                        AC-{idx + 1}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{ac}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Specification governed under Navigator Production PM Schema
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAiAutoFill(selectedStory.id)}
                  disabled={isAutoFilling}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-semibold border border-purple-500/50 transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Auto-fill RICE baseline metrics using AI"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isAutoFilling ? 'animate-spin' : ''}`} />
                  <span>{isAutoFilling ? 'Auto-filling...' : 'AI Auto-fill Baseline'}</span>
                </button>

                <button
                  onClick={() => {
                    handleOpenFormulaModal(selectedStory.id);
                    setSelectedStory(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Open standalone RICE Formula Calculator modal for this story"
                >
                  <Sliders className="w-3.5 h-3.5 text-white" />
                  <span>Formula Modal</span>
                </button>

                <button
                  onClick={() => {
                    handleSelectStoryForCalc(selectedStory.id);
                    setSelectedStory(null);
                    setIsCalculatorOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-purple-200 font-semibold border border-purple-700/60 transition-colors flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open in RICE Calculator</span>
                </button>

                <button
                  onClick={() => setSelectedStory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STANDALONE RICE FORMULA CALCULATOR MODAL */}
      <RiceFormulaCalculatorModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        stories={localStories}
        initialStoryId={modalTargetStoryId}
        productName={activeProduct?.name}
        productContext={activeProduct?.description}
        onSaveScore={handleSaveFromFormulaModal}
      />

      {/* AI SMART SUGGEST: EPIC MAPPING MODAL */}
      <SmartEpicMappingModal
        isOpen={isSmartEpicModalOpen}
        onClose={() => setIsSmartEpicModalOpen(false)}
        stories={localStories}
        productName={activeProduct?.name}
        productContext={activeProduct?.description}
        onApplyMappings={handleApplyEpicMappings}
      />

      {/* AI CONFIDENCE AUDIT MODAL (TELEMETRY GROUNDED) */}
      <ConfidenceAuditModal
        isOpen={isConfidenceAuditOpen}
        onClose={() => setIsConfidenceAuditOpen(false)}
        stories={localStories}
        productId={selectedProductId}
        productName={activeProduct?.name}
        artifactId={storiesArtifact?.id}
        onApplyUpdates={handleApplyAuditUpdates}
      />

      {/* AI IMPACT FORECAST MODAL (IMPLEMENTED VS. IGNORED) */}
      <StoryImpactForecastModal
        isOpen={isImpactForecastOpen}
        onClose={() => {
          setIsImpactForecastOpen(false);
          setForecastTargetStory(null);
        }}
        story={forecastTargetStory || localStories[0]}
        allStories={localStories}
        productId={selectedProductId}
        productName={activeProduct?.name}
        onSelectStory={(s) => setForecastTargetStory(s)}
      />

      {/* AI DEPENDENCY MAPPER MODAL (NLP NETWORK GRAPH) */}
      <StoryDependencyMapperModal
        isOpen={isDependencyMapperOpen}
        onClose={() => setIsDependencyMapperOpen(false)}
        stories={localStories}
        productId={selectedProductId}
        productName={activeProduct?.name}
        onSelectStory={(id) => {
          const s = localStories.find(item => item.id === id);
          if (s) setSelectedStory(s);
        }}
      />

      {/* AI RICE SUGGESTION ENGINE MODAL (PERSONA & TREND GROUNDED) */}
      <AiRiceSuggestionEngineModal
        isOpen={isSuggestionEngineOpen}
        onClose={() => setIsSuggestionEngineOpen(false)}
        stories={localStories}
        personas={workspacePersonas}
        productId={selectedProductId}
        productName={activeProduct?.name}
        onApplySuggestions={handleApplyScoreSuggestions}
      />

      {/* STORY VERSION HISTORY & REVERT MODAL */}
      <StoryVersionHistoryModal
        isOpen={!!historyModalStory}
        onClose={() => setHistoryModalStory(null)}
        story={historyModalStory}
        productName={activeProduct?.name}
        onRevert={handleRevertStory}
        isReverting={isRevertingStory}
      />
    </div>
  );
};

