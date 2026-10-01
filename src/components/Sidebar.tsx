import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Sparkles, 
  FileText, 
  Map, 
  ListTodo, 
  Users, 
  BarChart3, 
  Settings,
  ChevronRight,
  ShieldCheck,
  Bot
} from 'lucide-react';

export type NavigationTab = 
  | 'dashboard' 
  | 'projects' 
  | 'ai-workspace' 
  | 'prds' 
  | 'roadmaps' 
  | 'stories' 
  | 'personas' 
  | 'analytics' 
  | 'settings'
  | 'tests';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedProductName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedProductName
}) => {
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
    dividerAfter?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      dividerAfter: true
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
    },
    {
      id: 'ai-workspace',
      label: 'AI Workspace',
      icon: Sparkles,
      badge: '19',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dividerAfter: true
    },
    {
      id: 'prds',
      label: 'PRDs',
      icon: FileText,
    },
    {
      id: 'roadmaps',
      label: 'Roadmaps',
      icon: Map,
    },
    {
      id: 'stories',
      label: 'User Stories',
      icon: ListTodo,
    },
    {
      id: 'personas',
      label: 'Personas',
      icon: Users,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      dividerAfter: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    }
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        {/* Navigation Item List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : null}
                </button>

                {item.dividerAfter && (
                  <div className="my-2 border-b border-slate-900" />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Footer / Active Product Pill */}
      <div className="pt-4 border-t border-slate-900 space-y-2">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Active Workspace
          </div>
          <div className="mt-1 font-semibold text-slate-200 truncate">
            {selectedProductName || 'AI Banking App'}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>19-Artifact Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
