import React, { useState, useEffect, useRef } from 'react';
import { 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Radio, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { realtimeWs, ConnectionStatus, HeartbeatMetrics } from '../services/websocketClient.js';

interface WebSocketConnectionToastProps {
  onNavigateTab?: (tab: string) => void;
}

export const WebSocketConnectionToast: React.FC<WebSocketConnectionToastProps> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState<HeartbeatMetrics>(realtimeWs.getMetrics());
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isReconnectingManual, setIsReconnectingManual] = useState<boolean>(false);
  const [reconnectedBanner, setReconnectedBanner] = useState<boolean>(false);
  const [dismissedState, setDismissedState] = useState<ConnectionStatus | null>(null);

  const prevStatusRef = useRef<ConnectionStatus>(metrics.status);
  const dismissedStateRef = useRef<ConnectionStatus | null>(dismissedState);
  const isVisibleRef = useRef<boolean>(isVisible);
  const autoDismissTimerRef = useRef<any>(null);

  useEffect(() => {
    dismissedStateRef.current = dismissedState;
  }, [dismissedState]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    const unsubscribe = realtimeWs.subscribeMetrics((newMetrics) => {
      const prev = prevStatusRef.current;
      const curr = newMetrics.status;
      setMetrics(newMetrics);

      // Status transitioned to reconnecting or disconnected
      if (curr === 'reconnecting' || curr === 'disconnected') {
        // Only show if not explicitly dismissed for this exact state
        if (dismissedStateRef.current !== curr) {
          setIsVisible(true);
          setReconnectedBanner(false);
          if (autoDismissTimerRef.current) {
            clearTimeout(autoDismissTimerRef.current);
          }
        }
      } else if (curr === 'connected') {
        // If we were previously reconnecting or disconnected, show reconnected success banner
        if (prev === 'reconnecting' || prev === 'disconnected' || isVisibleRef.current) {
          setIsVisible(true);
          setReconnectedBanner(true);
          setIsReconnectingManual(false);
          setDismissedState(null);

          if (autoDismissTimerRef.current) {
            clearTimeout(autoDismissTimerRef.current);
          }
          autoDismissTimerRef.current = setTimeout(() => {
            setIsVisible(false);
            setReconnectedBanner(false);
          }, 4000);
        } else {
          setIsVisible(false);
        }
      }

      prevStatusRef.current = curr;
    });

    return () => {
      unsubscribe();
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, []);

  const handleManualReconnect = () => {
    setIsReconnectingManual(true);
    realtimeWs.reconnect();
    setTimeout(() => {
      setIsReconnectingManual(false);
    }, 2500);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissedState(metrics.status);
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
  };

  if (!isVisible) return null;

  const isReconnecting = metrics.status === 'reconnecting';
  const isDisconnected = metrics.status === 'disconnected';

  // Connected success toast
  if (reconnectedBanner && metrics.status === 'connected') {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] sm:w-96 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md p-4 text-slate-100 animate-fadeIn"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span>WebSocket Reconnected</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Real-time synchronization restored. Heartbeat latency: <strong>{metrics.latencyMs || 8}ms</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Warning toast for Reconnecting or Disconnected
  if (isReconnecting || isDisconnected) {
    const isWarnAmber = isReconnecting;
    const borderClass = isWarnAmber ? 'border-amber-500/60 shadow-amber-950/40' : 'border-rose-500/60 shadow-rose-950/40';
    const bgBadgeClass = isWarnAmber ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    const titleText = isReconnecting ? 'WebSocket Reconnecting' : 'WebSocket Disconnected';
    const descriptionText = isReconnecting
      ? 'Connection interrupted. Re-establishing live synchronization channel...'
      : 'Connection to real-time service lost. Live updates and feed events are paused.';

    return (
      <div 
        role="alert"
        aria-live="assertive"
        className={`fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] sm:w-[400px] rounded-2xl bg-slate-900/98 border ${borderClass} shadow-2xl backdrop-blur-md p-4 text-slate-100 animate-fadeIn`}
      >
        <div className="flex items-start gap-3">
          {/* Animated Status Icon */}
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 relative ${bgBadgeClass}`}>
            {isReconnecting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-300" />
            )}
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
              isReconnecting ? 'bg-amber-400' : 'bg-rose-500'
            } animate-ping opacity-75`} />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${bgBadgeClass}`}>
                  {metrics.status.toUpperCase()}
                </span>
                <h4 className="text-xs font-bold text-slate-100">
                  {titleText}
                </h4>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                title="Dismiss notification"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {descriptionText}
            </p>

            {/* Diagnostics Metadata */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Endpoint: /ws</span>
              <span>·</span>
              <span>Sent: {metrics.heartbeatsSent}</span>
              <span>·</span>
              <span>ACKs: {metrics.heartbeatsAcked}</span>
            </div>

            {/* Action Bar with Manual Reconnect Trigger Button */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              {onNavigateTab ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('websocket-monitor')}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Monitor</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-[10px] text-slate-500">Auto-retry active (3s)</span>
              )}

              <button
                type="button"
                onClick={handleManualReconnect}
                disabled={isReconnectingManual}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  isWarnAmber
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-98'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 active:scale-98'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconnectingManual ? 'animate-spin' : ''}`} />
                <span>{isReconnectingManual ? 'Reconnecting...' : 'Reconnect Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
