import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Key,
  ShieldCheck,
  Send,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Plus,
  Activity,
  Layers,
  Code2,
  FileJson,
  Lock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Server,
  Zap,
  ArrowRight,
  ExternalLink,
  Cpu,
  History,
  Search,
  Eye,
  RefreshCcw,
  Filter,
  Radio,
  Gauge,
  Sliders,
  Timer,
  Flame,
  BarChart3,
  ShieldAlert,
  ArrowUpRight,
  Play
} from 'lucide-react';
import {
  ApiKey,
  ApiEndpointSpec,
  ApiExecutionResult,
  ApiGatewayTelemetry,
  ApiScope,
  ApiEnvironment,
  ApiRequestAuditLogEntry,
  ApiAuditLogsStats,
  AiServiceQuota,
  AiGatewayRateLimiterOverview
} from '../types.js';
import { apiClient } from '../services/apiClient.js';
import { clientRateLimiter } from '../services/clientRateLimiter.js';
import { ApiHealthDashboard } from './ApiHealthDashboard.js';
import { ClientSideRateLimiterPanel } from './ClientSideRateLimiterPanel.js';

// Predefined OpenAPI-grade endpoint specifications
const ENDPOINT_SPECS: ApiEndpointSpec[] = [
  {
    id: 'ep_generate',
    method: 'POST',
    path: '/api/generate',
    category: 'Generation Engine',
    title: 'Autonomous PM Generation Engine',
    description: 'Generates structured, schema-compliant PM artifacts (PRD, Stories, Roadmaps, Personas, Architecture) using the Gemini 2.5 multi-model cascade with automated Zod repair.',
    requiredScopes: ['generate:execute', 'artifacts:write'],
    rateLimit: '60 req/min',
    defaultRequestBody: JSON.stringify({
      productId: 'prod_banking',
      taskType: 'PRD',
      customPrompt: 'Generate an executive Product Requirement Document with compliance SLAs.',
      schemaVersion: 2
    }, null, 2),
    responseSample: {
      success: true,
      artifact: {
        id: 'art_prd_gen_991',
        taskType: 'PRD',
        version: 1,
        schemaVersion: 2,
        status: 'DRAFT',
        schemaData: {
          title: 'Executive Treasury Orchestration Engine',
          objective: 'Automate multi-entity overnight cash sweeping and yield maximization.'
        }
      },
      validationAttempts: 1,
      repaired: false
    },
    curlExample: `curl -X POST https://api.productpilot.internal/api/generate \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9" \\
  -H "Content-Type: application/json" \\
  -d '{"productId":"prod_banking","taskType":"PRD","schemaVersion":2}'`
  },
  {
    id: 'ep_schemas_validate',
    method: 'POST',
    path: '/api/schemas/validate',
    category: 'Zod Schemas & Migration',
    title: 'Dual-Pass Schema Validator & Auto-Migrator',
    description: 'Validates raw artifact JSON payloads against versioned Zod schemas. Automatically detects legacy v1 structures and backfills missing fields to conform to modern v2 specifications.',
    requiredScopes: ['schemas:validate'],
    rateLimit: '300 req/min',
    defaultRequestBody: JSON.stringify({
      taskType: 'PRD',
      schemaVersion: 1,
      autoMigrate: true,
      data: {
        title: 'Legacy Mobile Banking Spec',
        objective: 'Build modern mobile banking app for SME customers',
        functionalRequirements: [
          { id: 'FR-01', description: 'Enable biometric login for mobile users' }
        ]
      }
    }, null, 2),
    responseSample: {
      success: true,
      detectedVersion: 1,
      targetVersion: 2,
      migrated: true,
      data: {
        schemaVersion: 2,
        title: 'Legacy Mobile Banking Spec',
        objective: 'Build modern mobile banking app for SME customers to achieve measurable platform operational efficiency.',
        problemStatement: 'Legacy baseline: Automated backfill for system integrity.',
        functionalRequirements: [
          { id: 'FR-01', description: 'Enable biometric login for mobile users with enterprise security controls.', priority: 'P1' }
        ]
      }
    },
    curlExample: `curl -X POST https://api.productpilot.internal/api/schemas/validate \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9" \\
  -H "Content-Type: application/json" \\
  -d '{"taskType":"PRD","autoMigrate":true,"data":{"title":"Mobile App","objective":"Valid Objective..."}}'`
  },
  {
    id: 'ep_schemas_versions',
    method: 'GET',
    path: '/api/schemas/versions',
    category: 'Zod Schemas & Migration',
    title: 'Schema Version Registry & Deltas',
    description: 'Retrieves all registered schema versions, contract changelogs, breaking differences, and metadata across all 19 PM artifact archetypes.',
    requiredScopes: ['artifacts:read'],
    rateLimit: '600 req/min',
    responseSample: {
      success: true,
      currentDefaultVersion: 2,
      supportedVersions: [1, 2],
      schemas: [
        {
          taskType: 'PRD',
          latestVersion: 2,
          versions: [
            { version: 1, name: 'v1.0 Baseline Specification', breakingChanges: [] },
            { version: 2, name: 'v2.0 Rigorous Engineering Specification', breakingChanges: ['Requires problemStatement min 20 chars', 'Requires functionalRequirements priority'] }
          ]
        }
      ]
    },
    curlExample: `curl -X GET https://api.productpilot.internal/api/schemas/versions \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9"`
  },
  {
    id: 'ep_products',
    method: 'GET',
    path: '/api/products',
    category: 'Workspaces & Products',
    title: 'Workspace Product Portfolio',
    description: 'Lists all registered product workspaces, counts of associated artifacts, customer personas, problem statements, and active sprint backlogs.',
    requiredScopes: ['artifacts:read'],
    rateLimit: '300 req/min',
    responseSample: {
      products: [
        {
          id: 'prod_banking',
          name: 'AI Banking App',
          vision: 'Autonomous corporate treasury management and real-time biometric KYC verification.',
          problemCount: 3,
          personaCount: 4,
          featureCount: 8,
          docCount: 2
        }
      ]
    },
    curlExample: `curl -X GET https://api.productpilot.internal/api/products \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9"`
  },
  {
    id: 'ep_comments_get',
    method: 'GET',
    path: '/api/artifacts/art_prd_banking/comments',
    category: 'Discussions & Collaboration',
    title: 'Artifact Requirement Comment Threads',
    description: 'Fetches threaded discussions, stakeholder feedback, and emoji reactions attached to a specific artifact or individual functional requirement anchor.',
    requiredScopes: ['artifacts:read'],
    rateLimit: '300 req/min',
    parameters: [
      { name: 'requirementId', in: 'query', type: 'string', required: false, description: 'Optional requirement anchor ID (e.g., FR-101, US-101)' }
    ],
    responseSample: {
      success: true,
      artifactId: 'art_prd_banking',
      requirementId: null,
      totalCount: 4,
      openCount: 2,
      resolvedCount: 2,
      comments: [
        {
          id: 'cmt_prd_101',
          requirementId: 'FR-101',
          author: { name: 'Marcus Chen', role: 'Staff Backend Architect' },
          content: 'Have we finalized the retry backoff policy for SWIFT network timeouts?',
          status: 'RESOLVED',
          tag: 'Architecture'
        }
      ]
    },
    curlExample: `curl -X GET "https://api.productpilot.internal/api/artifacts/art_prd_banking/comments?requirementId=FR-101" \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9"`
  },
  {
    id: 'ep_comments_post',
    method: 'POST',
    path: '/api/artifacts/art_prd_banking/comments',
    category: 'Discussions & Collaboration',
    title: 'Create Requirement Discussion Thread',
    description: 'Initiates a new discussion thread anchored to an exact requirement ID with categorized architectural tags and persona attribution.',
    requiredScopes: ['comments:manage'],
    rateLimit: '120 req/min',
    defaultRequestBody: JSON.stringify({
      content: 'Confirming if Redis cluster shard replication handles automated sweep failover under 500ms.',
      author: {
        name: 'Alex Rivera',
        role: 'Lead Product Manager',
        avatarBg: 'bg-emerald-600'
      },
      targetType: 'REQUIREMENT',
      requirementId: 'FR-102',
      requirementTitle: 'FR-102: Automated Daily Sweep Rules Engine',
      tag: 'Architecture'
    }, null, 2),
    responseSample: {
      success: true,
      comment: {
        id: 'cmt_new_482',
        artifactId: 'art_prd_banking',
        status: 'OPEN',
        createdAt: '2026-10-07T16:30:00.000Z'
      }
    },
    curlExample: `curl -X POST https://api.productpilot.internal/api/artifacts/art_prd_banking/comments \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Sweep discussion...","author":{"name":"Alex Rivera","role":"Lead PM"},"requirementId":"FR-102"}'`
  },
  {
    id: 'ep_approve',
    method: 'POST',
    path: '/api/artifacts/art_prd_banking/approve',
    category: 'Governance & Approvals',
    title: 'Promote Specification Approval Gate',
    description: 'Human-in-the-loop product governance gate. Transitions artifact status from DRAFT or REVIEW to OFFICIAL specification, locking version and auditing approval.',
    requiredScopes: ['artifacts:write'],
    rateLimit: '60 req/min',
    defaultRequestBody: JSON.stringify({
      userId: 'Lead Product Manager'
    }, null, 2),
    responseSample: {
      success: true,
      artifact: {
        id: 'art_prd_banking',
        status: 'OFFICIAL',
        version: 2
      },
      auditLog: {
        action: 'APPROVED',
        userId: 'Lead Product Manager',
        timestamp: '2026-10-07T16:35:00.000Z'
      }
    },
    curlExample: `curl -X POST https://api.productpilot.internal/api/artifacts/art_prd_banking/approve \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9" \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"Lead Product Manager"}'`
  },
  {
    id: 'ep_telemetry',
    method: 'GET',
    path: '/api/telemetry',
    category: 'Developer Keys & Telemetry',
    title: 'Autonomous Engine Telemetry Observatory',
    description: 'Provides real-time validation metrics, P50 and P95 latency distributions, dual-pass repair rates, and token budget consumption.',
    requiredScopes: ['audit:read'],
    rateLimit: '300 req/min',
    responseSample: {
      p50LatencyMs: 38,
      p95LatencyMs: 94,
      totalGenerations: 24,
      validationFailureRate: 0.0,
      repairSuccessRate: 100.0,
      tokenBudgetLimit: 50000,
      tokenBudgetUsed: 41000
    },
    curlExample: `curl -X GET https://api.productpilot.internal/api/telemetry \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9"`
  },
  {
    id: 'ep_api_keys',
    method: 'GET',
    path: '/api/api-keys',
    category: 'Developer Keys & Telemetry',
    title: 'Developer API Keys Registry',
    description: 'Lists all issued cryptographic API keys with masked prefixes, assigned security scopes, rate limits, and usage metrics.',
    requiredScopes: ['admin:all'],
    rateLimit: '120 req/min',
    responseSample: {
      success: true,
      apiKeys: [
        {
          id: 'key_prod_01',
          name: 'Production CI/CD Release Pipeline',
          prefix: 'sk_live_prodpilot_88a9',
          environment: 'production',
          scopes: ['artifacts:read', 'artifacts:write', 'generate:execute'],
          rateLimitPerMinute: 300,
          status: 'active',
          requestCount: 1420
        }
      ]
    },
    curlExample: `curl -X GET https://api.productpilot.internal/api/api-keys \\
  -H "Authorization: Bearer sk_live_prodpilot_88a9"`
  }
];

