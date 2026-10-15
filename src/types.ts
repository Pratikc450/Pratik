export type ArtifactType = 
  | 'PRD' 
  | 'PRODUCT_VISION'
  | 'PROBLEM_STATEMENT'
  | 'USER_PERSONAS'
  | 'USER_STORIES' 
  | 'EPICS'
  | 'FEATURES'
  | 'ACCEPTANCE_CRITERIA'
  | 'PRODUCT_REQUIREMENTS'
  | 'ROADMAP' 
  | 'MVP_SCOPE'
  | 'COMPETITOR_ANALYSIS'
  | 'SWOT'
  | 'USER_JOURNEY'
  | 'FEATURE_PRIORITIZATION'
  | 'OKRS'
  | 'KPIS' 
  | 'RELEASE_PLAN'
  | 'GTM_PLAN'
  | 'PERSONAS'      // alias for backwards compatibility
  | 'EXPERIMENTS';  // backwards compatibility

export interface ProductBrief {
  productName: string;
  targetAudience: string;
  problemStatement: string;
  proposedSolution: string;
  strategicContext?: string;
  industry?: string;
}

export type ArtifactCategory = 
  | 'Strategy' 
  | 'Discovery' 
  | 'Definition' 
  | 'Prioritization' 
  | 'Metrics' 
  | 'Execution';

export interface ArtifactMetaDescriptor {
  type: ArtifactType;
  label: string;
  category: ArtifactCategory;
  shortDesc: string;
  iconName: string;
}

export const ARTIFACT_19_CATALOG: ArtifactMetaDescriptor[] = [
  {
    type: 'PRD',
    label: 'Product Requirements Document',
    category: 'Definition',
    shortDesc: 'Complete spec with objective, MoSCoW functional requirements, non-functional SLA, and scope cutoffs.',
    iconName: 'FileText'
  },
  {
    type: 'PRODUCT_VISION',
    label: 'Product Vision',
    category: 'Strategy',
    shortDesc: 'North star statement, 3-year strategic pillars, core differentiator, and market transformation impact.',
    iconName: 'Compass'
  },
  {
    type: 'PROBLEM_STATEMENT',
    label: 'Problem Statement',
    category: 'Strategy',
    shortDesc: 'Quantified customer pain points, failure frequency, affected segments, and the measurable cost of inaction.',
    iconName: 'AlertTriangle'
  },
  {
    type: 'USER_PERSONAS',
    label: 'User Personas',
    category: 'Discovery',
    shortDesc: 'Primary and secondary user archetypes with demographics, JTBD, core friction, and verbatim quotes.',
    iconName: 'Users'
  },
  {
    type: 'USER_STORIES',
    label: 'User Stories',
    category: 'Definition',
    shortDesc: 'Standard "As a / I want / So that" backlog with personas, acceptance criteria, and story points.',
    iconName: 'ListTodo'
  },
  {
    type: 'EPICS',
    label: 'Epics',
    category: 'Definition',
    shortDesc: 'Strategic delivery themes grouping related user stories, business value, and release milestones.',
    iconName: 'Layers'
  },
  {
    type: 'FEATURES',
    label: 'Features Catalog',
    category: 'Definition',
    shortDesc: 'Structured capability breakdown categorized into Core, Value-Add, and Delight tiers.',
    iconName: 'Boxes'
  },
  {
    type: 'ACCEPTANCE_CRITERIA',
    label: 'Acceptance Criteria',
    category: 'Definition',
    shortDesc: 'Testable Gherkin-style Given/When/Then scenarios covering standard paths, edge cases, and error states.',
    iconName: 'CheckSquare'
  },
  {
    type: 'PRODUCT_REQUIREMENTS',
    label: 'Product Requirements',
    category: 'Definition',
    shortDesc: 'Exhaustive functional specifications paired with non-functional security, latency, and compliance SLAs.',
    iconName: 'ShieldCheck'
  },
  {
    type: 'ROADMAP',
    label: 'Roadmap (Now / Next / Later)',
    category: 'Prioritization',
    shortDesc: 'Phased strategic timeline with dependencies, quarterly themes, and milestone deliverables.',
    iconName: 'Milestone'
  },
  {
    type: 'MVP_SCOPE',
    label: 'MVP Scope & Boundaries',
    category: 'Prioritization',
    shortDesc: 'Strict Day-1 must-haves vs. deferred nice-to-haves and explicit out-of-scope boundaries to de-risk launch.',
    iconName: 'Crop'
  },
  {
    type: 'COMPETITOR_ANALYSIS',
    label: 'Competitor Analysis',
    category: 'Strategy',
    shortDesc: 'Direct and indirect competitor teardown, feature parity matrix, pricing models, and unfair competitive moat.',
    iconName: 'Target'
  },
  {
    type: 'SWOT',
    label: 'SWOT Analysis',
    category: 'Strategy',
    shortDesc: 'Interactive 2x2 matrix analyzing internal Strengths & Weaknesses against external Opportunities & Threats.',
    iconName: 'Grid'
  },
  {
    type: 'USER_JOURNEY',
    label: 'User Journey Map',
    category: 'Discovery',
    shortDesc: 'End-to-end journey from Awareness to Habit Loop, detailing actions, emotions, drop-offs, and delight points.',
    iconName: 'Footprints'
  },
  {
    type: 'FEATURE_PRIORITIZATION',
    label: 'Feature Prioritization (RICE)',
    category: 'Prioritization',
    shortDesc: 'Data-driven Reach, Impact, Confidence, and Effort formula with MoSCoW ranking recommendations.',
    iconName: 'ArrowUpDown'
  },
  {
    type: 'OKRS',
    label: 'Objectives & Key Results (OKRs)',
    category: 'Metrics',
    shortDesc: 'Quarterly strategic objectives with 3-4 measurable, quantitative key results, baselines, and stretch targets.',
    iconName: 'Flag'
  },
  {
    type: 'KPIS',
    label: 'KPIs & Telemetry Guardrails',
    category: 'Metrics',
    shortDesc: 'North Star metric, high-frequency leading indicators, lagging business results, and alert thresholds.',
    iconName: 'BarChart3'
  },
  {
    type: 'RELEASE_PLAN',
    label: 'Release Plan',
    category: 'Execution',
    shortDesc: 'Phased rollout (Alpha, Private Beta, Public Beta, GA) with gate checklists and rollback triggers.',
    iconName: 'Rocket'
  },
  {
    type: 'GTM_PLAN',
    label: 'Go-to-Market Plan',
    category: 'Execution',
    shortDesc: 'ICP targeting, launch distribution channels, pricing packaging, sales enablement, and milestone calendar.',
    iconName: 'Megaphone'
  }
];

