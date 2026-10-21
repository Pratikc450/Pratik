import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  ListTodo, 
  Map, 
  FolderKanban, 
  Users, 
  Zap, 
  ArrowRight, 
  X, 
  Command, 
  CornerDownLeft, 
  Sparkles, 
  CheckCircle2, 
  Layers,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Product } from '../types.js';
import { SearchableItem, fuzzySearchItems } from '../utils/fuzzySearch.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (targetTab: string, productId?: string, metadata?: Record<string, any>) => void;
  products: Product[];
  selectedProductId: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  products,
  selectedProductId
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [indexedItems, setIndexedItems] = useState<SearchableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch or construct search index
  const loadSearchIndex = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/search/index');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && Array.isArray(data.items)) {
            setIndexedItems(data.items);
            setIsLoading(false);
            return;
          }
        }
      }
    } catch {
      // Offline fallback
    }

    // Fallback: Index locally using available products
    const fallbackItems: SearchableItem[] = [];
    products.forEach(p => {
      fallbackItems.push({
        id: `prod_${p.id}`,
        type: 'PRODUCT',
        title: p.name,
        subtitle: `${p.industry || 'Workspace'} · Active`,
        description: p.vision || p.description || '',
        badge: 'Workspace',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        productId: p.id,
        productName: p.name,
        targetTab: 'projects'
      });
      fallbackItems.push({
        id: `prd_fallback_${p.id}`,
        type: 'PRD',
        title: `${p.name} Specification PRD`,
        subtitle: `${p.name} · Product Requirements Document`,
        description: `Full functional requirements and acceptance criteria for ${p.name}`,
        badge: 'PRD Spec',
        badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        productId: p.id,
        productName: p.name,
        targetTab: 'prds'
      });
      fallbackItems.push({
        id: `rm_fallback_${p.id}`,
        type: 'ROADMAP',
        title: `${p.name} Strategic Delivery Roadmap`,
        subtitle: `${p.name} · Strategic Quarterly Horizons`,
        description: `Now/Next/Later execution horizons for ${p.name}`,
        badge: 'Roadmap',
        badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        productId: p.id,
        productName: p.name,
        targetTab: 'roadmaps'
      });
      fallbackItems.push({
        id: `story_fallback_${p.id}`,
        type: 'USER_STORY',
        title: `${p.name} User Story Backlog`,
        subtitle: `${p.name} · User stories with Gherkin BDD criteria`,
        description: `Agile backlog and vertical slices for ${p.name}`,
        badge: 'User Stories',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        productId: p.id,
        productName: p.name,
        targetTab: 'stories'
      });
    });

    setIndexedItems(fallbackItems);
    setIsLoading(false);
  };

  // Focus input and fetch index whenever opened
  useEffect(() => {
    if (isOpen) {
      loadSearchIndex();
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Compute fuzzy search results
  const filteredResults = useMemo(() => {
    return fuzzySearchItems(query, indexedItems, filterType);
  }, [query, indexedItems, filterType]);

  // Reset selectedIndex if out of bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard Navigation Handling (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleSelect = (item: SearchableItem) => {
    onNavigate(item.targetTab, item.productId, item.metadata);
    onClose();
  };

  if (!isOpen) return null;

  const getItemIcon = (type: SearchableItem['type']) => {
    switch (type) {
      case 'PRD':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'USER_STORY':
        return <ListTodo className="w-4 h-4 text-amber-400" />;
      case 'ROADMAP':
        return <Map className="w-4 h-4 text-purple-400" />;
      case 'PRODUCT':
        return <FolderKanban className="w-4 h-4 text-emerald-400" />;
      case 'PERSONA':
        return <Users className="w-4 h-4 text-cyan-400" />;
      case 'ACTION':
      default:
        return <Zap className="w-4 h-4 text-indigo-400" />;
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Items' },
    { id: 'PRDS', label: 'PRDs' },
    { id: 'STORIES', label: 'User Stories' },
    { id: 'ROADMAPS', label: 'Roadmaps' },
    { id: 'WORKSPACES', label: 'Workspaces' },
    { id: 'ACTIONS', label: 'Actions' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4">
      {/* Blurred Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] z-10 animate-scaleUp">
        {/* Top Search Input Row */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PRDs, user stories, roadmaps, or type a command..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 overflow-x-auto text-xs">
          {categories.map((c) => {
            const isActive = filterType === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilterType(c.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {c.label}
              </button>
            );
          })}
          <div className="ml-auto text-[11px] text-slate-500 font-mono shrink-0 hidden sm:block">
            {filteredResults.length} {filteredResults.length === 1 ? 'match' : 'matches'}
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {isLoading && indexedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs">Indexing product portfolio specifications...</p>
            </div>
          ) : filteredResults.length > 0 ? (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border border-emerald-500/40 shadow-sm'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 bg-slate-950 border border-slate-800`}>
                      {getItemIcon(item.type)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold tracking-tight truncate ${
                          isSelected ? 'text-emerald-300' : 'text-slate-200'
                        }`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                            item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {item.subtitle}
                      </div>
                      {item.description && (
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <span>Select</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'
                    }`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No matching items found</p>
              <p className="text-xs text-slate-500">
                Try searching for a PRD title, user story ID (e.g. US-001), roadmap horizon, or product keyword.
              </p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Helper Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">↓</kbd>
              <span className="ml-1 text-slate-400">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">↵</kbd>
              <span className="ml-1 text-slate-400">Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">esc</kbd>
              <span className="ml-1 text-slate-400">Close</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Fuzzy Indexing Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
