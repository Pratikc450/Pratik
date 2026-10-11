import { z } from 'zod';

/**
 * Artifact Generation & Lifecycle Schemas
 */

export const GenerateRequestSchema = z.object({
  requestId: z.string().min(1, 'requestId is required and cannot be empty'),
  productId: z.string().min(1, 'productId is required and cannot be empty'),
  taskType: z.string().min(1, 'taskType is required'),
  userRequest: z.string().min(1, 'userRequest is required and cannot be empty'),
  schemaVersion: z.union([z.number(), z.string()]).optional().default(2),
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

export const ApproveArtifactSchema = z.object({
  userId: z.string().optional(),
  approvedBy: z.string().optional().default('Lead Product Manager')
});

export const AddRevisionSchema = z.object({
  changeSummary: z.string().min(1, 'changeSummary is required'),
  author: z.string().optional().default('Product Manager'),
  schemaData: z.any().optional(),
  schemaVersion: z.union([z.number(), z.string()]).optional().default(2),
  customNote: z.string().optional()
});

export const ValidateArtifactPayloadSchema = z.object({
  taskType: z.string().min(1, 'taskType is required'),
  data: z.any(),
  schemaVersion: z.union([z.number(), z.string()]).optional(),
  autoMigrate: z.boolean().optional().default(false)
});

export * from './versions/index.js';

// Helper to check for falsifiable objectives (reject generic empty buzzwords)
export const falsifiableObjectiveValidator = (val: string) => {
  if (val.length < 20) return false;
  const genericPatterns = [
    /^(help users|improve experience|make it better|make it faster|delight customers)\.?$/i,
    /^improve (the )?user experience$/i,
    /^make the product easier to use$/i,
  ];
  if (genericPatterns.some(pattern => pattern.test(val.trim()))) {
    return false;
  }
  return true;
};

// PRD Schema
export const PrdSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  objective: z.string().min(20, 'Objective must be at least 20 characters').refine(
    falsifiableObjectiveValidator,
    'Objective must be specific and falsifiable (cannot be generic like "help users" or "improve experience" without concrete targets)'
  ),
  problemStatement: z.string().min(15, 'Problem statement must be at least 15 characters'),
  targetUsers: z.array(z.string()).min(1, 'At least 1 target user group must be specified'),
  functionalRequirements: z.array(z.object({
    id: z.string(),
    requirement: z.string().min(5),
    priority: z.enum(['MUST', 'SHOULD', 'COULD'])
  })).min(1, 'At least 1 functional requirement required'),
  nonFunctionalRequirements: z.array(z.string()).min(1, 'At least 1 non-functional requirement required'),
  successMetrics: z.array(z.object({
    metric: z.string(),
    target: z.string(),
    currentBaseline: z.string().default('unknown')
  })).min(1, 'At least 1 success metric required'),
  risks: z.array(z.object({
    risk: z.string(),
    mitigation: z.string()
  })),
  mvpScope: z.array(z.string()).min(1, 'MVP scope must have at least 1 item'),
  outOfScope: z.array(z.string()).min(1, 'Out of scope must have at least 1 item'),
  openQuestions: z.array(z.string())
});

// Feature Requirements Schema
export const FeaturesSchema = z.object({
  featureName: z.string().min(5),
  summary: z.string(),
  userValueProposition: z.string(),
  coreRequirements: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    edgeCases: z.array(z.string()),
    complexity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
  })).min(1),
  technicalConstraints: z.array(z.string()),
  openQuestions: z.array(z.string())
});

// Roadmap Schema
export const RoadmapSchema = z.object({
  theme: z.string().min(5),
  timeHorizon: z.string(),
  phases: z.array(z.object({
    phaseName: z.string(),
    targetQuarter: z.string(),
    milestones: z.array(z.string()),
    deliverables: z.array(z.string()),
    dependencies: z.array(z.string())
  })).min(1),
  strategicAlignment: z.string(),
  openQuestions: z.array(z.string())
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty'),
  author: z.object({
    name: z.string().min(1),
    role: z.string().optional().default('Team Member'),
    avatarBg: z.string().optional().default('bg-indigo-600'),
    email: z.string().optional()
  }),
  targetType: z.enum(['PRD', 'USER_STORIES', 'REQUIREMENT', 'STORY']).optional().default('REQUIREMENT'),
  requirementId: z.string().optional(),
  requirementTitle: z.string().optional(),
  tag: z.string().optional().default('General'),
  productId: z.string().optional()
});

export const CreateReplySchema = z.object({
  content: z.string().min(1, 'Reply content cannot be empty'),
  author: z.object({
    name: z.string().min(1),
    role: z.string().optional().default('Team Member'),
    avatarBg: z.string().optional().default('bg-indigo-600'),
    email: z.string().optional()
  })
});

