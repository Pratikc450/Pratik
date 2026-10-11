/**
 * Client-Side API Rate Limiter Service
 * 
 * Protects Gemini API quotas and budgets during sandbox testing phases
 * by throttling, queuing, or blocking excessive client-side requests
 * before they reach upstream endpoints.
 */

export interface ClientRateLimiterConfig {
  enabled: boolean;
  maxRpm: number; // Max requests allowed per minute in sandbox
  burstLimit: number; // Max concurrent burst allowance
  policy: 'block' | 'queue'; // Immediately reject vs smooth with client delay
  scope: 'sandbox-only' | 'all-ai-calls';
  windowSeconds: number; // Sliding window duration (default: 60)
}

export interface ClientRateLimitDecision {
  allowed: boolean;
  delayMs: number;
  reason?: string;
  tokensRemaining: number;
  resetInSeconds: number;
  endpoint: string;
  timestamp: string;
}

export interface ClientRateLimiterStats {
  config: ClientRateLimiterConfig;
  tokensRemaining: number;
  requestsInWindow: number;
  totalAllowed: number;
  totalBlocked: number;
  totalQueued: number;
  resetInSeconds: number;
  recentDecisions: ClientRateLimitDecision[];
}

const STORAGE_KEY = 'prodpilot_client_rate_limiter_config';

const DEFAULT_CONFIG: ClientRateLimiterConfig = {
  enabled: true,
  maxRpm: 12, // Conservative limit below Google AI Studio 15 RPM free tier
  burstLimit: 3,
  policy: 'block',
  scope: 'sandbox-only',
  windowSeconds: 60
};

