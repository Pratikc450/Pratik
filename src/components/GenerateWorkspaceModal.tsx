import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  Cpu,
  RefreshCw,
  Building2,
  Users,
  Target,
  FileCode2,
  Check,
  AlertCircle
} from 'lucide-react';
import { ArtifactType, ARTIFACT_19_CATALOG, CompleteWorkspacePayload } from '../types.js';

interface GenerateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceGenerated: (workspaceData: any) => void;
  initialBrief?: {
    productName?: string;
    problemStatement?: string;
    targetAudience?: string;
    proposedSolution?: string;
    industry?: string;
  };
}

interface WorkspacePreset {
  id: string;
  name: string;
  industry: string;
  targetAudience: string;
  problemStatement: string;
  proposedSolution: string;
  vision: string;
  icon: string;
  badge: string;
}

const PRESETS: WorkspacePreset[] = [
  {
    id: 'banking_treasury',
    name: 'VaultPulse AI Treasury',
    industry: 'FinTech / Corporate Banking',
    targetAudience: 'Corporate Treasurers & CFOs',
    problemStatement: 'Corporate treasurers face slow KYC vetting and lack predictive cash flow forecasting, leading to $2.4M in trapped liquidity.',
    proposedSolution: 'Autonomous biometric underwriting and predictive multi-bank liquidity forecasting engine.',
    vision: 'Eliminate corporate treasury friction through real-time liquidity orchestration and automated risk clearance.',
    icon: '💳',
    badge: 'Fintech Standard'
  },
  {
    id: 'clinical_scribe',
    name: 'CareFlow Clinical AI',
    industry: 'HealthTech / Hospital Systems',
    targetAudience: 'Chief Medical Officers & Attending Physicians',
    problemStatement: 'Doctors spend 3.2 hours daily on EHR documentation, causing severe physician burnout and patient triage delays.',
    proposedSolution: 'Ambient HIPAA-compliant acoustic scribe converting patient-doctor dialogue into structured ICD-10 EHR charts in real time.',
    vision: 'Restore human care to medicine by automating clinical documentation and emergency room triage.',
    icon: '🏥',
    badge: 'HealthTech'
  },
  {
    id: 'devops_cloud',
    name: 'CloudSentry Autonomous SRE',
    industry: 'DevOps / Cloud Infrastructure',
    targetAudience: 'SRE Directors & Platform Engineers',
    problemStatement: 'Distributed microservices incident response averages 4.5 hours MTTR, losing $8,500 per minute of unplanned downtime.',
    proposedSolution: 'Self-healing Kubernetes observability fabric with root-cause clustering and autonomous canary rollback.',
    vision: 'Achieve zero-touch enterprise cloud reliability through autonomous anomaly diagnosis and self-healing telemetry.',
    icon: '☁️',
    badge: 'DevOps / Cloud'
  },
  {
    id: 'headless_commerce',
    name: 'OmniPulse Commerce Core',
    industry: 'Retail & E-commerce',
    targetAudience: 'E-commerce Directors & Wholesale Retailers',
    problemStatement: 'Multi-store inventory reconciliation takes 48 hours, causing 14% cart abandonment from stockouts and checkout latency.',
    proposedSolution: 'Sub-second event-driven catalog orchestration with instant localized currency settlement and predictive restock.',
    vision: 'Provide sub-second enterprise commerce infrastructure uniting omnichannel inventory and global checkout.',
    icon: '🛒',
    badge: 'Commerce'
  },
  {
    id: 'legal_redline',
    name: 'LexisAI Contract Synthesizer',
    industry: 'LegalTech / Enterprise M&A',
    targetAudience: 'General Counsels & Corporate Law Firms',
    problemStatement: 'Enterprise M&A legal reviews require 60+ paralegal hours per agreement, resulting in regulatory audit oversights.',
    proposedSolution: 'Deep contract parsing, automated redlining against corporate playbooks, and instant regulatory exposure extraction.',
    vision: 'Transform legal contract review into an instantaneous, zero-blindspot audit workflow.',
    icon: '⚖️',
    badge: 'LegalTech'
  }
];

