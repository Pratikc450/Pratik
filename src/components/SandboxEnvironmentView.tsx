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
  Code2
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
  ArtifactCategory
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
  const [activeTab, setActiveTab] = useState<'artifact-lab' | 'traffic' | 'chaos' | 'flags' | 'webhooks' | 'readiness'>('artifact-lab');
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingTraffic, setIsSimulatingTraffic] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
          <span>Feature Flags & Canary</span>
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
