import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import {
  clientRateLimiter,
  ClientRateLimiterConfig,
  ClientRateLimiterStats,
  ClientRateLimitDecision
} from '../services/clientRateLimiter.js';
import { apiClient } from '../services/apiClient.js';

export const ClientSideRateLimiterPanel: React.FC = () => {
  const [stats, setStats] = useState<ClientRateLimiterStats>(clientRateLimiter.getStats());
  const [isTestingBurst, setIsTestingBurst] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    callIndex: number;
    endpoint: string;
    allowed: boolean;
    delayMs: number;
    reason?: string;
    timestamp: string;
  }>>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = clientRateLimiter.subscribe(() => {
      setStats(clientRateLimiter.getStats());
    });

    // Refresh every second for active countdown timers
    const interval = setInterval(() => {
      setStats(clientRateLimiter.getStats());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleEnabled = () => {
    const nextState = !stats.config.enabled;
    clientRateLimiter.updateConfig({ enabled: nextState });
    showNotification(`Client-Side Sandbox Rate Limiter ${nextState ? 'ACTIVATED' : 'PAUSED'}`);
  };

  const handleUpdateRpm = (rpm: number) => {
    clientRateLimiter.updateConfig({ maxRpm: rpm });
  };

  const handleUpdateBurst = (burst: number) => {
    clientRateLimiter.updateConfig({ burstLimit: burst });
  };

  const handleUpdatePolicy = (policy: 'block' | 'queue') => {
    clientRateLimiter.updateConfig({ policy });
    showNotification(`Enforcement policy set to: ${policy === 'block' ? 'Immediate Block (429 Backoff)' : 'Smooth Client Delay'}`);
  };

  const handleUpdateScope = (scope: 'sandbox-only' | 'all-ai-calls') => {
    clientRateLimiter.updateConfig({ scope });
  };

  const handleResetStats = () => {
    clientRateLimiter.resetStats();
    setTestResults([]);
    showNotification('Client rate limiter statistics reset');
  };

  // Live stress-test burst generator: fires 5 rapid calls in succession to test the limiter
  const handleExecuteBurstTest = async () => {
    setIsTestingBurst(true);
    setTestResults([]);
    const results: typeof testResults = [];

    const endpoints = [
      '/api/sandbox/artifacts/test-solve',
      '/api/ai/health/probe',
      '/api/sandbox/artifacts/test-solve',
      '/api/sandbox/traffic/simulate',
      '/api/ai/health/probe'
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i];
      const start = performance.now();
      
      // Execute through apiClient.executeRaw which honors clientRateLimiter
      const res = await apiClient.executeRaw('POST', ep, { test: true });
      const elapsed = Math.round(performance.now() - start);

      const wasBlocked = res.statusCode === 429 && res.data?.clientRateLimited;
      
      results.push({
        callIndex: i + 1,
        endpoint: ep,
        allowed: !wasBlocked,
        delayMs: elapsed,
        reason: wasBlocked ? res.data?.error : 'Passed client guard & token acquired',
        timestamp: new Date().toLocaleTimeString()
      });

      setTestResults([...results]);

      // Tiny 150ms delay between burst calls to trigger burst/RPM limits
      await new Promise(r => setTimeout(r, 150));
    }

    setIsTestingBurst(false);
    showNotification('Client rate limiter stress-test completed');
  };

  const fillPercentage = Math.round((stats.tokensRemaining / Math.max(1, stats.config.maxRpm)) * 100);

  return (
    <div className="rounded-2xl border border-indigo-900/60 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-6 space-y-6 shadow-xl">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 border border-indigo-500 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Status Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stats.config.enabled ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' : 'bg-slate-800 text-slate-500'
            }`}>
              <Gauge className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Client-Side Sandbox Rate Limiter Guard</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                stats.config.enabled
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {stats.config.enabled ? 'ACTIVE & GUARDING' : 'DISABLED'}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Intercepts and regulates client requests before they hit the network during sandbox testing to prevent Gemini API quota exhaustion.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Master Enable/Disable Toggle */}
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
              stats.config.enabled
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${stats.config.enabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-500'}`} />
            <span>{stats.config.enabled ? 'Guard Enabled' : 'Enable Guard'}</span>
          </button>

          {/* Reset Stats */}
          <button
            type="button"
            onClick={handleResetStats}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            title="Reset telemetry counters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 1: Live Token Bucket & Real-Time Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Live Available Tokens */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Available Sandbox Tokens
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              {fillPercentage}% Full
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-100">
              {stats.tokensRemaining}
              <span className="text-xs text-slate-400 font-normal ml-1">/ {stats.config.maxRpm} tokens</span>
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {stats.requestsInWindow} used
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                fillPercentage > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                  : fillPercentage > 20
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, fillPercentage))}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-900">
            <span>Window: 60s sliding</span>
            <span className="text-amber-300">Resets in {stats.resetInSeconds}s</span>
          </div>
        </div>

        {/* Card 2: Intercepted Calls Count */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Excessive Calls Blocked
          </span>
          <div className="text-2xl font-black font-mono text-rose-300">
            {stats.totalBlocked}
            <span className="text-xs text-slate-400 font-normal ml-1">intercepted</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Prevented upstream 429 quota locks on Google AI Studio Free Tier.
          </p>
        </div>

        {/* Card 3: Allowed Requests */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Allowed Requests
          </span>
          <div className="text-2xl font-black font-mono text-emerald-300">
            {stats.totalAllowed}
            <span className="text-xs text-slate-400 font-normal ml-1">passed</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Complied with safe rate limits and burst allowances.
          </p>
        </div>

        {/* Card 4: Burst Limit State */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Burst Protection
          </span>
          <div className="text-2xl font-black font-mono text-amber-300">
            {stats.config.burstLimit}
            <span className="text-xs text-slate-400 font-normal ml-1">burst / 3s</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Prevents concurrent bursts from flooding the model endpoint.
          </p>
        </div>
      </div>

      {/* Row 2: Interactive Controls & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sandbox Rate Limiter Configuration</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">Policy: {stats.config.policy.toUpperCase()}</span>
          </div>

          {/* RPM Slider with Preset Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Maximum Allowed RPM in Sandbox:</span>
              <span className="font-mono font-bold text-indigo-300 text-sm">{stats.config.maxRpm} RPM</span>
            </div>
            <input
              type="range"
              min="3"
              max="30"
              step="1"
              value={stats.config.maxRpm}
              onChange={(e) => handleUpdateRpm(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {[
                { label: 'Strict Saver (5 RPM)', rpm: 5 },
                { label: 'Gemini Free Safe (10 RPM)', rpm: 10 },
                { label: 'Standard Staging (15 RPM)', rpm: 15 },
                { label: 'High Velocity (25 RPM)', rpm: 25 }
              ].map((p) => (
                <button
                  key={p.rpm}
                  type="button"
                  onClick={() => handleUpdateRpm(p.rpm)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
                    stats.config.maxRpm === p.rpm
                      ? 'bg-indigo-900/60 border-indigo-600 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Burst Limit Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Burst Allowance (Max calls per 3 seconds):</span>
              <span className="font-mono font-bold text-amber-300">{stats.config.burstLimit} calls</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleUpdateBurst(b)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    stats.config.burstLimit === b
                      ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {b} call{b > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Action Policy Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <label className="text-xs font-semibold text-slate-300">When Limit is Exceeded:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdatePolicy('block')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  stats.config.policy === 'block'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Immediate Block (429)</span>
                  {stats.config.policy === 'block' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Rejects call instantly without sending network request. Zero tokens consumed.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdatePolicy('queue')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  stats.config.policy === 'queue'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Smooth Client Queue</span>
                  {stats.config.policy === 'queue' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Delays and meters requests automatically to stay below limit.
                </div>
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
            <span className="text-slate-400">Guarded Scope:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateScope('sandbox-only')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  stats.config.scope === 'sandbox-only'
                    ? 'bg-indigo-900/60 border-indigo-600 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Sandbox Testing Phases Only
              </button>
              <button
                type="button"
                onClick={() => handleUpdateScope('all-ai-calls')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  stats.config.scope === 'all-ai-calls'
                    ? 'bg-indigo-900/60 border-indigo-600 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                All AI Gateway Calls
              </button>
            </div>
          </div>
        </div>

        {/* Live Stress-Test Column (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Stress-Test Simulator</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">5 Rapid Calls</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Fires 5 rapid requests against sandbox endpoints to demonstrate client-side interception in real time.
          </p>

          <button
            type="button"
            onClick={handleExecuteBurstTest}
            disabled={isTestingBurst}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isTestingBurst ? 'animate-pulse' : ''}`} />
            <span>{isTestingBurst ? 'Firing Rapid Requests...' : 'Trigger Burst Test (5 Calls)'}</span>
          </button>

          {/* Real-time test results */}
          {testResults.length > 0 ? (
            <div className="space-y-2 pt-2 border-t border-slate-900 max-h-56 overflow-y-auto">
              {testResults.map((res) => (
                <div
                  key={res.callIndex}
                  className={`p-2 rounded-lg border text-[11px] flex items-start justify-between gap-2 font-mono ${
                    res.allowed
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      {res.allowed ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      )}
                      <span>Call #{res.callIndex}: {res.allowed ? 'ALLOWED (Passed)' : '🛡️ BLOCKED by Client'}</span>
                    </div>
                    <div className="text-[10px] opacity-80 pl-4">{res.reason}</div>
                  </div>
                  <span className="text-[10px] opacity-60 shrink-0">{res.delayMs}ms</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
              Click &quot;Trigger Burst Test&quot; above to watch the client rate limiter actively guard sandbox calls.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Client-Side Decision Ledger */}
      {stats.recentDecisions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recent Client Rate Limiting Audit Trail</span>
            </span>
            <span className="font-mono text-[11px]">{stats.recentDecisions.length} events</span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
            {stats.recentDecisions.slice(0, 8).map((dec, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-900 flex items-center justify-between text-slate-300"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dec.allowed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-slate-400">{dec.timestamp}</span>
                  <span className="truncate">{dec.endpoint}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    dec.allowed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                  }`}>
                    {dec.allowed ? 'ALLOWED' : 'BLOCKED'}
                  </span>
                  <span className="text-slate-400 text-[10px]">{dec.tokensRemaining} tok rem</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
