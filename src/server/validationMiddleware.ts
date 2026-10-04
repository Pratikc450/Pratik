import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

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
 * Express middleware to strictly validate incoming request body against a Zod schema.
 * Replaces req.body with the parsed and coerced data if successful.
 * Returns HTTP 400 Bad Request with standardized error structure if invalid.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid request payload: ${message}`,
        details
      });
    }

    // Assign sanitized & validated data
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware to validate query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      return res.status(400).json({
        error: 'Query Validation Error',
        message: `Invalid query parameters: ${message}`,
        details
      });
    }

    req.query = result.data;
    next();
  };
}

/**
 * Express middleware to validate path parameters against a Zod schema.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const { message, details } = formatZodError(result.error);
      return res.status(400).json({
        error: 'Params Validation Error',
        message: `Invalid route parameters: ${message}`,
        details
      });
    }

    req.params = result.data;
    next();
  };
}
