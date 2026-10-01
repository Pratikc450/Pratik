import React, { useState } from 'react';
import { Settings, Cloud, Shield, Database, Key, Check, RefreshCw, LogIn, LogOut } from 'lucide-react';
import { UserProfile } from '../types.js';

interface SettingsViewProps {
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isFirestoreConnected: boolean;
  tokenBudgetLimit: number;
  tokenBudgetUsed: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onSignIn,
  onSignOut,
  isFirestoreConnected,
  tokenBudgetLimit,
  tokenBudgetUsed
}) => {
  const [modelCascade, setModelCascade] = useState('auto');
  const [schemaStrictness, setSchemaStrictness] = useState('strict');

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>Platform Settings</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Cloud synchronization, authentication, token quotas, and generation engine parameters.
        </p>
      </div>

      {/* Cloud & Firestore */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Firebase Firestore Cloud Sync</h2>
              <p className="text-xs text-slate-400">Persistent database storage for approved PM specifications</p>
            </div>
          </div>

          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isFirestoreConnected 
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' 
              : 'bg-amber-950/80 text-amber-400 border-amber-800/60'
          }`}>
            {isFirestoreConnected ? 'Online & Synchronized' : 'Connecting...'}
          </span>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Current account: <span className="font-mono text-slate-200">{user?.email || 'Not logged in (Local Preview Mode)'}</span>
          </div>

          {user ? (
            <button
              onClick={onSignOut}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connect Google Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Engine & Shield Parameters */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200">Autonomous Pipeline Reliability</h2>
            <p className="text-xs text-slate-400">Zod validation shield and deterministic cascade safeguards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Model Cascade Strategy</label>
            <select
              value={modelCascade}
              onChange={(e) => setModelCascade(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="auto">Automatic (Gemini 2.5 Pro → Flash → Domain Context Shield)</option>
              <option value="fast">High Velocity (Gemini 2.5 Flash Primary)</option>
              <option value="deterministic">Zero-Downtime Deterministic Fallback Enabled</option>
            </select>
            <span className="text-[11px] text-slate-500">Guarantees zero-downtime even during quota surges.</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Schema Strictness</label>
            <select
              value={schemaStrictness}
              onChange={(e) => setSchemaStrictness(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="strict">Strict (100% Zod compliance with dual-pass repair)</option>
              <option value="lenient">Permissive repair loop</option>
            </select>
            <span className="text-[11px] text-slate-500">Rejects unvalidated drafts from reaching the database.</span>
          </div>
        </div>
      </div>

      {/* Quotas & Telemetry Summary */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">Workspace Token Quotas</div>
          <div className="text-xs font-mono text-emerald-400 font-bold">
            {((tokenBudgetUsed / tokenBudgetLimit) * 100).toFixed(0)}% Utilized
          </div>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full" 
            style={{ width: `${(tokenBudgetUsed / tokenBudgetLimit) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
          <span>Current usage: {tokenBudgetUsed.toLocaleString()} tokens</span>
          <span>Workspace limit: {tokenBudgetLimit.toLocaleString()} tokens</span>
        </div>
      </div>
    </div>
  );
};
