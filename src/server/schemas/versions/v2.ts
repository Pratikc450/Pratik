import { z } from 'zod';

/**
 * ============================================================================
 * CURRENT ENHANCED ARTIFACT SCHEMAS (VERSION 2)
 * ============================================================================
 * Production grade schemas enforcing strict MoSCoW prioritization, falsifiable
 * objectives, numerical RICE bounds, SLA metrics, and explicit scope boundaries.
 */

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

// 1. PRD Schema (v2 - Current Production)
export const PrdSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  objective: z.string().min(20, 'Objective must be at least 20 characters').refine(
    falsifiableObjectiveValidator,
    'Objective must be specific and falsifiable (cannot be generic like "help users" or "improve experience" without concrete targets)'
  ),
  problemStatement: z.string().min(15, 'Problem statement must be at least 15 characters'),
  targetUsers: z.array(z.string()).min(1, 'At least 1 target user group must be specified'),
  functionalRequirements: z.array(
    z.object({
      id: z.string(),
      requirement: z.string().min(5, 'Requirement description must be at least 5 characters'),
      priority: z.enum(['MUST', 'SHOULD', 'COULD'])
    })
  ).min(1, 'At least 1 functional requirement required'),
  nonFunctionalRequirements: z.array(z.string()).min(1, 'At least 1 non-functional requirement required'),
  successMetrics: z.array(
    z.object({
      metric: z.string(),
      target: z.string(),
      currentBaseline: z.string().default('unknown')
    })
  ).min(1, 'At least 1 success metric required'),
  risks: z.array(
    z.object({
      risk: z.string(),
      mitigation: z.string()
    })
  ),
  mvpScope: z.array(z.string()).min(1, 'MVP scope must have at least 1 item'),
  outOfScope: z.array(z.string()).min(1, 'Out of scope must have at least 1 item'),
  openQuestions: z.array(z.string())
});

// 2. User Stories Schema (v2 - Current Production)
export const UserStoryItemSchemaV2 = z.object({
  id: z.string(),
  epicTitle: z.string().optional().default('Core Epic'),
  asA: z.string().min(3, 'asA must be at least 3 characters'),
  iWant: z.string().min(5, 'iWant must be at least 5 characters'),
  soThat: z.string().min(5, 'soThat must be at least 5 characters'),
  acceptanceCriteria: z.array(z.string()).min(2, 'At least 2 acceptance criteria required per story'),
  persona: z.string(),
  reach: z.coerce.number().min(1).max(100000),
  impact: z.coerce.number().min(0.25).max(3),
  confidence: z.coerce.number().min(0.1).max(1.0),
  effort: z.coerce.number().min(0.5).max(10),
  riceScore: z.coerce.number().optional(),
  estimationJustification: z.string().min(10, 'Estimation justification must be at least 10 characters')
});

export const UserStoriesSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  epicTitle: z.string().min(5, 'Epic title must be at least 5 characters'),
  featureSummary: z.string(),
  stories: z.array(UserStoryItemSchemaV2).min(1, 'At least 1 user story must be generated'),
  dependencies: z.array(z.string()),
  openQuestions: z.array(z.string())
});

// 3. Roadmap Schema (v2 - Current Production)
export const RoadmapPhaseSchemaV2 = z.object({
  phaseName: z.string(),
  targetQuarter: z.string(),
  milestones: z.array(z.string()),
  deliverables: z.array(z.string()),
  dependencies: z.array(z.string())
});

export const RoadmapSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  theme: z.string().min(5, 'Theme must be at least 5 characters'),
  timeHorizon: z.string(),
  phases: z.array(RoadmapPhaseSchemaV2).min(1, 'At least 1 phase required'),
  quarterHorizons: z.array(z.any()).optional().default([]),
  strategicAlignment: z.string(),
  openQuestions: z.array(z.string())
});

// 4. Features Schema (v2 - Current Production)
export const FeaturesSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  featureName: z.string().min(5),
  summary: z.string(),
  userValueProposition: z.string(),
  coreRequirements: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      edgeCases: z.array(z.string()),
      complexity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
    })
  ).min(1),
  technicalConstraints: z.array(z.string()),
  openQuestions: z.array(z.string())
});

// 5. Product Vision Schema (v2 - Current Production)
export const ProductVisionSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  visionStatement: z.string().min(10, 'Vision statement must be at least 10 characters'),
  targetMarket: z.string().min(3),
  coreValuePillars: z.array(z.string()).min(2, 'At least 2 value pillars required'),
  longTermImpact: z.string().min(10)
});

// 6. Personas Schema (v2 - Current Production)
export const PersonasSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  personas: z.array(
    z.object({
      name: z.string().min(2),
      role: z.string().min(2),
      demographics: z.string(),
      painPoints: z.array(z.string()).min(2),
      goals: z.array(z.string()).min(2),
      techComfort: z.enum(['Low', 'Medium', 'High', 'Expert'])
    })
  ).min(1)
});

// 7. KPIs Schema (v2 - Current Production)
export const KpisSchemaV2 = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  northStarMetric: z.object({
    metric: z.string().min(3),
    target: z.string().min(2),
    currentBaseline: z.string().default('unknown'),
    timeframe: z.string().default('Annual')
  }),
  supportingKpis: z.array(
    z.object({
      name: z.string(),
      target: z.string(),
      category: z.enum(['Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral']).optional().default('Activation')
    })
  ).min(2)
});
