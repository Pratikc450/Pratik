import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Key,
  Radio,
  Cpu,
  Flame,
  ArrowUpRight,
  Database,
  Terminal,
  Send,
  Layers,
  Sparkles,
  BarChart3,
  Sliders,
  Filter,
  Search,
  Percent,
  Play,
  RotateCcw,
  Check,
  MousePointerClick,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Trash2,
  ExternalLink,
  Target,
  Gauge,
  TrendingDown,
  TrendingUp,
  HardDrive,
  Settings2,
  FileText,
  FileSpreadsheet,
  Download,
  Copy,
  Eye,
  X,
  ChevronDown,
  AlertOctagon,
  ClipboardCheck,
  BookOpen
} from 'lucide-react';
import {
  ApiHealthMetrics,
  ServiceHealthItem,
  EnvironmentMode,
  EndpointDistributionItem,
  PushAlertEvent,
  ApiAlertThresholdConfig,
  Endpoint5xxAlertConfig,
  Endpoint5xxAlertEvent,
  DashboardThresholdConfig,
  LatencyTrendPoint,
  IncidentReport,
  CapturedDashboardState,
  ThresholdViolation
} from '../types.js';
import { realtimeWs } from '../services/websocketClient.js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine
} from 'recharts';

interface ApiHealthDashboardProps {
  onNavigateTab?: (tab: string) => void;
  environmentMode?: EnvironmentMode;
}

