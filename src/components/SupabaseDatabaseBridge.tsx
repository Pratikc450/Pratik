import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Key,
  Layers,
  Play,
  Copy,
  Check,
  Table,
  ArrowUpRight,
  ExternalLink,
  Lock,
  Cpu,
  Server,
  Code2
} from 'lucide-react';
import { DatabaseStatusResponse, SqlQueryResult, DatabaseTableMeta } from '../types.js';

interface SupabaseDatabaseBridgeProps {
  onNavigateTab?: (tab: string) => void;
}

export const SupabaseDatabaseBridge: React.FC<SupabaseDatabaseBridgeProps> = ({
  onNavigateTab
}) => {
  const [dbStatus, setDbStatus] = useState<DatabaseStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // SQL Query Runner State
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM products;');
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [selectedTableTab, setSelectedTableTab] = useState<string>('products');
  const [copiedCodeType, setCopiedCodeType] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data: DatabaseStatusResponse = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Failed to load database status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    executeSql('SELECT * FROM products;');
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const executeSql = async (queryToRun: string) => {
    setIsExecutingSql(true);
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryToRun })
      });
      const data: SqlQueryResult = await res.json();
      setQueryResult(data);
      if (data.success) {
        showToast(`Query completed in ${data.latencyMs}ms (${data.rowCount} rows returned)`);
      } else {
        showToast(`SQL Error: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Query failed: ${err.message}`);
    } finally {
      setIsExecutingSql(false);
    }
  };

  const handleSyncWorkspace = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/database/sync-workspace', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Synced ${data.syncedProductsCount} products & ${data.syncedStoriesCount} stories with Cloud SQL!`);
        await fetchStatus();
        executeSql(sqlQuery);
      } else {
        showToast(`Sync error: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || !dbStatus) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <div className="text-sm font-semibold text-slate-300">Connecting to Cloud SQL & Supabase Engine...</div>
        <p className="text-xs text-slate-500">Initializing connection pool and checking table metadata.</p>
      </div>
    );
  }

  const selectedTable = dbStatus.tables.find(t => t.tableName === selectedTableTab) || dbStatus.tables[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 border border-emerald-500/50 text-slate-100 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">Supabase & Cloud SQL Database Bridge</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Online · asia-southeast1
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  PostgreSQL 18.6
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                PostgreSQL relational database paired with Firebase Firestore persistence for PM specifications, user stories, personas, and audit trail events.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleSyncWorkspace}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Tables...' : 'Sync Workspace to Cloud DB'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Connection Pool */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PostgreSQL Pool</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-black text-white font-mono">10 Connections</div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Drizzle ORM</span>
            <span className="text-emerald-400 font-mono">Active Pool</span>
          </div>
        </div>

        {/* Card 2: Query Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Query Latency</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">{dbStatus.queryLatencyMs}ms</div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Direct Socket</span>
            <span className="text-emerald-400 font-mono">&lt; 25ms SLA</span>
          </div>
        </div>

        {/* Card 3: Auth & Identity Bridge */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auth & Identity</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">Firebase + Supabase</div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="truncate max-w-[140px] font-mono">{dbStatus.authBridge.currentUserEmail}</span>
            <span className="text-indigo-400 font-medium">Synced</span>
          </div>
        </div>

        {/* Card 4: Firestore Dual Sync */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Firestore Persistence</span>
            <Cloud className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">ai-studio-remixproductpilo...</div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Dual Sync</span>
            <span className="text-teal-400 font-medium">Synchronized</span>
          </div>
        </div>
      </div>

      {/* Relational Tables Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Relational Tables & Schema Catalog</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Drizzle ORM schema tables actively synchronized with PostgreSQL</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            {dbStatus.tables.length} Tables Registered
          </span>
        </div>

        {/* Table Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dbStatus.tables.map(tbl => (
            <button
              key={tbl.tableName}
              onClick={() => {
                setSelectedTableTab(tbl.tableName);
                setSqlQuery(`SELECT * FROM ${tbl.tableName} LIMIT 10;`);
                executeSql(`SELECT * FROM ${tbl.tableName} LIMIT 10;`);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedTableTab === tbl.tableName
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="font-mono">{tbl.tableName}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                {tbl.rowCount} rows
              </span>
            </button>
          ))}
        </div>

        {/* Active Table Columns */}
        {selectedTable && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold font-mono">Table: {selectedTable.tableName}</span>
              <span className="text-slate-400">{selectedTable.description}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {selectedTable.columns.map(col => (
                <div key={col.name} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono flex items-center gap-1.5">
                  <span className="text-slate-200 font-semibold">{col.name}</span>
                  <span className="text-slate-500 text-[10px]">({col.type})</span>
                  {col.isPrimary && <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1 rounded font-bold">PK</span>}
                  {col.isForeign && <span className="text-[9px] bg-teal-950 text-teal-300 px-1 rounded font-bold">FK</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive SQL Query Runner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Interactive SQL Query Console & Live Probe</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute read queries directly against PostgreSQL with execution latency and row-level inspection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: 'Products', sql: 'SELECT * FROM products;' },
              { label: 'User Stories', sql: 'SELECT id, as_a, i_want, priority, rice_score FROM user_stories ORDER BY rice_score DESC;' },
              { label: 'Personas', sql: 'SELECT name, role, goal, tech_comfort FROM personas;' },
              { label: 'Users', sql: 'SELECT uid, email, display_name, role FROM users;' },
              { label: 'Audit Log', sql: 'SELECT action, user_id, details, created_at FROM audit_trail_events ORDER BY created_at DESC LIMIT 5;' }
            ].map(p => (
              <button
                key={p.label}
                onClick={() => {
                  setSqlQuery(p.sql);
                  executeSql(p.sql);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Input Area */}
        <div className="flex gap-3">
          <input
            type="text"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            placeholder="SELECT * FROM products;"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono shadow-inner"
          />
          <button
            onClick={() => executeSql(sqlQuery)}
            disabled={isExecutingSql || !sqlQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${isExecutingSql ? 'animate-spin' : ''}`} />
            <span>{isExecutingSql ? 'Executing...' : 'Run Query'}</span>
          </button>
        </div>

        {/* SQL Results Table */}
        {queryResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${queryResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="font-bold text-slate-200 font-mono">
                  {queryResult.success ? `200 OK — ${queryResult.rowCount} rows returned` : 'Query Execution Error'}
                </span>
              </div>
              <div className="flex items-center space-x-3 font-mono text-[11px]">
                <span className="text-slate-400">Latency: <strong className="text-emerald-400">{queryResult.latencyMs}ms</strong></span>
              </div>
            </div>

            {queryResult.success && queryResult.rows && queryResult.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase bg-slate-900/60 sticky top-0">
                      {queryResult.columns.map(col => (
                        <th key={col} className="p-2">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        {queryResult.columns.map(col => (
                          <td key={col} className="p-2 truncate max-w-[240px]">
                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? 'null')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : queryResult.success ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">Query executed successfully with 0 rows returned.</div>
            ) : (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 font-mono">
                {queryResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supabase PostgREST & Dual Architecture Specs */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Supabase REST Compatibility & API Key Architecture</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure client and server connection credentials for PostgREST endpoints and Row Level Security
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">PostgREST v12</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Supabase Client Anon Key</span>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300">
              <span className="truncate">{dbStatus.authBridge.anonKeyMasked}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key_preview');
                  setCopiedCodeType('anon_key');
                  setTimeout(() => setCopiedCodeType(null), 2000);
                }}
                className="text-slate-400 hover:text-slate-200 ml-2 cursor-pointer"
              >
                {copiedCodeType === 'anon_key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Public anonymous key for browser read queries with RLS enforcement.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Service Role Administrative Key</span>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300">
              <span>sk_live_admin_service_role...</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded">Server Secured</span>
            </div>
            <p className="text-[11px] text-slate-500">Bypasses RLS for trusted backend operations, migrations, and AI pipeline sync.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