class ClientRateLimiterService {
  private config: ClientRateLimiterConfig = { ...DEFAULT_CONFIG };
  private requestTimestamps: number[] = [];
  private totalAllowed = 0;
  private totalBlocked = 0;
  private totalQueued = 0;
  private recentDecisions: ClientRateLimitDecision[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.config = { ...DEFAULT_CONFIG, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to parse client rate limiter config', e);
      }
    }
  }

  private saveConfig() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch (e) {
        console.warn('Failed to save client rate limiter config', e);
      }
    }
  }

  public getConfig(): ClientRateLimiterConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ClientRateLimiterConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.notify();
  }

  public resetStats() {
    this.requestTimestamps = [];
    this.totalAllowed = 0;
    this.totalBlocked = 0;
    this.totalQueued = 0;
    this.recentDecisions = [];
    this.notify();
  }

  /**
   * Cleans timestamps older than the sliding window and returns current window count
   */
  private cleanWindow(now: number): number {
    const windowMs = this.config.windowSeconds * 1000;
    const cutoff = now - windowMs;
    this.requestTimestamps = this.requestTimestamps.filter(t => t > cutoff);
    return this.requestTimestamps.length;
  }

  public isGuardedEndpoint(endpoint: string, isSandboxEnv: boolean = true): boolean {
    if (!this.config.enabled) return false;

    // Check scope
    if (this.config.scope === 'sandbox-only' && !isSandboxEnv && !endpoint.includes('/sandbox/')) {
      return false;
    }

    // Match AI, Gemini, or sandbox generation routes
    const aiPatterns = [
      '/api/ai/',
      '/api/sandbox/artifacts/test-solve',
      '/api/sandbox/',
      '/api/artifacts/generate',
      '/api/artifacts/stream'
    ];

    return aiPatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Evaluates if a request should be allowed, queued, or blocked
   */
  public async acquireToken(
    endpoint: string = '/api/sandbox/test',
    isSandboxEnv: boolean = true
  ): Promise<ClientRateLimitDecision> {
    const now = Date.now();
    const activeCount = this.cleanWindow(now);
    const windowMs = this.config.windowSeconds * 1000;
    const oldestTimestamp = this.requestTimestamps[0] || now;
    const resetInSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    const tokensRemaining = Math.max(0, this.config.maxRpm - activeCount);

    // If disabled or not guarded, allow immediately
    if (!this.config.enabled || !this.isGuardedEndpoint(endpoint, isSandboxEnv)) {
      const decision: ClientRateLimitDecision = {
        allowed: true,
        delayMs: 0,
        tokensRemaining,
        resetInSeconds,
        endpoint,
        timestamp: new Date().toLocaleTimeString()
      };
      return decision;
    }

    // Check burst limit over the last 3 seconds
    const recentBurst = this.requestTimestamps.filter(t => now - t < 3000).length;
    const isBurstExceeded = recentBurst >= this.config.burstLimit;

    // Check if within RPM threshold
    if (activeCount < this.config.maxRpm && !isBurstExceeded) {
      // Allowed
      this.requestTimestamps.push(now);
      this.totalAllowed++;

      const decision: ClientRateLimitDecision = {
        allowed: true,
        delayMs: 0,
        tokensRemaining: Math.max(0, this.config.maxRpm - (activeCount + 1)),
        resetInSeconds,
        endpoint,
        timestamp: new Date().toLocaleTimeString()
      };

      this.recordDecision(decision);
      return decision;
    }

    // Limit exceeded: apply policy
    if (this.config.policy === 'queue') {
      // Delay request until token bucket refills or burst window passes
      const delayMs = isBurstExceeded ? 3200 : Math.min(windowMs, (oldestTimestamp + windowMs - now) + 200);
      this.totalQueued++;

      const decision: ClientRateLimitDecision = {
        allowed: true,
        delayMs,
        reason: isBurstExceeded
          ? `Client-side burst limiter active (${recentBurst}/${this.config.burstLimit} in 3s). Queued for ${Math.round(delayMs)}ms.`
          : `Client-side sandbox limit reached (${activeCount}/${this.config.maxRpm} RPM). Queued for ${Math.round(delayMs)}ms.`,
        tokensRemaining: 0,
        resetInSeconds,
        endpoint,
        timestamp: new Date().toLocaleTimeString()
      };

      this.recordDecision(decision);

      // Perform client-side queue delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.requestTimestamps.push(Date.now());
      return decision;
    }

    // Policy is 'block': Immediately reject
    this.totalBlocked++;
    const reason = isBurstExceeded
      ? `Client Rate Limit: Exceeded burst allowance of ${this.config.burstLimit} calls/3s during sandbox testing phase.`
      : `Client Rate Limit: Exceeded client quota cap of ${this.config.maxRpm} RPM during sandbox testing. Wait ${resetInSeconds}s to protect Gemini API quota.`;

    const decision: ClientRateLimitDecision = {
      allowed: false,
      delayMs: 0,
      reason,
      tokensRemaining: 0,
      resetInSeconds,
      endpoint,
      timestamp: new Date().toLocaleTimeString()
    };

    this.recordDecision(decision);
    return decision;
  }

  private recordDecision(decision: ClientRateLimitDecision) {
    this.recentDecisions.unshift(decision);
    if (this.recentDecisions.length > 20) {
      this.recentDecisions.pop();
    }
    this.notify();
  }

  public getStats(): ClientRateLimiterStats {
    const now = Date.now();
    const activeCount = this.cleanWindow(now);
    const windowMs = this.config.windowSeconds * 1000;
    const oldestTimestamp = this.requestTimestamps[0] || now;
    const resetInSeconds = this.requestTimestamps.length > 0 
      ? Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000))
      : 0;

    return {
      config: { ...this.config },
      tokensRemaining: Math.max(0, this.config.maxRpm - activeCount),
      requestsInWindow: activeCount,
      totalAllowed: this.totalAllowed,
      totalBlocked: this.totalBlocked,
      totalQueued: this.totalQueued,
      resetInSeconds,
      recentDecisions: [...this.recentDecisions]
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Error in client rate limiter listener', err);
      }
    });
  }
}

export const clientRateLimiter = new ClientRateLimiterService();