export type ArtifactStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

export interface Product {
  id: string;
  name: string;
  vision: string;
  description: string;
  targetAudience: string;
  industry: string;
  createdAt: string;
}

export interface Problem {
  id: string;
  productId: string;
  title: string;
  description: string;
  impactScore: number; // 1-10
  frequency: string;
  isDeleted?: boolean;
}

export interface Persona {
  id: string;
  productId: string;
  name: string;
  role: string;
  goal: string;
  painPoint: string;
  painPoints?: string[];
  techComfort?: 'Low' | 'Medium' | 'High' | 'Expert';
  technicalLiteracy?: string;
  demographics?: string;
  jtbd?: string;
  quote?: string;
}

export interface Feature {
  id: string;
  productId: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  personaIds: string[];
}

export interface ResearchDocument {
  id: string;
  productId: string;
  title: string;
  type: 'User Interview' | 'Competitor Analysis' | 'Customer Feedback' | 'Analytics Report';
  content: string;
  isUntrusted?: boolean;
}

export interface GenerationMetadata {
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  validationAttempts: number;
  repaired: boolean;
  validationErrors?: string[];
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  requestId: string;
  tokenBudgetUsed: number;
  tokenBudgetLimit: number;
  schemaVersion?: number;
}

export interface ArtifactVersionRecord {
  version: number;
  status: ArtifactStatus;
  createdAt: string;
  createdBy?: string;
  changeSummary?: string;
  schemaData: any;
  renderedMarkdown: string;
  schemaVersion?: number;
  metadata?: Partial<GenerationMetadata>;
}

export interface CommentReply {
  id: string;
  author: {
    name: string;
    role: string;
    avatarBg: string;
    email?: string;
  };
  content: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
}

