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
}

export interface ArtifactVersionRecord {
  version: number;
  status: ArtifactStatus;
  createdAt: string;
  createdBy?: string;
  changeSummary?: string;
  schemaData: any;
  renderedMarkdown: string;
  metadata?: Partial<GenerationMetadata>;
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
  metadata: GenerationMetadata;
  consistencyIssues?: string[];
  versionHistory?: ArtifactVersionRecord[];
}

export interface AuditLogEntry {
  id: string;
  artifactId: string;
  taskType: ArtifactType;
  action: 'GENERATED' | 'REPAIRED' | 'APPROVED' | 'MODIFIED';
  userId: string;
  timestamp: string;
  details: string;
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