const AVAILABLE_SCOPES: Array<{ scope: ApiScope; label: string; desc: string }> = [
  { scope: 'generate:execute', label: 'generate:execute', desc: 'Trigger autonomous AI artifact generation & repair' },
  { scope: 'artifacts:read', label: 'artifacts:read', desc: 'Read product workspaces, PRDs, and user stories' },
  { scope: 'artifacts:write', label: 'artifacts:write', desc: 'Mutate artifacts, save revisions, and approve specs' },
  { scope: 'comments:manage', label: 'comments:manage', desc: 'Create, reply to, and resolve requirement discussions' },
  { scope: 'schemas:validate', label: 'schemas:validate', desc: 'Run Zod schema validation & auto-migration engine' },
  { scope: 'audit:read', label: 'audit:read', desc: 'Access audit trail, telemetry metrics, and logs' },
  { scope: 'admin:all', label: 'admin:all', desc: 'Full administrative access and key lifecycle rights' }
];

interface ApiGatewayViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const ApiGatewayView: React.FC<ApiGatewayViewProps> = ({ onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'keys' | 'audit-logs' | 'rate-limiter' | 'architecture' | 'health'>('explorer');

  // Rate Limiter & AI Quotas State
  const [rateLimiterOverview, setRateLimiterOverview] = useState<AiGatewayRateLimiterOverview | null>(null);
  const [rateLimiterLoading, setRateLimiterLoading] = useState(false);
  const [rateLimiterSimulating, setRateLimiterSimulating] = useState(false);
  const [selectedServiceForSim, setSelectedServiceForSim] = useState<string>('gemini-2.5-flash');
  const [simTrafficPreset, setSimTrafficPreset] = useState<'normal' | 'burst' | 'heavy' | 'throttle'>('burst');
  const [simResult, setSimResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    retryAfter?: number;
    timestamp: string;
    service?: AiServiceQuota;
    headers: Record<string, string>;
  } | null>(null);
  const [secondsToSlidingReset, setSecondsToSlidingReset] = useState<number>(45);
  const [timeUntilDailyReset, setTimeUntilDailyReset] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 7, minutes: 14, seconds: 22 });

  // Gateway Telemetry
  const [telemetry, setTelemetry] = useState<ApiGatewayTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<ApiEnvironment>('production');
  const [newKeyScopes, setNewKeyScopes] = useState<ApiScope[]>(['artifacts:read', 'generate:execute']);
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState<number>(90);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<number>(300);
  const [createdSecretDialog, setCreatedSecretDialog] = useState<{ key: ApiKey; secretToken: string } | null>(null);

  // Key Verifier Sandbox
  const [testTokenInput, setTestTokenInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; key?: any; reason?: string } | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);

  // Audit Logs & Observability State
  const [auditLogs, setAuditLogs] = useState<ApiRequestAuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<ApiAuditLogsStats | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | '2XX' | '4XX' | '5XX'>('ALL');
  const [logMethodFilter, setLogMethodFilter] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isAutoRefreshLogs, setIsAutoRefreshLogs] = useState(true);
  const [selectedLogDetail, setSelectedLogDetail] = useState<ApiRequestAuditLogEntry | null>(null);

  // Interactive Explorer State
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointSpec>(ENDPOINT_SPECS[0]);
  const [endpointCategoryFilter, setEndpointCategoryFilter] = useState<string>('ALL');
  const [requestPathInput, setRequestPathInput] = useState<string>(ENDPOINT_SPECS[0].path);
  const [requestBodyInput, setRequestBodyInput] = useState<string>(ENDPOINT_SPECS[0].defaultRequestBody || '');
  const [selectedKeyForRequest, setSelectedKeyForRequest] = useState<string>('DEFAULT_SDK');
  const [isExecutingRequest, setIsExecutingRequest] = useState(false);
  const [executionResult, setExecutionResult] = useState<ApiExecutionResult | null>(null);
  const [copiedCodeType, setCopiedCodeType] = useState<string | null>(null);
  const [snippetLanguage, setSnippetLanguage] = useState<'curl' | 'typescript' | 'python'>('curl');

  // Load audit logs stream
  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await apiClient.getGatewayAuditLogs({
        limit: 100,
        status: logStatusFilter,
        method: logMethodFilter,
        search: logSearchQuery
      });
      setAuditLogs(data.logs || []);
      setAuditStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load rate limiter & AI services quotas
  const loadRateLimiterData = async () => {
    setRateLimiterLoading(true);
    try {
      const data = await apiClient.getGatewayRateLimits();
      setRateLimiterOverview(data);
      if (data && data.upcomingWindowResetSeconds !== undefined) {
        setSecondsToSlidingReset(data.upcomingWindowResetSeconds);
      }
    } catch (err) {
      console.error('Failed to load rate limiter overview', err);
    } finally {
      setRateLimiterLoading(false);
    }
  };

  // Load telemetry and keys
  const loadGatewayData = async () => {
    setTelemetryLoading(true);
    setKeysLoading(true);
    try {
      const [tData, kData] = await Promise.all([
        apiClient.getGatewayHealth(),
        apiClient.getApiKeys()
      ]);
      setTelemetry(tData);
      setApiKeys(kData);
    } catch (err) {
      console.error('Failed to load gateway telemetry or keys', err);
    } finally {
      setTelemetryLoading(false);
      setKeysLoading(false);
    }
  };

  useEffect(() => {
    loadGatewayData();
    loadAuditLogs();
    loadRateLimiterData();
  }, []);

  // Live ticking countdown for 60s sliding window & daily midnight UTC reset
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Sliding window per-second ticker
      setSecondsToSlidingReset(prev => {
        if (prev <= 1) {
          loadRateLimiterData();
          return 60;
        }
        return prev - 1;
      });

      // 2. Daily midnight UTC ticker
      const now = new Date();
      const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = Math.max(0, nextUtcMidnight.getTime() - now.getTime());
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      setTimeUntilDailyReset({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [logStatusFilter, logMethodFilter, logSearchQuery]);

  // Periodic polling for real-time observability stream
  useEffect(() => {
    if (!isAutoRefreshLogs) return;
    const interval = setInterval(() => {
      loadAuditLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoRefreshLogs, logStatusFilter, logMethodFilter, logSearchQuery]);

  // Sync selected endpoint form inputs
  useEffect(() => {
    setRequestPathInput(selectedEndpoint.path);
    setRequestBodyInput(selectedEndpoint.defaultRequestBody || '');
    setExecutionResult(null);
  }, [selectedEndpoint]);

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    if (endpointCategoryFilter === 'ALL') return ENDPOINT_SPECS;
    return ENDPOINT_SPECS.filter(e => e.category === endpointCategoryFilter);
  }, [endpointCategoryFilter]);

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(ENDPOINT_SPECS.map(e => e.category)))];
  }, []);

  // Execute Request in Console
  const handleExecuteRequest = async () => {
    setIsExecutingRequest(true);
    try {
      let customHeaders: Record<string, string> = {};
      if (selectedKeyForRequest !== 'NONE') {
        const foundKey = apiKeys.find(k => k.id === selectedKeyForRequest);
        if (foundKey) {
          customHeaders['Authorization'] = `Bearer ${foundKey.hashedToken || foundKey.prefix}`;
        } else if (selectedKeyForRequest === 'DEFAULT_SDK') {
          customHeaders['Authorization'] = 'Bearer sk_live_prodpilot_88a9';
        }
      }

      let parsedBody: any = undefined;
      if (selectedEndpoint.method !== 'GET' && requestBodyInput.trim()) {
        try {
          parsedBody = JSON.parse(requestBodyInput);
        } catch {
          parsedBody = requestBodyInput;
        }
      }

      const result = await apiClient.executeRaw(
        selectedEndpoint.method,
        requestPathInput,
        parsedBody,
        customHeaders
      );

      setExecutionResult(result);
      // Refresh telemetry stats and audit log stream after live execution
      apiClient.getGatewayHealth().then(setTelemetry).catch(() => {});
      loadAuditLogs();
    } catch (err: any) {
      setExecutionResult({
        statusCode: 500,
        statusText: 'Internal Error',
        latencyMs: 12,
        headers: {},
        data: { error: err.message || 'Execution error' },
        timestamp: new Date().toISOString()
      });
      loadAuditLogs();
    } finally {
      setIsExecutingRequest(false);
    }
  };

  // Clear Audit Logs Handler
  const handleClearAuditLogs = async () => {
    if (!confirm('Clear all recorded API request audit attempts?')) return;
    try {
      await apiClient.clearGatewayAuditLogs();
      loadAuditLogs();
    } catch (err) {
      console.error('Failed to clear logs', err);
    }
  };

  // Re-run Request in Console
  const handleRerunInConsole = (log: ApiRequestAuditLogEntry) => {
    const matchingEndpoint = ENDPOINT_SPECS.find(e => e.path === log.path && e.method === log.method) ||
      ENDPOINT_SPECS.find(e => e.path === log.path) ||
      ENDPOINT_SPECS[0];
    setSelectedEndpoint(matchingEndpoint);
    setRequestPathInput(log.path);
    setActiveTab('explorer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Create New API Key Handler
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: newKeyEnv,
          scopes: newKeyScopes,
          expiresInDays: newKeyExpiryDays,
          rateLimitPerMinute: newKeyRateLimit
        })
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys(prev => [data.apiKey, ...prev]);
        setCreatedSecretDialog({
          key: data.apiKey,
          secretToken: data.apiKey.secretToken
        });
        setIsCreateKeyModalOpen(false);
        setNewKeyName('');
        // Refresh telemetry
        loadGatewayData();
      }
    } catch (err) {
      console.error('Failed to create key', err);
    }
  };

  // Revoke Key Handler
  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Systems relying on this key will be denied immediately.')) return;
    try {
      await apiClient.revokeApiKey(id);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
      loadGatewayData();
    } catch (err) {
      console.error('Failed to revoke key', err);
    }
  };

  // Rotate Key Handler
  const handleRotateKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}/rotate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(prev => prev.map(k => k.id === id ? data.apiKey : k));
        setCreatedSecretDialog({
          key: data.apiKey,
          secretToken: data.apiKey.secretToken
        });
        loadGatewayData();
      }
    } catch (err) {
      console.error('Failed to rotate key', err);
    }
  };

  // Test / Verify Key Handler
  const handleVerifyKey = async () => {
    if (!testTokenInput.trim()) return;
    setIsVerifyingKey(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/api-keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: testTokenInput.trim() })
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyResult({ valid: false, reason: err.message || 'Verification connection error' });
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // Rate Limiter Simulator Handler
  const handleExecuteSimulation = async () => {
    setRateLimiterSimulating(true);
    let reqs = 25;
    let tokens = 3500;
    let forceThrottle = false;

    if (simTrafficPreset === 'normal') {
      reqs = 10;
      tokens = 1500;
    } else if (simTrafficPreset === 'burst') {
      reqs = 60;
      tokens = 15000;
    } else if (simTrafficPreset === 'heavy') {
      reqs = 150;
      tokens = 50000;
    } else if (simTrafficPreset === 'throttle') {
      reqs = 200;
      tokens = 80000;
      forceThrottle = true;
    }

    try {
      const res = await apiClient.simulateRateLimitTraffic({
        serviceId: selectedServiceForSim,
        requestsCount: reqs,
        tokensCount: tokens,
        forceThrottle
      });

      const targetService = res.service || res.overview?.services?.find(s => s.serviceId === selectedServiceForSim);
      if (res.overview) {
        setRateLimiterOverview(res.overview);
      }

      const simulatedHeaders: Record<string, string> = {
        'content-type': 'application/json; charset=utf-8',
        'x-ratelimit-tier': 'Enterprise Scale Tier-3',
        'x-ratelimit-limit-rpm': targetService ? targetService.rpmQuota.toString() : '1000',
        'x-ratelimit-remaining-rpm': targetService ? targetService.rpmRemaining.toString() : '0',
        'x-ratelimit-reset-seconds': `${secondsToSlidingReset}s`,
        'x-ratelimit-daily-tokens-remaining': res.overview ? res.overview.totalDailyTokensRemaining.toLocaleString() : '18,580,000'
      };

      if (res.throttled || forceThrottle) {
        simulatedHeaders['retry-after'] = `${res.retryAfter || 15}s`;
      }

      setSimResult({
        success: !res.throttled,
        message: res.message,
        error: res.error,
        retryAfter: res.retryAfter,
        timestamp: new Date().toISOString(),
        service: targetService,
        headers: simulatedHeaders
      });
    } catch (err: any) {
      setSimResult({
        success: false,
        error: err.message || 'Simulation error',
        retryAfter: 15,
        timestamp: new Date().toISOString(),
        headers: {
          'status': '429 Too Many Requests',
          'retry-after': '15s',
          'x-ratelimit-remaining-rpm': '0'
        }
      });
      loadRateLimiterData();
    } finally {
      setRateLimiterSimulating(false);
    }
  };

  const handleQuickTestService = async (serviceId: string, burst: boolean) => {
    setSelectedServiceForSim(serviceId);
    setSimTrafficPreset(burst ? 'throttle' : 'normal');
    try {
      const res = await apiClient.simulateRateLimitTraffic({
        serviceId,
        requestsCount: burst ? 150 : 10,
        tokensCount: burst ? 50000 : 1500,
        forceThrottle: burst
      });
      if (res.overview) {
        setRateLimiterOverview(res.overview);
      }
    } catch (err) {
      console.error('Quick test error', err);
    }
  };

  const handleResetRateLimiter = async () => {
    try {
      const data = await apiClient.resetGatewayRateLimits();
      setRateLimiterOverview(data);
      setSimResult(null);
    } catch (err) {
      console.error('Failed to reset rate limits', err);
    }
  };

  // Generate dynamic code snippet
  const activeSnippet = useMemo(() => {
    const bearer = selectedKeyForRequest === 'NONE'
      ? 'YOUR_API_KEY'
      : (apiKeys.find(k => k.id === selectedKeyForRequest)?.hashedToken || 'sk_live_prodpilot_88a9');

    const cleanBody = selectedEndpoint.method !== 'GET' && requestBodyInput.trim()
      ? requestBodyInput
      : null;

    if (snippetLanguage === 'curl') {
      let cmd = `curl -X ${selectedEndpoint.method} "https://api.productpilot.internal${requestPathInput}" \\\n  -H "Authorization: Bearer ${bearer}" \\\n  -H "Content-Type: application/json"`;
      if (cleanBody) {
        cmd += ` \\\n  -d '${cleanBody.replace(/\n\s*/g, ' ')}'`;
      }
      return cmd;
    }

    if (snippetLanguage === 'typescript') {
      return `import { apiClient } from '@productpilot/sdk';\n\n// Initialize with high-assurance developer key\napiClient.setApiKey('${bearer}');\n\nconst response = await fetch('https://api.productpilot.internal${requestPathInput}', {\n  method: '${selectedEndpoint.method}',\n  headers: {\n    'Authorization': 'Bearer ${bearer}',\n    'Content-Type': 'application/json'\n  }${cleanBody ? `,\n  body: JSON.stringify(${cleanBody})` : ''}\n});\n\nconst result = await response.json();\nconsole.log('API Result:', result);`;
    }

    if (snippetLanguage === 'python') {
      return `import requests\n\nurl = "https://api.productpilot.internal${requestPathInput}"\nheaders = {\n    "Authorization": "Bearer ${bearer}",\n    "Content-Type": "application/json"\n}\n${cleanBody ? `payload = ${cleanBody}\nresponse = requests.${selectedEndpoint.method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers)`}\n\nprint(response.status_code, response.json())`;
    }

    return '';
  }, [selectedEndpoint, requestPathInput, requestBodyInput, selectedKeyForRequest, apiKeys, snippetLanguage]);

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Developer API Gateway & Architecture</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-semibold uppercase tracking-wider">
                  v2 REST + Zod
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Type-safe API contracts, interactive request sandbox, cryptographic API key issuance, and server-side Gemini 2.5 cascade proxy architecture.
              </p>
            </div>
          </div>
        </div>

        {/* Live SLA & Gateway Status Ribbon */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Gateway:</span>
            <span className="font-semibold text-emerald-300">
              {telemetry?.status === 'operational' ? 'Operational' : 'Online'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-300">{telemetry?.uptimePercentage || 99.98}% SLA</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-sm font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">P50:</span>
            <span className="text-amber-300 font-semibold">{telemetry?.p50LatencyMs || 38}ms</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">P95:</span>
            <span className="text-indigo-300 font-semibold">{telemetry?.p95LatencyMs || 94}ms</span>
          </div>

          {/* Quick Rate Limiter / Token Quota Status Ribbon */}
          <button
            onClick={() => setActiveTab('rate-limiter')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-xs shadow-sm font-mono transition-colors cursor-pointer group"
            title="Inspect visual AI Rate Limiter & Token Quota status"
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
            <span className="text-slate-400">AI Tokens Rem:</span>
            <span className="text-indigo-300 font-semibold">
              {rateLimiterOverview ? `${(rateLimiterOverview.totalDailyTokensRemaining / 1000000).toFixed(1)}M` : '18.6M'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Reset:</span>
            <span className="text-amber-300 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
              {secondsToSlidingReset}s
            </span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <div className="flex space-x-1">
          {[
            { id: 'explorer', label: 'Interactive API Console', icon: Code2, count: ENDPOINT_SPECS.length },
            { id: 'health', label: 'API Health Dashboard', icon: Activity, count: '99.4%' },
            { id: 'keys', label: 'API Keys & Access Control', icon: Key, count: apiKeys.length },
            { id: 'audit-logs', label: 'Request Audit Log', icon: History, count: auditLogs.length },
            { id: 'rate-limiter', label: 'Rate Limiter & AI Quotas', icon: Gauge, count: rateLimiterOverview?.services.length || 5 },
            { id: 'architecture', label: 'Security & System Architecture', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-indigo-900/80 text-indigo-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-3 pr-2">
          <button
            type="button"
            onClick={() => setActiveTab('rate-limiter')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-[10px] text-slate-300 transition-colors cursor-pointer"
            title="Configure Client-Side Sandbox Rate Limiter"
          >
            <Gauge className="w-3 h-3 text-indigo-400" />
            <span>Sandbox Guard: <strong className="text-indigo-300">{clientRateLimiter.getConfig().enabled ? `${clientRateLimiter.getConfig().maxRpm} RPM` : 'Off'}</strong></span>
          </button>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Server-Side Proxy Active</span>
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE API CONSOLE */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Endpoints Catalog (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  API Endpoints Catalog
                </span>
                <span className="text-[10px] text-slate-500 font-mono">100% Typed</span>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1 pt-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setEndpointCategoryFilter(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      endpointCategoryFilter === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Endpoints */}
            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredEndpoints.map((ep) => {
                const isSelected = selectedEndpoint.id === ep.id;
                const methodColors: Record<string, string> = {
                  GET: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
                  POST: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
                  PATCH: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
                  DELETE: 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                };

                return (
                  <button
                    key={ep.id}
                    onClick={() => setSelectedEndpoint(ep)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-950/50'
                        : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${methodColors[ep.method]}`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                          {ep.path}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {ep.rateLimit}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">
                      {ep.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Execution Sandbox & Documentation (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Endpoint Header Spec Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      selectedEndpoint.method === 'GET' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                      selectedEndpoint.method === 'POST' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                      selectedEndpoint.method === 'PATCH' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                      'bg-rose-950 text-rose-300 border-rose-800'
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <h2 className="text-base font-bold text-slate-100">{selectedEndpoint.title}</h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedEndpoint.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Category: {selectedEndpoint.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800">
                    Rate: {selectedEndpoint.rateLimit}
                  </span>
                </div>
              </div>

              {/* Scopes required tags */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400 flex items-center gap-1 shrink-0 text-[11px]">
                  <Lock className="w-3 h-3 text-indigo-400" />
                  Required Scopes:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedEndpoint.requiredScopes.map(scope => (
                    <span key={scope} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Interactive Request Builder */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Interactive Request Execution</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-normal">Auth Header:</span>
                    <select
                      value={selectedKeyForRequest}
                      onChange={(e) => setSelectedKeyForRequest(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    >
                      <option value="DEFAULT_SDK">Primary SDK Key (sk_live_prodpilot_88a9)</option>
                      {apiKeys.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.name} ({k.prefix})
                        </option>
                      ))}
                      <option value="NONE">No Key (Anonymous)</option>
                    </select>
                  </div>
                </div>

                {/* Target URL path input */}
                <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 overflow-hidden text-xs font-mono">
                  <span className="px-3 py-2 text-slate-500 bg-slate-950/70 border-r border-slate-800">
                    {selectedEndpoint.method}
                  </span>
                  <input
                    type="text"
                    value={requestPathInput}
                    onChange={(e) => setRequestPathInput(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2 text-slate-200 focus:outline-none"
                    placeholder="/api/..."
                  />
                  <button
                    onClick={handleExecuteRequest}
                    disabled={isExecutingRequest}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isExecutingRequest ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Request</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Body Editor (for POST/PATCH) */}
                {selectedEndpoint.method !== 'GET' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-300">
                        <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                        JSON Request Payload
                      </span>
                      <button
                        onClick={() => setRequestBodyInput(selectedEndpoint.defaultRequestBody || '{}')}
                        className="text-indigo-400 hover:text-indigo-300 text-[10px] cursor-pointer"
                      >
                        Reset to Default Schema
                      </button>
                    </div>
                    <textarea
                      value={requestBodyInput}
                      onChange={(e) => setRequestBodyInput(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 selection:bg-indigo-900"
                    />
                  </div>
                )}
              </div>

              {/* Execution Response Pane */}
              {executionResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        executionResult.statusCode >= 200 && executionResult.statusCode < 300
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {executionResult.statusCode} {executionResult.statusText}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {executionResult.latencyMs} ms
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(executionResult.data, null, 2));
                        setCopiedCodeType('response');
                        setTimeout(() => setCopiedCodeType(null), 2000);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCodeType === 'response' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCodeType === 'response' ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs font-mono text-slate-200 overflow-x-auto max-h-72">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Code Snippet Generator */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Code Generator</span>
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                      {(['curl', 'typescript', 'python'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setSnippetLanguage(lang)}
                          className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                            snippetLanguage === lang
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lang === 'curl' ? 'cURL' : lang === 'typescript' ? 'TypeScript SDK' : 'Python'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeSnippet);
                      setCopiedCodeType('snippet');
                      setTimeout(() => setCopiedCodeType(null), 2000);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCodeType === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeType === 'snippet' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-lg bg-slate-900 text-xs font-mono text-indigo-200 overflow-x-auto max-h-48 border border-slate-800/80">
                  {activeSnippet}
                </pre>
              </div>

              {/* Live Request Stream Preview in Console */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Live Request Trace ({auditLogs.slice(0, 3).length})</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('audit-logs')}
                    className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Audit Log ({auditLogs.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {auditLogs.slice(0, 3).map(l => (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLogDetail(l)}
                      className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                          l.statusCode < 400 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {l.statusCode}
                        </span>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">{l.method}</span>
                        <span className="text-slate-200 truncate">{l.path}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                        <span className="text-amber-300">{l.latencyMs}ms</span>
                        <span>{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API KEYS & ACCESS CONTROL */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          {/* Security Posture Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Enterprise Dual-Tier API Architecture</h3>
                <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                  External client applications authenticate via scoped cryptographic tokens (<code className="text-indigo-300 font-mono">sk_live_...</code>, <code className="text-blue-300 font-mono">sk_dev_...</code>).
                  All AI model calls are securely proxy-routed through server-side Express handlers using <code className="text-emerald-300 font-mono">process.env.GEMINI_API_KEY</code>, eliminating browser token exposure.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateKeyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New API Key</span>
            </button>
          </div>

          {/* Active API Keys Table */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <span>Active Cryptographic API Keys</span>
                </h3>
                <p className="text-xs text-slate-400">Keys authorized for programmatic API Gateway access</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{apiKeys.length} total issued</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-3 pl-2">Key Name & Environment</th>
                    <th className="pb-3">Token Prefix</th>
                    <th className="pb-3">Granted Scopes</th>
                    <th className="pb-3">Rate Limit</th>
                    <th className="pb-3">Usage</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {apiKeys.map((key) => {
                    const isRevoked = key.status === 'revoked';
                    const envColors = {
                      production: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                      staging: 'bg-amber-950 text-amber-300 border-amber-800',
                      development: 'bg-blue-950 text-blue-300 border-blue-800'
                    };

                    return (
                      <tr key={key.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pl-2 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{key.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase ${envColors[key.environment] || 'bg-slate-800 text-slate-300'}`}>
                              {key.environment}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Created {new Date(key.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-slate-300">
                          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800">
                            {key.prefix}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {key.scopes.map(s => (
                              <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-slate-400">
                          {key.rateLimitPerMinute} rpm
                        </td>
                        <td className="py-3.5 font-mono text-slate-300">
                          <div>{key.requestCount.toLocaleString()} reqs</div>
                          {key.lastUsedAt && (
                            <span className="text-[10px] text-slate-500">
                              Last used {new Date(key.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            key.status === 'active'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                          }`}>
                            {key.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRotateKey(key.id)}
                              disabled={isRevoked}
                              title="Rotate secret token"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              disabled={isRevoked}
                              title="Revoke key"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-rose-400 disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Verifier Sandbox */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>API Key Authentication Sandbox</span>
              </h3>
              <p className="text-xs text-slate-400">Test and verify any programmatic Bearer token against the authentication middleware</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testTokenInput}
                onChange={(e) => setTestTokenInput(e.target.value)}
                placeholder="Enter secret token e.g. sk_live_prodpilot_88a9f02c or sk_stage_..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleVerifyKey}
                disabled={isVerifyingKey || !testTokenInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isVerifyingKey ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Verify Token</span>
              </button>
            </div>

            {verifyResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                verifyResult.valid
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800 text-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    {verifyResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    {verifyResult.valid ? 'Token Valid & Authorized' : 'Validation Failed'}
                  </span>
                  {verifyResult.reason && (
                    <span className="font-mono text-[11px] opacity-80">{verifyResult.reason}</span>
                  )}
                </div>

                {verifyResult.valid && verifyResult.key && (
                  <div className="pt-2 border-t border-emerald-800/60 font-mono text-[11px] grid grid-cols-2 gap-2 text-slate-300">
                    <div>Key Name: <strong className="text-white">{verifyResult.key.name}</strong></div>
                    <div>Environment: <strong className="text-emerald-300">{verifyResult.key.environment}</strong></div>
                    <div>Rate Limit: <strong className="text-white">{verifyResult.key.rateLimitPerMinute} rpm</strong></div>
                    <div>Authorized Scopes: <strong className="text-white">{verifyResult.key.scopes?.join(', ')}</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REQUEST AUDIT LOGS & OBSERVABILITY */}
      {activeTab === 'audit-logs' && (
        <div className="space-y-6">
          {/* Top Observability Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Captured</span>
              <div className="text-xl font-bold font-mono text-slate-100">
                {auditStats?.totalRequests || auditLogs.length}
              </div>
              <div className="text-[10px] text-slate-500">Live request buffer</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Success Rate</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {auditStats?.successRate !== undefined ? `${auditStats.successRate}%` : '100%'}
              </div>
              <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>2xx Responses</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Avg Latency</span>
              <div className="text-xl font-bold font-mono text-amber-300">
                {auditStats?.avgLatencyMs || 34} ms
              </div>
              <div className="text-[10px] text-slate-500">End-to-end roundtrip</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">2xx Successes</span>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {auditStats?.successCount || auditLogs.filter(l => l.statusCode < 400).length}
              </div>
              <div className="text-[10px] text-slate-500">Completed operations</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">4xx Client Err</span>
              <div className="text-xl font-bold font-mono text-amber-400">
                {auditStats?.clientErrorCount || auditLogs.filter(l => l.statusCode >= 400 && l.statusCode < 500).length}
              </div>
              <div className="text-[10px] text-slate-500">Rejected validation/auth</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">5xx Server Err</span>
              <div className="text-xl font-bold font-mono text-rose-400">
                {auditStats?.serverErrorCount || auditLogs.filter(l => l.statusCode >= 500).length}
              </div>
              <div className="text-[10px] text-slate-500">0 critical failures</div>
            </div>
          </div>

          {/* Filter, Search & Action Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search by path, status code, token prefix, IP, or diagnostic details..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                {(['ALL', '2XX', '4XX', '5XX'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setLogStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                      logStatusFilter === st
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </button>
                ))}
              </div>

              {/* Method Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                {(['ALL', 'GET', 'POST', 'PATCH', 'DELETE'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setLogMethodFilter(m)}
                    className={`px-2 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                      logMethodFilter === m
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Auto Refresh Toggle */}
              <button
                onClick={() => setIsAutoRefreshLogs(!isAutoRefreshLogs)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isAutoRefreshLogs
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Toggle live 4s auto-refresh polling"
              >
                <span className={`w-2 h-2 rounded-full ${isAutoRefreshLogs ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{isAutoRefreshLogs ? 'Live Stream' : 'Paused'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadAuditLogs}
                disabled={logsLoading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Refresh audit logs now"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Clear Button */}
              <button
                onClick={handleClearAuditLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border border-slate-700 transition-colors text-xs font-semibold cursor-pointer"
                title="Clear all captured request attempts"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Audit Logs Table / Stream */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Recent API Request Attempts ({auditLogs.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Click any row for full headers & payload diagnostics
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                No API request attempts matching the current filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="pb-3 pl-2">Timestamp</th>
                      <th className="pb-3">Method & Path</th>
                      <th className="pb-3">Status Code</th>
                      <th className="pb-3">Latency</th>
                      <th className="pb-3">Consumer / Token</th>
                      <th className="pb-3">Client IP</th>
                      <th className="pb-3">Diagnostic Details</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {auditLogs.map((log) => {
                      const is2xx = log.statusCode >= 200 && log.statusCode < 300;
                      const is4xx = log.statusCode >= 400 && log.statusCode < 500;

                      const statusBadgeClass = is2xx
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                        : is4xx
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800/80';

                      const methodBadgeClass: Record<string, string> = {
                        GET: 'bg-blue-950 text-blue-300 border-blue-800',
                        POST: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                        PATCH: 'bg-amber-950 text-amber-300 border-amber-800',
                        DELETE: 'bg-rose-950 text-rose-300 border-rose-800'
                      };

                      const latencyClass = log.latencyMs < 50
                        ? 'text-emerald-400'
                        : log.latencyMs < 150
                        ? 'text-amber-400'
                        : 'text-purple-400';

                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogDetail(log)}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 pl-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${methodBadgeClass[log.method] || 'bg-slate-800 text-slate-300'}`}>
                                {log.method}
                              </span>
                              <span className="text-slate-200 font-semibold group-hover:text-indigo-300 transition-colors">
                                {log.path}
                              </span>
                            </div>
                          </td>

                          <td className="py-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                              {log.statusCode} {log.statusText}
                            </span>
                          </td>

                          <td className={`py-3 font-mono text-xs font-semibold ${latencyClass}`}>
                            {log.latencyMs} ms
                          </td>

                          <td className="py-3 font-mono text-[11px] text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                              {log.apiKeyPrefix || 'Web UI'}
                            </span>
                          </td>

                          <td className="py-3 font-mono text-[11px] text-slate-400">
                            {log.clientIp}
                          </td>

                          <td className="py-3 text-[11px] text-slate-300 max-w-xs truncate" title={log.details}>
                            {log.details}
                          </td>

                          <td className="py-3 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleRerunInConsole(log)}
                                className="px-2 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Re-run this request in the interactive console"
                              >
                                Re-run
                              </button>
                              <button
                                onClick={() => setSelectedLogDetail(log)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                title="View detailed diagnostic trace"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VISUAL RATE LIMITER & AI SERVICES QUOTA DASHBOARD */}
      {activeTab === 'rate-limiter' && (
        <div className="space-y-6">
          {/* Header & Observability Control Ribbon */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span>AI Service Rate Limiter & Token Quota Dashboard</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-900/80 border border-indigo-700/60 text-indigo-300 font-semibold">
                      Multi-Model Gateway
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time sliding window telemetry, token consumption rates, token runway forecasting, and multi-model quota guards.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Overall Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                rateLimiterOverview?.overallStatus === 'throttled'
                  ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                  : rateLimiterOverview?.overallStatus === 'warning'
                  ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  rateLimiterOverview?.overallStatus === 'throttled'
                    ? 'bg-rose-400 animate-ping'
                    : rateLimiterOverview?.overallStatus === 'warning'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400 animate-pulse'
                }`} />
                <span>
                  {rateLimiterOverview?.overallStatus === 'throttled'
                    ? 'Throttling Active (429 Backoff)'
                    : rateLimiterOverview?.overallStatus === 'warning'
                    ? 'High Load (>80% Capacity)'
                    : 'All AI Services Healthy'}
                </span>
              </div>

              {/* Reset Quota Counters Button */}
              <button
                onClick={handleResetRateLimiter}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Reset simulation counters back to healthy state"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Quotas</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadRateLimiterData}
                disabled={rateLimiterLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${rateLimiterLoading ? 'animate-spin' : ''}`} />
                <span>Sync Telemetry</span>
              </button>
            </div>
          </div>

          {/* Client-Side API Rate Limiter Guard for Sandbox Testing */}
          <ClientSideRateLimiterPanel />

          {/* Top 4 Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: 1-Minute Sliding RPM Quota */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Active 1-Min Request Quota
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                  RPM
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-100 tracking-tight font-mono">
                    {rateLimiterOverview
                      ? rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmUsed, 0).toLocaleString()
                      : '754'}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {rateLimiterOverview
                        ? rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmQuota, 0).toLocaleString()
                        : '3,960'} RPM
                    </span>
                  </span>
                  <span className="text-xs font-bold text-indigo-400 font-mono">
                    {rateLimiterOverview
                      ? Math.round((rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmUsed, 0) /
                          Math.max(1, rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmQuota, 0))) * 100)
                      : 19}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full"
                    style={{
                      width: `${rateLimiterOverview
                        ? Math.min(100, Math.round((rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmUsed, 0) /
                            Math.max(1, rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmQuota, 0))) * 100))
                        : 19}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-mono">
                  {rateLimiterOverview
                    ? rateLimiterOverview.services.reduce((acc, s) => acc + s.rpmRemaining, 0).toLocaleString()
                    : '3,206'}{' '}
                  RPM remaining
                </span>
                <span className="text-amber-400 font-mono flex items-center gap-1 font-semibold">
                  <Timer className="w-3 h-3" />
                  Resets in {secondsToSlidingReset}s
                </span>
              </div>
            </div>

            {/* Card 2: 24h Daily Request Quota */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  24h Daily Request Quota
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                  RPD
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-100 tracking-tight font-mono">
                    {rateLimiterOverview
                      ? rateLimiterOverview.totalDailyRequestsUsed.toLocaleString()
                      : '20,790'}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {rateLimiterOverview
                        ? rateLimiterOverview.totalDailyRequestsQuota.toLocaleString()
                        : '83,000'}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {rateLimiterOverview
                      ? Math.round((rateLimiterOverview.totalDailyRequestsUsed /
                          Math.max(1, rateLimiterOverview.totalDailyRequestsQuota)) * 100)
                      : 25}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                    style={{
                      width: `${rateLimiterOverview
                        ? Math.min(100, Math.round((rateLimiterOverview.totalDailyRequestsUsed /
                            Math.max(1, rateLimiterOverview.totalDailyRequestsQuota)) * 100))
                        : 25}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-mono">
                  {rateLimiterOverview
                    ? rateLimiterOverview.totalDailyRequestsRemaining.toLocaleString()
                    : '62,210'}{' '}
                  reqs left
                </span>
                <span className="text-emerald-400 font-mono">
                  {rateLimiterOverview?.activeConcurrency || 48} / {rateLimiterOverview?.maxConcurrency || 235} slots
                </span>
              </div>
            </div>

            {/* Card 3: Master Token Budget & Remaining Tokens (Hero Visual) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-800/40 space-y-3 relative overflow-hidden shadow-lg shadow-indigo-950/20">
              <div className="flex items-center justify-between text-xs text-indigo-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Remaining Token Budget
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/90 border border-indigo-700 text-indigo-200 uppercase font-semibold">
                  Remaining
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-indigo-200 tracking-tight font-mono">
                    {rateLimiterOverview
                      ? (rateLimiterOverview.totalDailyTokensRemaining / 1000000).toFixed(2)
                      : '18.58'}M
                    <span className="text-xs text-indigo-300/70 font-normal ml-1">
                      / {rateLimiterOverview
                        ? (rateLimiterOverview.totalDailyTokensQuota / 1000000).toFixed(0)
                        : '50'}M Tokens
                    </span>
                  </span>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {rateLimiterOverview
                      ? Math.round((rateLimiterOverview.totalDailyTokensUsed /
                          Math.max(1, rateLimiterOverview.totalDailyTokensQuota)) * 100)
                      : 63}% used
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 transition-all duration-500 rounded-full"
                    style={{
                      width: `${rateLimiterOverview
                        ? Math.min(100, Math.round((rateLimiterOverview.totalDailyTokensUsed /
                            Math.max(1, rateLimiterOverview.totalDailyTokensQuota)) * 100))
                        : 63}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-900/40">
                <span className="text-slate-300 font-mono">
                  {rateLimiterOverview
                    ? rateLimiterOverview.totalDailyTokensRemaining.toLocaleString()
                    : '18,580,000'}{' '}
                  tokens left
                </span>
                <span className="text-indigo-400 font-mono">~14.5h runway</span>
              </div>
            </div>

            {/* Card 4: Upcoming Window & Daily Reset Timers */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Upcoming Quota Resets
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                  Sliding + UTC
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-300 tracking-tight font-mono flex items-center gap-1.5">
                    <span>00:{secondsToSlidingReset.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-normal">RPM Refill</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">1s Cadence</span>
                </div>

                <div className="text-xs text-slate-400 mt-2 flex items-center justify-between font-mono bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Daily Reset:</span>
                  <span className="text-slate-200 font-semibold">
                    {timeUntilDailyReset.hours}h {timeUntilDailyReset.minutes}m {timeUntilDailyReset.seconds}s
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-mono">Midnight 00:00 UTC</span>
                <span className="text-indigo-400 font-mono">Token Bucket Smooth</span>
              </div>
            </div>
          </div>

          {/* Section: Connected AI Services Quota Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Connected AI Services Rate Limit Matrix</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Per-model request quotas, token throughput limits, active concurrency, and live sliding window reset states.
                </p>
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Healthy
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> High Load
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Throttled (429)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500" /> Standby
                </span>
              </div>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(rateLimiterOverview?.services || []).map((service) => {
                const rpmRatio = service.rpmUsed / Math.max(1, service.rpmQuota);
                const rpmPercent = Math.min(100, Math.round(rpmRatio * 100));
                const tpmRatio = service.tpmUsed / Math.max(1, service.tpmQuota);
                const tpmPercent = Math.min(100, Math.round(tpmRatio * 100));
                const dailyTokenRatio = service.dailyTokenUsed / Math.max(1, service.dailyTokenQuota);
                const dailyTokenPercent = Math.min(100, Math.round(dailyTokenRatio * 100));

                const statusBg =
                  service.status === 'throttled'
                    ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                    : service.status === 'approaching_limit'
                    ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                    : service.status === 'standby'
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300';

                return (
                  <div
                    key={service.serviceId}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 space-y-4 transition-all shadow-sm relative overflow-hidden group"
                  >
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {service.serviceName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                            {service.modelIdentifier}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
                            {service.category}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border uppercase ${statusBg}`}>
                        {service.status === 'throttled'
                          ? `429 Throttled`
                          : service.status === 'approaching_limit'
                          ? `>80% Load`
                          : service.status === 'standby'
                          ? `Standby`
                          : `Healthy`}
                      </span>
                    </div>

                    {/* Metric 1: Request Rate Quota (RPM) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Activity className="w-3 h-3 text-indigo-400" />
                          Requests Per Minute (RPM)
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {service.rpmUsed.toLocaleString()} / {service.rpmQuota.toLocaleString()}
                          <span className="text-indigo-400 ml-1">({rpmPercent}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            rpmPercent >= 90
                              ? 'bg-rose-500'
                              : rpmPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${rpmPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Remaining: {service.rpmRemaining.toLocaleString()} RPM</span>
                        <span className="text-amber-400">Reset: {secondsToSlidingReset}s</span>
                      </div>
                    </div>

                    {/* Metric 2: Token Throughput Quota (TPM) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Tokens Per Minute (TPM)
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {(service.tpmUsed / 1000).toFixed(0)}k / {(service.tpmQuota / 1000).toFixed(0)}k
                          <span className="text-amber-400 ml-1">({tpmPercent}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            tpmPercent >= 90
                              ? 'bg-rose-500'
                              : tpmPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${tpmPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Remaining: {(service.tpmRemaining / 1000).toFixed(0)}k TPM</span>
                        <span className="text-slate-500">Sliding 60s</span>
                      </div>
                    </div>

                    {/* Metric 3: Daily Tokens & Remaining Tokens */}
                    <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          Remaining Daily Tokens
                        </span>
                        <span className="font-mono text-purple-300 font-bold">
                          {(service.dailyTokenRemaining / 1000000).toFixed(2)}M Rem
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${dailyTokenPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Used: {(service.dailyTokenUsed / 1000000).toFixed(2)}M / {(service.dailyTokenQuota / 1000000).toFixed(0)}M</span>
                        <span className="text-purple-400">{dailyTokenPercent}% used</span>
                      </div>
                    </div>

                    {/* Concurrency, Latency, & Mini Trend */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 font-mono">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase block">Concurrency</span>
                        <span className="text-slate-200 font-semibold">
                          {service.concurrencyCurrent} / {service.concurrencyLimit} streams
                        </span>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">P95 Latency</span>
                        <span className="text-slate-200 font-semibold">{service.p95LatencyMs}ms</span>
                      </div>
                    </div>

                    {/* 12-Hour Hourly Trend Sparkline */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Hourly Request Density</span>
                        <span>Recent 12h</span>
                      </div>
                      <div className="flex items-end gap-1 h-6 pt-1">
                        {service.hourlySparkline.map((val, idx) => {
                          const maxVal = Math.max(...service.hourlySparkline, 1);
                          const barH = Math.max(15, Math.round((val / maxVal) * 100));
                          return (
                            <div
                              key={idx}
                              className={`flex-1 rounded-sm transition-all ${
                                idx === service.hourlySparkline.length - 1
                                  ? 'bg-indigo-400'
                                  : 'bg-slate-700/80 hover:bg-indigo-500/70'
                              }`}
                              style={{ height: `${barH}%` }}
                              title={`Hour -${12 - idx}: ${val} requests`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Simulation Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleQuickTestService(service.serviceId, false)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 border border-slate-700"
                        title="Simulate 10 standard generation requests"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Test 10 Reqs</span>
                      </button>

                      <button
                        onClick={() => handleQuickTestService(service.serviceId, true)}
                        className="py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/70 text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                        title="Trigger forced 429 Throttle and inspect Retry-After backpressure"
                      >
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>Force 429</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Interactive Rate Limiter Test & Throttle Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Simulation Controls (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Rate Limiter Traffic & Throttling Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Inject synthetic traffic spikes to evaluate sliding window smoothing, token budget depletion, and HTTP 429 Retry-After headers.
                </p>
              </div>

              {/* Service Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target AI Service</label>
                <select
                  value={selectedServiceForSim}
                  onChange={(e) => setSelectedServiceForSim(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {(rateLimiterOverview?.services || []).map((s) => (
                    <option key={s.serviceId} value={s.serviceId}>
                      {s.serviceName} ({s.rpmQuota} RPM / {(s.dailyTokenRemaining / 1000000).toFixed(1)}M Rem)
                    </option>
                  ))}
                </select>
              </div>

              {/* Traffic Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Traffic Simulation Profile</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'normal', label: 'Normal Traffic', desc: '10 requests • 1.5k tokens' },
                    { id: 'burst', label: 'Burst Traffic', desc: '60 requests • 15k tokens' },
                    { id: 'heavy', label: 'Heavy Synthesis', desc: '150 requests • 50k tokens' },
                    { id: 'throttle', label: 'Force 429 Throttle', desc: 'Simulate quota exhaustion' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSimTrafficPreset(preset.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        simTrafficPreset === preset.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{preset.label}</span>
                        {simTrafficPreset === preset.id && (
                          <Check className="w-3 h-3 text-indigo-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleExecuteSimulation}
                  disabled={rateLimiterSimulating}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${rateLimiterSimulating ? 'animate-pulse' : ''}`} />
                  <span>{rateLimiterSimulating ? 'Injecting Traffic...' : 'Execute Traffic Injection'}</span>
                </button>
                <button
                  onClick={handleResetRateLimiter}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                  title="Reset counters"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Live Simulated HTTP Response & Rate Limit Headers (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Simulated Gateway HTTP Response & Rate Limit Headers
                    </span>
                  </div>
                  {simResult && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      simResult.success
                        ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                        : 'bg-rose-950 border-rose-700 text-rose-300'
                    }`}>
                      {simResult.success ? '200 OK' : '429 Too Many Requests'}
                    </span>
                  )}
                </div>

                {simResult ? (
                  <div className="space-y-3">
                    {/* Headers Table */}
                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-xs space-y-1.5">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800 pb-1">
                        Response Rate-Limiting Headers
                      </div>
                      {Object.entries(simResult.headers).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between py-0.5">
                          <span className="text-indigo-400">{key}:</span>
                          <span className={`font-semibold ${
                            key.includes('remaining-rpm') && val === '0'
                              ? 'text-rose-400'
                              : key.includes('retry-after')
                              ? 'text-amber-300 font-bold'
                              : 'text-slate-200'
                          }`}>
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Result Notification Banner */}
                    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      simResult.success
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    }`}>
                      {simResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {simResult.success ? 'Traffic Passed Rate Limit Verification' : 'Rate Limit Backpressure Triggered'}
                        </div>
                        <div className="text-slate-300 text-[11px] mt-0.5">
                          {simResult.message || simResult.error}
                        </div>
                        {simResult.retryAfter && (
                          <div className="mt-1 font-mono text-amber-300 text-[11px]">
                            Recommended Client Backoff: Retry-After {simResult.retryAfter}s
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                    <Gauge className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      Select a traffic profile on the left and click <strong>Execute Traffic Injection</strong> to inspect the cryptographic rate limit headers and backpressure mechanics in real time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Rate Limiting Architecture & Token Bucket Visualizer */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Rate Limiting Algorithm Architecture & Leaky Bucket State</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tiered defensive algorithms orchestrating token consumption, burst accommodation, and sliding-window smoothing.
              </p>
            </div>

            {/* 3 Algorithm Explainer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">1. Sliding Window Counter</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400">RPM / TPM</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Smooths request velocity over a rolling 60-second window, preventing double-rate bursts at boundary intervals. Ticks down second-by-second automatically.
                </p>
                <div className="text-[10px] font-mono text-emerald-400 pt-1">
                  Active window reset in {secondsToSlidingReset}s
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">2. Token Bucket Burst</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400">Capacity & Refill</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Accommodates high-throughput generation bursts up to 1,000 requests with continuous refill at 16.6 tokens/sec, enabling responsive artifact drafting.
                </p>
                <div className="text-[10px] font-mono text-amber-400 pt-1">
                  Refill velocity: +16.6 tokens/sec
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">3. Concurrency Leaky Bucket</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-400">Circuit Breaker</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Limits simultaneous long-running LLM inferences across workers to prevent memory degradation. Emits HTTP 429 with Retry-After when saturated.
                </p>
                <div className="text-[10px] font-mono text-purple-400 pt-1">
                  Capacity: {rateLimiterOverview?.maxConcurrency || 235} simultaneous slots
                </div>
              </div>
            </div>

            {/* Active Token Buckets Progress Gauges */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Active In-Memory Token Buckets
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(rateLimiterOverview?.tokenBuckets || []).map((bucket) => (
                  <div key={bucket.bucketId} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{bucket.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        {bucket.algorithm}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Fill Level</span>
                        <span className="text-indigo-300 font-semibold">{bucket.fillPercentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, bucket.fillPercentage)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Available: {bucket.currentTokens.toLocaleString()}</span>
                        <span>Refill: +{bucket.refillRatePerSec}/s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Recent Throttle Events Log */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Recent Throttle Warnings & Incident Trail</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged rate limiter mitigation incidents, backoff durations, and recovery timestamps.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                Audited Log
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Trigger Reason</th>
                    <th className="py-2.5 px-3 text-right">Backoff</th>
                    <th className="py-2.5 px-3 text-right">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {(rateLimiterOverview?.recentThrottleEvents || []).map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-indigo-300 font-semibold">{ev.serviceId}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">{ev.reason}</td>
                      <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                        Retry-After: {ev.retryAfterSeconds}s
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px]">
                          Mitigated
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM ARCHITECTURE & BLUEPRINT */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Visual Architecture Layers */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Enterprise PM Platform Architecture Blueprint</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero-leakage security, dual-pass Zod schema validation shield, and deterministic cascade engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Layer 1 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/60 space-y-2 relative overflow-hidden">
                <div className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Layer 1: Clients & SDK</div>
                <h4 className="text-xs font-bold text-slate-200">Typed Consumers</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  React 19 Frontend SPA, CLI developer pipelines, and external Jira / GitHub webhook bots calling the Gateway with scoped API tokens.
                </p>
                <div className="pt-2 text-[10px] font-mono text-indigo-300 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  <span>Bearer sk_live_...</span>
                </div>
              </div>

              {/* Layer 2 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/60 space-y-2 relative overflow-hidden">
                <div className="text-[10px] font-mono text-purple-400 uppercase font-bold">Layer 2: API Gateway</div>
                <h4 className="text-xs font-bold text-slate-200">Express Middleware Shield</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Traffic tracking, IP rate-limiting (300 rpm), scope authorization enforcement, and audit trail stream.
                </p>
                <div className="pt-2 text-[10px] font-mono text-purple-300 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  <span>Sub-40ms P50</span>
                </div>
              </div>

              {/* Layer 3 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2 relative overflow-hidden">
                <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Layer 3: Validation Shield</div>
                <h4 className="text-xs font-bold text-slate-200">Zod Dual-Pass & Migrator</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Strict schema verification across 19 artifact types. Automatic backward compatibility migration from v1 to v2 specifications.
                </p>
                <div className="pt-2 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  <span>Dual Repair Loop</span>
                </div>
              </div>

              {/* Layer 4 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-900/60 space-y-2 relative overflow-hidden">
                <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">Layer 4: AI & Persistence</div>
                <h4 className="text-xs font-bold text-slate-200">Gemini 2.5 & Firestore</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Server-side proxy to Gemini 2.5 Pro → Flash with persistent storage in Cloud Firestore with multi-user RBAC security rules.
                </p>
                <div className="pt-2 text-[10px] font-mono text-amber-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Cloud Synchronized</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Schema Validation Playground */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Zod Dual-Version Validation & Migration Contract</span>
              </h3>
              <p className="text-xs text-slate-400">
                Explore how the engine handles legacy v1 payloads and seamlessly upgrades them to modern v2 specifications without database disruption.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Version 1.0 (Legacy Spec)</span>
                  <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800">
                    Deprecated / Backward-Compatible
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Minimal fields: simple string title and objective. Does not mandate problem statement or requirement priority levels.
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-slate-300 border border-slate-800">
{`{
  "schemaVersion": 1,
  "title": "Banking Portal",
  "objective": "Build modern banking",
  "functionalRequirements": [
    { "id": "FR-1", "description": "Biometric login" }
  ]
}`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Version 2.0 (Strict Modern Spec)</span>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                    Active Default
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Strict fields: minimum 20 char objective, explicit problem statement, mandatory requirement priorities (P0/P1/P2), and SLA metrics.
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-emerald-300 border border-slate-800">
{`{
  "schemaVersion": 2,
  "title": "Banking Portal",
  "objective": "Build modern banking...",
  "problemStatement": "Legacy baseline backfill...",
  "functionalRequirements": [
    { "id": "FR-1", "description": "Biometric login...", "priority": "P1" }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: API HEALTH DASHBOARD & PRODUCTION READINESS */}
      {activeTab === 'health' && (
        <ApiHealthDashboard onNavigateTab={onNavigateTab} />
      )}

      {/* MODAL: CREATE API KEY */}
      {isCreateKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <span>Issue New Cryptographic API Key</span>
              </h3>
              <button
                onClick={() => setIsCreateKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Key Name / Consumer</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. GitHub Actions Deployment Pipeline"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Environment</label>
                  <select
                    value={newKeyEnv}
                    onChange={(e) => setNewKeyEnv(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="production">Production (sk_live_...)</option>
                    <option value="staging">Staging (sk_stage_...)</option>
                    <option value="development">Development (sk_dev_...)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Expiration</label>
                  <select
                    value={newKeyExpiryDays}
                    onChange={(e) => setNewKeyExpiryDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year</option>
                    <option value={0}>No Expiration</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Security Scopes</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {AVAILABLE_SCOPES.map(item => {
                    const checked = newKeyScopes.includes(item.scope);
                    return (
                      <label
                        key={item.scope}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked ? 'bg-indigo-950/40 border-indigo-700/80 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setNewKeyScopes(newKeyScopes.filter(s => s !== item.scope));
                            } else {
                              setNewKeyScopes([...newKeyScopes, item.scope]);
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-mono font-semibold">{item.label}</div>
                          <div className="text-[10px] text-slate-500">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SECRET KEY REVEAL DIALOG */}
      {createdSecretDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-100">API Key Successfully Generated</h3>
            </div>

            <p className="text-xs text-slate-300">
              Please copy your secret key token now. For security purposes, you will not be able to view this full key again.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-emerald-300 break-all select-all">
                {createdSecretDialog.secretToken}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdSecretDialog.secretToken);
                  setCopiedCodeType('secret_token');
                  setTimeout(() => setCopiedCodeType(null), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedCodeType === 'secret_token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodeType === 'secret_token' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-[11px] text-amber-400/90 bg-amber-950/40 p-3 rounded-xl border border-amber-800/60 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Store this key in your secure secret manager (e.g. Google Cloud Secret Manager, GitHub Actions Secrets).</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCreatedSecretDialog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                I have saved my key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT LOG DETAIL DIALOG */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                  selectedLogDetail.statusCode < 400 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                  selectedLogDetail.statusCode < 500 ? 'bg-amber-950 text-amber-300 border-amber-800' :
                  'bg-rose-950 text-rose-300 border-rose-800'
                }`}>
                  {selectedLogDetail.statusCode} {selectedLogDetail.statusText}
                </span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  {selectedLogDetail.method} {selectedLogDetail.path}
                </span>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Latency</span>
                <span className="text-amber-300 font-bold">{selectedLogDetail.latencyMs} ms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Client IP</span>
                <span className="text-slate-200">{selectedLogDetail.clientIp}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Outcome</span>
                <span className="text-emerald-400">{selectedLogDetail.outcome}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Scope Used</span>
                <span className="text-indigo-300">{selectedLogDetail.scopeUsed || 'session:internal'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Diagnostic Narrative</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                {selectedLogDetail.details}
              </div>
            </div>

            {selectedLogDetail.userAgent && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">User-Agent</label>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                  {selectedLogDetail.userAgent}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">Raw Observability JSON Trace</label>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLogDetail, null, 2)}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  handleRerunInConsole(selectedLogDetail);
                  setSelectedLogDetail(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Re-run in Console</span>
              </button>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