export interface ArtifactComment {
  id: string;
  artifactId: string;
  productId: string;
  targetType: 'PRD' | 'USER_STORIES' | 'REQUIREMENT' | 'STORY';
  requirementId?: string; // e.g. 'FR-101', 'FR-102', 'US-101', 'OBJECTIVE', 'MVP_SCOPE'
  requirementTitle?: string;
  author: {
    name: string;
    role: string;
    avatarBg: string;
    email?: string;
  };
  content: string;
  createdAt: string;
  updatedAt?: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: {
    name: string;
    role: string;
  };
  resolvedAt?: string;
  replies: CommentReply[];
  reactions?: Record<string, string[]>;
  tag?: string; // 'Architecture' | 'Security' | 'Scope' | 'SLA' | 'UX' | 'General'
}

export interface GeneratedArtifact {
  id: string;
  requestId: string;
  productId: string;
  taskType: ArtifactType;
  status: ArtifactStatus;
  version: number;
  schemaData: any;
  renderedMarkdown: string;
  schemaVersion?: number;
  metadata: GenerationMetadata;
  consistencyIssues?: string[];
  versionHistory?: ArtifactVersionRecord[];
  comments?: ArtifactComment[];
}

export interface AuditLogEntry {
  id: string;
  artifactId: string;
  taskType: ArtifactType | 'SYSTEM' | string;
  action: 'GENERATED' | 'REPAIRED' | 'APPROVED' | 'MODIFIED' | 'WEBSOCKET_TRANSITION' | 'LATENCY_SPIKE' | 'AUTO_RECONNECT' | string;
  userId: string;
  timestamp: string;
  details: string;
  productId?: string;
  version?: number;
  metadata?: Record<string, any>;
}

export type AuditCategory = 'ARTIFACT_MODIFICATION' | 'APPROVAL_GATE' | 'AI_GENERATION' | 'WORKSPACE_ACTION';

export interface AuditTrailItem {
  id: string;
  timestamp: string;
  category: AuditCategory;
  title: string;
  description: string;
  artifactId?: string;
  artifactTitle?: string;
  taskType?: ArtifactType;
  action?: 'GENERATED' | 'REPAIRED' | 'APPROVED' | 'MODIFIED' | 'VERSION_CREATED' | 'COMMENT_ADDED';
  author: {
    name: string;
    role: string;
    avatarBg?: string;
  };
  version?: number;
  status?: string;
  productId?: string;
  metadata?: {
    model?: string;
    latencyMs?: number;
    tokensUsed?: number;
    changes?: string[];
    schemaVersion?: number;
    diffSnippet?: string;
    approvedBy?: string;
    targetVersion?: number;
  };
  details?: string;
}

export interface TelemetrySummary {
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalGenerations: number;
  validationFailureRate: number;
  repairSuccessRate: number;
  totalTokensUsed: number;
  tokenBudgetUsed: number;
  tokenBudgetLimit: number;
  recentRuns: any[];
}

export interface AcceptanceTestResult {
  id: string;
  name: string;
  description: string;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs?: number;
  details?: string;
  logs: string[];
  assertions: { name: string; passed: boolean; message: string }[];
}

export interface E2ETestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
  testData?: string;
  validationCheck?: string;
  status?: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
}

export interface E2ETestScenario {
  id: string;
  title: string;
  description: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  persona: string;
  relatedStoryIds: string[];
  coverageCategory: 'Happy Path' | 'Edge Case & Timeout' | 'Integration & Webhook' | 'Security & Biometrics' | 'Data Integrity';
  preconditions: string[];
  steps: E2ETestStep[];
  postconditions: string[];
  recoveryOrFallback?: string;
  automationSnippet?: {
    framework: 'Playwright' | 'Cypress';
    code: string;
  };
  simulationStatus?: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  simulationResult?: {
    durationMs: number;
    passedSteps: number;
    totalSteps: number;
    logs: string[];
  };
}

export type ChatRolePreset = 
  | 'Lead Product Strategist' 
  | 'Agile Coach & Scrum Master' 
  | 'Technical Architect' 
  | 'Customer Research Analyst';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model: 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';
  rolePreset: ChatRolePreset;
  groundingSources?: { title: string; url: string }[];
}

