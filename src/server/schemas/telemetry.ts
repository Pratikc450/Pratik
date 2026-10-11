import { z } from 'zod';

/**
 * Validation Telemetry & Schema Drift Schemas
 */

export const TelemetryIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
  code: z.string()
});

export const ReportValidationFailureSchema = z.object({
  endpoint: z.string().min(1, 'Endpoint is required'),
  method: z.string().optional().default('POST'),
  issues: z.array(TelemetryIssueSchema).min(1, 'At least one validation issue is required'),
  driftType: z.string().optional(),
  samplePayload: z.any().optional(),
  context: z.string().optional()
});

export const TelemetryQuerySchema = z.object({
  endpoint: z.string().optional(),
  driftType: z.string().optional(),
  limit: z.coerce.number().optional().default(50)
});
