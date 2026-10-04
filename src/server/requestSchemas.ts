import { z } from 'zod';
import { ARTIFACT_TYPES } from '../types.js';

// ==========================================
// 1. ARTIFACT GENERATION SCHEMAS
// ==========================================

export const GenerateRequestSchema = z.object({
  requestId: z.string().min(1, 'requestId is required and cannot be empty'),
  productId: z.string().min(1, 'productId is required and cannot be empty'),
  taskType: z.string().min(1, 'taskType is required'),
  userRequest: z.string().min(1, 'userRequest is required and cannot be empty'),
  featureId: z.string().optional(),
  modelOverride: z.string().optional(),
  simulateMalformedFirstPass: z.boolean().optional(),
  simulateTimeout: z.boolean().optional()
});

export const BriefGenerateSuiteSchema = z.object({
  brief: z.object({
    title: z.string().optional(),
    productName: z.string().optional(),
    problemStatement: z.string().min(1, 'problemStatement is required'),
    productId: z.string().optional(),
    targetAudience: z.string().optional(),
    proposedSolution: z.string().optional(),
    keyFeaturesOrIdeas: z.string().optional(),
    strategicGoals: z.string().optional(),
    strategicContext: z.string().optional(),
    industry: z.string().optional()
  }).refine((b) => !!(b.title || b.productName), {
    message: 'Product brief must specify either title or productName'
  }),
  selectedArtifacts: z.array(z.string()).optional().default([])
});

export const WorkspaceGenerateCompleteSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  problemStatement: z.string().min(1, 'Problem statement is required'),
  vision: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  proposedSolution: z.string().optional(),
  strategicGoals: z.string().optional(),
  selectedArtifacts: z.array(z.string()).optional()
});

// ==========================================
// 2. PRODUCT MANAGEMENT & RESOURCES SCHEMAS
// ==========================================

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  vision: z.string().min(1, 'Product vision is required'),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional()
});

export const AddProblemSchema = z.object({
  title: z.string().min(1, 'Problem title is required'),
  description: z.string().optional(),
  impactScore: z.coerce.number().min(1).max(10).optional().default(8),
  frequency: z.string().optional().default('Daily')
});

export const AddPersonaSchema = z.object({
  name: z.string().min(1, 'Persona name is required'),
  role: z.string().min(1, 'Persona role is required'),
  goal: z.string().optional().default('Streamline workflow'),
  painPoint: z.string().optional().default('Manual inefficiencies')
});

export const AddDocSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  content: z.string().min(1, 'Document content is required'),
  type: z.string().optional().default('User Interview'),
  isUntrusted: z.boolean().optional().default(false)
});

export const CreateSprintStorySchema = z.object({
  title: z.string().min(1, 'Story title is required'),
  description: z.string().optional().default(''),
  category: z.string().optional().default('Feature'),
  status: z.string().optional().default('TODO'),
  priority: z.string().optional().default('MEDIUM'),
  storyPoints: z.coerce.number().optional().default(3),
  assignee: z.any().optional(),
  acceptanceCriteria: z.array(z.string()).optional()
});

export const UpdateStorySchema = z.object({
  reach: z.coerce.number().optional(),
  impact: z.coerce.number().optional(),
  confidence: z.coerce.number().optional(),
  effort: z.coerce.number().optional(),
  storyData: z.record(z.string(), z.any()).optional(),
  asA: z.string().optional(),
  iWant: z.string().optional(),
  soThat: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  changeSummary: z.string().optional(),
  author: z.string().optional(),
  notes: z.string().optional()
});

export const RevertStorySchema = z.object({
  targetVersion: z.coerce.number().int().min(1, 'targetVersion must be an integer >= 1'),
  userId: z.string().optional(),
  reason: z.string().optional()
});

export const BulkStoriesUpdateSchema = z.object({
  storyIds: z.array(z.string()).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  action: z.string().optional(),
  isApprovalGate: z.boolean().optional(),
  userId: z.string().optional(),
  updates: z.array(z.object({
    id: z.string().min(1, 'Story id is required in updates list'),
    confidence: z.coerce.number().optional(),
    riceScore: z.coerce.number().optional(),
    priority: z.string().optional(),
    status: z.string().optional()
  })).optional()
}).refine(data => (Array.isArray(data.storyIds) && data.storyIds.length > 0) || (Array.isArray(data.updates) && data.updates.length > 0), {
  message: 'storyIds array or updates array is required'
});

