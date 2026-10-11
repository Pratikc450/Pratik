/**
 * Enterprise API Client SDK
 * Provides typed, resilient, and instrumented communication between
 * the React frontend and Express backend architecture.
 */

import {
  ArtifactType,
  GeneratedArtifact,
  Product,
  ArtifactComment,
  CommentReply,
  ApiKey,
  ApiExecutionResult,
  ApiGatewayTelemetry,
  ApiRequestAuditLogEntry,
  ApiAuditLogsStats,
  AiServiceQuota,
  AiGatewayRateLimiterOverview
} from '../types.js';
import { clientRateLimiter } from './clientRateLimiter.js';

export class ApiClientError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ProductPilotApiClient {
  private activeApiKeyToken: string | null = null;
  private defaultBaseUrl: string = '';

  constructor() {
    // Check localStorage for saved developer key
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('prodpilot_active_api_key');
      if (savedKey) {
        this.activeApiKeyToken = savedKey;
      }
    }
  }

  public setApiKey(token: string | null) {
    this.activeApiKeyToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('prodpilot_active_api_key', token);
      } else {
        localStorage.removeItem('prodpilot_active_api_key');
      }
    }
  }

  public getActiveApiKey(): string | null {
    return this.activeApiKeyToken;
  }

  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; latencyMs: number; status: number; headers: Record<string, string> }> {
    const startTime = performance.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.activeApiKeyToken && !headers['Authorization'] && !headers['x-api-key']) {
      headers['Authorization'] = `Bearer ${this.activeApiKeyToken}`;
    }

    try {
      const response = await fetch(`${this.defaultBaseUrl}${path}`, {
        ...options,
        headers
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      let json: any = null;
      const text = await response.text();
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (!response.ok) {
        throw new ApiClientError(
          json?.error || json?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          json
        );
      }

      return {
        data: json as T,
        latencyMs,
        status: response.status,
        headers: resHeaders
      };
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      const latencyMs = Math.round(performance.now() - startTime);
      throw new ApiClientError(err.message || 'Network request failed', 0, { latencyMs });
    }
  }

  // Raw execution method for Interactive API Console
  public async executeRaw(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
    customHeaders?: Record<string, string>
  ): Promise<ApiExecutionResult> {
    const startTime = performance.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders || {})
    };

    if (this.activeApiKeyToken && !headers['Authorization'] && !headers['x-api-key']) {
      headers['Authorization'] = `Bearer ${this.activeApiKeyToken}`;
    }

    const reqInit: RequestInit = {
      method,
      headers
    };

    if (body !== undefined && method !== 'GET') {
      reqInit.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Client-side rate limiter guard to protect Gemini API during sandbox testing phases
    const rateLimitDecision = await clientRateLimiter.acquireToken(path, true);
    if (!rateLimitDecision.allowed) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        statusCode: 429,
        statusText: 'Client-Side Rate Limit Exceeded (Sandbox Guard)',
        latencyMs,
        headers: {
          'x-client-rate-limit': 'active',
          'x-client-ratelimit-remaining': String(rateLimitDecision.tokensRemaining),
          'retry-after': String(rateLimitDecision.resetInSeconds)
        },
        data: {
          error: rateLimitDecision.reason,
          clientRateLimited: true,
          details: {
            guard: 'Client-Side Sandbox Rate Limiter',
            resetInSeconds: rateLimitDecision.resetInSeconds,
            policy: clientRateLimiter.getConfig().policy,
            maxRpm: clientRateLimiter.getConfig().maxRpm
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await fetch(`${this.defaultBaseUrl}${path}`, reqInit);
      const latencyMs = Math.round(performance.now() - startTime);
      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      let data: any;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { rawText: text };
      }

      return {
        statusCode: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        latencyMs,
        headers: resHeaders,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        statusCode: 500,
        statusText: 'Client Connection Failure',
        latencyMs,
        headers: {},
        data: { error: err.message || 'Failed to reach API endpoint' },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==========================================
  // GENERATION ENGINE API
  // ==========================================

  public async generateArtifact(payload: {
    productId: string;
    taskType: ArtifactType;
    customPrompt?: string;
    schemaVersion?: number;
  }) {
    const res = await this.request<{
      artifact: GeneratedArtifact;
      validationAttempts: number;
      repaired: boolean;
      telemetry: any;
    }>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  // ==========================================
  // ZOD SCHEMA REGISTRY & AUTO-MIGRATION
  // ==========================================

  public async getSchemaVersions() {
    const res = await this.request<{
      success: boolean;
      currentDefaultVersion: number;
      supportedVersions: number[];
      schemas: any[];
    }>('/api/schemas/versions');
    return res.data;
  }

  public async validateArtifactPayload(payload: {
    taskType: ArtifactType;
    data: any;
    schemaVersion?: number;
    autoMigrate?: boolean;
  }) {
    const res = await this.request<{
      success: boolean;
      detectedVersion?: number;
      targetVersion?: number;
      migrated?: boolean;
      error?: string;
      issues?: any[];
      data?: any;
    }>('/api/schemas/validate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  // ==========================================
  // WORKSPACES & PRODUCTS
  // ==========================================

  public async getProducts() {
    const res = await this.request<{ products: Product[] }>('/api/products');
    return res.data.products;
  }

  public async getProduct(id: string) {
    const res = await this.request<{
      product: Product;
      problems: any[];
      personas: any[];
      features: any[];
      docs: any[];
      artifacts: GeneratedArtifact[];
    }>(`/api/products/${id}`);
    return res.data;
  }

  // ==========================================
  // ARTIFACTS & GOVERNANCE APPROVAL
  // ==========================================

  public async approveArtifact(artifactId: string, userId: string = 'Lead Product Manager') {
    const res = await this.request<{
      success: boolean;
      artifact: GeneratedArtifact;
      auditLog: any;
    }>(`/api/artifacts/${artifactId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return res.data;
  }

  // ==========================================
  // REQUIREMENT DISCUSSION THREADS API
  // ==========================================

  public async getComments(artifactId: string, requirementId?: string) {
    const q = requirementId ? `?requirementId=${encodeURIComponent(requirementId)}` : '';
    const res = await this.request<{
      success: boolean;
      artifactId: string;
      requirementId: string | null;
      totalCount: number;
      openCount: number;
      resolvedCount: number;
      comments: ArtifactComment[];
    }>(`/api/artifacts/${artifactId}/comments${q}`);
    return res.data;
  }

  public async createComment(artifactId: string, commentData: {
    content: string;
    author: { name: string; role: string; avatarBg: string; email?: string };
    targetType?: 'REQUIREMENT' | 'STORY' | 'PRD';
    requirementId?: string;
    requirementTitle?: string;
    tag?: string;
    productId?: string;
  }) {
    const res = await this.request<{ success: boolean; comment: ArtifactComment }>(
      `/api/artifacts/${artifactId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(commentData)
      }
    );
    return res.data.comment;
  }

  public async createReply(artifactId: string, commentId: string, replyData: {
    content: string;
    author: { name: string; role: string; avatarBg: string; email?: string };
  }) {
    const res = await this.request<{ success: boolean; reply: CommentReply }>(
      `/api/artifacts/${artifactId}/comments/${commentId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify(replyData)
      }
    );
    return res.data.reply;
  }

  public async resolveComment(artifactId: string, commentId: string, resolvedBy?: { name: string; role: string }) {
    const res = await this.request<{ success: boolean; comment: ArtifactComment }>(
      `/api/artifacts/${artifactId}/comments/${commentId}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({ resolvedBy })
      }
    );
    return res.data.comment;
  }

  public async toggleReaction(artifactId: string, commentId: string, emoji: string, userName: string) {
    const res = await this.request<{ success: boolean; comment: ArtifactComment }>(
      `/api/artifacts/${artifactId}/comments/${commentId}/react`,
      {
        method: 'POST',
        body: JSON.stringify({ emoji, userName })
      }
    );
    return res.data.comment;
  }

  public async deleteComment(artifactId: string, commentId: string) {
    const res = await this.request<{ success: boolean; deletedId: string }>(
      `/api/artifacts/${artifactId}/comments/${commentId}`,
      {
        method: 'DELETE'
      }
    );
    return res.data;
  }

  // ==========================================
  // API KEY LIFECYCLE & SECURITY
  // ==========================================

  public async getApiKeys() {
    const res = await this.request<{ success: boolean; apiKeys: ApiKey[] }>('/api/api-keys');
    return res.data.apiKeys;
  }

  public async createApiKey(data: {
    name: string;
    environment?: 'production' | 'staging' | 'development';
    scopes?: string[];
    expiresInDays?: number;
    rateLimitPerMinute?: number;
  }) {
    const res = await this.request<{
      success: boolean;
      apiKey: ApiKey;
    }>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data.apiKey;
  }

  public async revokeApiKey(id: string) {
    const res = await this.request<{ success: boolean; id: string; status: string }>(
      `/api/api-keys/${id}`,
      {
        method: 'DELETE'
      }
    );
    return res.data;
  }

  public async rotateApiKey(id: string) {
    const res = await this.request<{ success: boolean; apiKey: ApiKey }>(
      `/api/api-keys/${id}/rotate`,
      {
        method: 'POST'
      }
    );
    return res.data.apiKey;
  }

  public async validateApiKey(token: string, requiredScope?: string) {
    const res = await this.request<{ valid: boolean; key?: Partial<ApiKey>; reason?: string }>(
      '/api/api-keys/validate',
      {
        method: 'POST',
        body: JSON.stringify({ token, requiredScope })
      }
    );
    return res.data;
  }

  // ==========================================
  // GATEWAY TELEMETRY & HEALTH
  // ==========================================

  public async getGatewayHealth(): Promise<ApiGatewayTelemetry> {
    const res = await this.request<ApiGatewayTelemetry>('/api/gateway/health');
    return res.data;
  }

  public async getTelemetry() {
    const res = await this.request<any>('/api/telemetry');
    return res.data;
  }

  public async getAuditLogs() {
    const res = await this.request<{ logs: any[] }>('/api/audit-logs');
    return res.data.logs;
  }

  // ==========================================
  // GATEWAY REQUEST AUDIT LOGS & OBSERVABILITY
  // ==========================================

  public async getGatewayAuditLogs(filters?: {
    limit?: number;
    status?: string;
    method?: string;
    search?: string;
  }): Promise<{ logs: ApiRequestAuditLogEntry[]; stats: ApiAuditLogsStats }> {
    const params = new URLSearchParams();
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.status) params.set('status', filters.status);
    if (filters?.method) params.set('method', filters.method);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{
      success: boolean;
      logs: ApiRequestAuditLogEntry[];
      stats: ApiAuditLogsStats;
    }>(`/api/gateway/audit-logs${query}`);
    return { logs: res.data.logs, stats: res.data.stats };
  }

  public async clearGatewayAuditLogs() {
    const res = await this.request<{ success: boolean; message: string }>(
      '/api/gateway/audit-logs/clear',
      { method: 'POST' }
    );
    return res.data;
  }

  // ==========================================
  // AI RATE LIMITER & QUOTA MONITOR
  // ==========================================

  public async getGatewayRateLimits(): Promise<AiGatewayRateLimiterOverview> {
    const res = await this.request<{ success: boolean; data: AiGatewayRateLimiterOverview }>(
      '/api/gateway/rate-limits'
    );
    return res.data.data;
  }

  public async simulateRateLimitTraffic(options: {
    serviceId: string;
    requestsCount?: number;
    tokensCount?: number;
    forceThrottle?: boolean;
  }): Promise<{ success: boolean; throttled?: boolean; message?: string; error?: string; retryAfter?: number; service?: AiServiceQuota; overview: AiGatewayRateLimiterOverview }> {
    const res = await this.request<{
      success: boolean;
      throttled?: boolean;
      message?: string;
      error?: string;
      retryAfter?: number;
      service?: AiServiceQuota;
      overview: AiGatewayRateLimiterOverview;
    }>('/api/gateway/rate-limits/simulate', {
      method: 'POST',
      body: JSON.stringify(options)
    });
    return res.data;
  }

  public async resetGatewayRateLimits(): Promise<AiGatewayRateLimiterOverview> {
    const res = await this.request<{
      success: boolean;
      message: string;
      overview: AiGatewayRateLimiterOverview;
    }>('/api/gateway/rate-limits/reset', {
      method: 'POST'
    });
    return res.data.overview;
  }
}

export const apiClient = new ProductPilotApiClient();
