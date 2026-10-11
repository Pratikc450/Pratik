import { z } from 'zod';

/**
 * ============================================================================
 * LEGACY ARTIFACT SCHEMAS (VERSION 1)
 * ============================================================================
 * Maintained for backward compatibility with historical artifacts, saved iterations,
 * and legacy export formats. Allows un-migrated legacy payloads to validate cleanly.
 */

// 1. PRD Schema (v1 - Legacy)
export const PrdSchemaV1 = z.object({
  schemaVersion: z.union([z.literal(1), z.literal('1'), z.number()]).optional().default(1),
  title: z.string().min(1, 'Title is required'),
  objective: z.string().min(1, 'Objective must be specified'),
  problemStatement: z.string().optional().default('Legacy baseline problem statement not explicitly detailed in v1 specification.'),
  targetUsers: z.array(z.string()).optional().default(['General Users']),
  functionalRequirements: z.array(
    z.object({
      id: z.string().optional().default(() => `FR-${Math.floor(Math.random() * 1000)}`),
      requirement: z.string(),
      description: z.string().optional(),
      priority: z.string().optional().default('SHOULD')
    })
  ).min(1, 'At least 1 functional requirement required'),
  nonFunctionalRequirements: z.array(z.string()).optional().default([]),
  successMetrics: z.array(
    z.object({
      metric: z.string(),
      target: z.string(),
      currentBaseline: z.string().optional().default('unknown')
    })
  ).optional().default([]),
  risks: z.union([
    z.array(z.string()),
    z.array(z.object({
      risk: z.string(),
      mitigation: z.string().optional().default('Standard monitoring')
    }))
  ]).optional().default([]),
  mvpScope: z.array(z.string()).optional().default([]),
  outOfScope: z.array(z.string()).optional().default([]),
  openQuestions: z.array(z.string()).optional().default([])
});

// 2. User Stories Schema (v1 - Legacy)
export const UserStoryItemSchemaV1 = z.object({
  id: z.string().optional().default(() => `US-${Math.floor(Math.random() * 1000)}`),
  epicTitle: z.string().optional().default('Core Epic'),
  asA: z.string().min(1),
  iWant: z.string().min(1),
  soThat: z.string().min(1),
  acceptanceCriteria: z.array(z.string()).optional().default(['Criterion 1']),
  persona: z.string().optional().default('End User'),
  reach: z.coerce.number().optional().default(1000),
  impact: z.coerce.number().optional().default(1.0),
  confidence: z.coerce.number().optional().default(0.8),
  effort: z.coerce.number().optional().default(2.0),
  riceScore: z.coerce.number().optional(),
  estimationJustification: z.string().optional().default('Standard baseline estimation')
});

export const UserStoriesSchemaV1 = z.object({
  schemaVersion: z.literal(1).optional().default(1),
  epicTitle: z.string().optional().default('Core Features'),
  featureSummary: z.string().optional().default('User story backlog'),
  stories: z.array(UserStoryItemSchemaV1).min(1, 'At least 1 story required'),
  dependencies: z.array(z.string()).optional().default([]),
  openQuestions: z.array(z.string()).optional().default([])
});

// 3. Roadmap Schema (v1 - Legacy)
export const RoadmapPhaseSchemaV1 = z.object({
  phaseName: z.string(),
  targetQuarter: z.string().optional().default('Q1'),
  milestones: z.array(z.string()).optional().default([]),
  deliverables: z.array(z.string()).optional().default([]),
  dependencies: z.array(z.string()).optional().default([])
});

export const RoadmapSchemaV1 = z.object({
  schemaVersion: z.literal(1).optional().default(1),
  theme: z.string().min(1, 'Theme is required'),
  timeHorizon: z.string().optional().default('12 Months'),
  phases: z.array(RoadmapPhaseSchemaV1).optional().default([]),
  quarterHorizons: z.array(z.any()).optional().default([]),
  strategicAlignment: z.string().optional().default('Aligned with core business goals'),
  openQuestions: z.array(z.string()).optional().default([])
});

// 4. Features Schema (v1 - Legacy)
export const FeaturesSchemaV1 = z.object({
  schemaVersion: z.literal(1).optional().default(1),
  featureName: z.string().min(1),
  summary: z.string().optional().default(''),
  userValueProposition: z.string().optional().default(''),
  coreRequirements: z.array(
    z.object({
      id: z.string().optional().default(() => `REQ-${Math.floor(Math.random() * 1000)}`),
      title: z.string(),
      description: z.string().optional().default(''),
      edgeCases: z.array(z.string()).optional().default([]),
      complexity: z.string().optional().default('MEDIUM')
    })
  ).optional().default([]),
  technicalConstraints: z.array(z.string()).optional().default([]),
  openQuestions: z.array(z.string()).optional().default([])
});

// 5. Product Vision Schema (v1 - Legacy)
export const ProductVisionSchemaV1 = z.object({
  schemaVersion: z.literal(1).optional().default(1),
  visionStatement: z.string().min(5),
  targetMarket: z.string().optional().default('General Market'),
  coreValuePillars: z.array(z.string()).optional().default([]),
  longTermImpact: z.string().optional().default('')
});

// 6. Personas Schema (v1 - Legacy)
export const PersonasSchemaV1 = z.object({
  schemaVersion: z.literal(1).optional().default(1),
  personas: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      demographics: z.string().optional().default(''),
      painPoints: z.array(z.string()).optional().default([]),
      goals: z.array(z.string()).optional().default([]),
      techComfort: z.string().optional().default('Medium')
    })
  ).min(1)
});

// 7. KPIs Schema (v1 - Legacy)
export const KpisSchemaV1 = z.object({
  schemaVersion: z.literal(1).optional().default(1),
  northStarMetric: z.object({
    metric: z.string(),
    target: z.string()
  }),
  supportingKpis: z.array(z.object({
    name: z.string(),
    target: z.string()
  })).optional().default([])
});