export interface AudioTranscriptResult {
  id: string;
  text: string;
  durationSeconds?: number;
  speakers?: string[];
  keyPainPoints: string[];
  featureRequests: string[];
  createdAt: string;
}

export interface AiImageResult {
  id: string;
  prompt: string;
  model: string;
  imageUrl: string;
  aspectRatio: string;
  imageSize: string;
  createdAt: string;
  isEdit?: boolean;
}

export interface AiVideoResult {
  id: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  videoUrl?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progressText?: string;
  operationName?: string;
  createdAt: string;
  thumbnailUrl?: string;
}

export interface SearchGroundingResult {
  query: string;
  summaryMarkdown: string;
  sources: { title: string; url: string; snippet?: string }[];
  keyFindings: string[];
}

export interface MapsGroundingResult {
  query: string;
  summaryMarkdown: string;
  places: { title: string; uri: string; address?: string; snippet?: string }[];
  locationContext?: string;
}

export interface MusicTrackResult {
  id: string;
  prompt: string;
  model: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
  audioBase64: string;
  mimeType: string;
  lyrics?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isGoogleAuthenticated?: boolean;
}

export type ActivityEventType =
  | 'STORY_MOVED'
  | 'PRD_APPROVED'
  | 'FEEDBACK_ADDED'
  | 'TELEMETRY_SPIKE'
  | 'COPILOT_SUGGESTION'
  | 'TEST_PASSED'
  | 'DEPLOYMENT'
  | 'COMMENT';

export interface WorkspaceActivity {
  id: string;
  productId: string;
  type: ActivityEventType;
  author: {
    name: string;
    role: string;
    avatarBg: string;
  };
  title: string;
  description: string;
  timestamp: string;
  tag?: string;
}

export interface SprintStory {
  id: string;
  productId: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  points: number;
  assignee: {
    name: string;
    role: string;
    avatarBg: string;
  };
  priority: 'P0' | 'P1' | 'P2';
  category: string;
  acceptanceCriteria?: string[];
  riceScore?: number;
}

export interface CompleteWorkspacePayload {
  name: string;
  vision?: string;
  description?: string;
  industry?: string;
  targetAudience?: string;
  problemStatement: string;
  proposedSolution?: string;
  strategicGoals?: string;
  selectedArtifacts?: ArtifactType[];
}

// ==========================================
// API GATEWAY & DEVELOPER INTERFACE TYPES
// ==========================================

export type ApiScope = 
  | 'artifacts:read'
  | 'artifacts:write'
  | 'generate:execute'
  | 'comments:manage'
  | 'schemas:validate'
  | 'audit:read'
  | 'admin:all';

export type ApiEnvironment = 'production' | 'staging' | 'development';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // e.g. "sk_live_prodpilot_88a9" or masked "sk_live_••••••88a9"
  secretToken?: string; // Only returned on generation
  hashedToken: string;
  environment: ApiEnvironment;
  scopes: ApiScope[];
  rateLimitPerMinute: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  requestCount: number;
  lastClientIp?: string;
}

export interface ApiEndpointSpec {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  category: 'Generation Engine' | 'Zod Schemas & Migration' | 'Workspaces & Products' | 'Discussions & Collaboration' | 'Governance & Approvals' | 'Developer Keys & Telemetry';
  title: string;
  description: string;
  requiredScopes: ApiScope[];
  rateLimit: string;
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header';
    type: string;
    required: boolean;
    description: string;
    default?: string;
  }>;
  requestBodySchema?: string;
  defaultRequestBody?: string;
  responseSample: any;
  curlExample: string;
}

export interface ApiExecutionResult {
  statusCode: number;
  statusText: string;
  latencyMs: number;
  headers: Record<string, string>;
  data: any;
  timestamp: string;
}

export interface ApiGatewayTelemetry {
  status: 'operational' | 'degraded';
  uptimePercentage: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalApiCalls24h: number;
  activeApiKeysCount: number;
  validationSuccessRate: number;
  rateLimitQuota: {
    limitPerMinute: number;
    remaining: number;
  };
}

export interface ApiRequestAuditLogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  apiKeyPrefix?: string;
  clientIp: string;
  scopeUsed?: string;
  outcome: 'SUCCESS' | 'CLIENT_ERROR' | 'SERVER_ERROR' | 'UNAUTHORIZED';
  details: string;
  userAgent?: string;
}

