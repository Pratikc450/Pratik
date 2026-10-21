import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Zap, 
  Sliders, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Flame, 
  Copy, 
  Check, 
  ArrowUpRight, 
  Lock, 
  Eye, 
  Radio, 
  Layers, 
  Terminal, 
  Server,
  Cpu,
  RotateCcw,
  Gauge,
  Sparkles,
  FileText,
  Compass,
  Users,
  ListTodo,
  Boxes,
  CheckSquare,
  Milestone,
  Crop,
  Target,
  Grid,
  Footprints,
  ArrowUpDown,
  Flag,
  BarChart3,
  Rocket,
  Megaphone,
  ArrowRight,
  ExternalLink,
  Code2,
  GitBranch,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Pause,
  Split
} from 'lucide-react';
import { 
  EnvironmentMode, 
  SandboxStatus, 
  SandboxChaosRule, 
  SandboxFeatureFlag, 
  SandboxWebhook, 
  SandboxPreFlightCheck, 
  SandboxTelemetryEvent,
  ArtifactType,
  ARTIFACT_19_CATALOG,
  ArtifactCategory,
  CanaryDeploymentConfig,
  CanaryMetricComparison,
  CanaryRequestLog
} from '../types.js';
import { clientRateLimiter } from '../services/clientRateLimiter.js';

interface SandboxEnvironmentViewProps {
  selectedProductId: string;
  onNavigateTab: (tab: string) => void;
  environmentMode: EnvironmentMode;
  onSetEnvironmentMode: (mode: EnvironmentMode) => void;
}