export const ApiHealthDashboard: React.FC<ApiHealthDashboardProps> = ({
  onNavigateTab,
  environmentMode = 'sandbox'
}) => {
  const [metrics, setMetrics] = useState<ApiHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProbing, setIsProbing] = useState(false);
  const [lastProbeResult, setLastProbeResult] = useState<any | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live prompt playground
  const [testPrompt, setTestPrompt] = useState('Verify Gemini 3.8 Flash latency and structured JSON output for Banking PRD');
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [testPromptResult, setTestPromptResult] = useState<any | null>(null);

  // Endpoint distribution filter & sort state
  const [endpointSearch, setEndpointSearch] = useState('');
  const [endpointCategoryFilter, setEndpointCategoryFilter] = useState<string>('all');
  const [endpointSortBy, setEndpointSortBy] = useState<'requests' | 'errorRate' | 'latency'>('requests');
  const [isSimulatingPulse, setIsSimulatingPulse] = useState(false);
  const [probingEndpointId, setProbingEndpointId] = useState<string | null>(null);

  // Push Notification & Error Rate Threshold Sentinel State
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [alertConfig, setAlertConfig] = useState<ApiAlertThresholdConfig>(() => {
    try {
      const saved = localStorage.getItem('api_health_push_alert_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled: true,
      thresholdPercent: 5.0,
      cooldownSeconds: 60,
      soundEnabled: true,
      desktopNotification: true,
      inAppNotification: true
    };
  });
  const [alertHistory, setAlertHistory] = useState<PushAlertEvent[]>(() => {
    try {
      const saved = localStorage.getItem('api_health_push_alert_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'init_alert_1',
        timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        errorRate: 7.4,
        threshold: 5.0,
        serviceName: 'Reasoning Engine (/api/ai/chat)',
        details: 'Traffic spike triggered transient 503 upstream gateway latency on Gemini 3.8 Flash.',
        severity: 'warning'
      },
      {
        id: 'init_alert_2',
        timestamp: new Date(Date.now() - 3600000 * 2.1).toISOString(),
        errorRate: 0.8,
        threshold: 5.0,
        serviceName: 'Reasoning Engine (/api/ai/chat)',
        details: 'Service healthy: Error rate normalized to 0.8% (safely below 5.0% threshold).',
        severity: 'recovered'
      }
    ];
  });
  const [activeBreach, setActiveBreach] = useState<PushAlertEvent | null>(null);
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [isBurstingErrors, setIsBurstingErrors] = useState(false);
  const [showNotificationHistory, setShowNotificationHistory] = useState(true);

  const lastAlertSentRef = React.useRef<number>(0);
  const wasBreachedRef = React.useRef<boolean>(false);

  const updateAlertConfig = (updater: Partial<ApiAlertThresholdConfig>) => {
    setAlertConfig(prev => {
      const updated = { ...prev, ...updater };
      try {
        localStorage.setItem('api_health_push_alert_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Automated Specific Endpoint 5xx Alert System (1-Minute Sliding Window)
  const [endpoint5xxConfig, setEndpoint5xxConfig] = useState<Endpoint5xxAlertConfig>(() => {
    try {
      const saved = localStorage.getItem('api_health_endpoint_5xx_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled: true,
      thresholdPercent: 5.0, // 5% threshold over 1-minute window
      windowSeconds: 60, // 1-minute window
      monitoredEndpoints: [
        '/api/generate',
        '/api/ai/chat',
        '/api/products/solve-issue',
        '/api/sandbox/status',
        '/api/sprint',
        '/api/products',
        '/api/gateway/keys'
      ],
      minRequestsInWindow: 3,
      desktopNotifications: true,
      soundAlerts: true,
      cooldownSeconds: 60
    };
  });

  const [endpoint5xxAlertHistory, setEndpoint5xxAlertHistory] = useState<Endpoint5xxAlertEvent[]>(() => {
    try {
      const saved = localStorage.getItem('api_health_endpoint_5xx_alert_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'init_ep_5xx_1',
        timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
        endpoint: '/api/generate',
        serviceName: 'Gemini 3.8 Spec Generation Engine',
        errorRate5xx: 8.3,
        threshold: 5.0,
        windowDurationSeconds: 60,
        error5xxCount: 1,
        totalRequestsInWindow: 12,
        severity: 'warning',
        details: 'Endpoint /api/generate reported 1x 503 error in 1-minute window (8.3% 5xx rate vs 5.0% threshold).'
      }
    ];
  });

  const [active5xxBreaches, setActive5xxBreaches] = useState<Record<string, Endpoint5xxAlertEvent>>({});
  const [simulatingEndpoint, setSimulatingEndpoint] = useState<string | null>(null);
  const [selectedSimulateEndpoint, setSelectedSimulateEndpoint] = useState<string>('/api/generate');
  const [showEndpoint5xxHistory, setShowEndpoint5xxHistory] = useState<boolean>(true);

  const lastEndpointAlertSentRef = React.useRef<Record<string, number>>({});
  const wasEndpointBreachedRef = React.useRef<Record<string, boolean>>({});

  const updateEndpoint5xxConfig = (updater: Partial<Endpoint5xxAlertConfig>) => {
    setEndpoint5xxConfig(prev => {
      const updated = { ...prev, ...updater };
      try {
        localStorage.setItem('api_health_endpoint_5xx_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const toggleMonitoredEndpoint = (epPath: string) => {
    setEndpoint5xxConfig(prev => {
      const isMonitored = prev.monitoredEndpoints.includes(epPath);
      const monitoredEndpoints = isMonitored
        ? prev.monitoredEndpoints.filter(e => e !== epPath)
        : [...prev.monitoredEndpoints, epPath];
      const updated = { ...prev, monitoredEndpoints };
      try {
        localStorage.setItem('api_health_endpoint_5xx_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const selectAllMonitoredEndpoints = (allPaths: string[]) => {
    setEndpoint5xxConfig(prev => {
      const updated = { ...prev, monitoredEndpoints: allPaths };
      try {
        localStorage.setItem('api_health_endpoint_5xx_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearAllMonitoredEndpoints = () => {
    setEndpoint5xxConfig(prev => {
      const updated = { ...prev, monitoredEndpoints: [] };
      try {
        localStorage.setItem('api_health_endpoint_5xx_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // =========================================================================
  // PM THRESHOLD CONFIGURATION & REAL-TIME CHART MARKERS STATE
  // =========================================================================
  const [thresholdConfig, setThresholdConfig] = useState<DashboardThresholdConfig>(() => {
    try {
      const saved = localStorage.getItem('api_health_threshold_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      latencyUpperMs: 180,
      latencyDropPercent: 35,
      backendLatencyMs: 45,
      payloadSizeKb: 128,
      payloadWarningKb: 64,
      enableVisualMarkers: true,
      enableSpikeHighlight: true,
      enableBrowserAlerts: true,
      enableSoundAlerts: true
    };
  });

  const [activeChartTab, setActiveChartTab] = useState<'latency' | 'payload' | 'dual'>('dual');
  const [chartVisualizationType, setChartVisualizationType] = useState<'timeline_bars' | 'line_chart'>('timeline_bars');
  const [isSimulatingSpike, setIsSimulatingSpike] = useState(false);
  const [thresholdFeedbackMsg, setThresholdFeedbackMsg] = useState<string | null>(null);
  const [showThresholdConfigPanel, setShowThresholdConfigPanel] = useState<boolean>(true);

  const updateThresholdConfig = (updater: Partial<DashboardThresholdConfig>) => {
    setThresholdConfig(prev => {
      const updated = { ...prev, ...updater };
      try {
        localStorage.setItem('api_health_threshold_config', JSON.stringify(updated));
      } catch (e) {}

      // Async sync to server
      fetch('/api/ai/health/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.debug('Threshold server sync error:', err));

      return updated;
    });
    setThresholdFeedbackMsg('Alert Thresholds Updated');
    setTimeout(() => setThresholdFeedbackMsg(null), 2500);
  };

  const handleApplyThresholdPreset = (preset: 'fast' | 'balanced' | 'batch') => {
    if (preset === 'fast') {
      updateThresholdConfig({
        latencyUpperMs: 130,
        latencyDropPercent: 30,
        backendLatencyMs: 35,
        payloadSizeKb: 64,
        payloadWarningKb: 32
      });
      showToast('⚡ Applied "High-Speed Microservice SLA" preset (130ms / 64 KB)');
    } else if (preset === 'balanced') {
      updateThresholdConfig({
        latencyUpperMs: 180,
        latencyDropPercent: 35,
        backendLatencyMs: 45,
        payloadSizeKb: 128,
        payloadWarningKb: 64
      });
      showToast('⚖️ Applied "Balanced Production" preset (180ms / 128 KB)');
    } else {
      updateThresholdConfig({
        latencyUpperMs: 320,
        latencyDropPercent: 45,
        backendLatencyMs: 80,
        payloadSizeKb: 512,
        payloadWarningKb: 256
      });
      showToast('📦 Applied "Heavy Data / Batch Pipeline" preset (320ms / 512 KB)');
    }
  };

  const handleResetThresholds = () => {
    updateThresholdConfig({
      latencyUpperMs: 180,
      latencyDropPercent: 35,
      backendLatencyMs: 45,
      payloadSizeKb: 128,
      payloadWarningKb: 64,
      enableVisualMarkers: true,
      enableSpikeHighlight: true,
      enableBrowserAlerts: true,
      enableSoundAlerts: true
    });
    showToast('🔄 Reset thresholds to enterprise defaults (180ms / 128 KB)');
  };

  // =========================================================================
  // AUTOMATED INCIDENT REPORT GENERATOR STATE (§Post-Mortem Sentinel)
  // =========================================================================
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>(() => {
    try {
      const saved = localStorage.getItem('api_health_incident_reports');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: `INC-${new Date(Date.now() - 3600000 * 2.8).toISOString().slice(0, 10).replace(/-/g, '')}-8421`,
        timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
        title: 'Latency Spike Alert: Gemini probe 245ms exceeded 180ms threshold (+36.1%)',
        severity: 'CRITICAL',
        triggerReason: 'Automated Real-Time Probe Latency Spike: 245ms exceeded configured threshold of 180ms',
        observedLatencyMs: 245,
        thresholdLatencyMs: 180,
        status: 'RESOLVED',
        capturedState: {
          systemStatus: 'DEGRADED',
          productionReadinessScore: 88,
          geminiModel: 'gemini-2.5-flash',
          geminiLatencyMs: 245,
          backendLatencyMs: 42,
          totalLatencyMs: 287,
          payloadKb: 54.2,
          statusCodeDistribution: { '2xx': 1420, '4xx': 12, '5xx': 3 },
          servicesSnapshot: [
            { name: 'Gemini 2.5 Flash Gateway', endpoint: '/api/generate', status: 'degraded', latencyMs: 245, uptime: '99.94%' },
            { name: 'Context Reasoning Engine', endpoint: '/api/ai/chat', status: 'operational', latencyMs: 142, uptime: '99.98%' },
            { name: 'Product Generation Proxy', endpoint: '/api/products', status: 'operational', latencyMs: 38, uptime: '100%' }
          ],
          endpointViolationsCount: 1
        },
        violations: [
          {
            metricName: 'Gemini 2.5 Flash API Roundtrip Latency',
            configuredThreshold: '180ms',
            observedValue: '245ms',
            delta: '+65ms (+36.1%)',
            severity: 'critical',
            status: 'VIOLATED'
          }
        ],
        recentLogs: [
          { id: 'log-1', timestamp: new Date(Date.now() - 3600000 * 2.8 + 12000).toISOString(), action: 'HEALTH_PROBE', user: 'Sentinel Daemon', details: 'Automated probe reported roundtrip 245ms (Threshold 180ms breached)', status: 'WARNING', latencyMs: 245 },
          { id: 'log-2', timestamp: new Date(Date.now() - 3600000 * 2.8 + 8000).toISOString(), action: 'API_REQUEST', user: 'Gateway Proxy', details: 'POST /api/generate - 200 OK', status: 'SUCCESS', latencyMs: 238 },
          { id: 'log-3', timestamp: new Date(Date.now() - 3600000 * 2.8 + 2000).toISOString(), action: 'API_REQUEST', user: 'Gateway Proxy', details: 'POST /api/ai/chat - 200 OK', status: 'SUCCESS', latencyMs: 135 }
        ],
        rootCauseAnalysis: {
          summary: 'Upstream Google Gemini Gateway experienced transient delay (245ms vs 180ms threshold) during batch processing window.',
          probableCause: 'High concurrent prompt token serialization and regional network hop jitter.',
          impactLevel: 'Medium — Temporary latency increase without client timeouts.',
          remediationSteps: [
            'Verify Gemini quota usage and model health in Google Cloud Console',
            'Inspect regional network transit latency between Express server and Google GenAI',
            'Evaluate prompt payload size caching for repeated context queries',
            'Ensure automatic circuit breaker fallback is enabled'
          ]
        },
        generatedBy: 'Automated Latency Spike Sentinel',
        notes: 'Investigated by On-Call PM. Resolved after upstream regional routing normalized.'
      }
    ];
  });

  const [selectedIncidentReport, setSelectedIncidentReport] = useState<IncidentReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportFilterSeverity, setReportFilterSeverity] = useState<string>('all');
  const [reportFilterStatus, setReportFilterStatus] = useState<string>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [showIncidentReportsPanel, setShowIncidentReportsPanel] = useState<boolean>(true);
  const [incidentNotesDraft, setIncidentNotesDraft] = useState<string>('');
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [activeIncidentToast, setActiveIncidentToast] = useState<IncidentReport | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'violations' | 'state' | 'logs' | 'playbook' | 'notes'>('violations');
  const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({});

  const generateMarkdownReport = (report: IncidentReport): string => {
    return `# INCIDENT POST-MORTEM: ${report.id}
**Title:** ${report.title}
**Timestamp:** ${new Date(report.timestamp).toUTCString()}
**Severity:** ${report.severity}
**Status:** ${report.status}
**Generated By:** ${report.generatedBy}

## 1. Executive Summary & Root Cause
${report.rootCauseAnalysis.summary}

- **Probable Cause:** ${report.rootCauseAnalysis.probableCause}
- **Impact Level:** ${report.rootCauseAnalysis.impactLevel}
- **Observed Latency:** ${report.observedLatencyMs}ms (Threshold: ${report.thresholdLatencyMs}ms)

## 2. Active Threshold Violations
${report.violations.map(v => `- **${v.metricName}**: Observed \`${v.observedValue}\` vs Configured \`${v.configuredThreshold}\` (Delta: ${v.delta}) [${v.status} - ${v.severity.toUpperCase()}]`).join('\n')}

## 3. Captured Dashboard State Snapshot
- **System Status:** ${report.capturedState.systemStatus}
- **Production Readiness Score:** ${report.capturedState.productionReadinessScore}/100
- **Gemini Model:** ${report.capturedState.geminiModel}
- **Gemini Latency:** ${report.capturedState.geminiLatencyMs}ms | **Backend:** ${report.capturedState.backendLatencyMs}ms | **Total:** ${report.capturedState.totalLatencyMs}ms
- **Payload Size:** ${report.capturedState.payloadKb ?? 'N/A'} KB
- **HTTP Status Codes:** 2xx: ${report.capturedState.statusCodeDistribution['2xx']} | 4xx: ${report.capturedState.statusCodeDistribution['4xx']} | 5xx: ${report.capturedState.statusCodeDistribution['5xx']}

## 4. Captured Gateway & Sentinel Logs
${report.recentLogs.map(l => `- \`[${l.timestamp}]\` **${l.action}** (${l.status || 'INFO'} - ${l.latencyMs ? l.latencyMs + 'ms' : ''}): ${l.details}`).join('\n')}

## 5. Remediation Steps & Mitigation Checklist
${report.rootCauseAnalysis.remediationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${report.notes ? `\n## 6. PM / On-Call Engineer Notes\n${report.notes}` : ''}
`;
  };

  const generateIncidentReport = async (options: {
    triggerReason: string;
    observedLatencyMs: number;
    thresholdLatencyMs: number;
    severity?: 'CRITICAL' | 'MAJOR' | 'WARNING';
    backendMs?: number;
    payloadKb?: number;
    manual?: boolean;
  }): Promise<IncidentReport> => {
    setIsGeneratingReport(true);
    const now = new Date();
    const id = `INC-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const observedLatencyMs = options.observedLatencyMs;
    const thresholdLatencyMs = options.thresholdLatencyMs;
    const deltaMs = Math.max(0, observedLatencyMs - thresholdLatencyMs);
    const deltaPct = thresholdLatencyMs > 0 ? Math.round((deltaMs / thresholdLatencyMs) * 100) : 0;
    const severity = options.severity || (observedLatencyMs >= thresholdLatencyMs * 1.35 ? 'CRITICAL' : 'MAJOR');
    const backendLatency = options.backendMs ?? (metrics?.gemini ? 36 : 28);
    const totalLatency = observedLatencyMs + backendLatency;
    const payload = options.payloadKb ?? 48.5;

    // Detect active violations
    const violations: ThresholdViolation[] = [];
    if (observedLatencyMs >= thresholdLatencyMs) {
      violations.push({
        metricName: 'Gemini 2.5 Flash API Roundtrip Latency',
        configuredThreshold: `${thresholdLatencyMs}ms`,
        observedValue: `${observedLatencyMs}ms`,
        delta: `+${deltaMs}ms (+${deltaPct}%)`,
        severity: observedLatencyMs >= thresholdLatencyMs * 1.35 ? 'critical' : 'warning',
        status: 'VIOLATED'
      });
    }

    if (backendLatency >= thresholdConfig.backendLatencyMs) {
      violations.push({
        metricName: 'Backend Proxy Gateway Roundtrip SLA',
        configuredThreshold: `${thresholdConfig.backendLatencyMs}ms`,
        observedValue: `${backendLatency}ms`,
        delta: `+${backendLatency - thresholdConfig.backendLatencyMs}ms`,
        severity: 'warning',
        status: 'SLA_BREACH'
      });
    }

    if (payload >= thresholdConfig.payloadSizeKb) {
      violations.push({
        metricName: 'HTTP Request/Response Payload Envelope Size',
        configuredThreshold: `${thresholdConfig.payloadSizeKb} KB`,
        observedValue: `${payload} KB`,
        delta: `+${(payload - thresholdConfig.payloadSizeKb).toFixed(1)} KB`,
        severity: 'warning',
        status: 'VIOLATED'
      });
    }

    // Capture recent gateway request logs
    let recentLogs: Array<{ id?: string; timestamp: string; action: string; user: string; details: string; status?: string; latencyMs?: number }> = [];
    try {
      const auditRes = await fetch('/api/gateway/audit-logs?limit=8');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        if (auditData.logs && Array.isArray(auditData.logs)) {
          recentLogs = auditData.logs.map((l: any) => ({
            id: l.id,
            timestamp: l.timestamp,
            action: `${l.method} ${l.path}`,
            user: l.apiKeyPrefix || 'Gateway Session',
            details: `${l.method} ${l.path} handled (${l.statusCode}) in ${l.latencyMs}ms - Outcome: ${l.outcome}`,
            status: l.statusCode >= 500 ? 'ERROR' : l.statusCode >= 400 ? 'WARNING' : 'SUCCESS',
            latencyMs: l.latencyMs
          }));
        }
      }
    } catch (e) {
      console.debug('Failed to fetch gateway audit logs:', e);
    }

    if (recentLogs.length === 0) {
      latencyTrend.slice(-6).forEach((p, idx) => {
        recentLogs.push({
          id: `probe-point-${idx}`,
          timestamp: new Date().toISOString(),
          action: 'HEALTH_PROBE',
          user: 'Sentinel Daemon',
          details: `Probe sample: Gemini ${p.geminiMs}ms, Backend ${p.backendMs}ms, Payload ${p.payloadKb ?? 48}KB`,
          status: p.geminiMs >= thresholdLatencyMs ? 'WARNING' : 'SUCCESS',
          latencyMs: p.geminiMs + p.backendMs
        });
      });
    }

    const capturedState: CapturedDashboardState = {
      systemStatus: observedLatencyMs >= thresholdLatencyMs * 1.5 ? 'CRITICAL_LATENCY' : 'DEGRADED_PERFORMANCE',
      productionReadinessScore: Math.max(65, Math.round(96 - (deltaPct / 2))),
      geminiModel: metrics?.gemini?.model || 'gemini-2.5-flash',
      geminiLatencyMs: observedLatencyMs,
      backendLatencyMs: backendLatency,
      totalLatencyMs: totalLatency,
      payloadKb: payload,
      statusCodeDistribution: {
        '2xx': metrics?.statusCodeDistribution?.['2xx'] ?? 1650,
        '4xx': metrics?.statusCodeDistribution?.['4xx'] ?? 18,
        '5xx': metrics?.statusCodeDistribution?.['5xx'] ?? 4
      },
      servicesSnapshot: (metrics?.services || [
        { name: 'Gemini 2.5 Flash Gateway', endpoint: '/api/generate', status: 'operational', latencyMs: observedLatencyMs, uptime: '99.9%' },
        { name: 'Context Reasoning Engine', endpoint: '/api/ai/chat', status: 'operational', latencyMs: backendLatency, uptime: '99.9%' },
        { name: 'Telemetry Observatory', endpoint: '/api/telemetry', status: 'operational', latencyMs: 25, uptime: '100%' }
      ]).map((s: any) => ({
        name: s.name,
        endpoint: s.endpoint,
        status: s.status,
        latencyMs: s.latencyMs,
        uptime: s.uptime
      })),
      endpointViolationsCount: violations.length
    };

    const newReport: IncidentReport = {
      id,
      timestamp: now.toISOString(),
      title: `Latency Spike Alert: Gemini probe ${observedLatencyMs}ms exceeded ${thresholdLatencyMs}ms threshold (+${deltaPct}%)`,
      severity,
      triggerReason: options.triggerReason,
      observedLatencyMs,
      thresholdLatencyMs,
      status: 'ACTIVE',
      capturedState,
      violations,
      recentLogs,
      rootCauseAnalysis: {
        summary: `Automated latency spike alert triggered at ${now.toLocaleTimeString()}. Probe roundtrip reached ${observedLatencyMs}ms (+${deltaPct}% over ${thresholdLatencyMs}ms limit).`,
        probableCause: observedLatencyMs > 280
          ? 'Upstream Google Gemini API delay or regional transit queue congestion during token generation.'
          : 'Elevated processing duration during prompt context ingestion and serialization.',
        impactLevel: observedLatencyMs > 280 ? 'HIGH — Client requests experience noticeable roundtrip delay' : 'MEDIUM — Probe threshold breach; system operating under degraded SLA',
        remediationSteps: [
          'Inspect Google GenAI API endpoint status and latency in Google Cloud Console',
          'Review prompt context window sizes and evaluate caching redundant tokens',
          'Check for concurrent spikes across /api/generate and /api/ai/chat endpoints',
          'Activate fallback fast model routing (gemini-2.5-flash) if degradation exceeds 60 seconds',
          'Verify backend Express proxy memory and event-loop lag'
        ]
      },
      generatedBy: options.manual ? 'Manual PM Diagnostic Trigger' : 'Automated Latency Spike Sentinel'
    };

    // Save locally
    setIncidentReports(prev => {
      const updated = [newReport, ...prev].slice(0, 30);
      try {
        localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Save to server
    fetch('/api/ai/health/incident-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: newReport })
    }).catch(err => console.debug('Failed to sync incident report to server:', err));

    setActiveIncidentToast(newReport);
    setIsGeneratingReport(false);

    if (thresholdConfig.enableSoundAlerts) {
      playAlertSound('critical');
    }

    showToast(`🚨 Latency Spike Alert Triggered: Incident Report ${id} automatically generated!`);
    return newReport;
  };

  const handleUpdateReportStatus = async (reportId: string, status: IncidentReport['status']) => {
    setIncidentReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, status } : r);
      try {
        localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (selectedIncidentReport && selectedIncidentReport.id === reportId) {
      setSelectedIncidentReport(prev => prev ? { ...prev, status } : null);
    }
    fetch(`/api/ai/health/incident-reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(err => console.debug('Failed to update report status on server:', err));
    showToast(`Incident ${reportId} status updated to ${status}`);
  };

  const handleSaveReportNotes = async (reportId: string, notes: string) => {
    setIncidentReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, notes } : r);
      try {
        localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (selectedIncidentReport && selectedIncidentReport.id === reportId) {
      setSelectedIncidentReport(prev => prev ? { ...prev, notes } : null);
    }
    fetch(`/api/ai/health/incident-reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    }).catch(err => console.debug('Failed to update report notes on server:', err));
    showToast(`Investigation notes saved to Incident ${reportId}`);
  };

  const handleDeleteReport = async (reportId: string) => {
    setIncidentReports(prev => {
      const updated = prev.filter(r => r.id !== reportId);
      try {
        localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (selectedIncidentReport && selectedIncidentReport.id === reportId) {
      setSelectedIncidentReport(null);
    }
    fetch(`/api/ai/health/incident-reports/${reportId}`, { method: 'DELETE' }).catch(() => {});
    showToast(`Incident report ${reportId} deleted`);
  };

  const handleClearAllReports = async () => {
    setIncidentReports([]);
    setSelectedIncidentReport(null);
    try {
      localStorage.removeItem('api_health_incident_reports');
    } catch (e) {}
    fetch('/api/ai/health/incident-reports', { method: 'DELETE' }).catch(() => {});
    showToast('All incident reports cleared');
  };

  const handleCopyMarkdown = (report: IncidentReport) => {
    const md = generateMarkdownReport(report);
    navigator.clipboard.writeText(md);
    setCopiedReportId(report.id);
    showToast(`📋 Copied incident post-mortem markdown to clipboard (Slack/Jira ready)`);
    setTimeout(() => setCopiedReportId(null), 3000);
  };

  const handleDownloadJson = (report: IncidentReport) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${report.id}_incident_postmortem.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`💾 Downloaded ${report.id} JSON`);
  };

  const handleDownloadMarkdown = (report: IncidentReport) => {
    const md = generateMarkdownReport(report);
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${report.id}_incident_postmortem.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`💾 Downloaded ${report.id} Markdown`);
  };

  const handleSimulateProbeSpike = async (type: 'latency_spike' | 'latency_drop' | 'payload_surge') => {
    setIsSimulatingSpike(true);
    try {
      const res = await fetch('/api/ai/health/probe-spike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok && data.success && data.point) {
        if (thresholdConfig.enableSoundAlerts) {
          playAlertSound(type === 'latency_spike' || type === 'payload_surge' ? 'critical' : 'warning');
        }

        if (thresholdConfig.enableBrowserAlerts && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`🚨 API Sentinel Alert: ${type.toUpperCase()}`, {
              body: data.note || 'Custom alert threshold exceeded on real-time probe.',
              icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
            });
          } catch (e) {}
        }

        showToast(data.note || 'Simulated probe recorded and chart updated!');

        if (data.latencyHistory) {
          setMetrics(prev => prev ? { ...prev, latencyTrend: data.latencyHistory } : prev);
        }

        // Automated Incident Report Generator integration
        if (data.incidentReport) {
          setIncidentReports(prev => {
            if (prev.some(r => r.id === data.incidentReport.id)) return prev;
            const updated = [data.incidentReport, ...prev].slice(0, 30);
            try {
              localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
          setActiveIncidentToast(data.incidentReport);
          showToast(`🚨 Latency Spike Alert: Incident Report ${data.incidentReport.id} generated!`);
        } else if (type === 'latency_spike' || data.point.geminiMs >= thresholdConfig.latencyUpperMs) {
          generateIncidentReport({
            triggerReason: data.note || `Simulated Latency Spike: ${data.point.geminiMs}ms exceeded ${thresholdConfig.latencyUpperMs}ms threshold`,
            observedLatencyMs: data.point.geminiMs,
            thresholdLatencyMs: thresholdConfig.latencyUpperMs,
            backendMs: data.point.backendMs,
            payloadKb: data.point.payloadKb
          });
        }
      }
    } catch (err: any) {
      showToast(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulatingSpike(false);
    }
  };

  const playAlertSound = (type: 'warning' | 'critical' | 'recovered' = 'warning') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'recovered') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (err) {
      console.debug('Audio context playback skipped:', err);
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Browser does not support desktop Push Notifications in this environment.');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPushPermission(res);
      if (res === 'granted') {
        showToast('Push Notifications enabled! Sentinel alerts are now armed.');
        if (alertConfig.soundEnabled) playAlertSound('recovered');
        try {
          new Notification('🔔 API Error Rate Sentinel Armed', {
            body: `You will be alerted instantly whenever error rate exceeds ${alertConfig.thresholdPercent}%.`,
            icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',
            tag: 'api-sentinel-welcome'
          });
        } catch (e) {}
      } else if (res === 'denied') {
        showToast('Notifications blocked by browser. Please enable notifications in site settings.');
      }
    } catch (err: any) {
      console.error('Permission request failed:', err);
    }
  };

  const triggerPushNotification = (
    errorRate: number,
    threshold: number,
    serviceName: string = 'Gateway Cluster',
    customDetails?: string
  ) => {
    const isBreached = errorRate >= threshold;
    const severity: 'warning' | 'critical' | 'recovered' =
      !isBreached ? 'recovered' : (errorRate > threshold * 1.5 ? 'critical' : 'warning');

    const alertEvent: PushAlertEvent = {
      id: `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      errorRate,
      threshold,
      serviceName,
      details: customDetails || (isBreached
        ? `API error rate peaked at ${errorRate}% (exceeding your ${threshold}% threshold).`
        : `API error rate recovered to ${errorRate}%, now safely below ${threshold}% threshold.`),
      severity
    };

    if (alertConfig.soundEnabled) {
      playAlertSound(severity);
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && alertConfig.desktopNotification) {
      try {
        const title = isBreached
          ? `🚨 API Error Rate Alert: ${errorRate}% (Threshold: ${threshold}%)`
          : `✅ API Error Rate Recovered: ${errorRate}%`;

        const notif = new Notification(title, {
          body: alertEvent.details,
          icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',
          tag: 'api-error-rate-sentinel'
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }

    setAlertHistory(prev => {
      const updated = [alertEvent, ...prev].slice(0, 30);
      try {
        localStorage.setItem('api_health_push_alert_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (isBreached) {
      setActiveBreach(alertEvent);
      showToast(`🚨 SENTINEL ALERT: API error rate ${errorRate}% breached ${threshold}% threshold!`);
    } else {
      setActiveBreach(null);
      showToast(`✅ SENTINEL RECOVERY: API error rate ${errorRate}% normalized below ${threshold}%!`);
    }

    try {
      fetch('/api/ai/health/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertEvent)
      });
    } catch (e) {}
  };

  const handleTestAlert = () => {
    setIsTestingAlert(true);
    triggerPushNotification(
      8.6,
      alertConfig.thresholdPercent,
      'Test Sentinel Dispatcher',
      `Manual test: Simulated 8.6% error rate exceeded ${alertConfig.thresholdPercent}% threshold. Desktop notifications & audio chime verified.`
    );
    setTimeout(() => setIsTestingAlert(false), 800);
  };

  const handleSimulateErrorBurst = async () => {
    setIsBurstingErrors(true);
    try {
      const res = await fetch('/api/ai/health/simulate-error-burst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorCount: 16, targetRate: 24 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Simulated error burst injected!');
        if (data.endpointDistribution) {
          setMetrics(prev => prev ? { ...prev, endpointDistribution: data.endpointDistribution } : prev);
        }
        fetchHealthMetrics();
        if (alertConfig.enabled) {
          triggerPushNotification(
            data.errorRate || 24,
            alertConfig.thresholdPercent,
            'Chaos Influx Cluster',
            `Chaos burst triggered! Error rate jumped to ${data.errorRate || 24}% (threshold: ${alertConfig.thresholdPercent}%).`
          );
        }
      }
    } catch (err: any) {
      showToast(`Error burst simulation failed: ${err.message}`);
    } finally {
      setIsBurstingErrors(false);
    }
  };

  const handleClearAlertHistory = () => {
    setAlertHistory([]);
    try {
      localStorage.removeItem('api_health_push_alert_history');
    } catch (e) {}
    showToast('Alert incident history cleared.');
  };

  const triggerEndpoint5xxBrowserAlert = (
    endpoint: string,
    serviceName: string,
    errorRate5xx: number,
    threshold: number,
    error5xxCount: number,
    totalRequests: number,
    isRecovery: boolean = false
  ) => {
    const alertId = `5xx_alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const event: Endpoint5xxAlertEvent = {
      id: alertId,
      timestamp: new Date().toISOString(),
      endpoint,
      serviceName,
      errorRate5xx,
      threshold,
      windowDurationSeconds: 60,
      error5xxCount,
      totalRequestsInWindow: totalRequests,
      severity: isRecovery ? 'recovered' : (errorRate5xx > threshold * 2 ? 'critical' : 'warning'),
      details: isRecovery
        ? `Endpoint ${endpoint} recovered: 5xx error rate normalized to ${errorRate5xx}% in 1-minute window.`
        : `Endpoint ${endpoint} reported a 5xx error rate of ${errorRate5xx}% (${error5xxCount}/${totalRequests} failed), exceeding the ${threshold}% threshold over the last 1-minute window.`
    };

    if (isRecovery) {
      setActive5xxBreaches(prev => {
        const next = { ...prev };
        delete next[endpoint];
        return next;
      });
      if (endpoint5xxConfig.soundAlerts) playAlertSound('recovered');
      showToast(`✅ 5xx Normalization: ${endpoint} error rate dropped to ${errorRate5xx}% (below ${threshold}% 1m threshold)`);
    } else {
      setActive5xxBreaches(prev => ({ ...prev, [endpoint]: event }));
      if (endpoint5xxConfig.soundAlerts) playAlertSound(errorRate5xx > threshold * 2 ? 'critical' : 'warning');
      showToast(`🚨 5xx ERROR RATE ALERT: ${endpoint} reached ${errorRate5xx}% (exceeding ${threshold}% over 1m window)!`);
    }

    // Native Desktop Browser Notification (Notification API)
    if (endpoint5xxConfig.desktopNotifications && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = isRecovery
          ? `✅ 5xx Normalization: ${endpoint}`
          : `🚨 5xx Error Alert: ${endpoint} (${errorRate5xx}%)`;
        const body = isRecovery
          ? `5xx Error rate on ${endpoint} dropped to ${errorRate5xx}%, returning safely below the ${threshold}% 1-minute window threshold.`
          : `Endpoint ${endpoint} (${serviceName}) reported ${errorRate5xx}% 5xx error rate over the last 1-minute window (${error5xxCount}/${totalRequests} failed). Threshold: ${threshold}%.`;

        const n = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `5xx-alert-${endpoint}`,
          requireInteraction: !isRecovery
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (err) {
        console.warn('Browser Notification error:', err);
      }
    }

    // Append to local endpoint alert history
    setEndpoint5xxAlertHistory(prev => {
      const updated = [event, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('api_health_endpoint_5xx_alert_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleSimulateEndpoint5xxBurst = async (targetEndpoint: string, errorCount: number = 2, totalReqs: number = 10) => {
    setSimulatingEndpoint(targetEndpoint);
    try {
      const res = await fetch('/api/ai/health/simulate-endpoint-5xx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: targetEndpoint,
          totalRequests: totalReqs,
          error5xxCount: errorCount,
          statusCode: 503
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.endpointDistribution) {
          setMetrics(prev => prev ? { ...prev, endpointDistribution: data.endpointDistribution } : prev);
        }
        if (data.alert) {
          triggerEndpoint5xxBrowserAlert(
            data.alert.endpoint,
            data.alert.serviceName,
            data.alert.errorRate5xx,
            data.alert.threshold,
            data.alert.error5xxCount,
            data.alert.totalRequestsInWindow
          );
        }
      }
    } catch (err) {
      console.error('Failed to simulate endpoint 5xx burst:', err);
      showToast('Simulation failed to connect to backend.');
    } finally {
      setSimulatingEndpoint(null);
    }
  };

  const handleResetEndpoint5xx = async (targetEndpoint?: string) => {
    try {
      const res = await fetch('/api/ai/health/reset-endpoint-5xx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: targetEndpoint })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.endpointDistribution) {
          setMetrics(prev => prev ? { ...prev, endpointDistribution: data.endpointDistribution } : prev);
        }
        if (targetEndpoint) {
          setActive5xxBreaches(prev => {
            const next = { ...prev };
            delete next[targetEndpoint];
            return next;
          });
        } else {
          setActive5xxBreaches({});
        }
        showToast('5xx error samples reset. Metrics normalized.');
      }
    } catch (err) {
      console.error('Failed to reset endpoint 5xx:', err);
    }
  };

  const handleClearEndpoint5xxHistory = () => {
    setEndpoint5xxAlertHistory([]);
    try {
      localStorage.removeItem('api_health_endpoint_5xx_alert_history');
    } catch (e) {}
    showToast('Endpoint 5xx incident history cleared.');
  };

  const fetchHealthMetrics = async () => {
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) {
        const data: ApiHealthMetrics = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to load API health metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();

    // Fetch stored incident reports from server
    fetch('/api/ai/health/incident-reports')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.reports) && data.reports.length > 0) {
          setIncidentReports(data.reports);
        }
      })
      .catch(() => {});

    // Listen to real-time endpoint distribution updates from WebSocket server
    const unsubWs = realtimeWs.subscribe('ENDPOINT_DISTRIBUTION_UPDATED', (data: any) => {
      if (data && data.endpointDistribution) {
        setMetrics((prev) => prev ? { ...prev, endpointDistribution: data.endpointDistribution } : prev);
      }
    });

    const unsubAudit = realtimeWs.subscribe('AUDIT_EVENT', () => {
      // Refresh telemetry when live audit events are streamed
      fetchHealthMetrics();
    });

    const unsubAlert = realtimeWs.subscribe('API_ALERT_TRIGGERED', (data: any) => {
      if (data && data.alert) {
        setAlertHistory((prev) => {
          const updated = [data.alert, ...prev].slice(0, 30);
          try {
            localStorage.setItem('api_health_push_alert_history', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubEndpoint5xx = realtimeWs.subscribe('ENDPOINT_5XX_ALERT_TRIGGERED', (data: any) => {
      if (data && data.alert) {
        const { endpoint, serviceName, errorRate5xx, threshold, error5xxCount, totalRequestsInWindow } = data.alert;
        if (endpoint5xxConfig.enabled && endpoint5xxConfig.monitoredEndpoints.includes(endpoint)) {
          triggerEndpoint5xxBrowserAlert(
            endpoint,
            serviceName,
            errorRate5xx,
            threshold,
            error5xxCount,
            totalRequestsInWindow
          );
        }
      }
    });

    const unsubProbe = realtimeWs.subscribe('REALTIME_HEALTH_PROBE', (data: any) => {
      if (data && data.latencyHistory) {
        setMetrics(prev => prev ? { ...prev, latencyTrend: data.latencyHistory } : prev);
      }
      if (data && data.incidentReport) {
        setIncidentReports(prev => {
          if (prev.some(r => r.id === data.incidentReport.id)) return prev;
          const updated = [data.incidentReport, ...prev].slice(0, 30);
          try {
            localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        setActiveIncidentToast(data.incidentReport);
      }
    });

    const unsubIncident = realtimeWs.subscribe('INCIDENT_REPORT_GENERATED', (data: any) => {
      if (data && data.report) {
        setIncidentReports(prev => {
          if (prev.some(r => r.id === data.report.id)) return prev;
          const updated = [data.report, ...prev].slice(0, 30);
          try {
            localStorage.setItem('api_health_incident_reports', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        setActiveIncidentToast(data.report);
      }
    });

    const unsubIncidentUpdate = realtimeWs.subscribe('INCIDENT_REPORT_UPDATED', (data: any) => {
      if (data && data.report) {
        setIncidentReports(prev => prev.map(r => r.id === data.report.id ? data.report : r));
      }
    });

    const unsubThresholds = realtimeWs.subscribe('HEALTH_THRESHOLDS_UPDATED', (data: any) => {
      if (data && data.thresholds) {
        setThresholdConfig(data.thresholds);
      }
    });

    return () => {
      unsubWs();
      unsubAudit();
      unsubAlert();
      unsubEndpoint5xx();
      unsubProbe();
      unsubIncident();
      unsubIncidentUpdate();
      unsubThresholds();
    };
  }, [endpoint5xxConfig]);

  // Automated 1-Minute Window 5xx Sentinel Watcher Hook
  useEffect(() => {
    if (!metrics?.endpointDistribution || !endpoint5xxConfig.enabled) return;

    const now = Date.now();
    const cooldownMs = endpoint5xxConfig.cooldownSeconds * 1000;
    const threshold = endpoint5xxConfig.thresholdPercent;

    metrics.endpointDistribution.forEach(ep => {
      if (!endpoint5xxConfig.monitoredEndpoints.includes(ep.endpoint)) return;

      const rate5xx = ep.oneMinute5xxErrorRate ?? 0;
      const count5xx = ep.oneMinute5xxCount ?? 0;
      const total1m = ep.oneMinuteTotalRequests ?? 0;

      const isBreached = rate5xx >= threshold && total1m >= endpoint5xxConfig.minRequestsInWindow;
      const lastSent = lastEndpointAlertSentRef.current[ep.endpoint] || 0;
      const wasBreached = wasEndpointBreachedRef.current[ep.endpoint] || false;

      if (isBreached) {
        if (now - lastSent > cooldownMs) {
          lastEndpointAlertSentRef.current[ep.endpoint] = now;
          wasEndpointBreachedRef.current[ep.endpoint] = true;
          triggerEndpoint5xxBrowserAlert(
            ep.endpoint,
            ep.serviceName,
            rate5xx,
            threshold,
            count5xx,
            total1m,
            false
          );
        }
      } else if (wasBreached && rate5xx < threshold) {
        wasEndpointBreachedRef.current[ep.endpoint] = false;
        triggerEndpoint5xxBrowserAlert(
          ep.endpoint,
          ep.serviceName,
          rate5xx,
          threshold,
          count5xx,
          total1m,
          true
        );
      }
    });
  }, [metrics?.endpointDistribution, endpoint5xxConfig]);

  // Automated Error Rate Sentinel Watcher Hook
  useEffect(() => {
    if (!metrics || !alertConfig.enabled) return;

    let currentRate = 0;
    if (metrics.endpointDistribution && metrics.endpointDistribution.length > 0) {
      const totalReq = metrics.endpointDistribution.reduce((s, e) => s + e.totalRequests, 0);
      const totalErr = metrics.endpointDistribution.reduce((s, e) => s + e.errorCount, 0);
      if (totalReq > 0) {
        currentRate = Number(((totalErr / totalReq) * 100).toFixed(1));
      }
    } else if (typeof (metrics as any).errorRate === 'number') {
      currentRate = (metrics as any).errorRate;
    }

    const isBreached = currentRate >= alertConfig.thresholdPercent;
    const now = Date.now();
    const cooldownMs = alertConfig.cooldownSeconds * 1000;

    if (isBreached) {
      if (now - lastAlertSentRef.current > cooldownMs) {
        lastAlertSentRef.current = now;
        wasBreachedRef.current = true;
        triggerPushNotification(
          currentRate,
          alertConfig.thresholdPercent,
          'Active Gateway Endpoints',
          `API error rate of ${currentRate}% exceeded your configured threshold of ${alertConfig.thresholdPercent}%.`
        );
      }
    } else if (wasBreachedRef.current && currentRate < alertConfig.thresholdPercent) {
      wasBreachedRef.current = false;
      triggerPushNotification(
        currentRate,
        alertConfig.thresholdPercent,
        'Active Gateway Endpoints',
        `API error rate normalized to ${currentRate}%, returning safely below ${alertConfig.thresholdPercent}% threshold.`
      );
    }
  }, [metrics, alertConfig.enabled, alertConfig.thresholdPercent, alertConfig.cooldownSeconds]);

  // Auto-refresh interval (every 12 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealthMetrics();
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleRunProbe = async () => {
    setIsProbing(true);
    try {
      const res = await fetch('/api/ai/health/probe', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLastProbeResult(data);
        showToast(`Probe successful: Gemini roundtrip ${data.gemini.latencyMs}ms · Backend ${data.backendLatencyMs}ms`);
        fetchHealthMetrics();

        // Check for latency spike and auto-generate incident report
        if (data.gemini && data.gemini.latencyMs >= thresholdConfig.latencyUpperMs) {
          generateIncidentReport({
            triggerReason: `Real-Time Probe Latency Spike: ${data.gemini.latencyMs}ms exceeded ${thresholdConfig.latencyUpperMs}ms threshold`,
            observedLatencyMs: data.gemini.latencyMs,
            thresholdLatencyMs: thresholdConfig.latencyUpperMs,
            backendMs: data.backendLatencyMs,
            payloadKb: data.payloadKb
          });
        }
      } else {
        showToast('Probe completed with error status.');
      }
    } catch (err: any) {
      showToast(`Probe failed: ${err.message}`);
    } finally {
      setIsProbing(false);
    }
  };

  const handleSimulateTrafficPulse = async (endpointTarget: string = '/api/generate', count: number = 15, errorRatio: number = 0.05) => {
    setIsSimulatingPulse(true);
    try {
      const res = await fetch('/api/ai/health/simulate-traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: endpointTarget, count, errorRatio })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Real-time traffic pulse injected: ${count} requests to ${endpointTarget}!`);
        if (data.endpointDistribution) {
          setMetrics(prev => prev ? { ...prev, endpointDistribution: data.endpointDistribution } : prev);
        } else {
          fetchHealthMetrics();
        }
      }
    } catch (err: any) {
      showToast(`Traffic pulse failed: ${err.message}`);
    } finally {
      setIsSimulatingPulse(false);
    }
  };

  const handleProbeSpecificEndpoint = async (item: EndpointDistributionItem) => {
    setProbingEndpointId(item.id);
    const start = Date.now();
    try {
      if (item.endpoint === '/api/ai/health/probe') {
        await handleRunProbe();
      } else {
        // Send a lightweight GET or health probe
        const res = await fetch(item.endpoint, { method: 'GET' });
        const latency = Date.now() - start;
        showToast(`Tested ${item.endpoint}: HTTP ${res.status} in ${latency}ms`);
        fetchHealthMetrics();
      }
    } catch (err: any) {
      const latency = Date.now() - start;
      showToast(`Tested ${item.endpoint}: Probe completed in ${latency}ms`);
      fetchHealthMetrics();
    } finally {
      setProbingEndpointId(null);
    }
  };

  const handleResetQuota = async () => {
    try {
      const res = await fetch('/api/ai/quota/reset', { method: 'POST' });
      if (res.ok) {
        showToast('Gemini API quota state reset. Normal operations resumed.');
        fetchHealthMetrics();
      }
    } catch (err) {
      showToast('Failed to reset quota state.');
    }
  };

  const handleTestPrompt = async () => {
    if (!testPrompt.trim()) return;
    setIsTestingPrompt(true);
    setTestPromptResult(null);
    const start = Date.now();
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testPrompt,
          model: 'gemini-3.8-flash',
          rolePreset: 'Lead Product Strategist',
          productName: 'ProductPilot Staging'
        })
      });
      const latency = Date.now() - start;
      const data = await res.json();
      setTestPromptResult({
        statusCode: res.status,
        latencyMs: latency,
        response: data.content || data.response || JSON.stringify(data),
        model: data.model || 'gemini-3.8-flash',
        success: res.ok
      });
      showToast(`Generation test completed in ${latency}ms (HTTP ${res.status})`);
      fetchHealthMetrics();
    } catch (err: any) {
      setTestPromptResult({
        statusCode: 500,
        latencyMs: Date.now() - start,
        error: err.message,
        success: false
      });
      showToast(`Test failed: ${err.message}`);
    } finally {
      setIsTestingPrompt(false);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <div className="text-sm font-semibold text-slate-300">Auditing Real-Time API Health & Readiness...</div>
        <p className="text-xs text-slate-500">Checking Gemini API key, microservices latency, and token quota headroom.</p>
      </div>
    );
  }

  const { gemini, services, latencyTrend, statusCodeDistribution, productionReadinessScore, readinessChecks } = metrics;
  const isHealthy = gemini.status === 'operational' && productionReadinessScore >= 95;

  // Endpoint distribution data fallback and filtering
  const endpointDistributionList: EndpointDistributionItem[] = metrics.endpointDistribution && metrics.endpointDistribution.length > 0
    ? metrics.endpointDistribution
    : [
        {
          id: 'ep_generate',
          endpoint: '/api/generate',
          serviceName: 'Autonomous 19-Artifact Generation Engine',
          category: 'generation',
          totalRequests: 1420,
          successCount: 1418,
          errorCount: 2,
          successRate: 99.86,
          errorRate: 0.14,
          avgLatencyMs: 142,
          p95LatencyMs: 285,
          lastCalled: new Date().toISOString(),
          distributionPercent: 33.2,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_ai_chat',
          endpoint: '/api/ai/chat',
          serviceName: 'Multi-Turn Copilot & Reasoning Gateway',
          category: 'reasoning',
          totalRequests: 980,
          successCount: 977,
          errorCount: 3,
          successRate: 99.69,
          errorRate: 0.31,
          avgLatencyMs: 115,
          p95LatencyMs: 240,
          lastCalled: new Date().toISOString(),
          distributionPercent: 22.9,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_audit_logs',
          endpoint: '/api/audit-logs',
          serviceName: 'Live Activity Feed & Audit Trail',
          category: 'telemetry',
          totalRequests: 740,
          successCount: 739,
          errorCount: 1,
          successRate: 99.86,
          errorRate: 0.14,
          avgLatencyMs: 24,
          p95LatencyMs: 55,
          lastCalled: new Date().toISOString(),
          distributionPercent: 17.3,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_products',
          endpoint: '/api/products',
          serviceName: 'Cloud Database & PostgreSQL Sync',
          category: 'database',
          totalRequests: 620,
          successCount: 619,
          errorCount: 1,
          successRate: 99.84,
          errorRate: 0.16,
          avgLatencyMs: 19,
          p95LatencyMs: 45,
          lastCalled: new Date().toISOString(),
          distributionPercent: 14.5,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_sprint',
          endpoint: '/api/sprint',
          serviceName: 'Sprint Velocity & RICE Scoring Engine',
          category: 'agile',
          totalRequests: 540,
          successCount: 539,
          errorCount: 1,
          successRate: 99.81,
          errorRate: 0.19,
          avgLatencyMs: 36,
          p95LatencyMs: 78,
          lastCalled: new Date().toISOString(),
          distributionPercent: 12.6,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_sandbox_status',
          endpoint: '/api/sandbox/status',
          serviceName: 'Sandbox Resiliency & Chaos Engine',
          category: 'sandbox',
          totalRequests: 410,
          successCount: 408,
          errorCount: 2,
          successRate: 99.51,
          errorRate: 0.49,
          avgLatencyMs: 28,
          p95LatencyMs: 65,
          lastCalled: new Date().toISOString(),
          distributionPercent: 9.6,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_solve_issue',
          endpoint: '/api/products/solve-issue',
          serviceName: 'Real-Time Multi-Artifact Problem Solver',
          category: 'solver',
          totalRequests: 320,
          successCount: 320,
          errorCount: 0,
          successRate: 100,
          errorRate: 0,
          avgLatencyMs: 168,
          p95LatencyMs: 310,
          lastCalled: new Date().toISOString(),
          distributionPercent: 7.5,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_gateway_keys',
          endpoint: '/api/gateway/keys',
          serviceName: 'Developer REST API Gateway',
          category: 'gateway',
          totalRequests: 290,
          successCount: 290,
          errorCount: 0,
          successRate: 100,
          errorRate: 0,
          avgLatencyMs: 22,
          p95LatencyMs: 50,
          lastCalled: new Date().toISOString(),
          distributionPercent: 6.8,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_probe',
          endpoint: '/api/ai/health/probe',
          serviceName: 'API Health & Latency Probe',
          category: 'telemetry',
          totalRequests: 165,
          successCount: 165,
          errorCount: 0,
          successRate: 100,
          errorRate: 0,
          avgLatencyMs: 125,
          p95LatencyMs: 210,
          lastCalled: new Date().toISOString(),
          distributionPercent: 3.9,
          recentStatus: 'healthy'
        },
        {
          id: 'ep_key_rotate',
          endpoint: '/api/ai/key/rotate',
          serviceName: 'Gemini Key Rotation & Zero-Downtime Engine',
          category: 'gateway',
          totalRequests: 48,
          successCount: 48,
          errorCount: 0,
          successRate: 100,
          errorRate: 0,
          avgLatencyMs: 112,
          p95LatencyMs: 190,
          lastCalled: new Date().toISOString(),
          distributionPercent: 1.1,
          recentStatus: 'healthy'
        }
      ];

  const filteredEndpoints = endpointDistributionList
    .filter(ep => {
      const matchesSearch = !endpointSearch ||
        ep.endpoint.toLowerCase().includes(endpointSearch.toLowerCase()) ||
        ep.serviceName.toLowerCase().includes(endpointSearch.toLowerCase());
      const matchesCategory = endpointCategoryFilter === 'all' || ep.category === endpointCategoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (endpointSortBy === 'errorRate') return b.errorRate - a.errorRate;
      if (endpointSortBy === 'latency') return b.avgLatencyMs - a.avgLatencyMs;
      return b.totalRequests - a.totalRequests;
    });

  const totalFilteredRequests = filteredEndpoints.reduce((sum, item) => sum + item.totalRequests, 0) || 1;
  const totalFilteredSuccess = filteredEndpoints.reduce((sum, item) => sum + item.successCount, 0);
  const totalFilteredErrors = filteredEndpoints.reduce((sum, item) => sum + item.errorCount, 0);
  const globalFilteredSuccessRate = Number(((totalFilteredSuccess / totalFilteredRequests) * 100).toFixed(2));
  const globalFilteredErrorRate = Number(((totalFilteredErrors / totalFilteredRequests) * 100).toFixed(2));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 border border-emerald-500/50 text-slate-100 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">API Health & Production Readiness</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                  isHealthy
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {isHealthy ? 'Production Ready · 99.4% SLA' : 'Monitoring Active'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Mode: {environmentMode.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time telemetry, latency percentiles, status codes, and quota tracking for the Gemini 3.8 API and internal PM services.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
              autoRefresh
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Auto-refresh metrics every 12 seconds"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-indigo-400 animate-pulse' : ''}`} />
            <span>{autoRefresh ? 'Live Poll: 12s' : 'Polling Paused'}</span>
          </button>

          <button
            onClick={handleRunProbe}
            disabled={isProbing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
            <span>{isProbing ? 'Probing Latency...' : 'Run Real-Time Probe'}</span>
          </button>
        </div>
      </div>

      {/* Active Breach Alert Banner */}
      {activeBreach && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-900/70 to-rose-950/90 border-2 border-rose-500/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  🚨 Push Alert Sentinel Triggered
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/30 text-rose-200 border border-rose-500/50">
                  {activeBreach.errorRate}% Error Rate
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-rose-300 bg-rose-900/40 border border-rose-700/50">
                  Threshold: {activeBreach.threshold}%
                </span>
              </div>
              <p className="text-xs text-rose-200/90 mt-0.5 font-medium">
                {activeBreach.details} Affected target: <strong className="text-white">{activeBreach.serviceName}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setActiveBreach(null)}
              className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-semibold border border-rose-700/60 transition-colors cursor-pointer"
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gemini API Status */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gemini API Status</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateTab ? onNavigateTab('settings') : null}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5 transition-colors cursor-pointer"
                title="Manage & Rotate Gemini API Key with Zero Downtime"
              >
                <span>Rotate Key</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-black text-white capitalize">{gemini.status.replace('_', ' ')}</div>
            <span className="text-xs font-semibold text-emerald-400 font-mono">200 OK</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-[11px] text-slate-300">{gemini.keyMasked}</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">Free Tier · 15 RPM</span>
          </div>
        </div>

        {/* Card 2: Latency SLAs */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latency SLAs</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-black text-white font-mono">{gemini.currentLatencyMs}ms</div>
            <span className="text-xs font-semibold text-indigo-400 font-mono">p50: {gemini.p50LatencyMs}ms</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>p95: <strong className="text-slate-200">{gemini.p95LatencyMs}ms</strong></span>
            <span>p99: <strong className="text-slate-200">{gemini.p99LatencyMs}ms</strong></span>
          </div>
        </div>

        {/* Card 3: Free Tier Quota Headroom */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Free Quota Usage</span>
            <Sliders className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-black text-white font-mono">{gemini.quotaUsageDailyPercent}%</div>
            <span className="text-xs font-semibold text-slate-400">of 1,500 RPD</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${gemini.quotaUsageDailyPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Limit: {gemini.rateLimitRpm} RPM</span>
            <span className="text-emerald-400 font-medium">Healthy Headroom</span>
          </div>
        </div>

        {/* Card 4: Production Readiness Score */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Production Gate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-black text-emerald-400 font-mono">{productionReadinessScore}%</div>
            <span className="text-xs font-semibold text-slate-400">Gate Passed</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Audits: <strong className="text-slate-200">8 of 8 Validated</strong></span>
            <span className="text-emerald-400 font-semibold">100% Zod Strict</span>
          </div>
        </div>
      </div>

      {/* Real-Time Push Notification & Error Rate Threshold Sentinel */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                globalFilteredErrorRate >= alertConfig.thresholdPercent
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
              }`}>
                {globalFilteredErrorRate >= alertConfig.thresholdPercent ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                ) : (
                  <BellRing className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Push Notification Sentinel & Error Rate Threshold Monitor
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    !alertConfig.enabled
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : globalFilteredErrorRate >= alertConfig.thresholdPercent
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {!alertConfig.enabled
                      ? 'Sentinel Disarmed'
                      : globalFilteredErrorRate >= alertConfig.thresholdPercent
                        ? `🚨 Alert Active: ${globalFilteredErrorRate}% ≥ ${alertConfig.thresholdPercent}%`
                        : `🛡️ Sentinel Armed · Nominal`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sends native browser push notifications and acoustic chimes the moment API error rate breaches your customized threshold.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Master Toggle */}
            <button
              onClick={() => updateAlertConfig({ enabled: !alertConfig.enabled })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all cursor-pointer ${
                alertConfig.enabled
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {alertConfig.enabled ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{alertConfig.enabled ? 'Sentinel Armed' : 'Sentinel Disarmed'}</span>
            </button>
          </div>
        </div>

        {/* 3 Status KPI Cards: Error Rate vs Threshold vs Desktop Push Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Measured Live Error Rate */}
          <div className={`p-4 rounded-xl border space-y-1.5 transition-all ${
            globalFilteredErrorRate >= alertConfig.thresholdPercent
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Current API Error Rate
            </span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black font-mono ${
                globalFilteredErrorRate >= alertConfig.thresholdPercent ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {globalFilteredErrorRate}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({totalFilteredErrors} / {totalFilteredRequests} calls)
              </span>
            </div>
            <div className="text-[11px] font-medium flex items-center space-x-1">
              {globalFilteredErrorRate >= alertConfig.thresholdPercent ? (
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  +{(globalFilteredErrorRate - alertConfig.thresholdPercent).toFixed(1)}% above threshold!
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {(alertConfig.thresholdPercent - globalFilteredErrorRate).toFixed(1)}% safety headroom
                </span>
              )}
            </div>
          </div>

          {/* Card 2: User Configured Threshold */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Configured Alert Threshold
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black font-mono text-indigo-300">
                {alertConfig.thresholdPercent}%
              </span>
              <span className="text-[11px] text-slate-400">Trigger Limit</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Debounce Cooldown: <strong className="text-slate-200 font-mono">{alertConfig.cooldownSeconds}s</strong>
            </div>
          </div>

          {/* Card 3: Browser Push Permission Status */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Browser Push Permission
              </span>
              <div className="flex items-center space-x-2 mt-1">
                {pushPermission === 'granted' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-bold text-emerald-400">Granted · Native OS Push Active</span>
                  </>
                ) : pushPermission === 'denied' ? (
                  <span className="text-sm font-bold text-rose-400 flex items-center gap-1">
                    <BellOff className="w-3.5 h-3.5" /> Blocked in Browser
                  </span>
                ) : (
                  <span className="text-sm font-bold text-amber-400">Not Armed</span>
                )}
              </div>
            </div>

            {pushPermission !== 'granted' ? (
              <button
                onClick={requestPushPermission}
                className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all shadow cursor-pointer"
              >
                <Bell className="w-3 h-3" />
                <span>Enable Browser Push Notifications</span>
              </button>
            ) : (
              <div className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" /> Web Notification API Armed
              </div>
            )}
          </div>
        </div>

        {/* Configuration Controls Grid */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-5">
          {/* Threshold Slider & Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Error Rate Trigger Threshold: <strong className="text-indigo-400 font-mono text-sm ml-1">{alertConfig.thresholdPercent}%</strong></span>
              </label>
              <span className="text-[11px] text-slate-400">Dispatches push alerts if live error rate reaches or exceeds this value</span>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.5"
                value={alertConfig.thresholdPercent}
                onChange={(e) => updateAlertConfig({ thresholdPercent: parseFloat(e.target.value) })}
                className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="w-14 text-center py-1 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-indigo-300">
                {alertConfig.thresholdPercent}%
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-slate-400">Threshold Presets:</span>
              {[
                { label: 'Strict 2.0% (Fintech SLA)', val: 2.0 },
                { label: 'Standard 5.0% (Production Baseline)', val: 5.0 },
                { label: 'Tolerant 10.0% (Staging)', val: 10.0 },
                { label: 'Resilience 15.0% (Chaos Testing)', val: 15.0 }
              ].map((p, i) => (
                <button
                  key={i}
                  onClick={() => updateAlertConfig({ thresholdPercent: p.val })}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer ${
                    alertConfig.thresholdPercent === p.val
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Options & Cooldown */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
            {/* Toggle 1: Desktop Push */}
            <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={alertConfig.desktopNotification}
                onChange={(e) => updateAlertConfig({ desktopNotification: e.target.checked })}
                className="accent-indigo-500 rounded cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium">Desktop Push Notifications</span>
            </label>

            {/* Toggle 2: Audio Warning Chime */}
            <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={alertConfig.soundEnabled}
                onChange={(e) => updateAlertConfig({ soundEnabled: e.target.checked })}
                className="accent-indigo-500 rounded cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                {alertConfig.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                Audio Warning Chime
              </span>
            </label>

            {/* Toggle 3: In-App Banner */}
            <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={alertConfig.inAppNotification}
                onChange={(e) => updateAlertConfig({ inAppNotification: e.target.checked })}
                className="accent-indigo-500 rounded cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium">In-App Banner Alert</span>
            </label>

            {/* Cooldown Select */}
            <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="flex-1 flex items-center justify-between text-xs">
                <span className="text-slate-400">Debounce:</span>
                <select
                  value={alertConfig.cooldownSeconds}
                  onChange={(e) => updateAlertConfig({ cooldownSeconds: parseInt(e.target.value) })}
                  className="bg-slate-800 text-slate-200 font-mono text-[11px] rounded px-2 py-0.5 border border-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s (Default)</option>
                  <option value={120}>2 mins</option>
                  <option value={300}>5 mins</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Action Bench: Test Push Notification & Chaos Fault Injection */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTestAlert}
              disabled={isTestingAlert}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-indigo-950/40 transition-all cursor-pointer disabled:opacity-50"
              title="Test the complete push notification pipeline (desktop notification + sound + toast)"
            >
              <BellRing className={`w-3.5 h-3.5 ${isTestingAlert ? 'animate-bounce' : ''}`} />
              <span>{isTestingAlert ? 'Dispatching Push Alert...' : 'Send Test Push Alert'}</span>
            </button>

            <button
              onClick={handleSimulateErrorBurst}
              disabled={isBurstingErrors}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
              title="Inject simulated 5xx errors to push live error rate above threshold and test the real-time sentinel trigger"
            >
              <Flame className={`w-3.5 h-3.5 ${isBurstingErrors ? 'animate-spin' : ''}`} />
              <span>{isBurstingErrors ? 'Injecting Chaos Errors...' : 'Simulate 5xx Error Spike (Test Trigger)'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNotificationHistory(!showNotificationHistory)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <span>{showNotificationHistory ? 'Hide Incident History' : `Show Incident History (${alertHistory.length})`}</span>
            </button>

            {alertHistory.length > 0 && (
              <button
                onClick={handleClearAlertHistory}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                title="Clear incident history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Incident History Log */}
        {showNotificationHistory && alertHistory.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Push Notification Incident Log ({alertHistory.length} events)</span>
              <span className="text-[11px] text-slate-500">Persisted locally & broadcast via WebSocket</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-mono">
              {alertHistory.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      evt.severity === 'critical'
                        ? 'bg-rose-500 animate-ping'
                        : evt.severity === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    }`} />
                    <span className={`font-bold ${
                      evt.severity === 'critical' ? 'text-rose-400' : evt.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {evt.errorRate}%
                    </span>
                    <span className="text-slate-300 truncate max-w-xs sm:max-w-md font-sans text-xs">{evt.details}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-500 text-[11px] shrink-0">
                    <span>Threshold: {evt.threshold}%</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2b. PM THRESHOLD CONFIGURATION PANEL (§Custom Alert Thresholds & Visual Markers) */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl transition-all duration-300">
        {/* Panel Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Threshold Configuration</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  PM Alert Sentinel
                </span>
                {thresholdFeedbackMsg && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold animate-fadeIn">
                    ✓ {thresholdFeedbackMsg}
                  </span>
                )}
                {thresholdConfig.enableVisualMarkers && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span>Visual Markers Active</span>
                  </span>
                )}
                {thresholdConfig.enableSpikeHighlight && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                    Red Spike Highlight On
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure custom alert thresholds for latency and payload size. Charts automatically highlight abnormal spikes and drops with a red background and render reference markers.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 mr-1 font-medium">SLA Presets:</span>
            <button
              onClick={() => handleApplyThresholdPreset('fast')}
              title="Fast Microservice SLA: 130ms Latency, 64 KB Payload"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>Fast (130ms / 64KB)</span>
            </button>
            <button
              onClick={() => handleApplyThresholdPreset('balanced')}
              title="Balanced Production SLA: 180ms Latency, 128 KB Payload"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Balanced (180ms / 128KB)</span>
            </button>
            <button
              onClick={() => handleApplyThresholdPreset('batch')}
              title="Batch Data Pipeline SLA: 320ms Latency, 512 KB Payload"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <HardDrive className="w-3 h-3 text-amber-400" />
              <span>Batch (320ms / 512KB)</span>
            </button>
            <button
              onClick={handleResetThresholds}
              title="Reset all thresholds to system factory defaults"
              className="p-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PM Sliders & Numeric Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Column 1: Latency Thresholds */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Roundtrip Latency Alert Thresholds</span>
              </span>
              <span className="font-mono text-[10px] text-indigo-400">Target p95 & Spikes</span>
            </div>

            {/* Slider 1: Latency Upper Spike Alert */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-medium">Latency Upper Threshold (Spike Alert):</span>
                <span className="font-mono font-bold text-rose-400 text-sm">{thresholdConfig.latencyUpperMs} ms</span>
              </div>
              <input
                type="range"
                min="60"
                max="400"
                step="5"
                value={thresholdConfig.latencyUpperMs}
                onChange={(e) => updateThresholdConfig({ latencyUpperMs: Number(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Aggressive (80ms)</span>
                <span>Production Normal (180ms)</span>
                <span>Relaxed (350ms)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Points with Gemini or roundtrip latency exceeding <strong className="text-rose-300">{thresholdConfig.latencyUpperMs}ms</strong> will trigger a red background highlight and alert.
              </p>
            </div>

            {/* Slider 2: Latency Drop / Anomaly Variance */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-medium">Latency Drop Anomaly Threshold:</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">±{thresholdConfig.latencyDropPercent}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="75"
                step="5"
                value={thresholdConfig.latencyDropPercent}
                onChange={(e) => updateThresholdConfig({ latencyDropPercent: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Sensitive (20%)</span>
                <span>Standard (35%)</span>
                <span>Wide Swing (60%)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sudden drops or jumps of <strong className="text-cyan-300">&gt; {thresholdConfig.latencyDropPercent}%</strong> relative to previous sample are highlighted as anomalies.
              </p>
            </div>

            {/* Slider 3: Backend Proxy SLA */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-medium">Backend Internal Proxy SLA:</span>
                <span className="font-mono font-bold text-teal-400 text-sm">{thresholdConfig.backendLatencyMs} ms</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={thresholdConfig.backendLatencyMs}
                onChange={(e) => updateThresholdConfig({ backendLatencyMs: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Strict (25ms)</span>
                <span>Nominal (45ms)</span>
                <span>Lenient (80ms)</span>
              </div>
            </div>
          </div>

          {/* Column 2: Payload Size Thresholds */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Payload Size Alert Thresholds</span>
              </span>
              <span className="font-mono text-[10px] text-amber-400">Request &amp; Response Bloat</span>
            </div>

            {/* Slider 4: Max Payload Size Alert */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-medium">Max Payload Alert Threshold (KB):</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{thresholdConfig.payloadSizeKb} KB</span>
              </div>
              <input
                type="range"
                min="24"
                max="512"
                step="8"
                value={thresholdConfig.payloadSizeKb}
                onChange={(e) => updateThresholdConfig({ payloadSizeKb: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Compact (48 KB)</span>
                <span>Standard (128 KB)</span>
                <span>Heavy Doc (512 KB)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                API payloads exceeding <strong className="text-amber-300">{thresholdConfig.payloadSizeKb} KB</strong> will be flagged with a visual red marker on the payload timeline.
              </p>
            </div>

            {/* Slider 5: Payload Warning Threshold */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-medium">Payload Early Warning Threshold:</span>
                <span className="font-mono font-bold text-yellow-400 text-sm">{thresholdConfig.payloadWarningKb} KB</span>
              </div>
              <input
                type="range"
                min="16"
                max="256"
                step="8"
                value={thresholdConfig.payloadWarningKb}
                onChange={(e) => updateThresholdConfig({ payloadWarningKb: Number(e.target.value) })}
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Caution (32 KB)</span>
                <span>Warning (64 KB)</span>
                <span>High (160 KB)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Early warning baseline to alert engineering before hard quota or payload envelope limits are breached.
              </p>
            </div>

            {/* Visual Markers & Alert Toggles */}
            <div className="pt-2 border-t border-slate-800/50 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 block">Sentinel Chart &amp; Alert Actions:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-slate-900/90 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={thresholdConfig.enableVisualMarkers}
                    onChange={(e) => updateThresholdConfig({ enableVisualMarkers: e.target.checked })}
                    className="rounded accent-purple-500 w-3.5 h-3.5"
                  />
                  <span>Visual Chart Markers</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-slate-900/90 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={thresholdConfig.enableSpikeHighlight}
                    onChange={(e) => updateThresholdConfig({ enableSpikeHighlight: e.target.checked })}
                    className="rounded accent-rose-500 w-3.5 h-3.5"
                  />
                  <span>Red Spike Highlight</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-slate-900/90 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={thresholdConfig.enableBrowserAlerts}
                    onChange={(e) => updateThresholdConfig({ enableBrowserAlerts: e.target.checked })}
                    className="rounded accent-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Browser Notifications</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-slate-900/90 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={thresholdConfig.enableSoundAlerts}
                    onChange={(e) => updateThresholdConfig({ enableSoundAlerts: e.target.checked })}
                    className="rounded accent-cyan-500 w-3.5 h-3.5"
                  />
                  <span>Acoustic Chime</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Influx Simulation Bar */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="font-semibold">Verify Custom Thresholds (Live Influx Simulator):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulateProbeSpike('latency_spike')}
              disabled={isSimulatingSpike}
              title="Inject a latency spike (250ms) exceeding threshold to test red background highlighting"
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all shadow-md shadow-rose-950/40 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Simulate Latency Spike (250ms)</span>
            </button>

            <button
              onClick={() => handleSimulateProbeSpike('latency_drop')}
              disabled={isSimulatingSpike}
              title="Inject an abnormally low drop (45ms) to test drop anomaly detection"
              className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Simulate Latency Drop (45ms)</span>
            </button>

            <button
              onClick={() => handleSimulateProbeSpike('payload_surge')}
              disabled={isSimulatingSpike}
              title="Inject an oversized payload (195 KB) exceeding threshold"
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Simulate Payload Surge (195 KB)</span>
            </button>

            <button
              onClick={handleRunProbe}
              disabled={isProbing}
              title="Run a standard live ping probe"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
              <span>Probe Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Row: Real-Time Charts & Status Code Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-Time Timelines with Custom Threshold Visual Markers & Red Highlights (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          {/* Chart Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200">
                  Real-Time Performance Timeline (Last {latencyTrend.length} Probes)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic threshold sentinels with automated red background highlights on spikes and drops
              </p>
            </div>

            {/* Mode & Breaches Pill Indicators */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Breach count badge */}
              {(() => {
                const totalBreaches = latencyTrend.filter((item, idx) => {
                  const prev = idx > 0 ? latencyTrend[idx - 1] : null;
                  const isSpike = item.geminiMs >= thresholdConfig.latencyUpperMs;
                  const isBackendSpike = item.backendMs >= thresholdConfig.backendLatencyMs;
                  const isDrop = prev && ((prev.geminiMs - item.geminiMs) / prev.geminiMs) >= (thresholdConfig.latencyDropPercent / 100);
                  const isJump = prev && ((item.geminiMs - prev.geminiMs) / prev.geminiMs) >= (thresholdConfig.latencyDropPercent / 100);
                  const isPayload = (item.payloadKb ?? 48) >= thresholdConfig.payloadSizeKb;
                  return isSpike || isBackendSpike || isDrop || isJump || isPayload;
                }).length;

                return totalBreaches > 0 ? (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center space-x-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{totalBreaches} Threshold Breach{totalBreaches > 1 ? 'es' : ''} Highlighted</span>
                  </span>
                ) : (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>All Samples Within SLA</span>
                  </span>
                );
              })()}

              {/* Chart View Mode Tabs & Style Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Visualization Style: Bars vs Line */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setChartVisualizationType('timeline_bars')}
                    title="Real-time discrete probe stream with red background highlight containers"
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      chartVisualizationType === 'timeline_bars' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Bars Stream
                  </button>
                  <button
                    onClick={() => setChartVisualizationType('line_chart')}
                    title="Continuous line chart with threshold reference lines and red anomaly marker halos"
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      chartVisualizationType === 'line_chart' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Line Chart
                  </button>
                </div>

                {/* Metric Domain Filter */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setActiveChartTab('dual')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      activeChartTab === 'dual' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dual View
                  </button>
                  <button
                    onClick={() => setActiveChartTab('latency')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      activeChartTab === 'latency' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Latency (ms)
                  </button>
                  <button
                    onClick={() => setActiveChartTab('payload')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      activeChartTab === 'payload' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Payload (KB)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Legends & Visual Marker Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-300">Gemini Latency</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="text-slate-300">Backend Proxy</span>
              </span>
              {(activeChartTab === 'dual' || activeChartTab === 'payload') && (
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-slate-300">Payload Size (KB)</span>
                </span>
              )}
            </div>

            {thresholdConfig.enableVisualMarkers && (
              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <span className="flex items-center space-x-1 text-rose-400">
                  <span className="w-3 border-t-2 border-dashed border-rose-500" />
                  <span>Alert: {thresholdConfig.latencyUpperMs}ms</span>
                </span>
                <span className="flex items-center space-x-1 text-teal-300">
                  <span className="w-3 border-t-2 border-dotted border-teal-500" />
                  <span>SLA: {thresholdConfig.backendLatencyMs}ms</span>
                </span>
                <span className="flex items-center space-x-1 text-amber-400">
                  <span className="w-3 border-t-2 border-dashed border-amber-500" />
                  <span>Payload Cap: {thresholdConfig.payloadSizeKb}KB</span>
                </span>
              </div>
            )}
          </div>

          {/* RECHARTS CONTINUOUS LINE CHART MODE */}
          {chartVisualizationType === 'line_chart' ? (
            <div className="pt-4 pb-2 space-y-4">
              {/* Latency Line Chart */}
              {(activeChartTab === 'dual' || activeChartTab === 'latency') && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Roundtrip Latency Timeline Curve (ms)</span>
                    </span>
                    <span className="font-mono text-[10px] text-rose-400 font-bold">
                      Red Dots = Latency Spikes / Drops Exceeding Thresholds
                    </span>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={latencyTrend} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 'auto']} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              const isSpike = d.geminiMs >= thresholdConfig.latencyUpperMs;
                              return (
                                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-700 shadow-xl text-xs font-mono space-y-1">
                                  <div className="font-sans font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between">
                                    <span>Probe: {d.timestamp}</span>
                                    <span className={isSpike ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                      {isSpike ? '⚠️ THRESHOLD BREACH' : '✓ OK'}
                                    </span>
                                  </div>
                                  <div className="text-indigo-300">Gemini: {d.geminiMs}ms (Threshold: {thresholdConfig.latencyUpperMs}ms)</div>
                                  <div className="text-teal-300">Backend: {d.backendMs}ms (SLA: {thresholdConfig.backendLatencyMs}ms)</div>
                                  {d.payloadKb && <div className="text-amber-300">Payload: {d.payloadKb} KB</div>}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsLegend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

                        {/* Visual Threshold Reference Lines */}
                        {thresholdConfig.enableVisualMarkers && (
                          <>
                            <ReferenceLine
                              y={thresholdConfig.latencyUpperMs}
                              stroke="#ef4444"
                              strokeDasharray="4 4"
                              strokeWidth={2}
                              label={{
                                value: `Threshold (${thresholdConfig.latencyUpperMs}ms)`,
                                fill: '#f87171',
                                fontSize: 10,
                                position: 'insideTopRight'
                              }}
                            />
                            <ReferenceLine
                              y={thresholdConfig.backendLatencyMs}
                              stroke="#14b8a6"
                              strokeDasharray="3 3"
                              strokeWidth={1.5}
                              label={{
                                value: `SLA (${thresholdConfig.backendLatencyMs}ms)`,
                                fill: '#2dd4bf',
                                fontSize: 10,
                                position: 'insideTopLeft'
                              }}
                            />
                          </>
                        )}

                        {/* Gemini Line with Custom Red Background Halos on Spikes/Drops */}
                        <Line
                          type="monotone"
                          dataKey="geminiMs"
                          name="Gemini Latency (ms)"
                          stroke="#818cf8"
                          strokeWidth={2.5}
                          dot={(props: any) => {
                            const { cx, cy, payload, index } = props;
                            const prev = index > 0 ? latencyTrend[index - 1] : null;
                            const isSpike = payload.geminiMs >= thresholdConfig.latencyUpperMs;
                            const isDrop = prev && ((prev.geminiMs - payload.geminiMs) / prev.geminiMs) >= (thresholdConfig.latencyDropPercent / 100);
                            const isJump = prev && ((payload.geminiMs - prev.geminiMs) / prev.geminiMs) >= (thresholdConfig.latencyDropPercent / 100);
                            const isBreach = isSpike || isDrop || isJump;

                            if (thresholdConfig.enableSpikeHighlight && isBreach) {
                              return (
                                <g key={`dot-${index}`}>
                                  <circle cx={cx} cy={cy} r={16} fill="rgba(225, 29, 72, 0.4)" stroke="#f43f5e" strokeWidth={2} />
                                  <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                                  <rect x={cx - 24} y={cy - 22} width={48} height={14} rx={3} fill="#e11d48" />
                                  <text x={cx} y={cy - 12} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="bold">
                                    {isSpike ? 'SPIKE' : isDrop ? 'DROP' : 'JUMP'}
                                  </text>
                                </g>
                              );
                            }
                            return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill="#6366f1" stroke="#1e1b4b" strokeWidth={2} />;
                          }}
                        />

                        {/* Backend Line */}
                        <Line
                          type="monotone"
                          dataKey="backendMs"
                          name="Backend Proxy (ms)"
                          stroke="#2dd4bf"
                          strokeWidth={2}
                          dot={(props: any) => {
                            const { cx, cy, payload, index } = props;
                            const isBreach = payload.backendMs >= thresholdConfig.backendLatencyMs;
                            if (thresholdConfig.enableSpikeHighlight && isBreach) {
                              return (
                                <g key={`dot-b-${index}`}>
                                  <circle cx={cx} cy={cy} r={13} fill="rgba(225, 29, 72, 0.35)" stroke="#f43f5e" strokeWidth={1.5} />
                                  <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                                </g>
                              );
                            }
                            return <circle key={`dot-b-${index}`} cx={cx} cy={cy} r={3} fill="#14b8a6" stroke="#042f2e" strokeWidth={1.5} />;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Payload Line Chart */}
              {(activeChartTab === 'dual' || activeChartTab === 'payload') && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Payload Envelope Timeline Curve (KB)</span>
                    </span>
                    <span className="font-mono text-[10px] text-amber-400 font-bold">
                      Cap: {thresholdConfig.payloadSizeKb} KB
                    </span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={latencyTrend} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 'auto']} />
                        <RechartsTooltip />
                        {thresholdConfig.enableVisualMarkers && (
                          <ReferenceLine
                            y={thresholdConfig.payloadSizeKb}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            label={{
                              value: `Max Payload (${thresholdConfig.payloadSizeKb} KB)`,
                              fill: '#fbbf24',
                              fontSize: 10,
                              position: 'insideTopRight'
                            }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="payloadKb"
                          name="Payload Size (KB)"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={(props: any) => {
                            const { cx, cy, payload, index } = props;
                            const isBreach = (payload.payloadKb ?? 0) >= thresholdConfig.payloadSizeKb;
                            if (thresholdConfig.enableSpikeHighlight && isBreach) {
                              return (
                                <g key={`dot-p-${index}`}>
                                  <circle cx={cx} cy={cy} r={16} fill="rgba(225, 29, 72, 0.45)" stroke="#f43f5e" strokeWidth={2} />
                                  <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                                  <rect x={cx - 30} y={cy - 22} width={60} height={14} rx={3} fill="#e11d48" />
                                  <text x={cx} y={cy - 12} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="bold">
                                    OVERSIZED
                                  </text>
                                </g>
                              );
                            }
                            return <circle key={`dot-p-${index}`} cx={cx} cy={cy} r={4} fill="#f59e0b" stroke="#78350f" strokeWidth={2} />;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* BARS TIMELINE STREAM MODE WITH VIVID RED BACKGROUND HIGHLIGHTS */
            <>
              {/* Real-Time Latency Timeline Chart Area */}
              {(activeChartTab === 'dual' || activeChartTab === 'latency') && (
                <div className="relative pt-6 pb-2 px-2 border-b border-slate-800">
                  {/* Dynamic Visual Marker Lines for Latency */}
                  {thresholdConfig.enableVisualMarkers && (() => {
                    const maxScale = Math.max(260, thresholdConfig.latencyUpperMs * 1.25);
                    const latencyMarkerBottom = Math.min(94, Math.max(6, (thresholdConfig.latencyUpperMs / maxScale) * 100));
                    const backendMarkerBottom = Math.min(94, Math.max(6, (thresholdConfig.backendLatencyMs / maxScale) * 100));

                    return (
                      <>
                        {/* Upper Latency Threshold Line */}
                        <div
                          className="absolute left-2 right-2 border-t-2 border-dashed border-rose-500/80 pointer-events-none z-10 transition-all duration-300"
                          style={{ bottom: `${latencyMarkerBottom}%` }}
                        >
                          <span className="absolute -top-3 right-0 text-[9px] font-mono font-bold text-rose-300 bg-slate-950/90 border border-rose-500/60 px-1.5 py-0.2 rounded shadow-xs">
                            ⚠️ Latency Spike Threshold ({thresholdConfig.latencyUpperMs}ms)
                          </span>
                        </div>

                        {/* Backend SLA Threshold Line */}
                        <div
                          className="absolute left-2 right-2 border-t-2 border-dotted border-teal-500/70 pointer-events-none z-10 transition-all duration-300"
                          style={{ bottom: `${backendMarkerBottom}%` }}
                        >
                          <span className="absolute -top-3 left-0 text-[9px] font-mono font-bold text-teal-300 bg-slate-950/90 border border-teal-500/60 px-1.5 py-0.2 rounded shadow-xs">
                            SLA Threshold ({thresholdConfig.backendLatencyMs}ms)
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  {/* Bar Chart Visualization with Red Background on Threshold Exceeded / Spike / Drop */}
                  <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2">
                    {latencyTrend.map((item, idx) => {
                      const maxScale = Math.max(260, thresholdConfig.latencyUpperMs * 1.25);
                      const geminiHeight = Math.min(100, (item.geminiMs / maxScale) * 100);
                      const backendHeight = Math.min(100, (item.backendMs / maxScale) * 100);

                      // Anomaly & Spike Detection
                      const prevPoint = idx > 0 ? latencyTrend[idx - 1] : null;
                      const isGeminiSpike = item.geminiMs >= thresholdConfig.latencyUpperMs;
                      const isBackendSpike = item.backendMs >= thresholdConfig.backendLatencyMs;
                      
                      let isDrop = false;
                      let dropPercent = 0;
                      if (prevPoint && prevPoint.geminiMs > 0) {
                        dropPercent = Math.round(((prevPoint.geminiMs - item.geminiMs) / prevPoint.geminiMs) * 100);
                        if (dropPercent >= thresholdConfig.latencyDropPercent) {
                          isDrop = true;
                        }
                      }

                      let isJump = false;
                      let jumpPercent = 0;
                      if (prevPoint && prevPoint.geminiMs > 0) {
                        jumpPercent = Math.round(((item.geminiMs - prevPoint.geminiMs) / prevPoint.geminiMs) * 100);
                        if (jumpPercent >= thresholdConfig.latencyDropPercent) {
                          isJump = true;
                        }
                      }

                      const isExceeded = isGeminiSpike || isBackendSpike || isDrop || isJump;
                      const shouldHighlightRed = thresholdConfig.enableSpikeHighlight && isExceeded;

                      return (
                        <div
                          key={idx}
                          style={shouldHighlightRed ? {
                            backgroundColor: 'rgba(225, 29, 72, 0.35)',
                            borderColor: '#f43f5e',
                            boxShadow: '0 0 16px rgba(225, 29, 72, 0.45)'
                          } : undefined}
                          className={`flex-1 flex flex-col items-center gap-1 group relative transition-all duration-300 ${
                            shouldHighlightRed
                              ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/60 shadow-xl shadow-rose-950/80 rounded-xl px-1 py-1 -my-1 z-20'
                              : 'hover:bg-slate-800/40 rounded-lg p-0.5'
                          }`}
                        >
                          {/* Spike / Drop Warning Badge Above Point (Red Background) */}
                          {shouldHighlightRed && (
                            <div className="absolute -top-6 whitespace-nowrap z-30 flex items-center justify-center animate-bounce">
                              {isGeminiSpike ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-mono font-black rounded bg-rose-600 text-white shadow-md shadow-rose-950">
                                  SPIKE {item.geminiMs}ms
                                </span>
                              ) : isDrop ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-mono font-black rounded bg-rose-600 text-white shadow-md shadow-rose-950">
                                  DROP -{dropPercent}%
                                </span>
                              ) : isJump ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-mono font-black rounded bg-rose-600 text-white shadow-md shadow-rose-950">
                                  JUMP +{jumpPercent}%
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[8px] font-mono font-black rounded bg-rose-600 text-white shadow-md shadow-rose-950">
                                  BACKEND {item.backendMs}ms
                                </span>
                              )}
                            </div>
                          )}

                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-200 pointer-events-none whitespace-nowrap z-40 shadow-xl font-mono">
                            <div className="font-bold font-sans text-slate-100 flex items-center justify-between gap-2 border-b border-slate-800 pb-0.5">
                              <span>Probe {idx + 1} ({item.timestamp})</span>
                              <span className={isExceeded ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                {isExceeded ? '⚠️ THRESHOLD BREACH' : '✓ HEALTHY'}
                              </span>
                            </div>
                            <div className="text-indigo-300">Gemini Latency: {item.geminiMs}ms (Threshold: {thresholdConfig.latencyUpperMs}ms)</div>
                            <div className="text-teal-300">Backend Proxy: {item.backendMs}ms (SLA: {thresholdConfig.backendLatencyMs}ms)</div>
                            {item.payloadKb && (
                              <div className="text-amber-300">Payload Size: {item.payloadKb} KB (Cap: {thresholdConfig.payloadSizeKb} KB)</div>
                            )}
                            {isDrop && <div className="text-rose-400 font-bold">Latency Anomaly Drop: -{dropPercent}% vs prior</div>}
                            {isJump && <div className="text-rose-400 font-bold">Latency Anomaly Jump: +{jumpPercent}% vs prior</div>}
                          </div>

                          {/* Dual Bars */}
                          <div className="w-full flex items-end justify-center gap-1 h-32">
                            {/* Gemini Bar */}
                            <div
                              className={`w-2 sm:w-3 rounded-t transition-all duration-500 hover:brightness-125 ${
                                shouldHighlightRed && isGeminiSpike
                                  ? 'bg-gradient-to-t from-rose-700 to-rose-400 shadow-md shadow-rose-500/40 ring-1 ring-rose-400 animate-pulse'
                                  : shouldHighlightRed
                                    ? 'bg-gradient-to-t from-rose-700 to-rose-400 ring-1 ring-rose-500/50'
                                    : 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                              }`}
                              style={{ height: `${geminiHeight}%` }}
                            />

                            {/* Backend Bar */}
                            <div
                              className={`w-2 sm:w-3 rounded-t transition-all duration-500 hover:brightness-125 ${
                                shouldHighlightRed && isBackendSpike
                                  ? 'bg-gradient-to-t from-rose-700 to-rose-400 shadow-md shadow-rose-500/40 ring-1 ring-rose-400'
                                  : 'bg-gradient-to-t from-teal-600 to-teal-400'
                              }`}
                              style={{ height: `${backendHeight}%` }}
                            />
                          </div>

                          {/* Time label */}
                          <span className={`text-[10px] font-mono truncate max-w-full ${
                            shouldHighlightRed ? 'text-rose-300 font-bold' : 'text-slate-500'
                          }`}>
                            {item.timestamp.split(':').slice(1).join(':')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real-Time Payload Size Timeline Chart Area */}
              {(activeChartTab === 'dual' || activeChartTab === 'payload') && (
                <div className="relative pt-6 pb-2 px-2 border-b border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Payload Envelope Timeline (KB per Health Probe)</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Custom Max Threshold: {thresholdConfig.payloadSizeKb} KB
                    </span>
                  </div>

                  {/* Visual Marker for Payload Size Limit */}
                  {thresholdConfig.enableVisualMarkers && (() => {
                    const maxPayloadScale = Math.max(220, thresholdConfig.payloadSizeKb * 1.3);
                    const payloadMarkerBottom = Math.min(94, Math.max(6, (thresholdConfig.payloadSizeKb / maxPayloadScale) * 100));

                    return (
                      <div
                        className="absolute left-2 right-2 border-t-2 border-dashed border-amber-500/80 pointer-events-none z-10 transition-all duration-300"
                        style={{ bottom: `${payloadMarkerBottom}%` }}
                      >
                        <span className="absolute -top-3 right-0 text-[9px] font-mono font-bold text-amber-300 bg-slate-950/90 border border-amber-500/60 px-1.5 py-0.2 rounded shadow-xs">
                          ⚠️ Max Payload Limit ({thresholdConfig.payloadSizeKb} KB)
                        </span>
                      </div>
                    );
                  })()}

                  {/* Payload Size Bar Chart */}
                  <div className="h-28 flex items-end justify-between gap-1.5 sm:gap-2">
                    {latencyTrend.map((item, idx) => {
                      const maxPayloadScale = Math.max(220, thresholdConfig.payloadSizeKb * 1.3);
                      const payloadKb = item.payloadKb ?? 48;
                      const payloadHeight = Math.min(100, (payloadKb / maxPayloadScale) * 100);
                      const isPayloadBreached = payloadKb >= thresholdConfig.payloadSizeKb;
                      const isPayloadWarn = payloadKb >= thresholdConfig.payloadWarningKb;
                      const shouldHighlightRed = thresholdConfig.enableSpikeHighlight && isPayloadBreached;

                      return (
                        <div
                          key={idx}
                          style={shouldHighlightRed ? {
                            backgroundColor: 'rgba(225, 29, 72, 0.35)',
                            borderColor: '#f43f5e',
                            boxShadow: '0 0 16px rgba(225, 29, 72, 0.45)'
                          } : undefined}
                          className={`flex-1 flex flex-col items-center gap-1 group relative transition-all duration-300 ${
                            shouldHighlightRed
                              ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/60 shadow-xl shadow-rose-950/80 rounded-xl px-1 py-1 -my-1 z-20'
                              : 'hover:bg-slate-800/40 rounded-lg p-0.5'
                          }`}
                        >
                          {/* Oversized Payload Warning Badge (Red Background) */}
                          {shouldHighlightRed && (
                            <div className="absolute -top-5 whitespace-nowrap z-30 animate-bounce">
                              <span className="px-1.5 py-0.5 text-[8px] font-mono font-black rounded bg-rose-600 text-white shadow-md shadow-rose-950">
                                OVERSIZED {payloadKb}KB
                              </span>
                            </div>
                          )}

                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] text-slate-200 pointer-events-none whitespace-nowrap z-30 shadow-xl font-mono">
                            Payload Size: {payloadKb} KB · Limit: {thresholdConfig.payloadSizeKb} KB ({isPayloadBreached ? 'BREACHED' : 'NORMAL'})
                          </div>

                          {/* Payload Bar */}
                          <div className="w-full flex items-end justify-center h-20">
                            <div
                              className={`w-3 sm:w-5 rounded-t transition-all duration-500 hover:brightness-125 ${
                                shouldHighlightRed
                                  ? 'bg-gradient-to-t from-rose-700 to-rose-400 ring-1 ring-rose-400 animate-pulse'
                                  : isPayloadWarn
                                    ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                                    : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                              }`}
                              style={{ height: `${payloadHeight}%` }}
                            />
                          </div>

                          <span className={`text-[9px] font-mono truncate max-w-full ${
                            shouldHighlightRed ? 'text-rose-300 font-bold' : 'text-slate-500'
                          }`}>
                            {payloadKb}k
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Status Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-1 gap-2">
            <div className="flex items-center space-x-3">
              <span>Configured Latency Threshold: <strong className="text-rose-300 font-mono">{thresholdConfig.latencyUpperMs}ms</strong></span>
              <span>Backend SLA: <strong className="text-teal-300 font-mono">{thresholdConfig.backendLatencyMs}ms</strong></span>
              <span>Payload Cap: <strong className="text-amber-300 font-mono">{thresholdConfig.payloadSizeKb} KB</strong></span>
            </div>
            <div className="flex items-center space-x-2 font-mono">
              <span className="text-emerald-400 font-semibold">Gemini 2.5 Flash Production Gateway</span>
            </div>
          </div>
        </div>

        {/* HTTP Status Code Breakdown (1 Column) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>HTTP Status Code Distribution</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Aggregated 24h gateway responses</p>
          </div>

          <div className="space-y-3 my-auto">
            {/* 2xx */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-emerald-400 font-mono">2xx Success (OK / Created)</span>
                <span className="font-mono text-slate-200">{statusCodeDistribution['2xx']} ({((statusCodeDistribution['2xx'] / (statusCodeDistribution['2xx'] + statusCodeDistribution['4xx'] + statusCodeDistribution['5xx'])) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '99.5%' }} />
              </div>
            </div>

            {/* 4xx */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-amber-400 font-mono">4xx Client / Rate-Limit (429)</span>
                <span className="font-mono text-slate-200">{statusCodeDistribution['4xx']} ({((statusCodeDistribution['4xx'] / (statusCodeDistribution['2xx'] + statusCodeDistribution['4xx'] + statusCodeDistribution['5xx'])) * 100).toFixed(2)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '0.4%' }} />
              </div>
            </div>

            {/* 5xx */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-rose-400 font-mono">5xx Upstream Faults (503)</span>
                <span className="font-mono text-slate-200">{statusCodeDistribution['5xx']} (0.10%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '0.1%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Overall Availability:</span>
            <span className="font-bold text-emerald-400 font-mono">99.98% High Availability</span>
          </div>
        </div>
      </div>

      {/* AUTOMATED ENDPOINT 5xx ERROR RATE ALERT SENTINEL (1-Minute Window & 5% Threshold) */}
      <div className={`p-6 rounded-2xl bg-slate-900/90 border space-y-6 transition-all duration-300 shadow-xl ${
        Object.keys(active5xxBreaches).length > 0
          ? 'border-rose-500/80 shadow-rose-950/40 ring-1 ring-rose-500/50'
          : 'border-slate-800'
      }`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Automated Endpoint 5xx Spike Sentinel & Browser Alert System
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                1-Minute Rolling Window
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                &gt; {endpoint5xxConfig.thresholdPercent}% 5xx Trigger
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 border ${
                endpoint5xxConfig.enabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${endpoint5xxConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{endpoint5xxConfig.enabled ? 'Sentinel Armed' : 'Sentinel Paused'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Continuously monitors selected API endpoints across a sliding 1-minute window. Dispatches native desktop browser push notifications and acoustic alarms the moment 5xx upstream errors exceed {endpoint5xxConfig.thresholdPercent}%.
            </p>
          </div>

          {/* Master Enable/Disable & Notification Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateEndpoint5xxConfig({ enabled: !endpoint5xxConfig.enabled })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border cursor-pointer ${
                endpoint5xxConfig.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {endpoint5xxConfig.enabled ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{endpoint5xxConfig.enabled ? 'Automated Sentinel Active' : 'Enable 5xx Sentinel'}</span>
            </button>

            {pushPermission !== 'granted' && (
              <button
                onClick={requestPushPermission}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer animate-pulse"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Desktop Notifications</span>
              </button>
            )}

            <button
              onClick={() => updateEndpoint5xxConfig({ soundAlerts: !endpoint5xxConfig.soundAlerts })}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                endpoint5xxConfig.soundAlerts
                  ? 'bg-slate-800 text-purple-300 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={endpoint5xxConfig.soundAlerts ? 'Acoustic audio alert chime enabled' : 'Acoustic audio alert chime muted'}
            >
              {endpoint5xxConfig.soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ACTIVE 5xx BREACH WARNING BANNER */}
        {Object.keys(active5xxBreaches).length > 0 ? (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/80 shadow-lg shadow-rose-950/50 space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>CRITICAL: 5xx Error Threshold Exceeded on {Object.keys(active5xxBreaches).length} Endpoint(s) (1-Min Window)</span>
              </div>
              <button
                onClick={() => handleResetEndpoint5xx()}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700 cursor-pointer"
              >
                Reset 5xx Metrics
              </button>
            </div>
            <div className="space-y-1.5 pt-1">
              {Object.values(active5xxBreaches).map((breach) => (
                <div key={breach.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-900/40 border border-rose-800/60 text-xs">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-rose-200">{breach.endpoint}</span>
                    <span className="text-rose-400">({breach.serviceName})</span>
                  </div>
                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                    <span className="text-rose-300">
                      5xx Rate: <strong className="text-white text-xs">{breach.errorRate5xx}%</strong> (Threshold: {breach.threshold}%)
                    </span>
                    <span className="text-rose-400">
                      Failed: {breach.error5xxCount} / {breach.totalRequestsInWindow} in 1m window
                    </span>
                    <span className="text-rose-300/80">
                      {new Date(breach.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">
                <strong>Sliding 1-Minute Window Clean:</strong> All monitored endpoints report 5xx error rates comfortably below the {endpoint5xxConfig.thresholdPercent}% threshold.
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              0 Active 5xx Breaches
            </span>
          </div>
        )}

        {/* 3 Status KPI Cards: Monitored Surface, Configured Threshold, Window Velocity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Monitored Endpoints</span>
              <Target className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black font-mono text-white">
              {endpoint5xxConfig.monitoredEndpoints.length} / {endpointDistributionList.length} Active
            </div>
            <div className="text-[10px] text-slate-500">Selective automated alerting enabled</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider">5xx Trigger Threshold</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-black font-mono text-rose-400">
              {endpoint5xxConfig.thresholdPercent}% 5xx Rate
            </div>
            <div className="text-[10px] text-slate-500">Over a 1-minute (60s) sliding window</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Desktop Push Status</span>
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-400">
              {pushPermission === 'granted' ? 'Native Push Active' : 'Permission Pending'}
            </div>
            <div className="text-[10px] text-slate-500">Instant OS banner on 5xx threshold breach</div>
          </div>
        </div>

        {/* Target Endpoints Multi-Select Chips Bar */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Specific API Endpoints for Automated 5xx Alerting:</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <button
                onClick={() => selectAllMonitoredEndpoints(endpointDistributionList.map(e => e.endpoint))}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Select All ({endpointDistributionList.length})
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={clearAllMonitoredEndpoints}
                className="text-slate-400 hover:text-slate-300 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Endpoint Chips */}
          <div className="flex flex-wrap gap-2">
            {endpointDistributionList.map((ep) => {
              const isSelected = endpoint5xxConfig.monitoredEndpoints.includes(ep.endpoint);
              const isBreached = (ep.oneMinute5xxErrorRate ?? 0) >= endpoint5xxConfig.thresholdPercent;
              return (
                <button
                  key={ep.endpoint}
                  onClick={() => toggleMonitoredEndpoint(ep.endpoint)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border flex items-center space-x-2 cursor-pointer ${
                    isBreached
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950/50'
                      : isSelected
                      ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-200 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                  title={`${ep.serviceName} - Current 1m 5xx rate: ${ep.oneMinute5xxErrorRate || 0}%`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    isBreached ? 'bg-rose-400 animate-pulse' : isSelected ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                  <span className="font-bold">{ep.endpoint}</span>
                  <span className="text-[10px] text-slate-400">
                    ({ep.oneMinute5xxErrorRate || 0}% 5xx)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Threshold Configuration & Simulation Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          {/* Threshold Tuning */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">5xx Error Rate Threshold:</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {endpoint5xxConfig.thresholdPercent}% (1-Min Window)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={endpoint5xxConfig.thresholdPercent}
              onChange={(e) => updateEndpoint5xxConfig({ thresholdPercent: parseFloat(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-slate-500">Presets:</span>
              <div className="flex gap-1.5">
                {[3.0, 5.0, 8.0, 10.0].map((presetVal) => (
                  <button
                    key={presetVal}
                    onClick={() => updateEndpoint5xxConfig({ thresholdPercent: presetVal })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                      endpoint5xxConfig.thresholdPercent === presetVal
                        ? 'bg-rose-600 text-white border-rose-500 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {presetVal}% {presetVal === 5.0 ? '(Target)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Action Bench: Endpoint 5xx Spike Simulation */}
          <div className="space-y-3 md:border-l md:border-slate-800 md:pl-4">
            <div className="flex items-center justify-between text-xs">
              <span className="semibold text-slate-300">Test Automated Browser Alert:</span>
              <span className="text-[10px] font-mono text-slate-500">Injects 503 Spike in 1m Window</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSimulateEndpoint}
                onChange={(e) => setSelectedSimulateEndpoint(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 flex-1 cursor-pointer"
              >
                {endpointDistributionList.map((ep) => (
                  <option key={ep.endpoint} value={ep.endpoint}>
                    {ep.endpoint} ({ep.serviceName})
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleSimulateEndpoint5xxBurst(selectedSimulateEndpoint, 2, 10)}
                disabled={!!simulatingEndpoint}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-50 shrink-0"
                title="Send 2x 503 errors on this endpoint within 1-minute window (20% 5xx rate > 5% threshold) to trigger browser notification"
              >
                <Zap className={`w-3.5 h-3.5 ${simulatingEndpoint ? 'animate-spin' : ''}`} />
                <span>{simulatingEndpoint ? 'Injecting Spike...' : 'Simulate 5xx Spike (Trigger Alert)'}</span>
              </button>

              <button
                onClick={() => handleResetEndpoint5xx(selectedSimulateEndpoint)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                title="Reset 5xx samples for this endpoint"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Tests full browser notification pipeline + acoustic alarm + audit logging.</span>
              <button
                onClick={() => handleResetEndpoint5xx()}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Reset All Endpoints
              </button>
            </div>
          </div>
        </div>

        {/* 5xx Incident History Stream Toggle & Table */}
        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowEndpoint5xxHistory(!showEndpoint5xxHistory)}
              className="text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>{showEndpoint5xxHistory ? 'Hide 5xx Alert Incident Stream' : 'View 5xx Alert Incident Stream'}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {endpoint5xxAlertHistory.length} Events
              </span>
              {showEndpoint5xxHistory ? <ChevronRight className="w-3.5 h-3.5 rotate-90 transition-transform" /> : <ChevronRight className="w-3.5 h-3.5 transition-transform" />}
            </button>

            {endpoint5xxAlertHistory.length > 0 && (
              <button
                onClick={handleClearEndpoint5xxHistory}
                className="text-slate-500 hover:text-rose-400 text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear 5xx Log</span>
              </button>
            )}
          </div>

          {showEndpoint5xxHistory && endpoint5xxAlertHistory.length > 0 && (
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {endpoint5xxAlertHistory.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    evt.severity === 'critical'
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : evt.severity === 'recovered'
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                      : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        evt.severity === 'critical'
                          ? 'bg-rose-900/80 text-rose-300 border-rose-700'
                          : evt.severity === 'recovered'
                          ? 'bg-emerald-900/80 text-emerald-300 border-emerald-700'
                          : 'bg-amber-900/80 text-amber-300 border-amber-700'
                      }`}>
                        {evt.severity}
                      </span>
                      <code className="font-mono font-bold text-slate-200">{evt.endpoint}</code>
                      <span className="text-slate-400 text-[11px]">({evt.serviceName})</span>
                    </div>
                    <p className="text-[11px] opacity-90">{evt.details}</p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 font-mono text-[11px]">
                    <span className="font-bold text-rose-300">{evt.errorRate5xx}% 5xx Rate</span>
                    <span className="text-slate-400">Window: {evt.windowDurationSeconds}s</span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2d. AUTOMATED INCIDENT REPORT GENERATOR & POST-MORTEM SENTINEL PANEL     */}
      {/* ========================================================================= */}
      <div className={`p-6 rounded-2xl bg-slate-900/90 border space-y-6 transition-all duration-300 shadow-xl ${
        incidentReports.some(r => r.status === 'ACTIVE')
          ? 'border-rose-500/80 shadow-rose-950/40 ring-1 ring-rose-500/50'
          : 'border-slate-800'
      }`}>
        {/* Panel Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Automated Incident Report Generator & Post-Mortem Sentinel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Auto-Trigger on Spike (&gt; {thresholdConfig.latencyUpperMs}ms)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {incidentReports.length} {incidentReports.length === 1 ? 'Report' : 'Reports'}
              </span>
              {incidentReports.filter(r => r.status === 'ACTIVE').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-600/30 text-rose-200 border border-rose-500/60 animate-pulse flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>{incidentReports.filter(r => r.status === 'ACTIVE').length} Active Incident</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Automatically captures a comprehensive post-mortem snapshot when a latency spike alert is triggered — preserving full dashboard telemetry, active threshold violations, and recent gateway logs.
            </p>
          </div>

          {/* Action Bench: Simulate & Generate */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleSimulateProbeSpike('latency_spike')}
              disabled={isSimulatingSpike || isGeneratingReport}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-50"
              title="Inject a high latency spike probe (> 180ms) and test automated incident report generation"
            >
              <Zap className={`w-3.5 h-3.5 ${isSimulatingSpike ? 'animate-spin' : ''}`} />
              <span>{isSimulatingSpike ? 'Injecting Spike...' : 'Simulate Spike & Auto-Generate'}</span>
            </button>

            <button
              onClick={() => generateIncidentReport({
                triggerReason: `Manual PM Diagnostic Snapshot at ${new Date().toLocaleTimeString()}`,
                observedLatencyMs: metrics?.gemini?.currentLatencyMs || 188,
                thresholdLatencyMs: thresholdConfig.latencyUpperMs,
                severity: (metrics?.gemini?.currentLatencyMs || 188) >= thresholdConfig.latencyUpperMs ? 'CRITICAL' : 'WARNING',
                manual: true
              })}
              disabled={isGeneratingReport}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Capture instantaneous state, violations, and gateway logs right now"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isGeneratingReport ? 'Capturing...' : 'Manual Snapshot'}</span>
            </button>

            {incidentReports.length > 0 && (
              <>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidentReports, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `all_api_incident_reports_${new Date().toISOString().slice(0, 10)}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast('Exported all incident reports as JSON');
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Export all incident reports as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleClearAllReports}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                  title="Clear all incident reports"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={() => setShowIncidentReportsPanel(!showIncidentReportsPanel)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title={showIncidentReportsPanel ? 'Collapse panel' : 'Expand panel'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showIncidentReportsPanel ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showIncidentReportsPanel && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Active Latency Spike Alert Banner */}
            {(() => {
              const activeIncident = incidentReports.find(r => r.status === 'ACTIVE');
              if (!activeIncident) return null;
              const deltaMs = Math.max(0, activeIncident.observedLatencyMs - activeIncident.thresholdLatencyMs);
              const deltaPct = activeIncident.thresholdLatencyMs > 0 ? Math.round((deltaMs / activeIncident.thresholdLatencyMs) * 100) : 0;

              return (
                <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/80 shadow-lg shadow-rose-950/50 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertOctagon className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-rose-200 tracking-wide">
                          ACTIVE LATENCY INCIDENT DETECTED
                        </span>
                        <code className="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[10px] font-mono border border-rose-700 font-bold">
                          {activeIncident.id}
                        </code>
                        <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-900/60 px-1.5 py-0.5 rounded border border-rose-700/80">
                          {activeIncident.observedLatencyMs}ms vs {activeIncident.thresholdLatencyMs}ms limit (+{deltaPct}%)
                        </span>
                      </div>
                      <p className="text-xs text-rose-300/90 mt-1 line-clamp-1">
                        {activeIncident.triggerReason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedIncidentReport(activeIncident);
                        setIncidentNotesDraft(activeIncident.notes || '');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Post-Mortem & Logs</span>
                    </button>
                    <button
                      onClick={() => handleUpdateReportStatus(activeIncident.id, 'INVESTIGATING')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 font-medium">Filter Severity:</span>
                {(['all', 'CRITICAL', 'MAJOR', 'WARNING'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setReportFilterSeverity(sev)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer border ${
                      reportFilterSeverity === sev
                        ? sev === 'CRITICAL'
                          ? 'bg-rose-600 text-white border-rose-500'
                          : sev === 'MAJOR'
                          ? 'bg-amber-600 text-white border-amber-500'
                          : sev === 'WARNING'
                          ? 'bg-yellow-600 text-white border-yellow-500'
                          : 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {sev === 'all' ? 'All Severities' : sev}
                  </button>
                ))}

                <span className="text-slate-500 mx-1">|</span>

                <span className="text-slate-400 font-medium">Status:</span>
                {(['all', 'ACTIVE', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setReportFilterStatus(st)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer border ${
                      reportFilterStatus === st
                        ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All' : st}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Search incident ID, metric..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Reports List */}
            {(() => {
              const filtered = incidentReports.filter(report => {
                if (reportFilterSeverity !== 'all' && report.severity !== reportFilterSeverity) return false;
                if (reportFilterStatus !== 'all' && report.status !== reportFilterStatus) return false;
                if (reportSearchQuery.trim()) {
                  const q = reportSearchQuery.toLowerCase();
                  const matchId = report.id.toLowerCase().includes(q);
                  const matchTitle = report.title.toLowerCase().includes(q);
                  const matchReason = report.triggerReason.toLowerCase().includes(q);
                  if (!matchId && !matchTitle && !matchReason) return false;
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto" />
                    <div className="text-sm font-semibold text-slate-300">No Incidents Matching Filter</div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      All systems operating within defined latency and payload thresholds. Automated post-mortems will appear here instantly if a latency spike occurs.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {filtered.map(report => {
                    const deltaMs = Math.max(0, report.observedLatencyMs - report.thresholdLatencyMs);
                    const deltaPct = report.thresholdLatencyMs > 0 ? Math.round((deltaMs / report.thresholdLatencyMs) * 100) : 0;

                    return (
                      <div
                        key={report.id}
                        className={`p-4 rounded-xl bg-slate-950/80 border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 group ${
                          report.status === 'ACTIVE'
                            ? 'border-rose-500/70 shadow-sm shadow-rose-950/30'
                            : 'border-slate-800'
                        }`}
                      >
                        {/* Left: Incident info & Badges */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Severity Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              report.severity === 'CRITICAL'
                                ? 'bg-rose-900/80 text-rose-300 border-rose-700'
                                : report.severity === 'MAJOR'
                                ? 'bg-amber-900/80 text-amber-300 border-amber-700'
                                : 'bg-yellow-900/80 text-yellow-300 border-yellow-700'
                            }`}>
                              {report.severity}
                            </span>

                            {/* Status Selector */}
                            <select
                              value={report.status}
                              onChange={(e) => handleUpdateReportStatus(report.id, e.target.value as any)}
                              className={`text-[10px] font-mono font-bold uppercase rounded px-2 py-0.5 border cursor-pointer focus:outline-none ${
                                report.status === 'ACTIVE'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : report.status === 'INVESTIGATING'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : report.status === 'MITIGATED'
                                  ? 'bg-purple-950 text-purple-300 border-purple-800'
                                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              <option value="ACTIVE">● ACTIVE</option>
                              <option value="INVESTIGATING">◌ INVESTIGATING</option>
                              <option value="MITIGATED">◍ MITIGATED</option>
                              <option value="RESOLVED">✓ RESOLVED</option>
                            </select>

                            <code className="font-mono font-bold text-slate-200 text-xs">{report.id}</code>
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(report.timestamp).toLocaleTimeString()} ({new Date(report.timestamp).toLocaleDateString()})
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                            {report.title}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                            <span className="text-rose-300 font-bold bg-rose-950/60 border border-rose-900/80 px-1.5 py-0.2 rounded">
                              Observed: {report.observedLatencyMs}ms (Threshold: {report.thresholdLatencyMs}ms · +{deltaPct}%)
                            </span>
                            <span className="text-indigo-300 bg-indigo-950/50 border border-indigo-900/60 px-1.5 py-0.2 rounded">
                              {report.violations.length} Active {report.violations.length === 1 ? 'Violation' : 'Violations'}
                            </span>
                            <span className="text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                              {report.recentLogs.length} Logs Captured
                            </span>
                            {report.notes && (
                              <span className="text-emerald-400 text-[10px] bg-emerald-950/50 border border-emerald-900/60 px-1.5 py-0.2 rounded">
                                Notes Attached
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedIncidentReport(report);
                              setIncidentNotesDraft(report.notes || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1 transition-all shadow-sm cursor-pointer"
                            title="View complete incident diagnostics, dashboard snapshot, and logs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Post-Mortem</span>
                          </button>

                          <button
                            onClick={() => handleCopyMarkdown(report)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                            title="Copy Markdown summary (Slack / Jira formatted)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownloadJson(report)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                            title="Download incident report JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                            title="Delete this incident report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Real-Time Visualization of API Request Distribution by Endpoint & Service */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Real-Time API Request Distribution by Endpoint & Service
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live traffic volume share, request distribution by route, and dynamic success vs. error rates per microservice.
            </p>
          </div>

          {/* Quick Simulation Pulse Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateTrafficPulse('/api/generate', 20, 0.05)}
              disabled={isSimulatingPulse}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-950/40 cursor-pointer disabled:opacity-50"
              title="Simulate a real-time burst of API requests to verify live visualization updates"
            >
              <Zap className={`w-3.5 h-3.5 ${isSimulatingPulse ? 'animate-spin' : ''}`} />
              <span>{isSimulatingPulse ? 'Injecting Traffic...' : 'Send Live Traffic Pulse'}</span>
            </button>
          </div>
        </div>

        {/* Global Aggregate Distribution KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Traffic Volume</span>
            <div className="text-xl font-black font-mono text-white">
              {filteredEndpoints.reduce((sum, item) => sum + item.totalRequests, 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">Across {filteredEndpoints.length} active routes</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Global Success Rate</span>
            <div className="text-xl font-black font-mono text-emerald-400">
              {globalFilteredSuccessRate}%
            </div>
            <div className="text-[10px] text-emerald-500/80">
              {totalFilteredSuccess.toLocaleString()} OK (2xx/3xx)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Global Error Rate</span>
            <div className="text-xl font-black font-mono text-rose-400">
              {globalFilteredErrorRate}%
            </div>
            <div className="text-[10px] text-rose-400/80">
              {totalFilteredErrors} Faults (4xx/5xx)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Average Roundtrip Latency</span>
            <div className="text-xl font-black font-mono text-indigo-300">
              {Math.round(filteredEndpoints.reduce((sum, item) => sum + item.avgLatencyMs, 0) / (filteredEndpoints.length || 1))}ms
            </div>
            <div className="text-[10px] text-slate-500">SLA Budget: &lt; 500ms</div>
          </div>
        </div>

        {/* Visual Segmented Proportional Traffic Bar */}
        <div className="space-y-2 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-indigo-400" />
              <span>Relative Traffic Share Breakdown by Route</span>
            </span>
            <span className="font-mono text-slate-400 text-[11px]">100% Monitored Surface</span>
          </div>

          {/* Segmented Stacked Bar */}
          <div className="w-full h-4 rounded-lg bg-slate-900 overflow-hidden flex shadow-inner">
            {filteredEndpoints.map((item, idx) => {
              const share = ((item.totalRequests / totalFilteredRequests) * 100);
              const palette = [
                'bg-purple-500 hover:bg-purple-400',
                'bg-cyan-500 hover:bg-cyan-400',
                'bg-emerald-500 hover:bg-emerald-400',
                'bg-amber-500 hover:bg-amber-400',
                'bg-blue-500 hover:bg-blue-400',
                'bg-violet-500 hover:bg-violet-400',
                'bg-teal-500 hover:bg-teal-400',
                'bg-rose-500 hover:bg-rose-400',
                'bg-indigo-500 hover:bg-indigo-400',
                'bg-sky-500 hover:bg-sky-400'
              ];
              const color = palette[idx % palette.length];

              return (
                <div
                  key={item.id}
                  style={{ width: `${Math.max(1, share)}%` }}
                  className={`${color} h-full transition-all duration-300 cursor-pointer relative group`}
                  title={`${item.endpoint}: ${item.totalRequests} reqs (${share.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Micro Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] font-mono text-slate-400">
            {filteredEndpoints.slice(0, 6).map((item, idx) => {
              const paletteDots = [
                'bg-purple-400',
                'bg-cyan-400',
                'bg-emerald-400',
                'bg-amber-400',
                'bg-blue-400',
                'bg-violet-400'
              ];
              const dotColor = paletteDots[idx % paletteDots.length];
              return (
                <div key={item.id} className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span className="text-slate-300">{item.endpoint}</span>
                  <span className="text-slate-500">({((item.totalRequests / totalFilteredRequests) * 100).toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Bar: Search, Category Pills, Sort Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                placeholder="Filter by endpoint path or microservice name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
              />
            </div>
            {endpointSearch && (
              <button
                onClick={() => setEndpointSearch('')}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer px-2"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              {['all', 'generation', 'reasoning', 'solver', 'agile', 'database'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEndpointCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                    endpointCategoryFilter === cat
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sort:</span>
              <select
                value={endpointSortBy}
                onChange={(e) => setEndpointSortBy(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs font-medium"
              >
                <option value="requests">Traffic Volume</option>
                <option value="errorRate">Error Rate</option>
                <option value="latency">Roundtrip Latency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Endpoint & Service Health Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEndpoints.map((item) => {
            const isCurrentlyProbing = probingEndpointId === item.id;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3 relative group shadow-sm"
              >
                {/* Header Row: Endpoint + Method + Health Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 truncate">
                    <code className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                      {item.endpoint}
                    </code>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      item.recentStatus === 'healthy'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : item.recentStatus === 'warning'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {item.recentStatus}
                    </span>

                    <button
                      onClick={() => handleProbeSpecificEndpoint(item)}
                      disabled={isCurrentlyProbing}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-400 transition-all border border-slate-800 cursor-pointer disabled:opacity-50"
                      title={`Send test probe to ${item.endpoint}`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${isCurrentlyProbing ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Service Name & Description */}
                <div>
                  <h4 className="text-xs font-bold text-slate-200 truncate">{item.serviceName}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-0.5">
                    <span>Traffic Volume: <strong className="text-slate-200">{item.totalRequests.toLocaleString()} reqs</strong></span>
                    <span>Share: <strong className="text-indigo-400">{((item.totalRequests / totalFilteredRequests) * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>

                {/* VISUAL SUCCESS VS. ERROR RATES PROGRESS BAR */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Success: {item.successRate}% ({item.successCount.toLocaleString()})
                    </span>
                    <span className={`${item.errorCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.errorCount > 0 ? 'bg-rose-400' : 'bg-slate-600'}`} />
                      Errors: {item.errorRate}% ({item.errorCount})
                    </span>
                  </div>

                  {/* Stacked Dual-Tone Progress Bar */}
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex border border-slate-800/80">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${Math.max(1, item.successRate)}%` }}
                      title={`Success: ${item.successRate}%`}
                    />
                    {item.errorCount > 0 && (
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${Math.max(1, item.errorRate)}%` }}
                        title={`Error: ${item.errorRate}%`}
                      />
                    )}
                  </div>
                </div>

                {/* 1-Minute Window 5xx Health Indicator & Actions */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      (item.oneMinute5xxErrorRate ?? 0) >= endpoint5xxConfig.thresholdPercent
                        ? 'bg-rose-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`} />
                    <span className="text-slate-400">1m 5xx:</span>
                    <span className={`font-bold ${
                      (item.oneMinute5xxErrorRate ?? 0) >= endpoint5xxConfig.thresholdPercent
                        ? 'text-rose-400'
                        : 'text-emerald-300'
                    }`}>
                      {item.oneMinute5xxErrorRate ?? 0}%
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      ({item.oneMinute5xxCount || 0}/{item.oneMinuteTotalRequests || 0} reqs)
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => toggleMonitoredEndpoint(item.endpoint)}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium transition-colors cursor-pointer border ${
                        endpoint5xxConfig.monitoredEndpoints.includes(item.endpoint)
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-700/80'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                      title={endpoint5xxConfig.monitoredEndpoints.includes(item.endpoint) ? 'Monitored for automated 5xx browser alerts' : 'Click to monitor for automated 5xx alerts'}
                    >
                      {endpoint5xxConfig.monitoredEndpoints.includes(item.endpoint) ? '● Monitored' : '○ Monitor'}
                    </button>

                    <button
                      onClick={() => handleSimulateEndpoint5xxBurst(item.endpoint, 2, 8)}
                      disabled={simulatingEndpoint === item.endpoint}
                      className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition-all cursor-pointer disabled:opacity-50"
                      title="Inject simulated 503 spike to test 1m automated alert"
                    >
                      {simulatingEndpoint === item.endpoint ? 'Spiking...' : 'Test 5xx Spike'}
                    </button>
                  </div>
                </div>

                {/* Footer Metrics Row: Latency, SLA, and Last Called */}
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span>Avg Latency: <strong className="text-slate-200">{item.avgLatencyMs}ms</strong></span>
                    <span>p95: <strong className="text-slate-300">{item.p95LatencyMs}ms</strong></span>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Updated {new Date(item.lastCalled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Internal Backend Services Health Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Internal PM Backend Microservices Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Health checks across generation engine, copilot, sandbox chaos, sprint velocity, and database sync</p>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            {services.filter(s => s.status === 'operational').length} / {services.length} Services Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-200 text-xs truncate max-w-[200px]">
                  {svc.name}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  svc.status === 'operational'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {svc.status}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {svc.description}
              </p>

              <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <code className="text-indigo-400 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded">{svc.endpoint}</code>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-300">{svc.latencyMs}ms</span>
                  <span className="text-emerald-400">{svc.uptime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Readiness Gate Audit Checklist */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Production Readiness Gate Checklist (8-Point Audit)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated validation criteria required before live production deployment</p>
          </div>
          <div className="text-xs font-semibold text-emerald-400 font-mono">
            {readinessChecks.filter(c => c.passed).length} / {readinessChecks.length} Criteria Passed
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {readinessChecks.map((chk, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                chk.passed
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-amber-950/20 border-amber-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-200 leading-snug">{chk.name}</span>
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <span className="font-mono text-emerald-300">{chk.metric}</span>
                <span className="text-slate-500 font-mono">{chk.threshold}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Model Generation Probe & Real-Time Test Bench */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Live Real-Time Generation Probe & Prompt Playground</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live reasoning queries against the integrated Gemini API to verify latency, token streaming, and response fidelity.
            </p>
          </div>

          <button
            onClick={handleResetQuota}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all"
            title="Reset quota exhaustion lockout"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Quota State</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-400">Quick Test Presets:</span>
          {[
            'Verify PRD Gherkin acceptance criteria syntax and latency SLA',
            'Generate 3 high-impact Fintech user stories with MoSCoW prioritization',
            'Estimate RICE score for Biometric Passkey rollout with 10k users',
            'Stress-test Gemini 3.8 Flash token throughput under 450ms budget'
          ].map((preset, i) => (
            <button
              key={i}
              onClick={() => setTestPrompt(preset)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
            >
              {preset.slice(0, 38)}...
            </button>
          ))}
        </div>

        {/* Prompt Input & Execute */}
        <div className="flex gap-3">
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Type a product management challenge to test live Gemini generation..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
          />
          <button
            onClick={handleTestPrompt}
            disabled={isTestingPrompt || !testPrompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-900/30 cursor-pointer shrink-0"
          >
            <Send className={`w-3.5 h-3.5 ${isTestingPrompt ? 'animate-spin' : ''}`} />
            <span>{isTestingPrompt ? 'Generating...' : 'Test Generation'}</span>
          </button>
        </div>

        {/* Test Result Display */}
        {testPromptResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${testPromptResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="font-bold text-slate-200">
                  {testPromptResult.success ? 'HTTP 200 OK — Model Response Received' : 'Error in Generation'}
                </span>
                <span className="text-slate-500 font-mono">({testPromptResult.model})</span>
              </div>
              <div className="flex items-center space-x-3 font-mono text-[11px]">
                <span className="text-slate-400">Duration: <strong className="text-emerald-400">{testPromptResult.latencyMs}ms</strong></span>
                <span className="text-slate-400">Status: <strong className="text-slate-200">{testPromptResult.statusCode}</strong></span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {testPromptResult.response || testPromptResult.error}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2e. FLOATING ACTIVE INCIDENT TOAST ALERT                                  */}
      {/* ========================================================================= */}
      {activeIncidentToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl shadow-rose-950/80 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    Latency Spike Alert Triggered
                  </span>
                  <code className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-200 border border-rose-800 font-bold">
                    {activeIncidentToast.id}
                  </code>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {activeIncidentToast.observedLatencyMs}ms Roundtrip
                  <span className="text-rose-400 text-xs ml-1 font-mono">
                    (Threshold: {activeIncidentToast.thresholdLatencyMs}ms)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Automated incident report generated with dashboard state snapshot, {activeIncidentToast.violations.length} active violations, and recent gateway logs.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveIncidentToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                setSelectedIncidentReport(activeIncidentToast);
                setIncidentNotesDraft(activeIncidentToast.notes || '');
                setActiveIncidentToast(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Post-Mortem & Logs</span>
            </button>
            <button
              onClick={() => setActiveIncidentToast(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2f. DETAILED INCIDENT REPORT INSPECTOR MODAL & POST-MORTEM VIEWER        */}
      {/* ========================================================================= */}
      {selectedIncidentReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      selectedIncidentReport.severity === 'CRITICAL'
                        ? 'bg-rose-900/80 text-rose-300 border-rose-700'
                        : selectedIncidentReport.severity === 'MAJOR'
                        ? 'bg-amber-900/80 text-amber-300 border-amber-700'
                        : 'bg-yellow-900/80 text-yellow-300 border-yellow-700'
                    }`}>
                      {selectedIncidentReport.severity}
                    </span>

                    <code className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {selectedIncidentReport.id}
                    </code>

                    <select
                      value={selectedIncidentReport.status}
                      onChange={(e) => handleUpdateReportStatus(selectedIncidentReport.id, e.target.value as any)}
                      className={`text-xs font-mono font-bold uppercase rounded px-2.5 py-0.5 border cursor-pointer focus:outline-none ${
                        selectedIncidentReport.status === 'ACTIVE'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : selectedIncidentReport.status === 'INVESTIGATING'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : selectedIncidentReport.status === 'MITIGATED'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      <option value="ACTIVE">● STATUS: ACTIVE</option>
                      <option value="INVESTIGATING">◌ STATUS: INVESTIGATING</option>
                      <option value="MITIGATED">◍ STATUS: MITIGATED</option>
                      <option value="RESOLVED">✓ STATUS: RESOLVED</option>
                    </select>

                    <span className="text-xs font-mono text-slate-400">
                      Captured: {new Date(selectedIncidentReport.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">
                    {selectedIncidentReport.title}
                  </h3>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyMarkdown(selectedIncidentReport)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Copy markdown post-mortem for Slack or Jira"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{copiedReportId === selectedIncidentReport.id ? 'Copied!' : 'Copy Markdown'}</span>
                </button>

                <button
                  onClick={() => handleDownloadJson(selectedIncidentReport)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Download report JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDownloadMarkdown(selectedIncidentReport)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Download report Markdown (.md)"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSelectedIncidentReport(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Top KPI Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Observed Probe Latency</div>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  {selectedIncidentReport.observedLatencyMs}ms
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Threshold: {selectedIncidentReport.thresholdLatencyMs}ms
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Total Roundtrip</div>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                  {selectedIncidentReport.capturedState.totalLatencyMs}ms
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Backend: {selectedIncidentReport.capturedState.backendLatencyMs}ms
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">System Readiness Score</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {selectedIncidentReport.capturedState.productionReadinessScore} / 100
                </div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  Status: {selectedIncidentReport.capturedState.systemStatus}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Active Violations</div>
                <div className="text-lg font-bold font-mono text-rose-300 mt-0.5">
                  {selectedIncidentReport.violations.length} Breached
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {selectedIncidentReport.recentLogs.length} Gateway Logs
                </div>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveReportTab('violations')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  activeReportTab === 'violations'
                    ? 'border-rose-500 text-rose-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Active Violations ({selectedIncidentReport.violations.length})</span>
              </button>

              <button
                onClick={() => setActiveReportTab('state')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  activeReportTab === 'state'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Captured Dashboard State</span>
              </button>

              <button
                onClick={() => setActiveReportTab('logs')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  activeReportTab === 'logs'
                    ? 'border-teal-500 text-teal-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Recent Gateway Logs ({selectedIncidentReport.recentLogs.length})</span>
              </button>

              <button
                onClick={() => setActiveReportTab('playbook')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  activeReportTab === 'playbook'
                    ? 'border-amber-500 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Root Cause & Playbook</span>
              </button>

              <button
                onClick={() => setActiveReportTab('notes')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  activeReportTab === 'notes'
                    ? 'border-emerald-500 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PM Notes {selectedIncidentReport.notes ? '✓' : ''}</span>
              </button>
            </div>

            {/* Modal Body Tab Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* TAB 1: ACTIVE VIOLATIONS */}
              {activeReportTab === 'violations' && (
                <div className="space-y-3">
                  <div className="text-slate-300 font-bold flex items-center justify-between">
                    <span>Threshold Violations Detected at Spike Instant</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Evaluated against active SLA configurations
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedIncidentReport.violations.map((violation, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                              violation.severity === 'critical'
                                ? 'bg-rose-900/80 text-rose-300 border-rose-700'
                                : 'bg-amber-900/80 text-amber-300 border-amber-700'
                            }`}>
                              {violation.status}
                            </span>
                            <span className="font-bold text-slate-200 text-xs">
                              {violation.metricName}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 font-mono text-xs">
                            <span className="text-slate-400">Threshold:</span>
                            <span className="text-slate-300 font-semibold">{violation.configuredThreshold}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-rose-400 font-bold">{violation.observedValue}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                              {violation.delta}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-300">Trigger Mechanism:</div>
                    <p>{selectedIncidentReport.triggerReason}</p>
                  </div>
                </div>
              )}

              {/* TAB 2: CAPTURED DASHBOARD STATE */}
              {activeReportTab === 'state' && (
                <div className="space-y-4">
                  <div className="text-slate-300 font-bold">
                    System State Snapshot Captured at Incident Timestamp
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Gemini Model & Tier</div>
                      <div className="text-sm font-bold text-slate-200 font-mono">
                        {selectedIncidentReport.capturedState.geminiModel}
                      </div>
                      <div className="text-[11px] text-emerald-400">Production High-Speed Cluster</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Payload Size Envelope</div>
                      <div className="text-sm font-bold text-amber-300 font-mono">
                        {selectedIncidentReport.capturedState.payloadKb ?? 48.5} KB
                      </div>
                      <div className="text-[11px] text-slate-500">Envelope Cap: {thresholdConfig.payloadSizeKb} KB</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Gateway Status Codes</div>
                      <div className="text-sm font-bold text-slate-200 font-mono flex items-center space-x-2">
                        <span className="text-emerald-400">{selectedIncidentReport.capturedState.statusCodeDistribution['2xx']} 2xx</span>
                        <span>·</span>
                        <span className="text-amber-400">{selectedIncidentReport.capturedState.statusCodeDistribution['4xx']} 4xx</span>
                        <span>·</span>
                        <span className="text-rose-400">{selectedIncidentReport.capturedState.statusCodeDistribution['5xx']} 5xx</span>
                      </div>
                      <div className="text-[11px] text-slate-500">99.98% High Availability Ratio</div>
                    </div>
                  </div>

                  {/* Microservices Snapshot Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Monitored Service Latency Snapshot:</div>
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="p-2.5">Service Name</th>
                            <th className="p-2.5">Route</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Latency</th>
                            <th className="p-2.5">Uptime</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedIncidentReport.capturedState.servicesSnapshot.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-slate-200">{s.name}</td>
                              <td className="p-2.5 text-slate-400">{s.endpoint}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  s.status === 'operational'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-slate-200">{s.latencyMs}ms</td>
                              <td className="p-2.5 text-slate-400">{s.uptime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CAPTURED LOGS */}
              {activeReportTab === 'logs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>Captured Diagnostic & Gateway Request Logs ({selectedIncidentReport.recentLogs.length} events)</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Synchronously snapshotted at breach instant
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 font-mono">
                    {selectedIncidentReport.recentLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              log.status === 'ERROR'
                                ? 'bg-rose-900/80 text-rose-200'
                                : log.status === 'WARNING'
                                ? 'bg-amber-900/80 text-amber-200'
                                : 'bg-emerald-900/80 text-emerald-200'
                            }`}>
                              {log.status || 'INFO'}
                            </span>
                            <span className="font-bold text-slate-200">{log.action}</span>
                            <span className="text-slate-500 text-[10px]">({log.user})</span>
                          </div>
                          <div className="text-slate-400 text-[11px]">{log.details}</div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 text-[11px] text-slate-500">
                          {log.latencyMs !== undefined && (
                            <span className="text-indigo-300 font-bold">{log.latencyMs}ms</span>
                          )}
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: ROOT CAUSE & PLAYBOOK */}
              {activeReportTab === 'playbook' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Executive Root-Cause Diagnostic Assessment</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedIncidentReport.rootCauseAnalysis.summary}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">Probable Root Cause:</span>
                        <p className="text-slate-200 mt-0.5 font-mono text-[11px]">
                          {selectedIncidentReport.rootCauseAnalysis.probableCause}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Impact Assessment:</span>
                        <p className="text-amber-300 mt-0.5 font-mono text-[11px]">
                          {selectedIncidentReport.rootCauseAnalysis.impactLevel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Remediation Checklist */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span>Actionable SRE & PM Mitigation Playbook</span>
                      <span className="text-[11px] text-slate-500">
                        Check off completed investigation steps
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedIncidentReport.rootCauseAnalysis.remediationSteps.map((step, idx) => {
                        const checkKey = `${selectedIncidentReport.id}_step_${idx}`;
                        const isDone = checklistCompleted[checkKey];

                        return (
                          <div
                            key={idx}
                            onClick={() => setChecklistCompleted(prev => ({ ...prev, [checkKey]: !prev[checkKey] }))}
                            className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                              isDone
                                ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300 line-through opacity-80'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!isDone}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 cursor-pointer"
                            />
                            <span className="text-xs font-mono">{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PM NOTES */}
              {activeReportTab === 'notes' && (
                <div className="space-y-3">
                  <div className="text-slate-300 font-bold">
                    On-Call PM & Engineering Incident Notes
                  </div>
                  <p className="text-slate-400 text-xs">
                    Record your post-mortem findings, mitigation steps taken, and communications to stakeholders. These notes persist with this incident record and export with Markdown.
                  </p>

                  <textarea
                    value={incidentNotesDraft}
                    onChange={(e) => setIncidentNotesDraft(e.target.value)}
                    placeholder="Enter post-mortem notes, root cause confirmation, or Jira ticket references..."
                    className="w-full h-36 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleSaveReportNotes(selectedIncidentReport.id, incidentNotesDraft)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Notes to Incident</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 font-mono">
                Generated By: <strong className="text-slate-400">{selectedIncidentReport.generatedBy}</strong>
              </div>

              <div className="flex items-center gap-2">
                {selectedIncidentReport.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => handleUpdateReportStatus(selectedIncidentReport.id, 'RESOLVED')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Resolved</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateReportStatus(selectedIncidentReport.id, 'ACTIVE')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Reopen Incident
                  </button>
                )}

                <button
                  onClick={() => handleCopyMarkdown(selectedIncidentReport)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedReportId === selectedIncidentReport.id ? 'Copied' : 'Copy Slack/Jira Post-Mortem'}</span>
                </button>

                <button
                  onClick={() => setSelectedIncidentReport(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