export interface ApiAuditLogsStats {
  totalRequests: number;
  successCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  avgLatencyMs: number;
  successRate: number;
}

// ==========================================
// AI RATE LIMITER & QUOTA MONITOR TYPES
// ==========================================

export interface AiServiceQuota {
  serviceId: string;
  serviceName: string;
  modelIdentifier: string;
  category: 'Core Generation' | 'Reasoning & Verification' | 'Streaming Engine' | 'Vector Grounding' | 'Failover Redundancy';
  status: 'healthy' | 'approaching_limit' | 'throttled' | 'standby';
  rpmQuota: number;
  rpmUsed: number;
  rpmRemaining: number;
  tpmQuota: number;
  tpmUsed: number;
  tpmRemaining: number;
  dailyTokenQuota: number;
  dailyTokenUsed: number;
  dailyTokenRemaining: number;
  dailyRequestQuota: number;
  dailyRequestUsed: number;
  dailyRequestRemaining: number;
  concurrencyLimit: number;
  concurrencyCurrent: number;
  upcomingWindowResetSeconds: number;
  upcomingDailyResetUtc: string;
  p95LatencyMs: number;
  retryAfterSeconds?: number;
  lastRequestAt: string;
  hourlySparkline: number[];
}

export interface AiGatewayRateLimiterOverview {
  overallStatus: 'optimal' | 'warning' | 'throttled';
  tier: 'Developer Free' | 'Pro PM Workspace' | 'Enterprise Scale';
  slidingWindowSeconds: number;
  upcomingWindowResetSeconds: number;
  upcomingDailyResetUtc: string;
  totalDailyRequestsQuota: number;
  totalDailyRequestsUsed: number;
  totalDailyRequestsRemaining: number;
  totalDailyTokensQuota: number;
  totalDailyTokensUsed: number;
  totalDailyTokensRemaining: number;
  activeConcurrency: number;
  maxConcurrency: number;
  services: AiServiceQuota[];
  tokenBuckets: Array<{
    bucketId: string;
    name: string;
    capacity: number;
    currentTokens: number;
    fillPercentage: number;
    refillRatePerSec: number;
    algorithm: 'Token Bucket' | 'Sliding Window Counter' | 'Leaky Bucket';
  }>;
  recentThrottleEvents: Array<{
    id: string;
    timestamp: string;
    serviceId: string;
    reason: string;
    retryAfterSeconds: number;
  }>;
}

// Sandbox Environment & Resiliency Engine Types
export type EnvironmentMode = 'production' | 'sandbox';

export interface SandboxChaosRule {
  id: string;
  name: string;
  type: 'latency' | 'rate_limit' | 'service_unavailable' | 'token_expiry' | 'db_failover' | 'schema_drift';
  enabled: boolean;
  description: string;
  impact: string;
  statusCode?: number;
  delayMs?: number;
}

export interface SandboxFeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environment: 'all' | 'sandbox_only';
  targetAudience: string;
  conversionImpactEstimate: string;
  churnRiskEstimate: string;
}

export interface SandboxTelemetryEvent {
  id: string;
  timestamp: string;
  event: string;
  status: 'success' | 'warn' | 'error';
  persona: string;
  latencyMs: number;
  details: string;
  endpoint: string;
}

export interface SandboxWebhook {
  id: string;
  name: string;
  targetService: 'Jira' | 'Slack' | 'GitHub' | 'Linear' | 'DataDog' | 'PagerDuty';
  event: string;
  targetUrl: string;
  lastDispatchedAt?: string;
  lastStatus?: 'success' | 'failed';
  lastStatusCode?: number;
  lastLatencyMs?: number;
  payloadSample: string;
}

export type WebhookEventType = 
  | 'prd.generated' 
  | 'prd.updated' 
  | 'user_stories.generated' 
  | 'user_stories.updated' 
  | 'sprint.planned' 
  | 'sprint.updated';

export interface AppWebhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  enabled: boolean;
  events: WebhookEventType[];
  targetService: 'Jira' | 'Slack' | 'GitHub' | 'Linear' | 'Discord' | 'Custom';
  createdAt: string;
  updatedAt: string;
  lastDispatchedAt?: string;
  lastStatus?: 'success' | 'failed' | null;
  lastStatusCode?: number | null;
  lastLatencyMs?: number | null;
  deliveriesCount: number;
  failureCount: number;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  webhookName: string;
  event: WebhookEventType;
  url: string;
  status: 'success' | 'failed';
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  requestPayload: any;
  responseBody?: string;
  signature?: string;
}

