import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { validationTelemetry, DriftType } from './telemetry.js';

/**
 * Formats Zod validation issues into a human-readable summary string and structured array.
 */
export function formatZodError(error: ZodError): {
  message: string;
  details: Array<{ path: string; message: string; code: string }>;
} {
  const details = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));

  const message = details
    .map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
    .join('; ');

  return { message, details };
}

/**
 * Centralized Zod validation middleware function for incoming request bodies.
 * Strictly adheres incoming payload structures to predefined schemas before reaching business logic.
 * Captures and reports validation failures to the telemetry engine.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // 1. Log failure into telemetry service
      const failureEvent = validationTelemetry.recordFailure(req, result.error.issues, req.body);

      // 2. Format client-friendly structured error
      const { message, details } = formatZodError(result.error);

      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid request payload: ${message}`,
        details,
        telemetryId: failureEvent.id,
        driftType: failureEvent.driftType
      });
    }

    // Assign sanitized & coerced data to body
    req.body = result.data;
    next();
  };
}

/**
 * Centralized Zod validation middleware function for query parameters.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const failureEvent = validationTelemetry.recordFailure(req, result.error.issues, req.query);
      const { message, details } = formatZodError(result.error);

      return res.status(400).json({
        error: 'Query Validation Error',
        message: `Invalid query parameters: ${message}`,
        details,
        telemetryId: failureEvent.id,
        driftType: failureEvent.driftType
      });
    }

    req.query = result.data as any;
    next();
  };
}

/**
 * Centralized Zod validation middleware function for URL path parameters.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const failureEvent = validationTelemetry.recordFailure(req, result.error.issues, req.params);
      const { message, details } = formatZodError(result.error);

      return res.status(400).json({
        error: 'Params Validation Error',
        message: `Invalid route parameters: ${message}`,
        details,
        telemetryId: failureEvent.id,
        driftType: failureEvent.driftType
      });
    }

    req.params = result.data as any;
    next();
  };
}

/**
 * Optional standalone Express middleware to monitor response status and report any 400 validation failures
 */
export function validationFailureLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (res.statusCode === 400 && body && (body.error === 'Validation Error' || body.details)) {
      if (!body.telemetryId) {
        const issues = Array.isArray(body.details)
          ? body.details
          : [{ path: 'unknown', message: body.message || 'Validation error', code: 'custom' }];
        const failureEvent = validationTelemetry.recordFailure(req, issues, req.body);
        body.telemetryId = failureEvent.id;
        body.driftType = failureEvent.driftType;
      }
    }
    return originalJson(body);
  };

  next();
}