export const ApproveArtifactSchema = z.object({
  userId: z.string().optional(),
  approvedBy: z.string().optional().default('Lead Product Manager')
});

export const AddRevisionSchema = z.object({
  changeSummary: z.string().min(1, 'changeSummary is required'),
  author: z.string().optional().default('Product Manager'),
  schemaData: z.any().optional(),
  customNote: z.string().optional()
});

export const AdvanceSprintStorySchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  status: z.string().min(1, 'status is required')
});

export const AddActivitySchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().optional(),
  authorName: z.string().optional(),
  authorRole: z.string().optional()
});

// ==========================================
// 3. PRODUCT TESTING & ACCEPTANCE LAB SCHEMAS
// ==========================================

export const RunTestSchema = z.object({
  testId: z.string().min(1, 'testId is required')
});

export const GenerateAcceptanceScenariosSchema = z.object({
  productId: z.string().optional(),
  coverageFocus: z.string().optional().default('Comprehensive Journey'),
  scenarioCount: z.coerce.number().int().min(1).max(20).optional().default(3)
});

export const SimulateScenarioStepSchema = z.object({
  stepNumber: z.coerce.number().optional(),
  action: z.string().min(1, 'Step action is required'),
  expectedResult: z.string().optional(),
  validationCheck: z.string().optional()
});

export const SimulateScenarioSchema = z.object({
  scenarioId: z.string().optional(),
  scenarioTitle: z.string().optional(),
  steps: z.array(SimulateScenarioStepSchema).optional().default([])
});

// ==========================================
// 4. AI PRIORITIZATION & FEATURE SCHEMAS
// ==========================================

export const SuggestRiceSchema = z.union([
  // Nested structure: { story: { ... }, productName?: string }
  z.object({
    story: z.object({
      asA: z.string().optional(),
      persona: z.string().optional(),
      iWant: z.string().optional(),
      soThat: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      acceptanceCriteria: z.array(z.string()).optional()
    }).refine(s => !!(s.asA || s.iWant || s.title || s.description), {
      message: 'Valid user story details (asA, iWant, or description) are required'
    }),
    productName: z.string().optional(),
    productContext: z.string().optional()
  }),
  // Flat structure: { asA: '...', iWant: '...', soThat: '...' }
  z.object({
    asA: z.string().optional(),
    persona: z.string().optional(),
    iWant: z.string().optional(),
    soThat: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    productName: z.string().optional(),
    productContext: z.string().optional()
  }).refine(s => !!(s.asA || s.iWant || s.title || s.description), {
    message: 'Valid user story details (asA, iWant, or description) are required'
  })
]);

export const EstimateKpiImpactSchema = z.object({
  stories: z.array(z.any()).min(1, 'At least one story is required to estimate KPI impact'),
  productName: z.string().optional(),
  productId: z.string().optional()
});

export const ConfidenceAuditSchema = z.object({
  stories: z.array(z.any()).min(1, 'At least one story is required for confidence audit'),
  productName: z.string().optional()
});

export const ImpactForecastSchema = z.object({
  stories: z.array(z.any()).optional().default([]),
  productName: z.string().optional(),
  targetStory: z.any().optional(),
  sprintWeeks: z.coerce.number().optional().default(2)
});

export const ClusterStoriesSchema = z.object({
  stories: z.array(z.any()).min(1, 'Stories array required for clustering'),
  productName: z.string().optional()
});

export const DependencyMappingSchema = z.object({
  stories: z.array(z.any()).optional().default([]),
  productId: z.string().optional(),
  productName: z.string().optional()
});

export const RiceSuggestionsSchema = z.object({
  stories: z.array(z.any()).optional().default([]),
  personas: z.array(z.any()).optional().default([]),
  productId: z.string().optional(),
  historicalTrends: z.any().optional()
});

export const SuggestEpicMappingSchema = z.object({
  stories: z.array(z.any()).optional().default([]),
  productName: z.string().optional()
});

export const StoryRecommendationsSchema = z.object({
  stories: z.array(z.any()).optional().default([]),
  productName: z.string().optional()
});