export interface WebhooksOverviewStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successRate: number;
  subscribedEventsCount: number;
}

export interface SandboxPreFlightCheck {
  id: string;
  name: string;
  category: 'Schema' | 'Resiliency' | 'Security' | 'Performance' | 'Quality';
  passed: boolean;
  severity: 'critical' | 'high' | 'medium';
  details: string;
}

export interface SandboxStatus {
  mode: EnvironmentMode;
  virtualUsersCount: number;
  rps: number;
  p95LatencyMs: number;
  errorRate: number;
  chaosModeActive: boolean;
  activeRulesCount: number;
  chaosRules: SandboxChaosRule[];
  featureFlags: SandboxFeatureFlag[];
  webhooks: SandboxWebhook[];
  recentTelemetry: SandboxTelemetryEvent[];
  preFlightChecks: SandboxPreFlightCheck[];
  lastPromotedAt?: string;
  lastSnapshotAt?: string;
}

export interface ServiceHealthItem {
  id: string;
  name: string;
  endpoint: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs: number;
  uptime: string;
  statusCode: number;
  description: string;
  lastChecked: string;
}

export interface LatencyTrendPoint {
  timestamp: string;
  geminiMs: number;
  backendMs: number;
  totalMs?: number;
  payloadKb?: number;
}

export interface DashboardThresholdConfig {
  latencyUpperMs: number;        // Alert threshold for upper latency spike in ms
  latencyDropPercent: number;    // Anomaly threshold for sudden drop percentage
  backendLatencyMs: number;      // Alert threshold for backend proxy SLA in ms
  payloadSizeKb: number;         // Max payload size alert threshold in KB
  payloadWarningKb: number;      // Payload size warning threshold in KB
  enableVisualMarkers: boolean;  // Render threshold reference markers on real-time charts
  enableSpikeHighlight: boolean; // Automatically highlight spike/drop points in red
  enableBrowserAlerts: boolean;  // Trigger desktop browser alert on breach
  enableSoundAlerts: boolean;    // Trigger acoustic chime on breach
}

export interface ThresholdViolation {
  metricName: string;
  configuredThreshold: string;
  observedValue: string;
  delta: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'VIOLATED' | 'SLA_BREACH' | 'RECOVERED';
}

export interface CapturedDashboardState {
  systemStatus: string;
  productionReadinessScore: number;
  geminiModel: string;
  geminiLatencyMs: number;
  backendLatencyMs: number;
  totalLatencyMs: number;
  payloadKb?: number;
  statusCodeDistribution: { '2xx': number; '4xx': number; '5xx': number };
  servicesSnapshot: Array<{ id?: string; name: string; endpoint: string; status: string; latencyMs: number; uptime: string }>;
  endpointViolationsCount: number;
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  title: string;
  severity: 'CRITICAL' | 'MAJOR' | 'WARNING';
  triggerReason: string;
  observedLatencyMs: number;
  thresholdLatencyMs: number;
  status: 'ACTIVE' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  capturedState: CapturedDashboardState;
  violations: ThresholdViolation[];
  recentLogs: Array<{ id?: string; timestamp: string; action: string; user: string; details: string; status?: string; latencyMs?: number }>;
  rootCauseAnalysis: {
    summary: string;
    probableCause: string;
    impactLevel: string;
    remediationSteps: string[];
  };
  generatedBy: string;
  notes?: string;
}

export interface ApiHealthMetrics {
  gemini: {
    status: 'operational' | 'degraded' | 'quota_exhausted';
    hasApiKey: boolean;
    keyMasked: string;
    model: string;
    tier: string;
    isQuotaExhausted: boolean;
    quotaExhaustedUntil: string | null;
    currentLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    rateLimitRpm: number;
    rateLimitTpm: number;
    quotaUsageDailyPercent: number;
    totalRequests24h: number;
    successRate: number;
  };
  services: ServiceHealthItem[];
  latencyTrend: LatencyTrendPoint[];
  statusCodeDistribution: {
    '2xx': number;
    '4xx': number;
    '5xx': number;
  };
  productionReadinessScore: number;
  readinessChecks: Array<{
    name: string;
    passed: boolean;
    metric: string;
    threshold: string;
  }>;
  endpointDistribution?: EndpointDistributionItem[];
}

