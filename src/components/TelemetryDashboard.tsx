import React, { useState, useEffect } from 'react';
import { TelemetrySummary, AuditLogEntry } from '../types.js';
import { 
  Activity, 
  Clock, 
  ShieldAlert, 
  Cpu, 
  Database, 
  RefreshCw, 
  Layers, 
  History, 
  CheckCircle2,
  TrendingUp,
  Target,
  Zap,
  Sliders,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Bug,
  Terminal,
  FileCode,
  DollarSign,
  Radio,
  Download,
  Flame,
  Calendar,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Wifi,
  AlertCircle,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { realtimeWs } from '../services/websocketClient.js';
import { exportToJson } from '../utils/exportUtils.js';

const TIME_SERIES_INITIATIVES = [
  {
    sprint: 'Sprint 1 (Draft)',
    shortLabel: 'S1 Draft',
    date: 'Aug 12',
    avgRiceScore: 840,
    confidencePct: 55,
    p0StoriesRatio: 0,
    p1StoriesRatio: 25,
    avgPriorityIndex: 28,
    underwritingScore: 714,
    reconciliationScore: 180,
    tradeLineScore: 450,
    backlogHygieneIndex: 62
  },
  {
    sprint: 'Sprint 2 (Interviews)',
    shortLabel: 'S2 Discovery',
    date: 'Aug 26',
    avgRiceScore: 1373,
    confidencePct: 68,
    p0StoriesRatio: 0,
    p1StoriesRatio: 50,
    avgPriorityIndex: 44,
    underwritingScore: 2041,
    reconciliationScore: 400,
    tradeLineScore: 1680,
    backlogHygieneIndex: 74
  },
  {
    sprint: 'Sprint 3 (Telemetry)',
    shortLabel: 'S3 Telemetry',
    date: 'Sep 09',
    avgRiceScore: 2589,
    confidencePct: 82,
    p0StoriesRatio: 33,
    p1StoriesRatio: 50,
    avgPriorityIndex: 68,
    underwritingScore: 4284,
    reconciliationScore: 640,
    tradeLineScore: 2844,
    backlogHygieneIndex: 86
  },
  {
    sprint: 'Sprint 4 (Arch Sizing)',
    shortLabel: 'S4 Arch',
    date: 'Sep 23',
    avgRiceScore: 3197,
    confidencePct: 88,
    p0StoriesRatio: 66,
    p1StoriesRatio: 33,
    avgPriorityIndex: 88,
    underwritingScore: 4860,
    reconciliationScore: 680,
    tradeLineScore: 4053,
    backlogHygieneIndex: 94
  },
  {
    sprint: 'Sprint 5 (Current Active)',
    shortLabel: 'S5 Current',
    date: 'Oct 01',
    avgRiceScore: 3410,
    confidencePct: 91,
    p0StoriesRatio: 66,
    p1StoriesRatio: 34,
    avgPriorityIndex: 94,
    underwritingScore: 4860,
    reconciliationScore: 920,
    tradeLineScore: 4450,
    backlogHygieneIndex: 97
  }
];

export const TelemetryDashboard: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [templates, setTemplates] = useState<any>({});
  const [valTelemetry, setValTelemetry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulatingDrift, setIsSimulatingDrift] = useState(false);
  const [timeSeriesMode, setTimeSeriesMode] = useState<'AGGREGATE' | 'INITIATIVES' | 'CONFIDENCE' | 'PRIORITY_SHIFT'>('AGGREGATE');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [telRes, auditRes, tplRes, valRes] = await Promise.all([
        fetch('/api/telemetry'),
        fetch('/api/audit-logs'),
        fetch('/api/templates'),
        fetch('/api/telemetry/validation-failures')
      ]);

      if (telRes.ok) {
        const data = await telRes.json();
        setTelemetry(data);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
      if (tplRes.ok) {
        const data = await tplRes.json();
        setTemplates(data.templates || {});
      }
      if (valRes.ok) {
        const data = await valRes.json();
        setValTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateDrift = async () => {
    setIsSimulatingDrift(true);
    try {
      // Intentionally trigger validation failure on /api/products
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Missing required product name & vision' })
      });
      // Refresh telemetry
      const res = await fetch('/api/telemetry/validation-failures');
      if (res.ok) {
        setValTelemetry(await res.json());
      }
    } catch (err) {
      console.error('Error simulating schema drift', err);
    } finally {
      setIsSimulatingDrift(false);
    }
  };

  const handleClearValTelemetry = async () => {
    try {
      await fetch('/api/telemetry/validation-failures/clear', { method: 'POST' });
      const res = await fetch('/api/telemetry/validation-failures');
      if (res.ok) {
        setValTelemetry(await res.json());
      }
    } catch (err) {
      console.error('Error clearing validation telemetry', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 30-Day Predictive Token Forecast State (§6)
  const [growthRate, setGrowthRate] = useState<number>(0.08); // 8% weekly compounding
  const [modelTier, setModelTier] = useState<'flash' | 'pro'>('flash');
  const [forecastScenario, setForecastScenario] = useState<'baseline' | 'caching' | 'repair'>('baseline');
  const [customBudgetLimit, setCustomBudgetLimit] = useState<number>(50000);
  const [forecastData, setForecastData] = useState<any>(null);
  const [isFetchingForecast, setIsFetchingForecast] = useState(false);
  const [isSimulatingTokenTick, setIsSimulatingTokenTick] = useState(false);
  const [wsPulseEffect, setWsPulseEffect] = useState(false);
  const [showMilestonesTable, setShowMilestonesTable] = useState(false);
  const [lastWsTokenEvent, setLastWsTokenEvent] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(true);

  const fetchForecast = async () => {
    setIsFetchingForecast(true);
    try {
      const url = `/api/telemetry/forecast?growthRate=${growthRate}&modelTier=${modelTier}&scenario=${forecastScenario}&customLimit=${customBudgetLimit}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setForecastData(data);
      }
    } catch (err) {
      console.error('Failed to fetch token forecast', err);
    } finally {
      setIsFetchingForecast(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [growthRate, modelTier, forecastScenario, customBudgetLimit, telemetry?.tokenBudgetUsed]);

  // Subscribe to real-time WebSocket events
  useEffect(() => {
    const unsubMetrics = realtimeWs.subscribeMetrics((metrics) => {
      setWsConnected(metrics.status === 'connected');
    });

    const unsubToken = realtimeWs.subscribe('TOKEN_CONSUMPTION_EVENT', (data) => {
      setLastWsTokenEvent(data);
      setWsPulseEffect(true);
      setTimeout(() => setWsPulseEffect(false), 2200);
      setTelemetry((prev) => prev ? { ...prev, tokenBudgetUsed: data.totalUsed, tokenBudgetLimit: data.budgetLimit } : null);
    });

    const unsubTel = realtimeWs.subscribe('TELEMETRY_UPDATED', (data) => {
      setTelemetry((prev) => prev ? { ...prev, tokenBudgetUsed: data.tokenBudgetUsed, tokenBudgetLimit: data.tokenBudgetLimit } : null);
    });

    const unsubBudget = realtimeWs.subscribe('BUDGET_CONFIG_UPDATED', (data) => {
      setCustomBudgetLimit(data.budgetLimit);
      setTelemetry((prev) => prev ? { ...prev, tokenBudgetLimit: data.budgetLimit } : null);
    });

    return () => {
      unsubMetrics();
      unsubToken();
      unsubTel();
      unsubBudget();
    };
  }, []);

  const handleSimulateTokenTick = async (amount: number = 850) => {
    setIsSimulatingTokenTick(true);
    try {
      const res = await fetch('/api/telemetry/simulate-token-tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: 'Interactive PRD Generation' })
      });
      if (res.ok) {
        const data = await res.json();
        setWsPulseEffect(true);
        setTimeout(() => setWsPulseEffect(false), 2200);
      }
    } catch (err) {
      console.error('Failed to simulate token tick', err);
    } finally {
      setIsSimulatingTokenTick(false);
    }
  };

  const handleUpdateBudgetLimit = async (limit: number) => {
    setCustomBudgetLimit(limit);
    try {
      await fetch('/api/telemetry/budget-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit })
      });
    } catch (err) {
      console.error('Failed to update budget limit', err);
    }
  };

  const handleExportForecast = (format: 'json' | 'csv') => {
    if (!forecastData?.dataPoints) return;
    if (format === 'json') {
      exportToJson(`30_day_api_token_budget_forecast.json`, {
        exportedAt: new Date().toISOString(),
        summary: {
          currentUsage: forecastData.currentUsed,
          budgetCap: forecastData.budgetLimit,
          projectedTotalTokens: forecastData.projectedTotalTokens,
          estimatedCostUsd: forecastData.finalCostUsd,
          growthRatePct: Math.round(forecastData.growthRate * 100),
          modelTier: forecastData.modelTier,
          scenario: forecastData.scenario,
          breachDay: forecastData.breachDay,
          breachDateLabel: forecastData.breachDateLabel
        },
        forecastDailyPoints: forecastData.dataPoints
      });
    } else {
      const headers = ['Day', 'Date', 'Daily_Burn_Tokens', 'Projected_Cumulative_Tokens', 'Lower_Bound_95CI', 'Upper_Bound_95CI', 'Budget_Cap', 'Estimated_Cost_USD', 'Is_Breached'];
      const rows = forecastData.dataPoints.map((p: any) => [
        p.day,
        p.date,
        p.dailyBurn,
        p.projectedCumulative,
        p.lowerBound,
        p.upperBound,
        p.budgetCap,
        p.estimatedCostUsd,
        p.isBreached ? 'YES' : 'NO'
      ]);
      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `30_day_api_token_budget_forecast.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleResetBudget = async () => {
    try {
      const res = await fetch('/api/budget/reset', { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Engine Observability & Performance Metrics (§6)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal telemetry tracking p50/p95 latency, schema validation failure rate, repair recovery, and prompt templates.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-800 flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2. Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: p50 / p95 Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Latency SLA (p50 / p95)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {telemetry?.p50LatencyMs || 0}ms <span className="text-slate-500 text-sm font-normal">/</span> {telemetry?.p95LatencyMs || 0}ms
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Within 45,000ms SLA target</span>
          </div>
        </div>

        {/* Metric 2: Validation Failure Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Schema Validation Fail Rate</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {telemetry?.validationFailureRate || 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Catches degrading prompt versions early
          </div>
        </div>

        {/* Metric 3: Single-Repair Pass Success */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Single-Repair Recovery</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {telemetry?.repairSuccessRate || 100}%
          </div>
          <div className="text-[11px] text-purple-400 mt-1">
            Heals ~80%+ without burning tokens
          </div>
        </div>

        {/* Metric 4: Org Token Usage vs Budget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Org Token Budget</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-100">
            {telemetry?.tokenBudgetUsed?.toLocaleString() || 0} / {telemetry?.tokenBudgetLimit?.toLocaleString() || 50000}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">Hard cap blocks at 100%</span>
            <button
              onClick={handleResetBudget}
              className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 2a. PREDICTIVE 30-DAY API TOKEN USAGE & BUDGET OBSERVABILITY (§6 & Acceptance Test 7) */}
      <div className={`bg-slate-900 border rounded-xl p-5 shadow-sm space-y-5 transition-all duration-300 ${
        wsPulseEffect ? 'border-purple-500 shadow-purple-500/20 ring-1 ring-purple-500/50' : 'border-slate-800'
      }`}>
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              wsPulseEffect ? 'bg-purple-500/30 text-purple-300 border border-purple-400' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Predictive 30-Day API Token Usage & Budget Forecast</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  30-Day Projections
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>WebSocket Live Synced</span>
                </span>
                {forecastData?.breachDay && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span>Projected Breach: Day {forecastData.breachDay}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Forecasting model calculating daily compounding token burn, 95% confidence bounds, and projected financial spend based on current Gemini 2.5 generation growth.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulateTokenTick(850)}
              disabled={isSimulatingTokenTick}
              title="Send a real-time token consumption pulse over WebSocket to demonstrate live forecast reactivity"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isSimulatingTokenTick ? 'animate-spin' : ''}`} />
              <span>{isSimulatingTokenTick ? 'Simulating Influx...' : 'Simulate Live Token Pulse (WS)'}</span>
            </button>

            <button
              onClick={() => handleExportForecast('json')}
              title="Download full 30-day forecast projection table as JSON"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => handleExportForecast('csv')}
              title="Download full 30-day forecast projection table as CSV"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* WebSocket Real-Time Alert Banner if Token Influx Occurred */}
        {lastWsTokenEvent && (
          <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-lg flex items-center justify-between text-xs text-purple-200 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>
                <strong>Live WebSocket Influx:</strong> +{lastWsTokenEvent.consumedTokens?.toLocaleString()} tokens consumed for &quot;{lastWsTokenEvent.reason}&quot;. Forecast updated dynamically across all clients.
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-400">
              {new Date(lastWsTokenEvent.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* 4 Forecast KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Projected 30-Day Token Burn */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="uppercase font-bold text-[10px] tracking-wider">Projected 30-Day Total</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-300 mt-1">
              {forecastData?.projectedTotalTokens?.toLocaleString() || '---'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              +{forecastData?.totalNewTokensProjected?.toLocaleString() || 0} tokens ({forecastData?.budgetUtilizationPct || 0}% cap)
            </div>
          </div>

          {/* Card 2: Projected Budget Runout / Exhaustion Date */}
          <div className={`p-3.5 bg-slate-950 rounded-xl border ${
            forecastData?.breachDay 
              ? forecastData.breachDay < 20 
                ? 'border-rose-900/80 bg-rose-950/20' 
                : 'border-amber-900/80 bg-amber-950/20' 
              : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="uppercase font-bold text-[10px] tracking-wider">Runway Exhaustion</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-xl font-bold font-mono mt-1 ${
              forecastData?.breachDay 
                ? forecastData.breachDay < 20 ? 'text-rose-400' : 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {forecastData?.breachDay ? `Day ${forecastData.breachDay} (${forecastData.breachDateLabel})` : 'Safe (30+ Days)'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {forecastData?.breachDay 
                ? `Cap ${forecastData.budgetLimit.toLocaleString()} breached early` 
                : `Zero runway breach projected`}
            </div>
          </div>

          {/* Card 3: Estimated 30-Day Cloud Spend */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="uppercase font-bold text-[10px] tracking-wider">Estimated Spend (USD)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
              ${forecastData?.finalCostUsd?.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Gemini {modelTier === 'pro' ? '2.5 Pro ($2.50/M)' : '2.5 Flash ($0.15/M)'}
            </div>
          </div>

          {/* Card 4: Daily Burn Velocity */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="uppercase font-bold text-[10px] tracking-wider">Daily Burn Velocity</span>
              <Flame className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
              ~{forecastData?.dailyRunRate?.toLocaleString() || 1250} / day
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {Math.round(growthRate * 100)}% weekly compound pace
            </div>
          </div>
        </div>

        {/* Interactive Controls Bar for PMs */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold">
              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
              <span>Predictive Modeling & Budget What-If Controls</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Fine-tune growth rates, efficiency architectures, and model pricing tiers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Control 1: Weekly Growth Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-medium">Weekly Growth Pace:</span>
                <span className="font-mono font-bold text-purple-300">+{Math.round(growthRate * 100)}%</span>
              </div>
              <input
                type="range"
                min="-0.10"
                max="0.40"
                step="0.02"
                value={growthRate}
                onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <button onClick={() => setGrowthRate(0)} className="hover:text-slate-200">Linear (0%)</button>
                <button onClick={() => setGrowthRate(0.08)} className="hover:text-purple-300 font-semibold">Normal (8%)</button>
                <button onClick={() => setGrowthRate(0.20)} className="hover:text-purple-300">Sprint Surge (20%)</button>
                <button onClick={() => setGrowthRate(0.35)} className="hover:text-rose-400">Hypergrowth (35%)</button>
              </div>
            </div>

            {/* Control 2: Architectural Optimization Scenarios */}
            <div className="space-y-1.5">
              <span className="text-slate-400 font-medium block">Architectural Efficiency Scenario:</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setForecastScenario('baseline')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                    forecastScenario === 'baseline'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Baseline
                </button>
                <button
                  onClick={() => setForecastScenario('caching')}
                  title="Prompt Caching eliminates redundant context tokens (-40%)"
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                    forecastScenario === 'caching'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Caching (-40%)
                </button>
                <button
                  onClick={() => setForecastScenario('repair')}
                  title="Self-Healing Zod Barrier reduces LLM re-generation retries (-22%)"
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                    forecastScenario === 'repair'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Self-Healing (-22%)
                </button>
              </div>
            </div>

            {/* Control 3: Model Pricing & Budget Cap Adjustment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium">Model Tier & Budget Cap:</span>
                <span className="font-mono text-[10px] text-slate-400">{customBudgetLimit.toLocaleString()} cap</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <button
                    onClick={() => setModelTier('flash')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                      modelTier === 'flash'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    2.5 Flash
                  </button>
                  <button
                    onClick={() => setModelTier('pro')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                      modelTier === 'pro'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    2.5 Pro
                  </button>
                </div>
                <div className="flex items-center space-x-1">
                  {[50000, 100000, 200000].map((cap) => (
                    <button
                      key={cap}
                      onClick={() => handleUpdateBudgetLimit(cap)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-mono border transition-colors ${
                        customBudgetLimit === cap
                          ? 'bg-slate-800 text-emerald-400 border-emerald-500/50 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cap / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 30-Day Predictive Line Chart Container */}
        <div className="w-full h-80 pt-2">
          {forecastData?.dataPoints ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData.dataPoints} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const headroom = d.budgetCap - d.projectedCumulative;
                      return (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-xs space-y-1.5 font-mono min-w-[240px]">
                          <div className="font-bold text-slate-200 font-sans border-b border-slate-800 pb-1 flex justify-between items-center">
                            <span>Day {d.day} ({d.date})</span>
                            <span className={d.isBreached ? 'text-rose-400 text-[10px]' : 'text-emerald-400 text-[10px]'}>
                              {d.isBreached ? 'QUOTA BREACHED' : 'ON TRACK'}
                            </span>
                          </div>
                          <div className="text-purple-300 font-bold">
                            Projected Total: {d.projectedCumulative?.toLocaleString()} tokens
                          </div>
                          <div className="text-slate-400 text-[11px] flex justify-between">
                            <span>Daily Burn:</span>
                            <span className="text-cyan-300">+{d.dailyBurn?.toLocaleString()} tokens/day</span>
                          </div>
                          <div className="text-slate-400 text-[11px] flex justify-between">
                            <span>95% CI Range:</span>
                            <span className="text-slate-300">[{d.lowerBound?.toLocaleString()} - {d.upperBound?.toLocaleString()}]</span>
                          </div>
                          <div className="text-slate-400 text-[11px] flex justify-between">
                            <span>Estimated Cost:</span>
                            <span className="text-emerald-400 font-bold">${d.estimatedCostUsd?.toFixed(2)} USD</span>
                          </div>
                          <div className="text-slate-400 text-[11px] flex justify-between border-t border-slate-800/80 pt-1">
                            <span>Budget Cap Headroom:</span>
                            <span className={headroom >= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                              {headroom >= 0 ? `${headroom.toLocaleString()} tokens` : `Deficit: ${Math.abs(headroom).toLocaleString()} tokens`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                {/* Org Budget Cap Reference Line */}
                <ReferenceLine
                  y={forecastData.budgetLimit}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Org Budget Cap (${(forecastData.budgetLimit / 1000).toFixed(0)}k)`,
                    fill: '#f87171',
                    fontSize: 10,
                    position: 'insideTopRight'
                  }}
                />

                {/* Breach Day Vertical Line */}
                {forecastData.breachDateLabel && (
                  <ReferenceLine
                    x={forecastData.breachDateLabel}
                    stroke="#fbbf24"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Runout: Day ${forecastData.breachDay}`,
                      fill: '#fbbf24',
                      fontSize: 10,
                      position: 'insideTopLeft'
                    }}
                  />
                )}

                {/* 95% Confidence Upper Bound */}
                <Line
                  type="monotone"
                  dataKey="upperBound"
                  name="95% Upper Bound"
                  stroke="#818cf8"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                />

                {/* Main Projected Trajectory */}
                <Line
                  type="monotone"
                  dataKey="projectedCumulative"
                  name="Projected Cumulative Usage (Tokens)"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#a855f7' }}
                  activeDot={{ r: 6, fill: '#c084fc' }}
                />

                {/* 95% Confidence Lower Bound */}
                <Line
                  type="monotone"
                  dataKey="lowerBound"
                  name="95% Lower Bound"
                  stroke="#06b6d4"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin text-purple-400" />
              Calculating 30-day predictive token projection model...
            </div>
          )}
        </div>

        {/* Milestone Milestones Table Toggle */}
        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowMilestonesTable(!showMilestonesTable)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>{showMilestonesTable ? 'Hide 30-Day Milestone Details' : 'View 30-Day Milestones Breakdown Table'}</span>
              {showMilestonesTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[11px] font-mono text-slate-500">
              Confidence Grounding: ±14% to ±22% over 30 days
            </span>
          </div>

          {showMilestonesTable && forecastData?.dataPoints && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300 font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Milestone</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Daily Burn</th>
                    <th className="p-2.5">Projected Total</th>
                    <th className="p-2.5">95% Range</th>
                    <th className="p-2.5">Spend ($)</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {[1, 5, 10, 15, 20, 25, 30].map((targetDay) => {
                    const point = forecastData.dataPoints[targetDay - 1];
                    if (!point) return null;
                    return (
                      <tr key={targetDay} className={point.isBreached ? 'bg-rose-950/20' : 'hover:bg-slate-800/40'}>
                        <td className="p-2.5 font-bold text-slate-200">Day +{point.day}</td>
                        <td className="p-2.5 text-slate-400">{point.date}</td>
                        <td className="p-2.5 text-cyan-300">+{point.dailyBurn.toLocaleString()}</td>
                        <td className="p-2.5 text-purple-300 font-bold">{point.projectedCumulative.toLocaleString()}</td>
                        <td className="p-2.5 text-slate-400 text-[11px]">[{point.lowerBound.toLocaleString()} - {point.upperBound.toLocaleString()}]</td>
                        <td className="p-2.5 text-emerald-400">${point.estimatedCostUsd.toFixed(2)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            point.isBreached
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {point.isBreached ? 'BREACHED' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PM Budget Optimization Recommendations Panel */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Product Manager Token Budget Recommendations:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="p-2.5 bg-slate-900/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Prompt Caching Architecture</span>
              </span>
              <p className="text-[11px]">
                {forecastScenario === 'caching' 
                  ? 'Active: Saving ~40% tokens on repeated domain context loads.' 
                  : 'Turn on Prompt Caching to reduce monthly burn by up to 40% ($' + ((forecastData?.finalCostUsd || 5) * 0.4).toFixed(2) + ' savings).'}
              </p>
            </div>

            <div className="p-2.5 bg-slate-900/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Zod Self-Healing Efficiency</span>
              </span>
              <p className="text-[11px]">
                Pre-validating with strict Zod barriers avoids costly 2nd-pass LLM repair calls for ~80%+ of schema drifts.
              </p>
            </div>

            <div className="p-2.5 bg-slate-900/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Runway Action Trigger</span>
              </span>
              <p className="text-[11px]">
                {forecastData?.breachDay 
                  ? `Warning: Quota will exhaust on Day ${forecastData.breachDay}. Increase limit to 100k or apply Prompt Caching.` 
                  : 'Runway is healthy across the 30-day forecast horizon under current growth rates.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2b. TIME-SERIES VIEW: HISTORICAL EVOLUTION OF RICE SCORES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Historical Evolution of Product Initiative RICE Scores
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Time-Series Observability
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tracks backlog quality velocity, telemetry-grounded confidence gains, and initiative readiness across sprint cycles.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setTimeSeriesMode('AGGREGATE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'AGGREGATE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ROI Velocity
            </button>
            <button
              onClick={() => setTimeSeriesMode('INITIATIVES')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'INITIATIVES' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Initiatives
            </button>
            <button
              onClick={() => setTimeSeriesMode('CONFIDENCE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'CONFIDENCE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Confidence & Hygiene
            </button>
            <button
              onClick={() => setTimeSeriesMode('PRIORITY_SHIFT')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'PRIORITY_SHIFT' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Priority Shift
            </button>
          </div>
        </div>

        {/* Time-Series Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Backlog ROI Lift</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 flex items-center space-x-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>+306% Growth</span>
            </div>
            <span className="text-[10px] text-slate-400">840 → 3,410 pts</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Confidence Grounding</span>
            <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">
              91% Certainty
            </div>
            <span className="text-[10px] text-slate-400">+36% via production sync</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">P0 Sprint-Ready Ratio</span>
            <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
              66% Readiness
            </div>
            <span className="text-[10px] text-slate-400">Stories crossing 3,000 threshold</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Backlog Hygiene Index</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>97 / 100</span>
            </div>
            <span className="text-[10px] text-slate-400">MoSCoW & INVEST compliant</span>
          </div>
        </div>

        {/* Time-Series Chart Area */}
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {timeSeriesMode === 'AGGREGATE' ? (
              <AreaChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="riceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.sprint} ({d.date})</div>
                          <div className="text-purple-300 font-mono font-bold">Avg RICE: {d.avgRiceScore.toLocaleString()} pts</div>
                          <div className="text-slate-400 text-[10px]">Confidence: {d.confidencePct}% · P0 Gate: {d.p0StoriesRatio}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={3000} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'P0 Gate (3,000)', fill: '#10b981', fontSize: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="avgRiceScore" 
                  name="Average Backlog RICE" 
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#riceAreaGrad)" 
                />
              </AreaChart>
            ) : timeSeriesMode === 'INITIATIVES' ? (
              <LineChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-slate-200 font-sans border-b border-slate-800 pb-1">{d.sprint}</div>
                          <div className="text-purple-300">Underwriting: {d.underwritingScore.toLocaleString()}</div>
                          <div className="text-emerald-300">Trade Line: {d.tradeLineScore.toLocaleString()}</div>
                          <div className="text-cyan-300">Reconciliation: {d.reconciliationScore.toLocaleString()}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="underwritingScore" name="Checkout & Underwriting" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tradeLineScore" name="Trade Line Transparency" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="reconciliationScore" name="ERP Webhook Reconciliation" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            ) : timeSeriesMode === 'CONFIDENCE' ? (
              <LineChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[50, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.sprint}</div>
                          <div className="text-emerald-400 font-mono">Confidence: {d.confidencePct}%</div>
                          <div className="text-cyan-300 font-mono">Backlog Hygiene: {d.backlogHygieneIndex}/100</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="confidencePct" name="Telemetry-Grounded Confidence (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="backlogHygieneIndex" name="INVEST Backlog Hygiene Index (0-100)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              /* Priority Shift Visualization */
              <LineChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-slate-200 font-sans border-b border-slate-800 pb-1">{d.sprint} ({d.date})</div>
                          <div className="text-emerald-400">P0 Readiness Ratio: {d.p0StoriesRatio}%</div>
                          <div className="text-cyan-400">P1 High-Priority Ratio: {d.p1StoriesRatio}%</div>
                          <div className="text-purple-300 font-bold">Priority Velocity Index: {d.avgPriorityIndex} / 100</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="p0StoriesRatio" name="P0 Critical Sprint-Ready Ratio (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="p1StoriesRatio" name="P1 High-Priority Ratio (%)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="avgPriorityIndex" name="Average Priority Shift Index (0-100)" stroke="#c084fc" strokeDasharray="4 4" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Split Section: Prompt Template Registry & Audit Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Registry (§3) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">Prompt Template Registry (§3 Versioned)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">6 Registered</span>
          </div>

          <p className="text-xs text-slate-400">
            Every prompt is stored as an immutable versioned record. No inline string concatenation is permitted in controllers.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {Object.keys(templates).map((key) => {
              const tpl = templates[key];
              return (
                <div key={key} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{tpl.taskType}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-semibold">
                      {tpl.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-2">
                    {tpl.systemPrompt.slice(0, 140)}...
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Log Stream (§7 Human Approval Gate) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">Audit Log Stream (§7 Verification Trail)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} Events</span>
          </div>

          <p className="text-xs text-slate-400">
            Immutable log of all generation events, repair occurrences, and human PM approval actions.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                      log.action === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.action === 'REPAIRED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-slate-200">{log.details}</div>
                <div className="text-[10px] text-slate-500 font-mono">User: {log.userId} · Task: {log.taskType}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Centralized Zod Validation & Schema Drift Observability */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Centralized Zod Validation & Schema Drift Observability</h3>
                <p className="text-xs text-slate-400">Strict runtime barrier validating payloads before hitting business logic</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSimulateDrift}
                disabled={isSimulatingDrift}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 transition-colors flex items-center space-x-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isSimulatingDrift ? 'Testing...' : 'Simulate Invalid Payload'}</span>
              </button>
              <button
                onClick={handleClearValTelemetry}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Clear Telemetry
              </button>
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Interceptions</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {valTelemetry?.totalFailures ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Blocked pre-logic</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Active Schemas</div>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                100%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Products, Artifacts, Tests</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Top Drift Vector</div>
              <div className="text-xs font-bold font-mono text-amber-300 mt-2 truncate">
                {valTelemetry?.topFailedFields?.[0]?.field ? `${valTelemetry.topFailedFields[0].field} (${valTelemetry.topFailedFields[0].count}x)` : 'None detected'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Most common missing input</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Top Endpoint</div>
              <div className="text-xs font-bold font-mono text-blue-300 mt-2 truncate">
                {valTelemetry?.topFailedEndpoints?.[0]?.endpoint || 'Clean state'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Protected barrier route</div>
            </div>
          </div>

          {/* Drift Types Breakdown */}
          {valTelemetry?.driftBreakdown && (
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <span className="text-[11px] font-mono text-slate-400">Drift Classification:</span>
              {Object.entries(valTelemetry.driftBreakdown as Record<string, number>).map(([type, count]) => (
                <span
                  key={type}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    count > 0
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 font-bold'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          )}

          {/* Recent Validation Failure Stream */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Real-Time Schema Drift Events Stream</span>
            </div>

            {(!valTelemetry?.recentFailures || valTelemetry.recentFailures.length === 0) ? (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
                No schema validation errors recorded yet. All incoming payloads adhere strictly to defined Zod schemas.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {valTelemetry.recentFailures.map((event: any) => (
                  <div key={event.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                          HTTP 400
                        </span>
                        <span className="font-mono text-[11px] text-slate-200 font-semibold">{event.endpoint}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
                          {event.driftType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      {event.issues?.map((iss: any, idx: number) => (
                        <div key={idx} className="font-mono text-[11px] text-rose-400 flex items-start space-x-1.5">
                          <span className="text-slate-500">›</span>
                          <span className="font-semibold text-rose-300">{iss.path || 'root'}:</span>
                          <span className="text-slate-300">{iss.message}</span>
                          <span className="text-[9px] text-slate-500">({iss.code})</span>
                        </div>
                      ))}
                    </div>

                    {event.samplePayload && Object.keys(event.samplePayload).length > 0 && (
                      <div className="text-[10px] font-mono text-slate-500">
                        Payload preview: {JSON.stringify(event.samplePayload)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
