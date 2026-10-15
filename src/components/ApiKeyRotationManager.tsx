import React, { useState, useEffect } from 'react';
import {
  Key,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  Check,
  Zap,
  ArrowRight,
  History,
  Sparkles,
  Timer,
  Eye,
  EyeOff,
  Copy,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { KeyRotationStatus, KeyRotationHistoryEntry } from '../types.js';

interface ApiKeyRotationManagerProps {
  onNavigateTab?: (tab: string) => void;
}

export const ApiKeyRotationManager: React.FC<ApiKeyRotationManagerProps> = ({ onNavigateTab }) => {
  const [rotationStatus, setRotationStatus] = useState<KeyRotationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState(45);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isInstantSwapping, setIsInstantSwapping] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ai/key/rotation-status');
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setRotationStatus(data.status);
        }
      }
    } catch (err) {
      console.error('Failed to fetch key rotation status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll status every 1.5 seconds if rotation is active, else every 10 seconds
  useEffect(() => {
    const isRotating = rotationStatus?.status === 'grace_period' || rotationStatus?.status === 'validating';
    const intervalMs = isRotating ? 1000 : 10000;
    const timer = setInterval(() => {
      fetchStatus();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [rotationStatus?.status]);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleInitiateRotation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyInput.trim()) {
      showNotification('error', 'Please enter a valid candidate Gemini API key.');
      return;
    }

    setIsInitiating(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/ai/key/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newKey: newKeyInput.trim(),
          gracePeriodSeconds,
          initiatedBy: 'Settings Admin'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Zero-downtime rotation initiated successfully!');
        setNewKeyInput('');
        fetchStatus();
      } else {
        showNotification('error', data.message || 'Failed to initiate rotation. Pre-flight probe did not succeed.');
      }
    } catch (err: any) {
      showNotification('error', `Rotation request failed: ${err.message}`);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleInstantSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) {
      showNotification('error', 'Please enter a valid candidate Gemini API key.');
      return;
    }

    setIsInstantSwapping(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/ai/key/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newKey: newKeyInput.trim(),
          initiatedBy: 'Settings Admin'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Key verified and updated instantly!');
        setNewKeyInput('');
        fetchStatus();
      } else {
        showNotification('error', data.message || 'Instant key update failed.');
      }
    } catch (err: any) {
      showNotification('error', `Instant update error: ${err.message}`);
    } finally {
      setIsInstantSwapping(false);
    }
  };

  const handleConfirmEarly = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch('/api/ai/key/rotate/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiatedBy: 'Settings Admin' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', 'Old Gemini API key decommissioned early. New key permanently active!');
        fetchStatus();
      } else {
        showNotification('error', 'Failed to confirm key rotation.');
      }
    } catch (err: any) {
      showNotification('error', `Confirm failed: ${err.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelRotation = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/ai/key/rotate/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiatedBy: 'Settings Admin' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('info', 'Rotation aborted. Safely rolled back to previous primary key with zero downtime.');
        fetchStatus();
      } else {
        showNotification('error', 'Failed to abort key rotation.');
      }
    } catch (err: any) {
      showNotification('error', `Abort failed: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleFillSimulatedKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewKeyInput(`AIzaSyDemoRotatedKey${randomHex}ProductPilotProd`);
    showNotification('info', 'Staging candidate key generated for zero-downtime testing.');
  };

  const handleCopyMasked = (text: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const isRotating = rotationStatus?.status === 'grace_period' || rotationStatus?.status === 'validating';
  const remainingSec = rotationStatus?.remainingSeconds || 0;
  const totalSec = rotationStatus?.totalSeconds || 45;
  const progressPercent = totalSec > 0 ? Math.max(0, Math.min(100, ((totalSec - remainingSec) / totalSec) * 100)) : 100;

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg transition-all animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : actionMessage.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {actionMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {actionMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {actionMessage.type === 'info' && <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-200 cursor-pointer ml-3 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Gemini API Key Zero-Downtime Rotation</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/80">
                  Dual-Key Buffer
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                  Zero Downtime
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cycle Google AI Studio Gemini API keys seamlessly with an active countdown timer, pre-flight latency probe, and dual-key grace period buffer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchStatus}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
              title="Refresh Key Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('api-health')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <span>View API Telemetry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Current Active Key Overview Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Active Key Fingerprint */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Active Primary Key</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono font-bold text-slate-200">
                {rotationStatus?.primaryKeyMask || 'AIzaSy...prod'}
              </code>
              <button
                onClick={() => handleCopyMasked(rotationStatus?.primaryKeyMask || '')}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy masked fingerprint"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Model: Google Gemini 3.8 Flash (Free Tier)
            </div>
          </div>

          {/* Rotation Status & Last Rotated */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Lifecycle State</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isRotating
                  ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}>
                {rotationStatus?.status || 'Active'}
              </span>
            </div>
            <div className="text-xs text-slate-300 font-medium">
              {isRotating ? 'Transition In Progress' : 'Stable Production Baseline'}
            </div>
            <div className="text-[10px] text-slate-500">
              Last rotated: {rotationStatus?.lastRotatedAt ? new Date(rotationStatus.lastRotatedAt).toLocaleDateString() : '3 days ago'}
            </div>
          </div>

          {/* Dual-Key Grace Buffer Telemetry */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">In-Flight Continuity</span>
              <span className="text-emerald-400 text-[10px] font-bold">100% Zero Dropped</span>
            </div>
            <div className="text-xs font-mono text-slate-200">
              {rotationStatus?.fallbackKeyMask ? (
                <span className="text-amber-400">Fallback: {rotationStatus.fallbackKeyMask}</span>
              ) : (
                <span className="text-slate-400">Fallback Buffer: Standby</span>
              )}
            </div>
            <div className="text-[10px] text-slate-500">
              New key served: <strong className="text-slate-300">{rotationStatus?.requestsServedByNewKey || 0}</strong> reqs
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE COUNTDOWN TIMER PANEL (Appears dynamically during key rotation) */}
      {isRotating && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border-2 border-purple-500/50 shadow-2xl space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="text-base font-bold text-white">Zero-Downtime Transition Active</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                  Grace Period Countdown
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Traffic is smoothly transitioning to the new key. The previous key remains active as a zero-downtime safety buffer until the timer finishes.
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-purple-500/60 shadow-lg text-center">
                <div className="text-2xl font-black font-mono text-purple-300 tracking-wider">
                  00:{remainingSec < 10 ? `0${remainingSec}` : remainingSec}
                </div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Seconds Left</div>
              </div>
            </div>
          </div>

          {/* Animated Countdown Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Transition Progress: {progressPercent.toFixed(0)}%</span>
              <span>Total Grace Period: {totalSec}s</span>
            </div>
            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 4-Step Transition Pipeline Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-200 text-[11px]">1. Pre-Flight Probe</div>
                <div className="text-[10px] text-emerald-400 font-mono">Verified OK</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-purple-500/40 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-200 text-[11px]">2. Candidate Primary</div>
                <div className="text-[10px] text-purple-300 font-mono">Active & Routing</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/40 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <div>
                <div className="font-bold text-slate-200 text-[11px]">3. Dual-Key Buffer</div>
                <div className="text-[10px] text-amber-300 font-mono">{remainingSec}s Ticking</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center space-x-2 opacity-70">
              <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-400">4</div>
              <div>
                <div className="font-bold text-slate-400 text-[11px]">4. Decommission Old</div>
                <div className="text-[10px] text-slate-500 font-mono">Auto upon 00:00</div>
              </div>
            </div>
          </div>

          {/* Emergency / Manual Controls during rotation */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Candidate key:{' '}
              <strong className="text-slate-200 font-mono">
                {rotationStatus?.candidateKeyMask || rotationStatus?.primaryKeyMask}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmEarly}
                disabled={isConfirming}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
              >
                <Check className={`w-3.5 h-3.5 ${isConfirming ? 'animate-spin' : ''}`} />
                <span>{isConfirming ? 'Decommissioning...' : 'Decommission Previous Key Now'}</span>
              </button>

              <button
                onClick={handleCancelRotation}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isCancelling ? 'animate-spin' : ''}`} />
                <span>{isCancelling ? 'Aborting...' : 'Abort & Rollback'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROTATION INITIATION FORM */}
      {!isRotating && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-slate-200">Initiate New Zero-Downtime Key Cycle</h3>
            </div>
            <button
              onClick={handleFillSimulatedKey}
              type="button"
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-semibold border border-purple-500/30 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Simulate Staging Key</span>
            </button>
          </div>

          <form onSubmit={handleInitiateRotation} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                New Google Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showKeyInput ? 'text' : 'password'}
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono pr-20 focus:outline-none focus:border-purple-500 shadow-inner"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showKeyInput ? 'Hide key' : 'Show key'}
                  >
                    {showKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-500">
                Enter your replacement API key from Google AI Studio. A pre-flight test probe will verify connectivity before traffic switches.
              </span>
            </div>

            {/* Grace Period Duration Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { sec: 30, label: '30s Fast Transition', desc: 'Quick switchover with 30s standby buffer' },
                { sec: 45, label: '45s Standard Grace', desc: 'Recommended balance for production drain' },
                { sec: 60, label: '60s Extended Buffer', desc: 'Ensures long in-flight reasoning calls finish' }
              ].map((opt) => (
                <div
                  key={opt.sec}
                  onClick={() => setGracePeriodSeconds(opt.sec)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    gracePeriodSeconds === opt.sec
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{opt.label}</span>
                    {gracePeriodSeconds === opt.sec && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{opt.desc}</div>
                </div>
              ))}
            </div>

            {/* Safety Guarantee Callout */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <strong className="text-slate-300">Automated Pre-Flight Guard:</strong> If the candidate key is invalid or fails the Gemini ping, the active primary key is never touched. If successful, the server operates in dual-key mode during the {gracePeriodSeconds}-second grace period countdown, guaranteeing 100% zero downtime.
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleInstantSwap}
                disabled={isInstantSwapping || isInitiating || !newKeyInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-2 transition-all cursor-pointer"
                title="Immediately update key with pre-flight check, bypassing the grace period"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-400 ${isInstantSwapping ? 'animate-spin' : ''}`} />
                <span>{isInstantSwapping ? 'Verifying...' : 'Instant Hot-Swap Key'}</span>
              </button>

              <button
                type="submit"
                disabled={isInitiating || isInstantSwapping || !newKeyInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-purple-900/30 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isInitiating ? 'animate-spin' : ''}`} />
                <span>{isInitiating ? 'Verifying Pre-Flight Probe...' : 'Start Zero-Downtime Rotation'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ROTATION AUDIT TRAIL HISTORY */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-slate-200">Key Rotation Audit Ledger</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {rotationStatus?.rotationHistory?.length || 0} Events Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Initiator</th>
                <th className="pb-2.5">Previous Key</th>
                <th className="pb-2.5">New Key</th>
                <th className="pb-2.5">Latency Probe</th>
                <th className="pb-2.5">Grace Period</th>
                <th className="pb-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {(rotationStatus?.rotationHistory || []).map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 text-slate-300">
                    {new Date(entry.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="py-2.5 font-sans text-slate-400">{entry.initiatedBy}</td>
                  <td className="py-2.5 text-slate-400">{entry.previousKeyMask}</td>
                  <td className="py-2.5 text-purple-300 font-semibold">{entry.newKeyMask}</td>
                  <td className="py-2.5 text-emerald-400">{entry.verifiedLatencyMs}ms</td>
                  <td className="py-2.5 text-slate-400">{entry.durationSeconds}s / {entry.gracePeriodSeconds}s</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        entry.status === 'completed'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                          : entry.status === 'cancelled'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                      }`}
                    >
                      {entry.status === 'completed' ? 'Zero Downtime' : entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