export const SandboxEnvironmentView: React.FC<SandboxEnvironmentViewProps> = ({
  selectedProductId,
  onNavigateTab,
  environmentMode,
  onSetEnvironmentMode
}) => {
  const [status, setStatus] = useState<SandboxStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'artifact-lab' | 'canary' | 'traffic' | 'chaos' | 'flags' | 'webhooks' | 'readiness'>('artifact-lab');
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingTraffic, setIsSimulatingTraffic] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Canary Deployment State
  const [isSimulatingCanary, setIsSimulatingCanary] = useState(false);
  const [canaryRequestFilter, setCanaryRequestFilter] = useState<'all' | 'canary' | 'stable' | 'errors'>('all');

  // 19-Artifact Real-Time Problem Solver State
  const [selectedTaskType, setSelectedTaskType] = useState<ArtifactType>('PRD');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [problemPreset, setProblemPreset] = useState<string>('fintech_3ds');
  const [customProblemText, setCustomProblemText] = useState<string>(
    'Mobile banking users experience 34% drop-off at Step 3 during identity verification. Architect a biometric Passkey fallback workflow that preserves PSD2 compliance while reducing time-to-authenticate to under 4 seconds.'
  );
  const [simulateChaosDuringGen, setSimulateChaosDuringGen] = useState<boolean>(false);
  const [isSolvingArtifact, setIsSolvingArtifact] = useState<boolean>(false);
  const [solvedArtifactResult, setSolvedArtifactResult] = useState<any | null>(null);
  const [artifactViewerMode, setArtifactViewerMode] = useState<'preview' | 'json' | 'logs'>('preview');
  const [copiedArtifactJson, setCopiedArtifactJson] = useState<boolean>(false);
  const [isPromotingSingleArtifact, setIsPromotingSingleArtifact] = useState<boolean>(false);
  
  // Traffic Simulation Controls
  const [virtualUsers, setVirtualUsers] = useState(500);
  const [targetRps, setTargetRps] = useState(85);
  const [errorRateSlider, setErrorRateSlider] = useState(1); // 1%
  const [trafficTimer, setTrafficTimer] = useState<number | null>(null);

  // Webhook State
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('wh_jira');
  const [customPayloadText, setCustomPayloadText] = useState<string>('');
  const [lastDispatchResponse, setLastDispatchResponse] = useState<any | null>(null);
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Promotion Confirmation Modal
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sandbox/status');
      if (res.ok) {
        const data: SandboxStatus = await res.json();
        setStatus(data);
        if (data.mode !== environmentMode) {
          onSetEnvironmentMode(data.mode);
        }
      }
    } catch (e) {
      console.warn('Failed to load sandbox status', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  // Update payload sample when webhook selection changes
  useEffect(() => {
    if (status?.webhooks) {
      const current = status.webhooks.find(w => w.id === selectedWebhookId);
      if (current) {
        setCustomPayloadText(current.payloadSample);
      }
    }
  }, [selectedWebhookId, status?.webhooks]);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleEnv = async (targetMode: EnvironmentMode) => {
    try {
      const res = await fetch('/api/sandbox/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode })
      });
      if (res.ok) {
        onSetEnvironmentMode(targetMode);
        await fetchStatus();
        showNotification(`Switched active workspace to ${targetMode.toUpperCase()} mode.`);
      }
    } catch (e) {
      showNotification('Failed to toggle environment mode');
    }
  };

  const handleRunTrafficBurst = async () => {
    setIsSimulatingTraffic(true);
    setTrafficTimer(10);

    const countdown = setInterval(() => {
      setTrafficTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdown);
          setIsSimulatingTraffic(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const res = await fetch('/api/sandbox/traffic/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          virtualUsers,
          rps: targetRps,
          errorRate: errorRateSlider / 100
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchStatus();
        showNotification(`Traffic burst executed: ${data.generatedEventsCount} synthetic persona sessions completed.`);
      }
    } catch (e) {
      showNotification('Traffic simulation encountered an error');
      setIsSimulatingTraffic(false);
      setTrafficTimer(null);
    }
  };

  const handleUpdateCanaryTraffic = async (pct: number) => {
    try {
      const res = await fetch('/api/sandbox/canary/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trafficPercentage: pct })
      });
      if (res.ok) {
        await fetchStatus();
        showNotification(`Canary routing updated: ${pct}% Canary / ${100 - pct}% Stable.`);
      }
    } catch (e) {
      showNotification('Failed to update canary traffic ratio');
    }
  };

  const handleSetCanaryFault = async (fault: string) => {
    try {
      const res = await fetch('/api/sandbox/canary/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fault })
      });
      if (res.ok) {
        await fetchStatus();
        const labels: Record<string, string> = {
          none: 'Baseline nominal health restored',
          latency_spike: 'Latency spike fault injected (+540ms)',
          null_pointer_500: 'HTTP 500 panic surge injected (+5.4%)',
          memory_leak: 'Memory leak surge injected (940MB)',
          rate_limit: 'HTTP 429 token bucket surge injected'
        };
        showNotification(labels[fault] || 'Canary fault updated');
      }
    } catch (e) {
      showNotification('Failed to update canary fault injection');
    }
  };

  const handleCanaryAction = async (action: 'promote' | 'rollback' | 'pause' | 'resume') => {
    try {
      const res = await fetch('/api/sandbox/canary/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await fetchStatus();
        if (action === 'promote') {
          showNotification('🚀 Canary release promoted to 100% production!');
        } else if (action === 'rollback') {
          showNotification('🛡️ Emergency rollback triggered: Traffic shifted to 100% stable!');
        } else if (action === 'pause') {
          showNotification('⏸️ Canary progression paused.');
        } else if (action === 'resume') {
          showNotification('▶️ Canary traffic progression resumed.');
        }
      }
    } catch (e) {
      showNotification(`Failed to execute canary ${action}`);
    }
  };

  const handleSimulateCanaryBurst = async () => {
    setIsSimulatingCanary(true);
    try {
      const res = await fetch('/api/sandbox/canary/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 8 })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchStatus();
        showNotification(`Simulated ${data.generatedCount || 8} traffic requests across canary mesh.`);
      }
    } catch (e) {
      showNotification('Failed to simulate canary traffic');
    } finally {
      setIsSimulatingCanary(false);
    }
  };

  const handleToggleChaosRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/sandbox/chaos/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, enabled: !currentEnabled })
      });
      if (res.ok) {
        await fetchStatus();
        showNotification(`Chaos rule ${!currentEnabled ? 'ACTIVATED' : 'DISABLED'}.`);
      }
    } catch (e) {
      showNotification('Could not toggle chaos rule');
    }
  };

  const handleTriggerChaosStorm = async (active: boolean) => {
    try {
      const res = await fetch('/api/sandbox/chaos/storm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      if (res.ok) {
        await fetchStatus();
        showNotification(active ? '🌪 Chaos Storm injected across all subsystems!' : '🛡 Nominal baseline restored.');
      }
    } catch (e) {
      showNotification('Failed to execute chaos storm command');
    }
  };

  const handleUpdateFlag = async (key: string, enabled?: boolean, rolloutPercentage?: number) => {
    try {
      const res = await fetch('/api/sandbox/flags/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled, rolloutPercentage })
      });
      if (res.ok) {
        await fetchStatus();
        showNotification('Feature flag updated in real-time.');
      }
    } catch (e) {
      showNotification('Failed to update feature flag');
    }
  };

  const handleDispatchWebhook = async () => {
    setIsDispatchingWebhook(true);
    try {
      let parsedPayload: any = null;
      try {
        parsedPayload = JSON.parse(customPayloadText);
      } catch {
        parsedPayload = { text: customPayloadText };
      }

      const res = await fetch('/api/sandbox/webhooks/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookId: selectedWebhookId,
          customPayload: parsedPayload
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLastDispatchResponse(data);
        await fetchStatus();
        showNotification(`Webhook successfully delivered to ${data.webhook.targetService} (HTTP ${data.response.statusCode}).`);
      }
    } catch (e) {
      showNotification('Webhook delivery simulation failed');
    } finally {
      setIsDispatchingWebhook(false);
    }
  };

  const handleResetSandbox = async () => {
    if (!window.confirm('Reset sandbox environment to clean production baseline? All chaos injectors will be deactivated.')) {
      return;
    }
    try {
      const res = await fetch('/api/sandbox/reset', { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
        showNotification('Sandbox restored to clean production baseline.');
      }
    } catch (e) {
      showNotification('Failed to reset sandbox');
    }
  };

  const handlePromoteToProduction = async () => {
    setIsPromoting(true);
    try {
      const res = await fetch('/api/sandbox/promote', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setShowPromoteModal(false);
        onSetEnvironmentMode('production');
        await fetchStatus();
        showNotification('🚀 Promotion Succeeded: Sandbox verified and promoted to Live Production!');
      } else {
        showNotification(`Promotion Blocked: ${data.error || 'Pre-flight checks failed'}`);
      }
    } catch (e: any) {
      showNotification('Failed to promote to production');
    } finally {
      setIsPromoting(false);
    }
  };

  const handlePresetSelect = (presetKey: string) => {
    setProblemPreset(presetKey);
    switch (presetKey) {
      case 'fintech_3ds':
        setCustomProblemText('Mobile banking users experience 34% drop-off at Step 3 during identity verification. Architect a biometric Passkey fallback workflow that preserves PSD2 compliance while reducing time-to-authenticate to under 4 seconds.');
        setSelectedTaskType('PRD');
        break;
      case 'saas_churn':
        setCustomProblemText('Enterprise B2B clients threatening churn over unencrypted data residency and coarse-grained workspace permissions. Implement multi-tenant audit logs, zero-trust RBAC, and regional data partitioning in asia-southeast1.');
        setSelectedTaskType('USER_STORIES');
        break;
      case 'cart_abandon':
        setCustomProblemText('E-commerce checkout funnel drops 28% on mobile between cart review and payment. Design 1-click Express Checkout with Apple Pay, local currency autoswitch, and zero-registration guest checkout.');
        setSelectedTaskType('ROADMAP');
        break;
      case 'sprint_velocity':
        setCustomProblemText('Sprint velocity plummeted 40% due to circular dependencies between billing and core identity services. Split the monolith billing epic into 4 vertically sliced, testable user stories with Gherkin BDD.');
        setSelectedTaskType('EPICS');
        break;
      case 'ai_sla':
        setCustomProblemText('Autonomous generation requests timing out under burst load. Implement token bucket rate limiter, model cascade fallback (Gemini 3.8 -> 3.5 -> Deterministic Shield), and client-side exponential backoff.');
        setSelectedTaskType('PRODUCT_REQUIREMENTS');
        break;
      default:
        break;
    }
  };

  const handleSolveArtifact = async () => {
    if (!customProblemText.trim()) return;

    // Check Client-Side Rate Limiter to prevent Gemini API quota exhaustion during sandbox testing
    const rateCheck = await clientRateLimiter.acquireToken('/api/sandbox/artifacts/test-solve', true);
    if (!rateCheck.allowed) {
      showNotification(`🛡️ ${rateCheck.reason}`);
      return;
    }

    setIsSolvingArtifact(true);
    setSolvedArtifactResult(null);

    try {
      const res = await fetch('/api/sandbox/artifacts/test-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId || 'prod_banking',
          taskType: selectedTaskType,
          problemStatement: customProblemText,
          simulateChaos: simulateChaosDuringGen
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSolvedArtifactResult(data);
        await fetchStatus();
        showNotification(`✅ Sandbox Solved ${selectedTaskType} in ${data.latencyMs}ms. Zod Schema: VALID.`);
      } else {
        showNotification(`Generation error: ${data.error || 'Failed to solve artifact'}`);
      }
    } catch (err: any) {
      showNotification(`Test failed: ${err.message}`);
    } finally {
      setIsSolvingArtifact(false);
    }
  };

  const handlePromoteSingleArtifact = async () => {
    if (!solvedArtifactResult?.artifact?.id) return;
    setIsPromotingSingleArtifact(true);
    try {
      const res = await fetch(`/api/artifacts/${solvedArtifactResult.artifact.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'lead_product_manager',
          notes: `Promoted from Sandbox 19-Artifact Problem Solver after Zod compliance verification.`
        })
      });
      if (res.ok) {
        showNotification(`🚀 ${selectedTaskType} approved and promoted to Live Production Database!`);
        await fetchStatus();
      } else {
        showNotification('Failed to promote artifact.');
      }
    } catch (err: any) {
      showNotification(`Promotion failed: ${err.message}`);
    } finally {
      setIsPromotingSingleArtifact(false);
    }
  };

  const passingChecksCount = status?.preFlightChecks.filter(c => c.passed).length || 0;
  const totalChecksCount = status?.preFlightChecks.length || 7;
  const isPreFlightReady = passingChecksCount === totalChecksCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner: Environment Mode & Mission Control */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-100 tracking-tight">
                    Sandbox Simulation Lab
                  </h1>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    environmentMode === 'sandbox'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  }`}>
                    {environmentMode === 'sandbox' ? 'Isolated Staging Active' : 'Live Production Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
                  Production-grade sandbox for testing real-world problem-solving across all 19 PM artifacts, simulating traffic, injecting chaos, and passing pre-flight gates.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Environment Controls */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Quick Live API Health link */}
            <button
              onClick={() => onNavigateTab('api-health')}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Monitor Gemini API latency, status codes, and quotas"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>API Health Dashboard</span>
            </button>

            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => handleToggleEnv('sandbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  environmentMode === 'sandbox'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Sandbox</span>
              </button>
              <button
                onClick={() => handleToggleEnv('production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  environmentMode === 'production'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Production</span>
              </button>
            </div>

            <button
              onClick={() => setShowPromoteModal(true)}
              disabled={!isPreFlightReady}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                isPreFlightReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
              title={isPreFlightReady ? 'Promote tested artifacts to Live Production' : 'Pre-flight checks must pass (7/7) before promoting'}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Promote to Prod</span>
            </button>

            <button
              onClick={handleResetSandbox}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset Sandbox to clean baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-Time Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Simulated Concurrency</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-100 font-mono">{status?.virtualUsersCount || virtualUsers}</span>
              <span className="text-[11px] text-slate-400 font-medium">personas</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Synthetic Throughput</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-100 font-mono">{status?.rps || targetRps}</span>
              <span className="text-[11px] text-slate-400 font-medium">req / sec</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">p95 Latency SLA</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-lg font-black font-mono ${
                (status?.p95LatencyMs || 118) > 300 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {status?.p95LatencyMs || 118}ms
              </span>
              <span className="text-[11px] text-slate-400 font-medium">&lt; 350ms SLA</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Chaos Injectors</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-lg font-black font-mono ${
                (status?.activeRulesCount || 0) > 0 ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {status?.activeRulesCount || 0} / 6
              </span>
              <span className="text-[11px] text-slate-400 font-medium">faults active</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pre-Flight Gate</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-lg font-black font-mono ${
                isPreFlightReady ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {passingChecksCount} / {totalChecksCount}
              </span>
              <span className={`text-[11px] font-medium ${isPreFlightReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isPreFlightReady ? 'Ready for Prod' : 'Audits Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sandbox Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('artifact-lab')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'artifact-lab'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>19-Artifact Problem Solver</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/80 text-indigo-200 font-mono font-bold">19 Specs</span>
        </button>

        <button
          onClick={() => setActiveTab('canary')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'canary'
              ? 'bg-amber-600/30 text-amber-200 font-bold border border-amber-500/50 shadow-md shadow-amber-950/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <GitBranch className="w-4 h-4 text-amber-400" />
          <span>Canary Deployment</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
            {status?.canaryDeployment?.trafficPercentage ?? 20}% Canary
          </span>
        </button>

        <button
          onClick={() => setActiveTab('traffic')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'traffic'
              ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Real-Time Traffic Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('chaos')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === 'chaos'
              ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Chaos & Resiliency Simulator</span>
          {(status?.activeRulesCount || 0) > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === 'flags'
              ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Feature Flags & Rollouts</span>
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === 'webhooks'
              ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Send className="w-4 h-4 text-cyan-400" />
          <span>Mock Webhook Dispatcher</span>
        </button>

        <button
          onClick={() => setActiveTab('readiness')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === 'readiness'
              ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pre-Flight Gate ({passingChecksCount}/{totalChecksCount})</span>
        </button>
      </div>

      {/* TAB 0: 19-ARTIFACT REAL-TIME PROBLEM SOLVER */}
      {activeTab === 'artifact-lab' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Step 1: Real-World Problem Statement & Enterprise Scenarios */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Product Problem Statement</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a real-world enterprise problem scenario or formulate a custom prompt to solve in the sandbox environment.
                </p>
              </div>

              {/* Chaos Toggle for Generation */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={simulateChaosDuringGen}
                  onChange={(e) => setSimulateChaosDuringGen(e.target.checked)}
                  className="rounded text-indigo-500 focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Flame className={`w-3.5 h-3.5 ${simulateChaosDuringGen ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>Simulate Chaos Fault (+600ms latency)</span>
                </span>
              </label>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Enterprise Problem Presets:</span>
              {[
                { id: 'fintech_3ds', label: 'FinTech 3DS Dropoff', spec: 'PRD' },
                { id: 'saas_churn', label: 'B2B SaaS RBAC Churn', spec: 'USER_STORIES' },
                { id: 'cart_abandon', label: 'Checkout Cart Abandonment', spec: 'ROADMAP' },
                { id: 'sprint_velocity', label: 'Sprint Dependency Deadlock', spec: 'EPICS' },
                { id: 'ai_sla', label: 'Burst Traffic SLA Breach', spec: 'PRODUCT_REQUIREMENTS' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                    problemPreset === p.id
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] font-mono opacity-60">({p.spec})</span>
                </button>
              ))}
            </div>

            {/* Problem Statement Text Area */}
            <div className="space-y-1.5">
              <textarea
                rows={3}
                value={customProblemText}
                onChange={(e) => setCustomProblemText(e.target.value)}
                placeholder="Describe the product-related problem or friction to solve in real-time..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono shadow-inner resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Step 2: Choose from 19 Product Artifact Archetypes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Target 19-Artifact Specification Suite</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose the target artifact archetype to generate and test in the sandbox environment.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {['All', 'Strategy', 'Discovery', 'Definition', 'Prioritization', 'Metrics', 'Execution'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 19 Artifacts Grid Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {ARTIFACT_19_CATALOG
                .filter(item => selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter)
                .map(item => {
                  const isSelected = selectedTaskType === item.type;
                  return (
                    <div
                      key={item.type}
                      onClick={() => setSelectedTaskType(item.type)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-slate-100 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500'
                          : 'bg-slate-950/80 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="font-semibold text-xs leading-snug text-slate-200">
                          {item.label}
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.category}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.shortDesc}
                      </p>

                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">{item.type}</span>
                        {isSelected && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Selected: <strong className="text-slate-100 font-mono">{selectedTaskType}</strong></span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">Sandbox Isolation: <strong className="text-amber-400">Zero DB pollution</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSolveArtifact}
                  disabled={isSolvingArtifact || !customProblemText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/60 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isSolvingArtifact ? 'animate-spin' : ''}`} />
                  <span>{isSolvingArtifact ? 'Solving & Testing...' : `Solve & Generate ${selectedTaskType} in Sandbox`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Solved Artifact Result Inspector */}
          {solvedArtifactResult && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 animate-fadeIn shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100">
                        {solvedArtifactResult.artifact?.title || `Generated ${solvedArtifactResult.taskType}`}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        HTTP 200 OK
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        100% Zod Compliant
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Roundtrip Latency: <strong className="text-emerald-400">{solvedArtifactResult.latencyMs}ms</strong> · Request ID: {solvedArtifactResult.requestId}
                    </p>
                  </div>
                </div>

                {/* Sub-view toggle & Action Buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['preview', 'json', 'logs'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setArtifactViewerMode(tab)}
                        className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                          artifactViewerMode === tab
                            ? 'bg-slate-800 text-slate-100 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handlePromoteSingleArtifact}
                    disabled={isPromotingSingleArtifact}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{isPromotingSingleArtifact ? 'Promoting...' : 'Promote to Production DB'}</span>
                  </button>
                </div>
              </div>

              {/* View 1: Rendered Specification Preview */}
              {artifactViewerMode === 'preview' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs text-slate-300">
                  {/* Executive Summary */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Objective / Executive Summary</span>
                    <p className="text-slate-200 leading-relaxed font-sans text-xs">
                      {solvedArtifactResult.artifact?.objective || 
                       solvedArtifactResult.artifact?.content?.objective || 
                       solvedArtifactResult.artifact?.content?.vision || 
                       solvedArtifactResult.artifact?.summary ||
                       'Generated specification strictly structured against Zod domain schemas.'}
                    </p>
                  </div>

                  {/* Render Functional Requirements or Stories if present */}
                  {solvedArtifactResult.artifact?.functionalRequirements && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Functional Requirements (MoSCoW)</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {solvedArtifactResult.artifact.functionalRequirements.slice(0, 6).map((fr: any, i: number) => (
                          <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-indigo-300">{fr.id || `FR-${i + 1}`}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                                {fr.priority || 'P1'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{fr.description || fr.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render User Stories if present */}
                  {solvedArtifactResult.artifact?.userStories && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Generated User Stories & Acceptance Criteria</span>
                      <div className="space-y-2">
                        {solvedArtifactResult.artifact.userStories.slice(0, 4).map((st: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">{st.title || `Story US-${i + 1}`}</span>
                              <span className="font-mono text-[10px] text-amber-400">{st.storyPoints || 5} Points</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">{st.asA ? `As a ${st.asA}, I want ${st.iWant}, So that ${st.soThat}` : st.description}</p>
                            {st.acceptanceCriteria && (
                              <div className="text-[10px] text-emerald-400/90 font-mono bg-slate-950 p-2 rounded">
                                Given/When/Then: {Array.isArray(st.acceptanceCriteria) ? st.acceptanceCriteria.join(' · ') : String(st.acceptanceCriteria)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Roadmap items if present */}
                  {solvedArtifactResult.artifact?.timeline && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Roadmap Delivery Phasing</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {Object.entries(solvedArtifactResult.artifact.timeline).map(([phase, items]: any, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="font-bold text-slate-200 capitalize text-[11px]">{phase}</div>
                            <div className="text-[11px] text-slate-400">
                              {Array.isArray(items) ? items.join(', ') : JSON.stringify(items)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Prose if available */}
                  {solvedArtifactResult.artifact?.renderedMarkdown && (
                    <div className="pt-2 border-t border-slate-900 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Rendered Markdown Specification</span>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                        {solvedArtifactResult.artifact.renderedMarkdown}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Raw Zod JSON */}
              {artifactViewerMode === 'json' && (
                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(solvedArtifactResult.artifact, null, 2));
                      setCopiedArtifactJson(true);
                      setTimeout(() => setCopiedArtifactJson(false), 2000);
                    }}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    {copiedArtifactJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedArtifactJson ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-80 leading-relaxed">
                    {JSON.stringify(solvedArtifactResult.artifact, null, 2)}
                  </pre>
                </div>
              )}

              {/* View 3: Execution Pipeline Logs */}
              {artifactViewerMode === 'logs' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1 max-h-60 overflow-y-auto">
                  {(solvedArtifactResult.logs || []).map((log: string, idx: number) => (
                    <div key={idx} className="text-slate-400 leading-relaxed">
                      <span className="text-slate-600">[{idx + 1}]</span> {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: CANARY DEPLOYMENT SIMULATOR */}
      {activeTab === 'canary' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card: Canary Deployment Release Overview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-100">
                      {status?.canaryDeployment?.name || 'Canary Deployment: Autonomous PM Dual-Pass Synthesizer v2.5.0-rc2'}
                    </h3>
                    {/* Status Pill */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border flex items-center gap-1.5 ${
                      status?.canaryDeployment?.status === 'running'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : status?.canaryDeployment?.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : status?.canaryDeployment?.status === 'promoted'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        status?.canaryDeployment?.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-current'
                      }`} />
                      {status?.canaryDeployment?.status?.toUpperCase() || 'RUNNING'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Target: {status?.canaryDeployment?.targetService || 'API Gateway & Multi-Artifact Spec Pipeline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {status?.canaryDeployment?.description || 'Gradual multi-region canary rollout featuring 38% faster p95 spec generation and sub-second Gherkin verification.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={handleSimulateCanaryBurst}
                  disabled={isSimulatingCanary}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/60 disabled:opacity-50"
                  title="Inject 8 realistic requests across canary routing mesh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingCanary ? 'animate-spin' : ''}`} />
                  <span>{isSimulatingCanary ? 'Simulating Traffic...' : 'Simulate Live Burst'}</span>
                </button>

                {status?.canaryDeployment?.status === 'running' ? (
                  <button
                    onClick={() => handleCanaryAction('pause')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Pause traffic progression"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCanaryAction('resume')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Resume traffic progression"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  onClick={() => handleCanaryAction('promote')}
                  disabled={status?.canaryDeployment?.trafficPercentage === 100}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Promote canary version to 100% production traffic"
                >
                  <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Promote to 100%</span>
                </button>

                <button
                  onClick={() => handleCanaryAction('rollback')}
                  disabled={status?.canaryDeployment?.trafficPercentage === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Emergency Circuit Breaker: Instantly drop canary traffic to 0%"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rollback (0%)</span>
                </button>
              </div>
            </div>

            {/* Version comparison row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Stable Baseline Version</div>
                    <div className="text-[11px] font-mono text-blue-400">{status?.canaryDeployment?.stableVersion || 'v2.4.2 (Production Stable)'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-300">{100 - (status?.canaryDeployment?.trafficPercentage ?? 20)}% Traffic</div>
                  <div className="text-[10px] text-slate-500">{status?.canaryDeployment?.stableMetrics?.rps || 68} RPS</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-amber-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Canary Candidate Version</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono font-bold">Candidate</span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-300">{status?.canaryDeployment?.canaryVersion || 'v2.5.0-rc2 (Canary Dual-Pass)'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-amber-300">{status?.canaryDeployment?.trafficPercentage ?? 20}% Traffic</div>
                  <div className="text-[10px] text-slate-500">{status?.canaryDeployment?.canaryMetrics?.rps || 17} RPS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Traffic Percentage Splitter */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Split className="w-4 h-4 text-amber-400" />
                  <span>Traffic Split Ratio & Mesh Controller</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drag the slider or click a preset to instantly rebalance API ingress traffic between Stable and Canary versions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <span className="text-blue-400 font-bold">{100 - (status?.canaryDeployment?.trafficPercentage ?? 20)}% Stable</span>
                  <span className="text-slate-600">:</span>
                  <span className="text-amber-400 font-bold">{status?.canaryDeployment?.trafficPercentage ?? 20}% Canary</span>
                </div>
              </div>
            </div>

            {/* Visual Dual-Tone Segmented Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-950 border border-slate-800 p-0.5">
                <div
                  style={{ width: `${100 - (status?.canaryDeployment?.trafficPercentage ?? 20)}%` }}
                  className="bg-gradient-to-r from-blue-700 to-indigo-600 h-full rounded-l-lg transition-all duration-300 flex items-center justify-center text-[10px] font-mono font-bold text-white px-2 truncate shadow-inner"
                >
                  {(100 - (status?.canaryDeployment?.trafficPercentage ?? 20)) > 12 && (
                    <span>Stable: {100 - (status?.canaryDeployment?.trafficPercentage ?? 20)}%</span>
                  )}
                </div>
                <div
                  style={{ width: `${status?.canaryDeployment?.trafficPercentage ?? 20}%` }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-r-lg transition-all duration-300 flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 px-2 truncate shadow-inner"
                >
                  {(status?.canaryDeployment?.trafficPercentage ?? 20) > 12 && (
                    <span>Canary: {status?.canaryDeployment?.trafficPercentage ?? 20}%</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>0% (100% Production Stable)</span>
                <span>50% (Equal Split)</span>
                <span>100% (Full Canary Rollout)</span>
              </div>
            </div>

            {/* Slider Control */}
            <div className="pt-2">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={status?.canaryDeployment?.trafficPercentage ?? 20}
                onChange={(e) => handleUpdateCanaryTraffic(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 cursor-pointer h-2.5 rounded-lg"
              />
            </div>

            {/* Preset Split Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium mr-1">Quick Presets:</span>
              {[
                { label: '0% (Stable Only)', pct: 0 },
                { label: '10% (Canary Pilot)', pct: 10 },
                { label: '25% (Early Adopter)', pct: 25 },
                { label: '50% (Dual Split)', pct: 50 },
                { label: '75% (Staged Rollout)', pct: 75 },
                { label: '100% (Full Release)', pct: 100 }
              ].map((preset) => {
                const isActive = (status?.canaryDeployment?.trafficPercentage ?? 20) === preset.pct;
                return (
                  <button
                    key={preset.pct}
                    onClick={() => handleUpdateCanaryTraffic(preset.pct)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Visual Impact on API Health Metrics (Side-by-Side Comparison) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time API Health Metrics Impact Visualizer</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Side-by-side comparative telemetry comparing latency, error rates, throughput, and resource consumption.
                </p>
              </div>

              {/* Threshold alerts indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span>Auto-Rollback Thresholds: Latency &gt; 450ms · Error &gt; 2.0%</span>
              </div>
            </div>

            {(() => {
              const stable = status?.canaryDeployment?.stableMetrics || {
                version: 'v2.4.2 (Stable)',
                trafficPercentage: 80,
                rps: 68,
                p95LatencyMs: 94,
                p99LatencyMs: 165,
                errorRate: 0.12,
                cpuUsagePercent: 34,
                memoryUsageMb: 412,
                statusCodes: { status2xx: 14280, status4xx: 24, status5xx: 3 }
              };
              const canary = status?.canaryDeployment?.canaryMetrics || {
                version: 'v2.5.0-rc2 (Canary)',
                trafficPercentage: 20,
                rps: 17,
                p95LatencyMs: 58,
                p99LatencyMs: 98,
                errorRate: 0.06,
                cpuUsagePercent: 22,
                memoryUsageMb: 368,
                statusCodes: { status2xx: 3570, status4xx: 6, status5xx: 0 }
              };

              const latDelta = stable.p95LatencyMs > 0
                ? ((canary.p95LatencyMs - stable.p95LatencyMs) / stable.p95LatencyMs) * 100
                : 0;
              const errDelta = canary.errorRate - stable.errorRate;

              const isLatencySpike = canary.p95LatencyMs >= 450;
              const isErrorSpike = canary.errorRate >= 2.0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Throughput (RPS) */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Throughput & RPS</span>
                      <Gauge className="w-4 h-4 text-blue-400" />
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold font-mono text-slate-100">
                        {(stable.rps + canary.rps)} <span className="text-xs text-slate-400 font-normal">total RPS</span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {canary.rps} RPS Canary
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-blue-400">Stable: {stable.rps} RPS ({stable.trafficPercentage}%)</span>
                        <span className="text-amber-400">Canary: {canary.rps} RPS ({canary.trafficPercentage}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden flex bg-slate-950">
                        <div style={{ width: `${stable.trafficPercentage}%` }} className="bg-blue-500 h-full" />
                        <div style={{ width: `${canary.trafficPercentage}%` }} className="bg-amber-400 h-full" />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: P95 & P99 Latency */}
                  <div className={`rounded-2xl border p-4 space-y-3 ${
                    isLatencySpike
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">P95 Spec Gen Latency</span>
                      {latDelta <= 0 ? (
                        <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          <TrendingDown className="w-3 h-3" />
                          {Math.abs(Math.round(latDelta))}% Faster
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                          <TrendingUp className="w-3 h-3" />
                          +{Math.round(latDelta)}% Slower
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-medium">Stable P95</div>
                        <div className="text-lg font-mono font-bold text-blue-400">{stable.p95LatencyMs}ms</div>
                        <div className="text-[10px] text-slate-500 font-mono">P99: {stable.p99LatencyMs}ms</div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${
                        isLatencySpike
                          ? 'bg-rose-950/60 border-rose-500/40'
                          : 'bg-slate-950/80 border-amber-900/40'
                      }`}>
                        <div className="text-[10px] text-slate-400 font-medium">Canary P95</div>
                        <div className={`text-lg font-mono font-bold ${isLatencySpike ? 'text-rose-400' : 'text-amber-300'}`}>
                          {canary.p95LatencyMs}ms
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">P99: {canary.p99LatencyMs}ms</div>
                      </div>
                    </div>

                    {isLatencySpike && (
                      <div className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Exceeds 450ms Auto-Rollback threshold!</span>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Error Rate & HTTP Panics */}
                  <div className={`rounded-2xl border p-4 space-y-3 ${
                    isErrorSpike
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Error Rate</span>
                      {errDelta <= 0 ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          Nominal ({canary.errorRate}%)
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                          +{errDelta.toFixed(2)}% Surge
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-medium">Stable</div>
                        <div className="text-lg font-mono font-bold text-slate-200">{stable.errorRate}%</div>
                        <div className="text-[10px] text-slate-500 font-mono">5xx: {stable.statusCodes.status5xx}</div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${
                        isErrorSpike
                          ? 'bg-rose-950/60 border-rose-500/40'
                          : 'bg-slate-950/80 border-amber-900/40'
                      }`}>
                        <div className="text-[10px] text-slate-400 font-medium">Canary</div>
                        <div className={`text-lg font-mono font-bold ${isErrorSpike ? 'text-rose-400' : 'text-amber-300'}`}>
                          {canary.errorRate}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">5xx: {canary.statusCodes.status5xx}</div>
                      </div>
                    </div>

                    {isErrorSpike && (
                      <div className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Exceeds 2.0% SLA Threshold!</span>
                      </div>
                    )}
                  </div>

                  {/* Card 4: Resource Footprint (CPU & Memory) */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Resource Footprint</span>
                      <Cpu className="w-4 h-4 text-indigo-400" />
                    </div>

                    <div className="space-y-2 pt-1 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">CPU Usage:</span>
                          <span className="text-slate-200">Stable {stable.cpuUsagePercent}% · <span className="text-amber-400">Canary {canary.cpuUsagePercent}%</span></span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
                          <div style={{ width: `${canary.cpuUsagePercent}%` }} className="bg-amber-400 h-full" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Memory RSS:</span>
                          <span className="text-slate-200">Stable {stable.memoryUsageMb}MB · <span className="text-amber-400">Canary {canary.memoryUsageMb}MB</span></span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
                          <div style={{ width: `${Math.min(100, (canary.memoryUsageMb / 1024) * 100)}%` }} className="bg-indigo-500 h-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 4: Canary Simulated Fault Injection & Stress Testing */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Canary Fault Injection & Auto-Rollback Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate canary regressions to verify how health checks, alert thresholds, and circuit breakers respond in real time.
                </p>
              </div>

              <div className="text-xs font-mono text-slate-400">
                Active Fault: <span className="text-amber-400 font-bold uppercase">{status?.canaryDeployment?.simulatedFault || 'NONE'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  id: 'none',
                  title: 'Nominal Baseline',
                  desc: 'Healthy dual-pass pipeline. Sub-60ms p95 latency, 0.04% error rate.',
                  badge: 'Healthy Baseline',
                  badgeColor: 'text-emerald-400 border-emerald-800 bg-emerald-950/40'
                },
                {
                  id: 'latency_spike',
                  title: 'Latency Spike (+540ms)',
                  desc: 'Downstream Gemini API latency degradation. Exceeds 450ms rollback threshold.',
                  badge: 'Latency Gate Fail',
                  badgeColor: 'text-amber-400 border-amber-800 bg-amber-950/40'
                },
                {
                  id: 'null_pointer_500',
                  title: 'HTTP 500 Panic Surge',
                  desc: 'Unhandled schema parse panic on dual-pass verification. Error rate surges to 5.4%.',
                  badge: 'SLA Breach (5.4%)',
                  badgeColor: 'text-rose-400 border-rose-800 bg-rose-950/40'
                },
                {
                  id: 'memory_leak',
                  title: 'Memory Leak (940MB)',
                  desc: 'Context memory leak on dual-pass synthesis. Memory rises to 940MB with CPU 89%.',
                  badge: 'OOM Risk',
                  badgeColor: 'text-purple-400 border-purple-800 bg-purple-950/40'
                },
                {
                  id: 'rate_limit',
                  title: 'HTTP 429 Token Limit',
                  desc: 'Quota exhaustion on model synthesis endpoints. Triggers client retry backoff.',
                  badge: 'Quota Exhaustion',
                  badgeColor: 'text-cyan-400 border-cyan-800 bg-cyan-950/40'
                }
              ].map((faultItem) => {
                const isSelected = (status?.canaryDeployment?.simulatedFault || 'none') === faultItem.id;
                return (
                  <button
                    key={faultItem.id}
                    onClick={() => handleSetCanaryFault(faultItem.id)}
                    className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-950/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {faultItem.title}
                        </span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {faultItem.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${faultItem.badgeColor}`}>
                        {faultItem.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Real-Time Live Request Stream (Canary Router Inspection) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Request Routing Log (Canary vs Stable Stream)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live inspect synthetic and user requests arriving at the gateway to confirm traffic routing accuracy.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                {(['all', 'canary', 'stable', 'errors'] as const).map((filter) => {
                  const isActive = canaryRequestFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setCanaryRequestFilter(filter)}
                      className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 text-slate-100 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Request Table / List */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Routing Variant</th>
                      <th className="py-2.5 px-3">Method & Endpoint</th>
                      <th className="py-2.5 px-3">Persona / Client IP</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Latency</th>
                      <th className="py-2.5 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {(() => {
                      const reqs = status?.canaryDeployment?.recentRequests || [];
                      const filtered = reqs.filter((r) => {
                        if (canaryRequestFilter === 'canary') return r.version === 'canary';
                        if (canaryRequestFilter === 'stable') return r.version === 'stable';
                        if (canaryRequestFilter === 'errors') return r.status === 'error' || r.statusCode >= 400;
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                              No requests match the selected filter. Click "Simulate Live Burst" to generate traffic.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((req) => {
                        const isCanary = req.version === 'canary';
                        return (
                          <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isCanary ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                                  <GitBranch className="w-2.5 h-2.5" />
                                  <span>CANARY v2.5</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
                                  <Server className="w-2.5 h-2.5" />
                                  <span>STABLE v2.4</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-bold text-slate-300 mr-1.5">{req.method}</span>
                              <span className="text-slate-400">{req.endpoint}</span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-sans">
                              <div className="font-medium text-slate-300">{req.persona || 'Synthetic Agent'}</div>
                              <div className="text-[10px] font-mono text-slate-500">{req.clientIp}</div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                req.statusCode === 200
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                  : req.statusCode === 429
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                              }`}>
                                {req.statusCode} {req.statusCode === 200 ? 'OK' : req.statusCode === 429 ? 'Too Many Requests' : 'Internal Error'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`${
                                req.latencyMs < 100
                                  ? 'text-emerald-400 font-bold'
                                  : req.latencyMs < 300
                                  ? 'text-amber-400'
                                  : 'text-rose-400 font-bold'
                              }`}>
                                {req.latencyMs}ms
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-right text-slate-500 text-[10px]">
                              {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: REAL-TIME TRAFFIC & LOAD SIMULATOR */}
      {activeTab === 'traffic' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1-col: Simulation Controls */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Traffic Surge Parameters</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Inject synthetic personas to exercise user stories and measure API responsiveness.
                </p>
              </div>

              {/* Slider 1: Virtual Users */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Virtual Personas</span>
                  <span className="font-mono text-emerald-400 font-bold">{virtualUsers.toLocaleString()} users</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2500"
                  step="50"
                  value={virtualUsers}
                  onChange={(e) => setVirtualUsers(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 cursor-pointer h-1.5 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50</span>
                  <span>1,000</span>
                  <span>2,500</span>
                </div>
              </div>

              {/* Slider 2: Request Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Throughput Target</span>
                  <span className="font-mono text-cyan-400 font-bold">{targetRps} req / sec</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="350"
                  step="5"
                  value={targetRps}
                  onChange={(e) => setTargetRps(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 cursor-pointer h-1.5 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>10 RPS</span>
                  <span>150 RPS</span>
                  <span>350 RPS</span>
                </div>
              </div>

              {/* Slider 3: Error Rate Injection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Simulated Network Flakiness</span>
                  <span className="font-mono text-amber-400 font-bold">{errorRateSlider}% flakiness</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={errorRateSlider}
                  onChange={(e) => setErrorRateSlider(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 cursor-pointer h-1.5 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Clean)</span>
                  <span>5%</span>
                  <span>15% (Severe)</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunTrafficBurst}
                disabled={isSimulatingTraffic}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isSimulatingTraffic
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                }`}
              >
                {isSimulatingTraffic ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Surging Traffic ({trafficTimer}s left)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run 10-Second Traffic Surge</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Live Persona Testing</div>
                <p>
                  Tests OAuth authentication, RICE calculations, story status transitions, and Cloud SQL read replicas in real time without polluting production records.
                </p>
              </div>
            </div>

            {/* Right 2-cols: Live Synthetic Stream & Metrics */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-100">Live Synthetic Telemetry Stream</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Real-time event ring buffer (25 max)
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto pr-1">
                  {status?.recentTelemetry && status.recentTelemetry.length > 0 ? (
                    status.recentTelemetry.map((ev) => (
                      <div key={ev.id} className="py-2.5 text-xs flex items-start justify-between gap-3 group">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              ev.status === 'success' 
                                ? 'bg-emerald-400' 
                                : ev.status === 'warn' 
                                ? 'bg-amber-400' 
                                : 'bg-rose-400'
                            }`} />
                            <span className="font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                              {ev.event}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span className="text-slate-300 font-medium">{ev.persona}</span>
                            <span>·</span>
                            <span className="font-mono text-slate-500">{ev.endpoint}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{ev.details}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[11px] font-mono font-bold ${
                            ev.latencyMs > 200 ? 'text-amber-400' : 'text-slate-300'
                          }`}>
                            {ev.latencyMs}ms
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No events recorded yet. Run a traffic surge to populate the stream.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHAOS & RESILIENCY SIMULATOR */}
      {activeTab === 'chaos' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Storm Controller */}
          <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-amber-200">Real-Time Product Resiliency & Chaos Suite</h3>
              </div>
              <p className="text-xs text-amber-300/80 max-w-2xl">
                Real-world outages are product problems. Inject deliberate faults into the sandbox to verify client-side retry strategies, exponential backoff, and graceful degradations before customers encounter them.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => handleTriggerChaosStorm(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Flame className="w-4 h-4" />
                <span>Inject Chaos Storm</span>
              </button>
              <button
                onClick={() => handleTriggerChaosStorm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
              >
                Clear All Faults
              </button>
            </div>
          </div>

          {/* Fault Injector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status?.chaosRules.map((rule) => {
              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    rule.enabled
                      ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold leading-snug ${
                        rule.enabled ? 'text-amber-300' : 'text-slate-200'
                      }`}>
                        {rule.name}
                      </span>
                      <button
                        onClick={() => handleToggleChaosRule(rule.id, rule.enabled)}
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                          rule.enabled
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="font-mono text-slate-500">Impact Profile</span>
                    <span className={`font-medium ${rule.enabled ? 'text-amber-400' : 'text-slate-400'}`}>
                      {rule.impact}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FEATURE FLAGS & CANARY EXPERIMENTATION */}
      {activeTab === 'flags' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">Canary Feature Flag Matrix</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage live percentage rollouts, test kill-switches, and model conversion impact in real-time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {status?.featureFlags.map((flag) => {
              return (
                <div
                  key={flag.key}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-slate-200">{flag.name}</span>
                        <code className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {flag.key}
                        </code>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          flag.environment === 'all'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        }`}>
                          {flag.environment === 'all' ? 'All Envs' : 'Sandbox Only'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-2xl">
                        {flag.description}
                      </p>
                    </div>

                    {/* Kill Switch Toggle */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleUpdateFlag(flag.key, !flag.enabled)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          flag.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${flag.enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span>{flag.enabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Percentage Slider & Impact Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80 items-center">
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Canary Rollout Cohort</span>
                        <span className="font-mono font-bold text-indigo-400">{flag.rolloutPercentage}% of users</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        disabled={!flag.enabled}
                        value={flag.rolloutPercentage}
                        onChange={(e) => handleUpdateFlag(flag.key, undefined, Number(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-800 cursor-pointer h-1.5 rounded-lg disabled:opacity-40"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-4 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500">Output Impact</div>
                        <div className="text-emerald-400 font-bold">{flag.conversionImpactEstimate}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Churn Risk</div>
                        <div className="text-slate-300 font-bold">{flag.churnRiskEstimate}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MOCK WEBHOOK DISPATCHER & INSPECTOR */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1-col: Webhook Selectors */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Configured Endpoints</h3>
              <p className="text-xs text-slate-400">
                Test outbound event propagation to external project management and observability platforms.
              </p>

              <div className="space-y-2 pt-2">
                {status?.webhooks.map((wh) => (
                  <button
                    key={wh.id}
                    onClick={() => setSelectedWebhookId(wh.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      selectedWebhookId === wh.id
                        ? 'bg-slate-800 border-cyan-500/50 text-slate-100 font-semibold shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{wh.targetService}</span>
                      <span className="text-[10px] font-mono text-emerald-400">HTTP {wh.lastStatusCode || 200}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 truncate">{wh.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">{wh.targetUrl}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right 2-cols: Payload Editor & Inspector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-100">Outbound JSON Payload Inspector</h3>
                    <p className="text-xs text-slate-400">
                      Edit sample JSON and dispatch a real simulated HTTP delivery with HMAC-SHA256 headers.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(customPayloadText);
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy payload"
                  >
                    {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <textarea
                  value={customPayloadText}
                  onChange={(e) => setCustomPayloadText(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 font-mono text-xs text-cyan-300 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                    <span>Signature: sha256=e3b0c442...</span>
                    <span>·</span>
                    <span>Timeout: 5,000ms</span>
                  </div>

                  <button
                    onClick={handleDispatchWebhook}
                    disabled={isDispatchingWebhook}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center gap-2 shadow-sm"
                  >
                    {isDispatchingWebhook ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Mock Event</span>
                      </>
                    )}
                  </button>
                </div>

                {lastDispatchResponse && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1 mt-4">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>HTTP {lastDispatchResponse.response.statusCode} OK</span>
                      <span className="text-slate-500 font-normal">{lastDispatchResponse.response.latencyMs}ms</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Request ID: {lastDispatchResponse.response.headers['x-request-id']}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRE-FLIGHT READINESS GATE & PROMOTION */}
      {activeTab === 'readiness' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">Automated Production Pre-Flight Audit</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Strict 7-pillar gate verifying schema conformity, acceptance test suites, resilience SLA, and security configurations.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
                  isPreFlightReady
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                }`}>
                  {passingChecksCount} of {totalChecksCount} Audits Passing
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 pt-2">
              {status?.preFlightChecks.map((check) => (
                <div key={check.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-bold text-xs text-slate-200">{check.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">[{check.category}]</span>
                    </div>
                    <p className="text-xs text-slate-400 pl-6 leading-relaxed">
                      {check.details}
                    </p>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 ${
                    check.passed 
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' 
                      : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                  }`}>
                    {check.passed ? 'PASSED' : 'ACTION REQUIRED'}
                  </span>
                </div>
              ))}
            </div>

            {/* Promote Action Box */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Last promoted to production: <span className="font-mono text-slate-300">{status?.lastPromotedAt ? new Date(status.lastPromotedAt).toLocaleString() : 'Never'}</span>
              </div>

              <button
                onClick={() => setShowPromoteModal(true)}
                disabled={!isPreFlightReady}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                  isPreFlightReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Promote Tested Sandbox Build to Production</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTION CONFIRMATION MODAL */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Confirm Production Deployment</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Promote verified user stories, PRDs, and configurations into the Live Production environment.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-300">Pre-Flight Audit Summary:</div>
              <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                <li>All 19 artifacts validated against strict Zod schemas</li>
                <li>100% Gherkin Given/When/Then acceptance criteria verified</li>
                <li>Simulated traffic passed p99 SLA (&lt; 350ms)</li>
                <li>Audit trail record signed and synchronized with Cloud SQL</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteToProduction}
                disabled={isPromoting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-2"
              >
                {isPromoting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Promoting...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Confirm & Promote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
