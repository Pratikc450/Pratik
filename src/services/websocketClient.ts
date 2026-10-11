/**
 * Real-time WebSocket Client for ProductPilot
 * Manages WebSocket heartbeat, automatic reconnection, and bidirectional event pub/sub.
 */

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface HeartbeatMetrics {
  status: ConnectionStatus;
  latencyMs: number;
  lastHeartbeat: Date | null;
  heartbeatsAcked: number;
  heartbeatsSent: number;
  endpoint: string;
  uptimeSeconds: number;
  activeClientsCount: number;
  environment: string;
}

export type RealtimeEventHandler = (event: any) => void;
export type MetricsListener = (metrics: HeartbeatMetrics) => void;

class RealtimeWebSocketClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private heartbeatInterval: any = null;
  private reconnectTimeout: any = null;
  private latencyMs: number = 0;
  private lastHeartbeat: Date | null = null;
  private heartbeatsAcked: number = 0;
  private heartbeatsSent: number = 0;
  private activeClientsCount: number = 1;
  private environment: string = 'production';
  private connectStartTime: number = Date.now();
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private metricsListeners: Set<MetricsListener> = new Set();
  private pingTimestamp: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private getEndpoint(): string {
    if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    const url = this.getEndpoint();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.connectStartTime = Date.now();
        this.startHeartbeat();
        // Send initial ping immediately
        this.sendPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.warn('[WS Client Parse Error]', err);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Client Error]', err);
        this.stopHeartbeat();
        this.setStatus('disconnected');
      };
    } catch (err) {
      console.warn('[WS Client Connection Error]', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.notifyMetrics();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.setStatus('reconnecting');
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  public sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.pingTimestamp = Date.now();
      this.heartbeatsSent++;
      this.ws.send(JSON.stringify({
        type: 'ping',
        timestamp: this.pingTimestamp
      }));
    }
  }

  public send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  private handleMessage(data: any) {
    if (data.type === 'pong') {
      const now = Date.now();
      if (this.pingTimestamp) {
        this.latencyMs = Math.max(1, now - this.pingTimestamp);
      }
      this.lastHeartbeat = new Date();
      this.heartbeatsAcked++;
      if (data.activeClients) this.activeClientsCount = data.activeClients;
      if (data.environment) this.environment = data.environment;
      this.notifyMetrics();
      return;
    }

    if (data.type === 'INIT_CONNECTED') {
      if (data.environment) this.environment = data.environment;
      this.notifyMetrics();
    }

    // Broadcast message to type-specific and wildcard listeners
    const type = data.type || 'message';
    const specificListeners = this.listeners.get(type);
    if (specificListeners) {
      specificListeners.forEach(listener => listener(data));
    }

    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => listener(data));
    }
  }

  public subscribe(eventType: string, handler: RealtimeEventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  public subscribeMetrics(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    listener(this.getMetrics());

    return () => {
      this.metricsListeners.delete(listener);
    };
  }

  public getMetrics(): HeartbeatMetrics {
    const uptimeSeconds = this.status === 'connected' 
      ? Math.floor((Date.now() - this.connectStartTime) / 1000) 
      : 0;

    return {
      status: this.status,
      latencyMs: this.latencyMs,
      lastHeartbeat: this.lastHeartbeat,
      heartbeatsAcked: this.heartbeatsAcked,
      heartbeatsSent: this.heartbeatsSent,
      endpoint: this.getEndpoint(),
      uptimeSeconds,
      activeClientsCount: this.activeClientsCount,
      environment: this.environment
    };
  }

  private notifyMetrics() {
    const metrics = this.getMetrics();
    this.metricsListeners.forEach(listener => listener(metrics));
  }

  public reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.connect();
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public simulateReconnecting() {
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.scheduleReconnect();
  }
}

export const realtimeWs = new RealtimeWebSocketClient();
