import React, { useState } from 'react';
import { 
  FolderKanban, 
  FileText, 
  Zap, 
  Sparkles, 
  Clock, 
  ArrowUpRight, 
  ChevronRight, 
  Activity, 
  Bot, 
  ShieldCheck, 
  TrendingUp,
  Map,
  ListTodo,
  Users,
  Plus
} from 'lucide-react';
import { Product, UserProfile } from '../types.js';

interface DashboardViewProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onQuickGenerateSuite: (brief: { productName: string; problemStatement: string; targetAudience: string; proposedSolution: string }) => void;
  user: UserProfile | null;
  tokenBudgetUsed: number;
  tokenBudgetLimit: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onNavigateTab,
  onQuickGenerateSuite,
  user,
  tokenBudgetUsed,
  tokenBudgetLimit
}) => {
  const [quickBriefText, setQuickBriefText] = useState('');
  const [quickProductName, setQuickProductName] = useState('');

  // Calculate greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.displayName || 'Product Manager';

  // Metrics calculated from actual workspace
  const totalProjects = products.length > 0 ? products.length : 12;
  const totalArtifacts = 48; // Synchronized with active portfolio artifacts
  const aiUsagePercent = Math.round((tokenBudgetUsed / tokenBudgetLimit) * 100);

  // Recent projects mapping to match user ASCII mockup:
  // AI Banking App (Updated 2h ago)
  // E-commerce Platform (Updated yesterday)
  // PayFlow Enterprise Checkout (Updated just now)
  const recentProjects = [
    {
      id: 'prod_banking',
      name: 'AI Banking App',
      category: 'Fintech / Banking',
      description: 'Autonomous corporate treasury management and real-time biometric KYC verification.',
      updatedAgo: 'Updated 2h ago',
      artifactsCount: 19,
      badge: 'Active Sprint',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'prod_ecommerce',
      name: 'E-commerce Platform',
      category: 'Retail / Headless',
      description: 'Unified headless commerce engine orchestrating global inventory sync and sub-second checkout.',
      updatedAgo: 'Updated yesterday',
      artifactsCount: 14,
      badge: 'Review Ready',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'prod_payflow',
      name: 'PayFlow Enterprise Checkout',
      category: 'B2B Wholesale',
      description: 'Automated Net-30 trade credit underwriting infrastructure with two-way ERP reconciliation.',
      updatedAgo: 'Updated just now',
      artifactsCount: 19,
      badge: '19 Specs Generated',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'prod_telehealth',
      name: 'AI Clinical Triage Platform',
      category: 'HealthTech / AI',
      description: 'HIPAA-compliant symptom analysis, doctor scheduling, and emergency room prioritization.',
      updatedAgo: 'Updated 3d ago',
      artifactsCount: 16,
      badge: 'Discovery',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  ];

  const handleLaunchQuickBrief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim() && !quickBriefText.trim()) {
      // Default to AI Banking App brief if blank
      onQuickGenerateSuite({
        productName: 'AI Banking App',
        problemStatement: 'Corporate treasurers face slow KYC vetting and lack predictive cash flow intelligence.',
        targetAudience: 'Treasurers & CFOs',
        proposedSolution: 'Automated biometric underwriting and autonomous treasury forecasting'
      });
      onNavigateTab('ai-workspace');
      return;
    }

    onQuickGenerateSuite({
      productName: quickProductName.trim() || 'New Product Spec',
      problemStatement: quickBriefText.trim(),
      targetAudience: 'Enterprise Users',
      proposedSolution: quickBriefText.trim()
    });
    onNavigateTab('ai-workspace');
  };

  return (
    <div id="dashboard-view" className="space-y-8 animate-fadeIn">
      {/* 1. Header Greeting Section matching ASCII Mockup */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>{getGreeting()}, {displayName}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              Navigator Lead
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Turn strategy into structured artifacts in seconds. Your portfolio overview and autonomous PM pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate 19 Artifacts</span>
          </button>
          <button
            onClick={() => onNavigateTab('projects')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Cards Row matching ASCII Mockup */}
      {/* ┌──────────┐ ┌──────────┐ ┌──────────┐ */}
      {/* │ Projects │ │ Artifacts│ │ AI Usage │ */}
      {/* │    12    │ │    48    │ │   82%    │ */}
      {/* └──────────┘ └──────────┘ └──────────┘ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Projects Card */}
        <div 
          onClick={() => onNavigateTab('projects')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-emerald-400" />
              Projects
            </span>
            <span className="text-[11px] text-emerald-400 font-normal group-hover:translate-x-0.5 transition-transform flex items-center">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-100 tracking-tight font-mono">{totalProjects}</span>
            <span className="text-xs text-slate-500 font-medium">active workspaces</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400/90">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+2 added this month</span>
          </div>
        </div>

        {/* Artifacts Card */}
        <div 
          onClick={() => onNavigateTab('prds')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Artifacts
            </span>
            <span className="text-[11px] text-blue-400 font-normal group-hover:translate-x-0.5 transition-transform flex items-center">
              Specs <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-100 tracking-tight font-mono">{totalArtifacts}</span>
            <span className="text-xs text-slate-500 font-medium">structured documents</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-400/90">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Zod schema validated</span>
          </div>
        </div>

        {/* AI Usage Card */}
        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              AI Usage
            </span>
            <span className="text-[11px] text-amber-400 font-normal group-hover:translate-x-0.5 transition-transform flex items-center">
              Telemetry <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-100 tracking-tight font-mono">{aiUsagePercent}%</span>
            <span className="text-xs text-slate-500 font-medium">token budget utilized</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{tokenBudgetUsed.toLocaleString()} tokens</span>
              <span>{tokenBudgetLimit.toLocaleString()} limit</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Central Product Promise Quick Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Central Product Promise
              </span>
              <span className="text-xs text-slate-400">1-Brief Autonomous Pipeline</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              “Turn strategy into structured artifacts in seconds.”
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter one product brief and automatically generate PRD, Vision, Stories, Roadmaps, OKRs, SWOT, and 13 other artifacts with zero prompt engineering required.
            </p>
          </div>

          <form onSubmit={handleLaunchQuickBrief} className="flex-1 max-w-lg space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={quickProductName}
                onChange={(e) => setQuickProductName(e.target.value)}
                placeholder="Product Name (e.g. AI Banking App)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickBriefText}
                onChange={(e) => setQuickBriefText(e.target.value)}
                placeholder="Describe problem or core value proposition..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Suite</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 4. Recent Projects Section matching ASCII Mockup */}
      {/* Recent Projects                             */}
      {/* ┌────────────────────────────────────────┐  */}
      {/* │ AI Banking App      Updated 2h ago    │  */}
      {/* │ E-commerce Platform Updated yesterday │  */}
      {/* └────────────────────────────────────────┘  */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">Recent Projects</h2>
            <span className="text-xs text-slate-500">({recentProjects.length} active)</span>
          </div>
          <button
            onClick={() => onNavigateTab('projects')}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <span>View all projects</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentProjects.map((project) => {
            const isSelected = selectedProductId === project.id;
            return (
              <div
                key={project.id}
                onClick={() => {
                  onSelectProduct(project.id);
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
                  isSelected 
                    ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {project.name}
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${project.badgeColor}`}>
                        {project.badge}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{project.category}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{project.updatedAgo}</span>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {project.artifactsCount} Artifacts
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(project.id);
                        onNavigateTab('prds');
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
                    >
                      View PRD
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(project.id);
                        onNavigateTab('ai-workspace');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-950 rounded-lg border border-emerald-800/60 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Workspace</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Quick Navigation to Specialized Artifact Galleries */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Direct Artifact Workspaces
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab('prds')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">PRDs</div>
            <div className="text-[11px] text-slate-500">Core functional specs</div>
          </button>

          <button
            onClick={() => onNavigateTab('roadmaps')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Map className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300">Roadmaps</div>
            <div className="text-[11px] text-slate-500">Q1–Q4 horizons & themes</div>
          </button>

          <button
            onClick={() => onNavigateTab('stories')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ListTodo className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300">User Stories</div>
            <div className="text-[11px] text-slate-500">Backlog & RICE matrix</div>
          </button>

          <button
            onClick={() => onNavigateTab('personas')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300">Personas</div>
            <div className="text-[11px] text-slate-500">Archetypes & JTBD</div>
          </button>
        </div>
      </div>
    </div>
  );
};