export interface EndpointDistributionItem {
  id: string;
  endpoint: string;
  serviceName: string;
  category: 'generation' | 'reasoning' | 'solver' | 'sandbox' | 'agile' | 'gateway' | 'database' | 'telemetry';
  totalRequests: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastCalled: string;
  distributionPercent: number;
  recentStatus: 'healthy' | 'warning' | 'critical';
  // 1-Minute Sliding Window 5xx Metrics
  oneMinuteTotalRequests?: number;
  oneMinute5xxCount?: number;
  oneMinute5xxErrorRate?: number;
  is5xxBreached?: boolean;
}

export interface KeyRotationHistoryEntry {
  id: string;
  timestamp: string;
  initiatedBy: string;
  previousKeyMask: string;
  newKeyMask: string;
  status: 'completed' | 'cancelled' | 'failed';
  durationSeconds: number;
  gracePeriodSeconds: number;
  verifiedLatencyMs: number;
  requestsServedDuringTransition: number;
  zeroDowntimeVerified: boolean;
}

export interface KeyRotationStatus {
  isRotating: boolean;
  primaryKeyMask: string;
  candidateKeyMask: string | null;
  fallbackKeyMask: string | null;
  status: 'active' | 'validating' | 'grace_period' | 'completed' | 'cancelled' | 'failed';
  remainingSeconds: number;
  totalSeconds: number;
  startedAt: string | null;
  gracePeriodEndsAt: string | null;
  requestsServedByNewKey: number;
  requestsServedByOldKey: number;
  lastRotatedAt: string;
  rotationHistory: KeyRotationHistoryEntry[];
}

export interface DatabaseTableMeta {
  tableName: string;
  rowCount: number;
  columns: Array<{ name: string; type: string; isPrimary?: boolean; isForeign?: boolean }>;
  description: string;
}

export interface DatabaseStatusResponse {
  engine: string;
  host: string;
  region: string;
  connected: boolean;
  poolActive: boolean;
  poolMax: number;
  queryLatencyMs: number;
  tables: DatabaseTableMeta[];
  authBridge: {
    provider: string;
    currentUserEmail: string;
    rlsStatus: string;
    supabaseCompatibility: boolean;
    anonKeyMasked: string;
    serviceKeyConfigured: boolean;
  };
  firestoreSync: {
    status: 'online' | 'connecting' | 'offline';
    databaseId: string;
    projectId: string;
    lastSyncedAt: string;
  };
}

export interface SqlQueryResult {
  success: boolean;
  query: string;
  latencyMs: number;
  rowCount: number;
  columns: string[];
  rows: any[];
  error?: string;
}

export interface PushAlertEvent {
  id: string;
  timestamp: string;
  errorRate: number;
  threshold: number;
  serviceName: string;
  details: string;
  severity: 'warning' | 'critical' | 'recovered';
}

export interface ApiAlertThresholdConfig {
  enabled: boolean;
  thresholdPercent: number; // e.g. 5.0
  cooldownSeconds: number; // e.g. 60
  soundEnabled: boolean;
  desktopNotification: boolean;
  inAppNotification: boolean;
}

export interface Endpoint5xxAlertConfig {
  enabled: boolean;
  thresholdPercent: number; // default 5.0%
  windowSeconds: number; // 60s (1-minute window)
  monitoredEndpoints: string[]; // specific endpoints to monitor
  minRequestsInWindow: number; // minimum requests in 1m window before alerting (e.g. 3)
  desktopNotifications: boolean;
  soundAlerts: boolean;
  cooldownSeconds: number;
}

export interface Endpoint5xxAlertEvent {
  id: string;
  timestamp: string;
  endpoint: string;
  serviceName: string;
  errorRate5xx: number; // e.g. 12.5%
  threshold: number; // e.g. 5.0%
  windowDurationSeconds: number; // 60
  error5xxCount: number;
  totalRequestsInWindow: number;
  severity: 'warning' | 'critical' | 'recovered';
  details: string;
}

