import { z } from 'zod';

/**
 * User Story, Sprint Backlog, and Prioritization Schemas
 */

export const UserStoryItemSchema = z.object({
  id: z.string(),
  epicTitle: z.string().optional().default('Core Epic'),
  asA: z.string().min(3),
  iWant: z.string().min(5),
  soThat: z.string().min(5),
  acceptanceCriteria: z.array(z.string()).min(2, 'At least 2 acceptance criteria required per story'),
  persona: z.string(),
  reach: z.number().min(1).max(100000),
  impact: z.number().min(0.25).max(3),
  confidence: z.number().min(0.1).max(1.0),
  effort: z.number().min(0.5).max(10),
  riceScore: z.number().optional(),
  estimationJustification: z.string().min(10)
});

export const UserStoriesSchema = z.object({
  epicTitle: z.string().min(5),
  featureSummary: z.string(),
  stories: z.array(UserStoryItemSchema).min(1, 'At least 1 user story must be generated'),
  dependencies: z.array(z.string()),
  openQuestions: z.array(z.string())
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

export const AdvanceSprintStorySchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  status: z.string().min(1, 'status is required')
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
  sprint: z.string().optional(),
  sprintId: z.string().optional(),
  action: z.string().optional(),
  isApprovalGate: z.boolean().optional(),
  userId: z.string().optional(),
  riceUpdates: z.object({
    reach: z.coerce.number().optional(),
    impact: z.coerce.number().optional(),
    confidence: z.coerce.number().optional(),
    effort: z.coerce.number().optional(),
    riceScore: z.coerce.number().optional()
  }).optional(),
  updates: z.array(z.object({
    id: z.string().min(1, 'Story id is required in updates list'),
    confidence: z.coerce.number().optional(),
    riceScore: z.coerce.number().optional(),
    reach: z.coerce.number().optional(),
    impact: z.coerce.number().optional(),
    effort: z.coerce.number().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    sprint: z.string().optional(),
    sprintId: z.string().optional()
  })).optional()
}).refine(data => (Array.isArray(data.storyIds) && data.storyIds.length > 0) || (Array.isArray(data.updates) && data.updates.length > 0), {
  message: 'storyIds array or updates array is required'
});

export const AddActivitySchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().optional(),
  authorName: z.string().optional(),
  authorRole: z.string().optional()
});

export const SuggestRiceSchema = z.union([
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
  stories: z.array(z.any()).optional(),
  story: z.any().optional(),
  productName: z.string().optional(),
  productId: z.string().optional()
}).refine(data => (Array.isArray(data.stories) && data.stories.length > 0) || data.story !== undefined, {
  message: 'At least one story (story or stories array) is required to estimate KPI impact'
});

export const ConfidenceAuditSchema = z.object({
  stories: z.array(z.any()).min(1, 'At least one story is required for confidence audit'),
  productName: z.string().optional(),
  productId: z.string().optional(),
  deliveryTelemetry: z.any().optional()
});

export const ImpactForecastSchema = z.object({
  stories: z.array(z.any()).optional().default([]),
  story: z.any().optional(),
  productId: z.string().optional(),
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
