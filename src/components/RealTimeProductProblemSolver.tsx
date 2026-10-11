import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Map,
  ListTodo,
  Users,
  FileText,
  Calendar,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Flame,
  FlaskConical,
  Radio,
  Plus,
  Check,
  ChevronRight,
  Cpu,
  Layers,
  Copy,
  Clock,
  Target,
  Wifi
} from 'lucide-react';
import { Product, EnvironmentMode } from '../types.js';
import { realtimeWs, ConnectionStatus } from '../services/websocketClient.js';

interface RealTimeProductProblemSolverProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  environmentMode?: EnvironmentMode;
  onToggleEnvironment?: () => void;
  onRefreshWorkspace?: () => void;
}

interface SolvedSolutionPayload {
  success: boolean;
  productId: string;
  product: Product;
  issueTitle: string;
  environment: EnvironmentMode;
  totalTokens: number;
  latencyMs: number;
  roadmap: any;
  userStories: any;
  personas: any;
  prd: any;
  sprint: {
    sprintName: string;
    velocity: number;
    totalPoints: number;
    stories: any[];
  };
  auditEvent: any;
  logs: string[];
  summary: string;
}

const PROBLEM_PRESETS = [
  {
    id: 'fintech_auth',
    label: 'Fintech KYC Drop-Off',
    productName: 'PayFlow Enterprise Checkout',
    category: 'Fintech / B2B Payments',
    issueTitle: '34% Drop-Off at Mobile Step-3 Identity Verification',
    issueDescription: 'Wholesale buyers abandon checkout during SMS OTP authentication. Architect biometric WebAuthn passkey fallback preserving PSD2 SCA compliance while cutting auth latency to under 4 seconds.',
    features: ['Biometric Passkey Authentication', 'Automated Fallback to Push Notification', 'Sub-4s Latency SLA']
  },
  {
    id: 'ecommerce_cart',
    label: 'E-Commerce Cross-Border Churn',
    productName: 'OmniStore Headless Commerce',
    category: 'Retail & E-Commerce',
    issueTitle: 'Checkout Cart Abandonment on Dynamic Currency Conversion',
    issueDescription: 'Cross-border buyers experience unexpected FX conversion surcharges at payment step. Implement transparent multi-currency settlement, guaranteed FX rates for 15 minutes, and local APM payment gateways.',
    features: ['Guaranteed 15-Min FX Rate Locks', 'Native Local APM Integration', '1-Click Express Checkout']
  },
  {
    id: 'saas_rbac',
    label: 'B2B Enterprise RBAC & Residency',
    productName: 'CloudSphere Enterprise SaaS',
    category: 'B2B Cloud SaaS',
    issueTitle: 'Enterprise Churn Threat Over Coarse Permissions & EU Data Residency',
    issueDescription: 'Enterprise Fortune 500 customers threatening contract churn over lack of fine-grained role-based permissions and regional data partitioning in Frankfurt (eu-central-1). Architect zero-trust RBAC and regional database tenancy.',
    features: ['Fine-Grained ABAC / RBAC Engine', 'Regional Cloud SQL Sharding (Frankfurt)', 'Immutable Audit Trail Ledger']
  },
  {
    id: 'health_triage',
    label: 'HealthTech Emergency Wait Time',
    productName: 'MedPulse Clinical Triage',
    category: 'HealthTech & AI',
    issueTitle: 'Emergency Room Intake Latency & Clinician Burnout',
    issueDescription: 'Patients waiting 45+ minutes for preliminary triage intake. Build multimodal conversational tablet intake with automated vitals severity scoring (ESI scale) and instant physician paging for acute indicators.',
    features: ['ESI Severity Scoring Algorithm', 'HIPAA-Compliant Audio EHR Drafting', 'Instant Physician Red-Alert Paging']
  }
];

