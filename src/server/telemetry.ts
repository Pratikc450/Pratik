import { Request } from 'express';
import { ZodIssue } from 'zod';

export type DriftType = 
  | 'MISSING_REQUIRED_FIELD'
  | 'TYPE_MISMATCH'
  | 'VALUE_OUT_OF_RANGE'
  | 'CUSTOM_RULE_FAILED'
  | 'INVALID_ENUM_OPTION'
  | 'SCHEMA_DRIFT';

export interface ValidationFailureEvent {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  driftType: DriftType;
  issues: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  failedFields: string[];
  samplePayload?: Record<string, any>;
  clientReported?: boolean;
}

export interface TelemetrySummary {
  totalFailures: number;
  lastFailureAt: string | null;
  driftBreakdown: Record<DriftType, number>;
  topFailedEndpoints: Array<{ endpoint: string; count: number }>;
  topFailedFields: Array<{ field: string; count: number }>;
  recentFailures: ValidationFailureEvent[];
}

class ValidationTelemetryService {
  private events: ValidationFailureEvent[] = [];
  private readonly maxEvents = 200;

  /**
   * Intelligently classifies the primary schema drift pattern
   */
  public classifyDriftType(issues: Array<{ code: string; message: string }>): DriftType {
    if (!issues || issues.length === 0) return 'SCHEMA_DRIFT';

    const hasMissing = issues.some(
      (i) => i.message.toLowerCase().includes('required') || i.code === 'invalid_type' && i.message.toLowerCase().includes('undefined')
    );
    if (hasMissing) return 'MISSING_REQUIRED_FIELD';

    const hasTypeMismatch = issues.some(
      (i) => i.code === 'invalid_type' || i.message.toLowerCase().includes('expected')
    );
    if (hasTypeMismatch) return 'TYPE_MISMATCH';

    const hasRange = issues.some(
      (i) => i.code === 'too_small' || i.code === 'too_big' || i.message.toLowerCase().includes('characters')
    );
    if (hasRange) return 'VALUE_OUT_OF_RANGE';

    const hasEnum = issues.some(
      (i) => i.code === 'invalid_enum_value' || i.message.toLowerCase().includes('options')
    );
    if (hasEnum) return 'INVALID_ENUM_OPTION';

    const hasCustom = issues.some((i) => i.code === 'custom');
    if (hasCustom) return 'CUSTOM_RULE_FAILED';

    return 'SCHEMA_DRIFT';
  }

  /**
   * Sanitizes payload by stripping potential credentials or massive bodies
   */
  private sanitizePayload(body: any): Record<string, any> | undefined {
    if (!body || typeof body !== 'object') return undefined;
    try {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(body)) {
        if (/token|password|secret|key/i.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.length > 150) {
          sanitized[key] = value.slice(0, 150) + '... (truncated)';
        } else if (Array.isArray(value)) {
          sanitized[key] = `[Array length: ${value.length}]`;
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = '[Nested Object]';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    } catch {
      return { _note: 'Payload could not be serialized' };
    }
  }

  /**
   * Captures and records a validation failure
   */
  public recordFailure(
    req: Request | { method?: string; originalUrl?: string; url?: string; ip?: string; headers?: Record<string, any> },
    issues: ZodIssue[] | Array<{ path: string | string[]; message: string; code: string }>,
    samplePayload?: any,
    clientReported = false
  ): ValidationFailureEvent {
    const formattedIssues = issues.map((iss) => ({
      path: Array.isArray(iss.path) ? iss.path.join('.') : String(iss.path || 'root'),
      message: iss.message,
      code: iss.code
    }));

    const driftType = this.classifyDriftType(formattedIssues);
    const failedFields = Array.from(new Set(formattedIssues.map((i) => i.path).filter(Boolean)));
    const endpoint = (req as Request).originalUrl || (req as any).url || 'unknown';
    const method = req.method || 'POST';
    const ip = (req as Request).ip || (req.headers && (req.headers['x-forwarded-for'] as string)) || '127.0.0.1';
    const userAgent = (req.headers && (req.headers['user-agent'] as string)) || 'unknown-client';

    const event: ValidationFailureEvent = {
      id: `val_fail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      endpoint: `${method} ${endpoint}`,
      method,
      ip: String(ip),
      userAgent,
      driftType,
      issues: formattedIssues,
      failedFields,
      samplePayload: this.sanitizePayload(samplePayload || (req as Request).body),
      clientReported
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    return event;
  }

  /**
   * Aggregates telemetry stats across all recorded validation events
   */
  public getStats(filterEndpoint?: string, filterDriftType?: string, limit = 50): TelemetrySummary {
    let filtered = this.events;
    if (filterEndpoint) {
      filtered = filtered.filter((e) => e.endpoint.toLowerCase().includes(filterEndpoint.toLowerCase()));
    }
    if (filterDriftType) {
      filtered = filtered.filter((e) => e.driftType === filterDriftType);
    }

    const driftBreakdown: Record<DriftType, number> = {
      MISSING_REQUIRED_FIELD: 0,
      TYPE_MISMATCH: 0,
      VALUE_OUT_OF_RANGE: 0,
      CUSTOM_RULE_FAILED: 0,
      INVALID_ENUM_OPTION: 0,
      SCHEMA_DRIFT: 0
    };

    const endpointCounts: Record<string, number> = {};
    const fieldCounts: Record<string, number> = {};

    for (const e of this.events) {
      driftBreakdown[e.driftType] = (driftBreakdown[e.driftType] || 0) + 1;
      endpointCounts[e.endpoint] = (endpointCounts[e.endpoint] || 0) + 1;
      for (const f of e.failedFields) {
        fieldCounts[f] = (fieldCounts[f] || 0) + 1;
      }
    }

    const topFailedEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topFailedFields = Object.entries(fieldCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFailures: this.events.length,
      lastFailureAt: this.events[0]?.timestamp || null,
      driftBreakdown,
      topFailedEndpoints,
      topFailedFields,
      recentFailures: filtered.slice(0, limit)
    };
  }

  /**
   * Resets all telemetry logs
   */
  public clear(): void {
    this.events = [];
  }
}

export const validationTelemetry = new ValidationTelemetryService();
