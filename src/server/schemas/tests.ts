import { z } from 'zod';

/**
 * Product Testing, Acceptance Scenarios, and E2E Simulation Schemas
 */

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

export const AcceptanceTestSubmissionSchema = z.object({
  testId: z.string().min(1, 'testId is required'),
  targetArtifactId: z.string().optional(),
  scenarioId: z.string().optional(),
  status: z.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']).optional(),
  executionDurationMs: z.number().optional(),
  errorDetails: z.string().optional()
});

export const AcceptanceCriteriaSchema = z.object({
  featureId: z.string().min(1),
  scenarios: z.array(z.object({
    id: z.string(),
    title: z.string(),
    given: z.string().min(3),
    when: z.string().min(3),
    then: z.string().min(3),
    edgeCase: z.boolean().default(false)
  })).min(1, 'At least 1 scenario required')
});