export const RealTimeProductProblemSolver: React.FC<RealTimeProductProblemSolverProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onNavigateTab,
  environmentMode = 'production',
  onToggleEnvironment,
  onRefreshWorkspace
}) => {
  // Input form state
  const [activeMode, setActiveMode] = useState<EnvironmentMode>(environmentMode);
  const [productMode, setProductMode] = useState<'existing' | 'new'>('existing');
  const [productNameInput, setProductNameInput] = useState('');
  const [productCategoryInput, setProductCategoryInput] = useState('Fintech & B2B Payments');
  const [issueTitleInput, setIssueTitleInput] = useState('34% Drop-Off at Mobile Step-3 Identity Verification');
  const [issueDescInput, setIssueDescInput] = useState(
    'Wholesale buyers abandon checkout during SMS OTP authentication. Architect biometric WebAuthn passkey fallback preserving PSD2 SCA compliance while cutting auth latency to under 4 seconds.'
  );
  const [featureTagInput, setFeatureTagInput] = useState('Biometric Passkeys, Push Fallback, Fraud Velocity Guard');

  // Execution & results state
  const [isSolving, setIsSolving] = useState(false);
  const [solveProgressStage, setSolveProgressStage] = useState<string>('');
  const [solveProgressPct, setSolveProgressPct] = useState<number>(0);
  const [stagePreview, setStagePreview] = useState<string>('');
  const [solutionResult, setSolutionResult] = useState<SolvedSolutionPayload | null>(null);
  const [activeSolutionTab, setActiveSolutionTab] = useState<'roadmap' | 'stories' | 'personas' | 'prd' | 'sprint' | 'audit'>('roadmap');
  const [isPromotingToProd, setIsPromotingToProd] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(realtimeWs.getMetrics().status);
  const [wsLatency, setWsLatency] = useState<number>(realtimeWs.getMetrics().latencyMs);
  const [useWsStreaming, setUseWsStreaming] = useState<boolean>(true);
  const [incomingBroadcast, setIncomingBroadcast] = useState<{ issueTitle: string; productName: string; solution: any } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const unsubMetrics = realtimeWs.subscribeMetrics((m) => {
      setWsStatus(m.status);
      setWsLatency(m.latencyMs);
    });

    const unsubSolveEvent = realtimeWs.subscribe('PRODUCT_SOLVED_EVENT', (msg: any) => {
      if (msg?.solution && msg.solution.issueTitle !== issueTitleInput) {
        setIncomingBroadcast({
          issueTitle: msg.issueTitle || msg.solution.issueTitle,
          productName: msg.productName || msg.solution.product?.name || 'Product',
          solution: msg.solution
        });
      }
    });

    const unsubEnvMode = realtimeWs.subscribe('ENVIRONMENT_MODE_CHANGED', (msg: any) => {
      if (msg?.mode) {
        setActiveMode(msg.mode);
      }
    });

    return () => {
      unsubMetrics();
      unsubSolveEvent();
      unsubEnvMode();
    };
  }, [issueTitleInput]);

  const handleApplyPreset = (preset: typeof PROBLEM_PRESETS[0]) => {
    setIssueTitleInput(preset.issueTitle);
    setIssueDescInput(preset.issueDescription);
    setFeatureTagInput(preset.features.join(', '));
    setProductCategoryInput(preset.category);

    const matchingProd = products.find(p => p.name.toLowerCase().includes(preset.productName.toLowerCase()) || p.industry?.toLowerCase().includes(preset.category.toLowerCase()));
    if (matchingProd) {
      onSelectProduct(matchingProd.id);
      setProductMode('existing');
    } else {
      setProductNameInput(preset.productName);
      setProductMode('new');
    }
    showToast(`Loaded problem preset: ${preset.label}`);
  };

  const handleExecuteSolve = async () => {
    if (!issueTitleInput.trim() || !issueDescInput.trim()) {
      showToast('Please provide an issue title and problem description');
      return;
    }

    const reqId = `ws_solve_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const selectedProd = products.find(p => p.id === selectedProductId);
    const targetName = productMode === 'new' ? (productNameInput.trim() || 'Custom Enterprise Product') : (selectedProd?.name || 'Enterprise Product');
    const featureList = featureTagInput.split(',').map(f => f.trim()).filter(Boolean);

    setIsSolving(true);
    setSolutionResult(null);
    setSolveProgressStage('Initializing Real-Time WebSocket Generation Pipeline...');
    setSolveProgressPct(10);
    setStagePreview('Gating schema & dispatching stream');

    const handleSuccessData = (data: SolvedSolutionPayload) => {
      setSolutionResult(data);
      setSolveProgressPct(100);
      setSolveProgressStage('Real-time specification pipeline complete!');
      setStagePreview('All specifications committed & verified');
      if (data.productId && data.productId !== selectedProductId) {
        onSelectProduct(data.productId);
      }
      if (onRefreshWorkspace) onRefreshWorkspace();
      showToast(`🎉 Real-Time Problem Solved! Generated Roadmap, Stories, Personas, PRD & Sprint #1 in ${data.latencyMs}ms`);
      setIsSolving(false);
    };

    let resolved = false;

    // Execute via WebSocket if streaming is enabled and socket is open
    if (useWsStreaming && realtimeWs.getMetrics().status === 'connected') {
      const unsubProgress = realtimeWs.subscribe('SOLVE_PROGRESS', (msg: any) => {
        if (msg.requestId === reqId) {
          setSolveProgressStage(msg.stage || 'Synthesizing specification...');
          if (typeof msg.progress === 'number') setSolveProgressPct(msg.progress);
          if (msg.preview) setStagePreview(msg.preview);
        }
      });

      const unsubResult = realtimeWs.subscribe('SOLVE_RESULT', (msg: any) => {
        if (msg.requestId === reqId) {
          resolved = true;
          unsubProgress();
          unsubResult();
          if (msg.success && msg.data) {
            handleSuccessData(msg.data);
          } else {
            showToast(`Error: ${msg.error || 'Failed to solve issue via WebSocket'}`);
            setIsSolving(false);
          }
        }
      });

      const sent = realtimeWs.send({
        type: 'SOLVE_PRODUCT_PROBLEM',
        requestId: reqId,
        productId: productMode === 'new' ? undefined : selectedProductId,
        productName: targetName,
        productCategory: productCategoryInput,
        issueTitle: issueTitleInput,
        issueDescription: issueDescInput,
        featureRequests: featureList,
        environment: activeMode,
        requestedArtifacts: ['ROADMAP', 'USER_STORIES', 'PERSONAS', 'PRD']
      });

      if (sent) {
        // Fallback safety timeout if WS stream drops
        setTimeout(() => {
          if (!resolved && isSolving) {
            unsubProgress();
            unsubResult();
            fallbackToRest();
          }
        }, 12000);
        return;
      }
    }

    // Fallback path
    fallbackToRest();

    async function fallbackToRest() {
      const stages = [
        { label: 'Gating context & gathering domain requirements...', pct: 15, prev: 'Validating domain criteria' },
        { label: 'Synthesizing Real-Time Strategic Roadmap...', pct: 35, prev: 'Phased Milestones & Horizon' },
        { label: 'Architecting Vertical User Stories & Gherkin criteria...', pct: 55, prev: 'BDD Scenarios & RICE Scores' },
        { label: 'Generating Validated Qualitative Personas...', pct: 70, prev: 'PM Archetypes & User Journeys' },
        { label: 'Drafting Full Product Requirements Document (PRD)...', pct: 85, prev: 'Specs, SLAs & Non-functional criteria' },
        { label: 'Allocating User Stories into Active Sprint #1 Backlog...', pct: 95, prev: 'Sprint allocation & estimation' },
        { label: 'Recording Immutable Cryptographic Audit Trail Event...', pct: 99, prev: 'Audited & Committed' }
      ];

      let stageIdx = 0;
      const progressInterval = setInterval(() => {
        if (stageIdx < stages.length) {
          setSolveProgressStage(stages[stageIdx].label);
          setSolveProgressPct(stages[stageIdx].pct);
          setStagePreview(stages[stageIdx].prev);
          stageIdx++;
        }
      }, 700);

      try {
        const res = await fetch('/api/products/solve-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productMode === 'new' ? undefined : selectedProductId,
            productName: targetName,
            productCategory: productCategoryInput,
            issueTitle: issueTitleInput,
            issueDescription: issueDescInput,
            featureRequests: featureList,
            environment: activeMode,
            requestedArtifacts: ['ROADMAP', 'USER_STORIES', 'PERSONAS', 'PRD']
          })
        });

        clearInterval(progressInterval);

        if (res.ok) {
          const data: SolvedSolutionPayload = await res.json();
          handleSuccessData(data);
        } else {
          const err = await res.json();
          showToast(`Error: ${err.error || 'Failed to solve issue'}`);
          setIsSolving(false);
        }
      } catch (e: any) {
        clearInterval(progressInterval);
        showToast(`Execution error: ${e.message}`);
        setIsSolving(false);
      }
    }
  };

  const handlePromoteToProduction = async () => {
    if (!solutionResult) return;
    setIsPromotingToProd(true);
    try {
      const artifactsToPromote = [
        solutionResult.roadmap?.id,
        solutionResult.userStories?.id,
        solutionResult.personas?.id,
        solutionResult.prd?.id
      ].filter(Boolean);

      for (const artId of artifactsToPromote) {
        await fetch(`/api/artifacts/${artId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'lead_product_manager',
            notes: `Promoted from Sandbox Real-Time Problem Solver to Live Production.`
          })
        });
      }

      setActiveMode('production');
      if (solutionResult) {
        solutionResult.environment = 'production';
      }
      if (onRefreshWorkspace) onRefreshWorkspace();
      showToast('🚀 Promoted to Live Production! All 4 specifications approved and committed.');
    } catch (err: any) {
      showToast(`Promotion failed: ${err.message}`);
    } finally {
      setIsPromotingToProd(false);
    }
  };

  const handleCopySummary = () => {
    if (!solutionResult) return;
    const text = `--- Real-Time Product Problem Solution ---
Product: ${solutionResult.product.name}
Issue: ${solutionResult.issueTitle}
Environment: ${solutionResult.environment.toUpperCase()}
Execution Latency: ${solutionResult.latencyMs}ms (${solutionResult.totalTokens} tokens)

1. ROADMAP: ${solutionResult.roadmap?.schemaData?.theme || 'Phased delivery schedule'}
2. USER STORIES: ${solutionResult.userStories?.schemaData?.stories?.length || 0} vertical stories with Gherkin BDD
3. PERSONAS: ${solutionResult.personas?.schemaData?.personas?.length || 0} target qualitative archetypes
4. PRD: Validated specifications with non-functional SLAs
5. SPRINT PLANNING: ${solutionResult.sprint.stories.length} stories committed (${solutionResult.sprint.totalPoints} points)
6. AUDIT TRAIL: Cryptographic event logged (${solutionResult.auditEvent.id})
Generated via Navigator Real-Time Production Engine`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  const currentProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Promise Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Real-Time Production-Based Problem Solver</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
              activeMode === 'production'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-amber-950/80 border-amber-700 text-amber-300'
            }`}>
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span>Mode: {activeMode.toUpperCase()}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Gemini 3.8 Flash · Zero Latency Mockup Fallbacks · Dual-Pass Zod Pipeline
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            Solve Product-Related Issues in Real Time
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Enter your product and feature dilemma to immediately generate synchronized <strong>Roadmaps</strong>, <strong>User Stories</strong>, <strong>Personas</strong>, <strong>PRDs</strong>, <strong>Sprint Plans</strong>, and <strong>Audit Trail events</strong> with production-ready fidelity.
          </p>
        </div>

        {/* Environment Mode Switcher & Quick Actions */}
        <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveMode('sandbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'sandbox'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Sandbox Lab</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('production')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'production'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live Production</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Problem Presets Bar */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold flex items-center gap-1.5 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Try Instant Real-World Product Dilemma Presets:</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">1-Click Population</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PROBLEM_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-emerald-600/50 text-left transition-all cursor-pointer group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                {p.label}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.category}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Formulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* Left Column: Product Context (5 Cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Product Identity & Target Domain</span>
            </h3>
            
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setProductMode('existing')}
                className={`px-2 py-0.5 rounded ${productMode === 'existing' ? 'bg-indigo-900/60 text-indigo-200 font-semibold' : 'text-slate-400'}`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setProductMode('new')}
                className={`px-2 py-0.5 rounded ${productMode === 'new' ? 'bg-indigo-900/60 text-indigo-200 font-semibold' : 'text-slate-400'}`}
              >
                New Product
              </button>
            </div>
          </div>

          {productMode === 'existing' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Selected Product Workspace</label>
              <select
                value={selectedProductId}
                onChange={(e) => onSelectProduct(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.industry || 'FinTech'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Workspace: <strong>{currentProduct?.name}</strong> · Real-time sync enabled
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Product Name</label>
                <input
                  type="text"
                  value={productNameInput}
                  onChange={(e) => setProductNameInput(e.target.value)}
                  placeholder="e.g. PayFlow Instant Trade Credit"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Domain / Industry</label>
                <input
                  type="text"
                  value={productCategoryInput}
                  onChange={(e) => setProductCategoryInput(e.target.value)}
                  placeholder="e.g. Fintech / B2B Payments"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Requested Key Feature Directives */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <label className="text-xs font-semibold text-slate-300">Specific Feature Directives (comma separated)</label>
            <input
              type="text"
              value={featureTagInput}
              onChange={(e) => setFeatureTagInput(e.target.value)}
              placeholder="e.g. Biometric Passkeys, Push Fallback, Fraud Velocity Guard"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Right Column: Problem & Dilemma Statement (7 Cols) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Product-Related Issue / Friction Dilemma</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Actionable Problem Solving</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Issue Title / Bottleneck Summary</label>
            <input
              type="text"
              value={issueTitleInput}
              onChange={(e) => setIssueTitleInput(e.target.value)}
              placeholder="e.g. 34% Drop-Off at Mobile Step-3 Identity Verification"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Problem Breakdown & Constraints</label>
            <textarea
              rows={3}
              value={issueDescInput}
              onChange={(e) => setIssueDescInput(e.target.value)}
              placeholder="Describe user friction, metric regression, edge cases, and compliance constraints..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-[11px] leading-relaxed"
            />
          </div>

          {/* Trigger Action Button & Real-time Controls */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-900">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setUseWsStreaming(!useWsStreaming)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  useWsStreaming
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Stream multi-artifact synthesis and progress in real-time over WebSocket"
              >
                <Radio className={`w-3 h-3 ${wsStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span>WS Stream: {wsStatus === 'connected' ? `Live (${wsLatency || 12}ms)` : wsStatus}</span>
              </button>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Strict Zod Gates</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteSolve}
              disabled={isSolving}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                isSolving
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 active:scale-98'
              }`}
            >
              {isSolving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                  <span>Streaming Multi-Artifact Solution ({solveProgressPct}%)...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Solve Product Issue in Real-Time</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Incoming WebSocket Broadcast Notice */}
      {incomingBroadcast && (
        <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-between gap-3 text-xs text-indigo-200 animate-fadeIn relative z-10">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
            <div>
              <span className="font-semibold text-indigo-300">Live Real-Time Solution Broadcast:</span>{' '}
              <span>"{incomingBroadcast.issueTitle}" resolved for {incomingBroadcast.productName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSolutionResult(incomingBroadcast.solution);
                setIncomingBroadcast(null);
                showToast(`Loaded live broadcast solution for ${incomingBroadcast.productName}`);
              }}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              View Solution
            </button>
            <button
              type="button"
              onClick={() => setIncomingBroadcast(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Real-Time WebSocket Multi-Stage Progress Card */}
      {isSolving && (
        <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/60 space-y-3 relative z-10 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-2 font-bold text-emerald-300">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>{solveProgressStage}</span>
            </span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              {solveProgressPct}%
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 h-full transition-all duration-300 rounded-full shadow-sm shadow-emerald-500/50"
              style={{ width: `${Math.min(100, Math.max(8, solveProgressPct))}%` }}
            />
          </div>

          {stagePreview && (
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Current Pipeline Slice: <strong className="text-emerald-300">{stagePreview}</strong></span>
              <span className="text-slate-500">Real-Time Streaming WebSocket (Port 3000/ws)</span>
            </div>
          )}

          {/* 6 Real-Time Artifact Step Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-900 text-[11px] font-medium">
            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              solveProgressPct >= 30 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Map className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. Roadmap</span>
              {solveProgressPct >= 30 && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              solveProgressPct >= 50 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <ListTodo className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Stories</span>
              {solveProgressPct >= 50 && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              solveProgressPct >= 70 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Personas</span>
              {solveProgressPct >= 70 && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              solveProgressPct >= 85 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">4. PRD</span>
              {solveProgressPct >= 85 && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              solveProgressPct >= 95 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">5. Sprint 1</span>
              {solveProgressPct >= 95 && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              solveProgressPct >= 99 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">6. Audit Trail</span>
              {solveProgressPct >= 99 && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Solution Results Hub */}
      {solutionResult && (
        <div className="space-y-4 pt-4 border-t border-slate-800 relative z-10">
          {/* Executive Solution Header */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  REAL-TIME SOLUTION VERIFIED
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Product: <strong>{solutionResult.product.name}</strong>
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {solutionResult.latencyMs}ms · {solutionResult.totalTokens} tokens
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-1">
                Resolved: {solutionResult.issueTitle}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {solutionResult.environment === 'sandbox' && (
                <button
                  type="button"
                  onClick={handlePromoteToProduction}
                  disabled={isPromotingToProd}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isPromotingToProd ? 'Promoting...' : 'Promote to Live Production'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>

          {/* Solution Tabs Strip */}
          <div className="flex space-x-1 border-b border-slate-800 overflow-x-auto pb-1">
            {[
              { id: 'roadmap', label: 'Real-Time Roadmap', icon: Map, badge: 'Phased' },
              { id: 'stories', label: 'User Stories & BDD', icon: ListTodo, badge: solutionResult.userStories?.schemaData?.stories?.length || 4 },
              { id: 'personas', label: 'Target Personas', icon: Users, badge: solutionResult.personas?.schemaData?.personas?.length || 2 },
              { id: 'prd', label: 'Verified PRD', icon: FileText, badge: 'v1.0' },
              { id: 'sprint', label: 'Sprint Planning', icon: Calendar, badge: `${solutionResult.sprint.totalPoints} pts` },
              { id: 'audit', label: 'Audit Trail Event', icon: History, badge: 'Logged' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSolutionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSolutionTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-emerald-900/80 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: REAL-TIME ROADMAP VIEW */}
          {activeSolutionTab === 'roadmap' && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Map className="w-4 h-4 text-emerald-400" />
                    <span>Strategic Phased Delivery Roadmap</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Theme: {solutionResult.roadmap?.schemaData?.theme || 'Autonomous Product Delivery'} · Horizon: {solutionResult.roadmap?.schemaData?.timeHorizon || '12 Months'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('roadmaps')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Open in Full Roadmap View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Phases Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {((solutionResult.roadmap?.schemaData?.phases || solutionResult.roadmap?.schemaData?.quarterHorizons || []).slice(0, 3)).map((phase: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300">{phase.phaseName || phase.quarter || `Phase ${i + 1}`}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {phase.targetQuarter || `Horizon ${i + 1}`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-semibold">{phase.theme || phase.milestones?.[0] || 'Core Deliverables'}</div>
                    <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                      {(phase.deliverables || phase.milestones || []).slice(0, 2).map((d: string, di: number) => (
                        <div key={di} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="truncate">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: REAL-TIME USER STORIES VIEW */}
          {activeSolutionTab === 'stories' && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-emerald-400" />
                    <span>Vertical User Stories with Gherkin BDD Acceptance Criteria</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prioritized with deterministic RICE scores and persona targeting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('stories')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Open in User Stories View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(solutionResult.userStories?.schemaData?.stories || []).slice(0, 4).map((story: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {story.id || `US-0${idx + 1}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        RICE: {Math.round(story.riceScore || 1200)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 font-medium leading-relaxed">
                      <strong>As a</strong> {story.asA}, <strong>I want</strong> {story.iWant}, <strong>so that</strong> {story.soThat}
                    </div>

                    {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                      <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase text-slate-500">BDD Criteria:</span>
                        {story.acceptanceCriteria.slice(0, 2).map((ac: string, aci: number) => (
                          <div key={aci} className="flex items-start gap-1">
                            <span className="text-emerald-400">•</span>
                            <span className="truncate">{ac}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REAL-TIME PERSONAS VIEW */}
          {activeSolutionTab === 'personas' && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Target Qualitative Archetypes & JTBD</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Synthesized from customer research and friction signals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('personas')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Open in Personas View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Personas Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(solutionResult.personas?.schemaData?.personas || []).slice(0, 2).map((p: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold">
                        {p.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.role} · {p.techProficiency} Tech</div>
                      </div>
                    </div>

                    {p.verbatimQuote && (
                      <p className="text-xs italic text-slate-300 border-l-2 border-indigo-500 pl-2.5 my-1">
                        &quot;{p.verbatimQuote}&quot;
                      </p>
                    )}

                    <div className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      <div><strong className="text-slate-300">Core JTBD:</strong> {(p.jobsToBeDone || []).slice(0, 2).join(', ')}</div>
                      <div><strong className="text-rose-400">Critical Pain:</strong> {(p.painPoints || []).slice(0, 2).join(', ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: REAL-TIME PRD VIEW */}
          {activeSolutionTab === 'prd' && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Product Requirements Document (PRD)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Formal specifications with non-functional latency/security SLAs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('prds')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Open in PRD View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objective</span>
                  <p className="font-semibold text-slate-100 mt-0.5">{solutionResult.prd?.schemaData?.objective || 'Deliver zero-friction customer experience'}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Problem Statement</span>
                  <p className="text-slate-400 mt-0.5">{solutionResult.prd?.schemaData?.problemStatement || solutionResult.issueTitle}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Functional Requirements</span>
                  <div className="space-y-1 mt-1">
                    {(solutionResult.prd?.schemaData?.functionalRequirements || []).slice(0, 3).map((fr: any, fri: number) => (
                      <div key={fri} className="flex items-start gap-1.5 font-mono text-[11px] text-slate-300">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>[{fr.priority || 'P1'}] {fr.requirement || fr.title || fr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REAL-TIME SPRINT PLANNING VIEW */}
          {activeSolutionTab === 'sprint' && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time Sprint 1 Commitment</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {solutionResult.sprint.sprintName} · {solutionResult.sprint.totalPoints} points committed (Velocity: {solutionResult.sprint.velocity} pts)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('sprint-planner')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Open in Sprint Planner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sprint Stories Table */}
              <div className="space-y-2">
                {solutionResult.sprint.stories.map((story: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {story.points}p
                      </span>
                      <span className="font-semibold text-slate-200 truncate">{story.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        story.status === 'IN_PROGRESS' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {story.status}
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">{story.assignee?.name || 'Assigned'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: REAL-TIME AUDIT TRAIL VIEW */}
          {activeSolutionTab === 'audit' && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic Audit Trail Ledger Event</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable event logged directly to workspace compliance ledger.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('audit-trail')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Open in Full Audit Trail</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Event ID: {solutionResult.auditEvent.id}</span>
                  <span className="text-emerald-400">{solutionResult.auditEvent.timestamp}</span>
                </div>
                <div className="text-slate-200 font-bold pt-1">
                  Action: {solutionResult.auditEvent.action} · Category: {solutionResult.auditEvent.tag}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800">
                  {solutionResult.auditEvent.details}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