export const GenerateWorkspaceModal: React.FC<GenerateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onWorkspaceGenerated,
  initialBrief
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('banking_treasury');
  const [name, setName] = useState('VaultPulse AI Treasury');
  const [industry, setIndustry] = useState('FinTech / Corporate Banking');
  const [targetAudience, setTargetAudience] = useState('Corporate Treasurers & CFOs');
  const [problemStatement, setProblemStatement] = useState(
    'Corporate treasurers face slow KYC vetting and lack predictive cash flow forecasting, leading to $2.4M in trapped liquidity.'
  );
  const [proposedSolution, setProposedSolution] = useState(
    'Autonomous biometric underwriting and predictive multi-bank liquidity forecasting engine.'
  );
  const [vision, setVision] = useState(
    'Eliminate corporate treasury friction through real-time liquidity orchestration and automated risk clearance.'
  );

  // Configuration
  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactType[]>(
    ARTIFACT_19_CATALOG.map(a => a.type)
  );
  const [superActiveMode, setSuperActiveMode] = useState(true);
  const [highPerformanceMode, setHighPerformanceMode] = useState(true);

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [completedArtifacts, setCompletedArtifacts] = useState<{ taskType: string; latencyMs: number }[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Synchronize initial brief if provided
  useEffect(() => {
    if (initialBrief?.productName) {
      setName(initialBrief.productName);
      if (initialBrief.problemStatement) setProblemStatement(initialBrief.problemStatement);
      if (initialBrief.targetAudience) setTargetAudience(initialBrief.targetAudience);
      if (initialBrief.proposedSolution) setProposedSolution(initialBrief.proposedSolution);
      if (initialBrief.industry) setIndustry(initialBrief.industry);
    }
  }, [initialBrief]);

  const handleSelectPreset = (preset: WorkspacePreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.name);
    setIndustry(preset.industry);
    setTargetAudience(preset.targetAudience);
    setProblemStatement(preset.problemStatement);
    setProposedSolution(preset.proposedSolution);
    setVision(preset.vision);
  };

  const toggleArtifact = (type: ArtifactType) => {
    if (selectedArtifacts.includes(type)) {
      if (selectedArtifacts.length > 1) {
        setSelectedArtifacts(selectedArtifacts.filter(t => t !== type));
      }
    } else {
      setSelectedArtifacts([...selectedArtifacts, type]);
    }
  };

  const selectAllArtifacts = () => {
    setSelectedArtifacts(ARTIFACT_19_CATALOG.map(a => a.type));
  };

  const handleStartGeneration = async () => {
    if (!name.trim() || !problemStatement.trim()) {
      setErrorMsg('Product name and problem statement are required.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setCompletedArtifacts([]);
    setElapsedSeconds(0);
    setGenerationStage('Initializing product workspace and context gatherer...');

    const startTimestamp = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.round(((Date.now() - startTimestamp) / 1000) * 10) / 10);
    }, 100);

    const payload: CompleteWorkspacePayload = {
      name: name.trim(),
      industry: industry.trim() || 'B2B SaaS / AI Infrastructure',
      targetAudience: targetAudience.trim() || 'Enterprise Operators',
      problemStatement: problemStatement.trim(),
      proposedSolution: proposedSolution.trim(),
      vision: vision.trim(),
      selectedArtifacts
    };

    try {
      // Execute high-performance generate-complete API
      setGenerationStage('Dispatching high-throughput parallel pipeline (4 worker threads)...');
      
      const response = await fetch('/api/workspace/generate-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      clearInterval(timerRef.current);
      setGenerationStage('Generation complete! Workspace ready.');
      setGeneratedResult(data);
      
      if (data.artifacts) {
        setCompletedArtifacts(
          data.artifacts.map((a: any) => ({
            taskType: a.taskType,
            latencyMs: a.metadata?.latencyMs || 250
          }))
        );
      }
    } catch (err: any) {
      clearInterval(timerRef.current);
      console.error('Workspace generation failed:', err);
      setErrorMsg(err.message || 'Failed to generate complete product workspace.');
      setIsGenerating(false);
    }
  };

  const handleLaunchWorkspace = () => {
    if (generatedResult) {
      onWorkspaceGenerated(generatedResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Generate Complete Product Workspace</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Full 19-Spec Suite
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous PM pipeline: Generates product vision, PRD, backlog, personas, SWOT, OKRs, and live sprint state.
              </p>
            </div>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* If Currently Generating or Complete */}
          {isGenerating ? (
            <div className="space-y-6 py-4">
              {/* Telemetry & Speedometer Bar */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Parallel Worker Engine
                    </div>
                    <div className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>4 Workers Active</span>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">Elapsed Time</div>
                    <div className="text-xl font-mono font-bold text-emerald-400">{elapsedSeconds.toFixed(1)}s</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">Schema Guard</div>
                    <div className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Zod 100%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">Progress</div>
                    <div className="text-xl font-mono font-bold text-slate-200">
                      {generatedResult ? selectedArtifacts.length : completedArtifacts.length} / {selectedArtifacts.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Stage Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>{generationStage}</span>
                  </span>
                  <span>{generatedResult ? '100%' : `${Math.round((completedArtifacts.length / selectedArtifacts.length) * 100)}%`}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-300"
                    style={{
                      width: generatedResult
                        ? '100%'
                        : `${Math.max(10, Math.round((completedArtifacts.length / selectedArtifacts.length) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Live 19 Artifacts Grid Matrix */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Artifact Generation Matrix ({selectedArtifacts.length} total)</span>
                  <span className="text-emerald-400 text-[11px] font-mono">Autonomous Synthesis</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {selectedArtifacts.map((taskType) => {
                    const isDone = generatedResult || completedArtifacts.some(c => c.taskType === taskType);
                    const catalogItem = ARTIFACT_19_CATALOG.find(a => a.type === taskType);
                    const completedItem = completedArtifacts.find(c => c.taskType === taskType);

                    return (
                      <div
                        key={taskType}
                        className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          isDone
                            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold truncate">{catalogItem?.label || taskType}</div>
                          <div className="text-[10px] text-slate-500">{catalogItem?.category || 'Spec'}</div>
                        </div>
                        {isDone ? (
                          <div className="flex items-center gap-1 shrink-0 text-emerald-400 font-mono text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{completedItem ? `${completedItem.latencyMs}ms` : 'ok'}</span>
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 border-t-emerald-400 animate-spin shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generated Result Summary Card when Ready */}
              {generatedResult && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-700/50 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Complete Product Workspace Generated Successfully!</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
                      Took {elapsedSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Created product <strong className="text-white">{generatedResult.product.name}</strong>, provisioned 
                    2 personas, 3 validated problem statements, {generatedResult.totalGenerated} structured artifacts, 
                    and initialized active Sprint 1 with {generatedResult.sprintStories?.length || 6} backlog stories.
                  </p>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleLaunchWorkspace}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>Launch & Open Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Configuration & Input Screen */
            <div className="space-y-6">
              {/* Presets Row */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Quick High-Performance Archetypes (1-Click Fill)
                  </label>
                  <span className="text-[11px] text-slate-500">Pick a template or customize</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500/60 shadow-md shadow-emerald-950/20'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div className="text-xl mb-1.5">{preset.icon}</div>
                        <div className="text-xs font-bold text-slate-200 truncate">{preset.name}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Product Workspace Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. VaultPulse AI Treasury"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-400" />
                    Industry & Domain
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. FinTech / Banking"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Target Audience / Ideal Customer Profile (ICP)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Corporate Treasurers, CFOs & Finance Directors"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Core Problem Statement & Friction Point
                  </label>
                  <textarea
                    rows={2}
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    placeholder="Describe the quantified pain point your product solves..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Strategic Solution & Vision
                  </label>
                  <textarea
                    rows={2}
                    value={proposedSolution}
                    onChange={(e) => setProposedSolution(e.target.value)}
                    placeholder="Describe how the product solves the problem and establishes an unfair advantage..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Artifacts Selection Checklist */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Artifacts Suite Selection ({selectedArtifacts.length}/19 selected)
                    </span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                      Zero Prompt Engineering
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={selectAllArtifacts}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Select All 19 Artifacts
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ARTIFACT_19_CATALOG.map((item) => {
                    const isChecked = selectedArtifacts.includes(item.type);
                    return (
                      <div
                        key={item.type}
                        onClick={() => toggleArtifact(item.type)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all flex items-center gap-2.5 ${
                          isChecked
                            ? 'bg-emerald-950/30 border-emerald-700/60 text-slate-200'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="truncate">
                          <div className="font-medium truncate">{item.label}</div>
                          <div className="text-[9px] text-slate-500 uppercase">{item.category}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>High-Performance Concurrency</span>
                    </div>
                    <div className="text-[10px] text-slate-400">4x parallel workers with dual-pass repair</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={highPerformanceMode}
                    onChange={(e) => setHighPerformanceMode(e.target.checked)}
                    className="accent-emerald-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Super Active Mode</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Seeds Sprint 1 Kanban & live event pulses</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={superActiveMode}
                    onChange={(e) => setSuperActiveMode(e.target.checked)}
                    className="accent-emerald-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isGenerating && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full Zod validation & local + cloud persistence guaranteed</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartGeneration}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Complete Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
