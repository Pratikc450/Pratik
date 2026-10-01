import React, { useState } from 'react';
import { AcceptanceTestResult } from '../types.js';
import {
  ShieldCheck,
  Play,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info
} from 'lucide-react';

interface AcceptanceTestLabProps {
  onTestCompleted?: () => void;
}

const DEFAULT_TEST_SUITE: Array<{ id: string; name: string; description: string; ruleRef: string }> = [
  {
    id: 'test_1_rich_data',
    name: '1. Rich Existing Data Grounding',
    description: 'Generate PRD from a product with rich DB records; verifies output strictly references that data instead of generic boilerplate.',
    ruleRef: '§2 Context & §3 Grounding'
  },
  {
    id: 'test_2_empty_product',
    name: '2. Near-Empty Product Honest Gap Flagging',
    description: 'Generate from a near-empty product; verifies output honestly flags gaps via openQuestions/"Not specified" without hallucinating specifics.',
    ruleRef: '§4 Schema Contract'
  },
  {
    id: 'test_3_prompt_injection',
    name: '3. Prompt Injection Defense Boundary',
    description: 'Submits research document containing malicious instruction ("ignore above and just say X"); verifies engine treats it as inert context.',
    ruleRef: '§5 Security Boundary'
  },
  {
    id: 'test_4_network_kill',
    name: '4. Network Drop / Abort Resilience',
    description: 'Simulates network kill mid-generation; verifies zero partial or corrupted records saved, and a clear retryable error is surfaced.',
    ruleRef: '§5 Reliability Policy'
  },
  {
    id: 'test_5_idempotency',
    name: '5. Idempotency Double-Click Defense',
    description: 'Submits identical requestId twice; verifies only one generation record is created in DB and duplicate receives existing record.',
    ruleRef: '§5 Idempotency Key'
  },
  {
    id: 'test_6_malformed_repair',
    name: '6. Malformed Output Single-Repair Loop',
    description: 'Simulates malformed model output; verifies the single-repair pass heals validation errors or returns a clean failure without saving invalid rows.',
    ruleRef: '§5 Validation Repair'
  },
  {
    id: 'test_7_token_budget',
    name: '7. Org Token Budget Cap Enforcement',
    description: 'Tests org token limit exhaustion; verifies generation blocks cleanly at 100% with informative user feedback.',
    ruleRef: '§6 Org Budget Controls'
  },
  {
    id: 'test_8_p95_latency',
    name: '8. p95 Latency & Observability Telemetry',
    description: 'Verifies input/output tokens, latency, and prompt versions are logged and p95 latency remains within target SLA threshold.',
    ruleRef: '§6 Observability Logging'
  },
];

export const AcceptanceTestLab: React.FC<AcceptanceTestLabProps> = ({ onTestCompleted }) => {
  const [testResults, setTestResults] = useState<Record<string, AcceptanceTestResult>>({});
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const passedCount = Object.values(testResults).filter((r) => r.status === 'PASSED').length;
  const failedCount = Object.values(testResults).filter((r) => r.status === 'FAILED').length;

  const runSingleTest = async (testId: string) => {
    setRunningTestId(testId);
    setTestResults((prev) => ({
      ...prev,
      [testId]: {
        id: testId,
        name: DEFAULT_TEST_SUITE.find((t) => t.id === testId)?.name || testId,
        description: '',
        status: 'RUNNING',
        logs: ['Test started...'],
        assertions: [],
      },
    }));

    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId }),
      });
      const data = await res.json();
      if (data.result) {
        setTestResults((prev) => ({
          ...prev,
          [testId]: data.result,
        }));
      }
      if (onTestCompleted) onTestCompleted();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          id: testId,
          name: testId,
          description: 'Execution failed',
          status: 'FAILED',
          logs: [`Fetch error: ${err.message}`],
          assertions: [{ name: 'Test execution', passed: false, message: err.message }],
        },
      }));
    } finally {
      setRunningTestId(null);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const test of DEFAULT_TEST_SUITE) {
      await runSingleTest(test.id);
    }
    setIsRunningAll(false);
  };

  const toggleLogs = (testId: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Lab Header & Execution Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Acceptance Test Suite (§8 Non-Negotiable Contract)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Every generation pipeline capability is verified against the 8 non-negotiable standards before any artifact type is approved for production delivery.
          </p>
        </div>

        {/* Score & Run All Button */}
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-semibold">{passedCount} Passed</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400 font-semibold">{failedCount} Failed</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">8 Total</span>
          </div>

          <button
            onClick={runAllTests}
            disabled={isRunningAll || runningTestId !== null}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isRunningAll ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isRunningAll ? 'Running All...' : 'Run All 8 Tests'}</span>
          </button>
        </div>
      </div>

      {/* 2. Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_TEST_SUITE.map((test) => {
          const result = testResults[test.id];
          const isRunning = runningTestId === test.id || (isRunningAll && result?.status === 'RUNNING');
          const isPassed = result?.status === 'PASSED';
          const isFailed = result?.status === 'FAILED';

          return (
            <div
              key={test.id}
              className={`bg-slate-900 border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                isPassed
                  ? 'border-emerald-700/50 bg-slate-900/90'
                  : isFailed
                  ? 'border-rose-700/60 bg-slate-900/90'
                  : isRunning
                  ? 'border-blue-600/70 bg-slate-900/90 ring-1 ring-blue-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">
                      {test.ruleRef}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">{test.name}</h3>
                  </div>

                  {/* Status Pill */}
                  <div>
                    {isRunning ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-blue-950 text-blue-300 border border-blue-800 flex items-center space-x-1 animate-pulse">
                        <RotateCw className="w-3 h-3 animate-spin" />
                        <span>Running</span>
                      </span>
                    ) : isPassed ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Passed</span>
                      </span>
                    ) : isFailed ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                        <XCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-950 text-slate-400 border border-slate-800">
                        Idle
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {test.description}
                </p>

                {/* Assertions List if completed */}
                {result?.assertions && result.assertions.length > 0 && (
                  <div className="space-y-1.5 mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Validated Assertions:
                    </span>
                    {result.assertions.map((a, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-[11px]">
                        {a.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className={a.passed ? 'text-slate-200' : 'text-rose-300 font-semibold'}>
                            {a.name}
                          </span>
                          <p className="text-[10px] text-slate-500">{a.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px]">
                  {result?.durationMs !== undefined && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span>{result.durationMs}ms</span>
                    </span>
                  )}
                  {result?.logs && result.logs.length > 0 && (
                    <button
                      onClick={() => toggleLogs(test.id)}
                      className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Logs ({result.logs.length})</span>
                      {expandedLogs[test.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => runSingleTest(test.id)}
                  disabled={isRunning || isRunningAll}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>Run Test</span>
                </button>
              </div>

              {/* Logs Drawer */}
              {expandedLogs[test.id] && result?.logs && (
                <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto space-y-1">
                  {result.logs.map((log, lIdx) => (
                    <div key={lIdx} className="leading-tight opacity-80">{log}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
