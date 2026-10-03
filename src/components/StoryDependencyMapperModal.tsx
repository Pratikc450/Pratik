import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Share2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  X,
  RotateCcw,
  Zap,
  Info,
  ShieldAlert,
  GitBranch,
  CornerDownRight
} from 'lucide-react';

interface DependencyNode {
  id: string;
  title: string;
  persona: string;
  tier: string;
  riceScore: number;
  effort: number;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'BLOCKS' | 'REQUIRES' | 'ENHANCES';
  reason: string;
}

interface DependencyMappingData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
  bottleneckStoryId: string;
  bottleneckReason: string;
}

interface StoryDependencyMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: any[];
  productId: string;
  productName?: string;
  onSelectStory?: (id: string) => void;
}

export const StoryDependencyMapperModal: React.FC<StoryDependencyMapperModalProps> = ({
  isOpen,
  onClose,
  stories,
  productId,
  productName = 'Product',
  onSelectStory
}) => {
  const [mapping, setMapping] = useState<DependencyMappingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL_PATH' | 'BOTTLENECK'>('ALL');

  useEffect(() => {
    if (isOpen && stories.length > 0) {
      loadDependencies();
    }
  }, [isOpen, stories, productId]);

  const loadDependencies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/dependency-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories,
          productId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mapping) {
          setMapping(data.mapping);
          if (data.mapping.bottleneckStoryId) {
            setSelectedStoryId(data.mapping.bottleneckStoryId);
          } else if (data.mapping.nodes.length > 0) {
            setSelectedStoryId(data.mapping.nodes[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to map dependencies', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Node position layout calculation for SVG Network Graph
  const layoutNodes = useMemo(() => {
    if (!mapping) return [];
    const count = mapping.nodes.length;
    const width = 680;
    const height = 340;
    
    // Multi-tier column layout (Left: Preconditions/Core -> Center: Integrations -> Right: Security/Downstream)
    return mapping.nodes.map((node, i) => {
      const isCritical = (mapping.criticalPath || []).includes(node.id);
      const isBottleneck = mapping.bottleneckStoryId === node.id;
      
      // Calculate arranged x and y coordinates
      let x = 80;
      let y = 80;
      if (count <= 3) {
        x = 90 + i * 240;
        y = 170;
      } else {
        const col = i % 3;
        const row = Math.floor(i / 3);
        x = 90 + col * 240;
        y = 80 + row * 130;
      }

      return {
        ...node,
        x,
        y,
        isCritical,
        isBottleneck
      };
    });
  }, [mapping]);

  const selectedNodeData = useMemo(() => {
    if (!mapping || !selectedStoryId) return null;
    const node = mapping.nodes.find(n => n.id === selectedStoryId);
    const incoming = mapping.edges.filter(e => e.to === selectedStoryId);
    const outgoing = mapping.edges.filter(e => e.from === selectedStoryId);
    return { node, incoming, outgoing };
  }, [mapping, selectedStoryId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  AI Inter-Story Dependency & Critical Path Mapper
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  NLP Graph Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extracts cross-story preconditions and architectural dependencies to highlight single-point-of-failure bottlenecks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDependencies}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Re-run dependency extraction"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottleneck Warning Banner */}
        {mapping?.bottleneckStoryId && (
          <div className="px-5 py-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-200">
                  Critical Bottleneck Identified: <span className="font-mono text-amber-400 font-bold">{mapping.bottleneckStoryId}</span>
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {mapping.bottleneckReason}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                Critical Path: {mapping.criticalPath.join(' → ')}
              </span>
            </div>
          </div>
        )}

        {/* Main Body: Graph Canvas + Inspector Panel */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* SVG Network Graph Canvas */}
          <div className="lg:col-span-2 p-4 flex flex-col justify-between bg-slate-950/60 relative">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-slate-200">Interactive Dependency Network Graph</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2.5 h-0.5 bg-purple-500 inline-block" /> Critical Path
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-0.5 bg-slate-600 inline-block" /> Dependency Link
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="h-80 flex flex-col items-center justify-center space-y-2">
                <GitBranch className="w-8 h-8 text-purple-400 animate-pulse" />
                <span className="text-xs text-slate-400">Extracting inter-story relationships...</span>
              </div>
            ) : (
              <div className="w-full h-80 rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden relative shadow-inner">
                <svg className="w-full h-full" viewBox="0 0 700 340">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                    </marker>
                    <marker
                      id="arrow-critical"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#c084fc" />
                    </marker>
                  </defs>

                  {/* Render Dependency Edges */}
                  {mapping?.edges.map((edge, idx) => {
                    const fromNode = layoutNodes.find(n => n.id === edge.from);
                    const toNode = layoutNodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const isEdgeCritical = mapping.criticalPath.includes(edge.from) && mapping.criticalPath.includes(edge.to);
                    const isSelectedEdge = selectedStoryId === edge.from || selectedStoryId === edge.to;

                    return (
                      <g key={idx}>
                        <path
                          d={`M ${fromNode.x} ${fromNode.y} Q ${(fromNode.x + toNode.x) / 2} ${(fromNode.y + toNode.y) / 2 - 25} ${toNode.x} ${toNode.y}`}
                          fill="none"
                          stroke={isEdgeCritical ? '#a855f7' : isSelectedEdge ? '#818cf8' : '#334155'}
                          strokeWidth={isEdgeCritical ? 2.5 : isSelectedEdge ? 2 : 1.2}
                          strokeDasharray={edge.type === 'ENHANCES' ? '4 4' : 'none'}
                          markerEnd={isEdgeCritical ? 'url(#arrow-critical)' : 'url(#arrow)'}
                        />
                      </g>
                    );
                  })}

                  {/* Render Story Nodes */}
                  {layoutNodes.map((node) => {
                    const isSelected = selectedStoryId === node.id;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedStoryId(node.id)}
                        className="cursor-pointer group"
                      >
                        {/* Glow halo if critical */}
                        {node.isCritical && (
                          <circle
                            r="28"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="2"
                            strokeOpacity="0.4"
                            className="animate-pulse"
                          />
                        )}

                        <circle
                          r="22"
                          fill={isSelected ? '#3b0764' : node.isBottleneck ? '#451a03' : '#0f172a'}
                          stroke={
                            node.isBottleneck ? '#f59e0b' :
                            node.isCritical ? '#a855f7' :
                            isSelected ? '#38bdf8' : '#334155'
                          }
                          strokeWidth={isSelected || node.isCritical ? 2.5 : 1.5}
                        />

                        {/* Story ID Text */}
                        <text
                          textAnchor="middle"
                          dy="-2"
                          fill="#f8fafc"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {node.id}
                        </text>

                        {/* Priority Tier Subtext */}
                        <text
                          textAnchor="middle"
                          dy="10"
                          fill={node.tier === 'P0' ? '#34d399' : '#38bdf8'}
                          fontSize="8"
                          fontWeight="bold"
                        >
                          {node.tier}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            <div className="p-2 text-[11px] text-slate-500 font-mono flex items-center justify-between">
              <span>Click a node to inspect blocking relationships</span>
              <span>{mapping?.edges.length || 0} Links Extracted</span>
            </div>
          </div>

          {/* Inspector Side Panel */}
          <div className="p-4 sm:p-5 space-y-4 bg-slate-900 flex flex-col justify-between">
            {selectedNodeData?.node ? (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {selectedNodeData.node.id}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">
                      {selectedNodeData.node.tier} Tier · {selectedNodeData.node.riceScore.toLocaleString()} RICE
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mt-2">
                    {selectedNodeData.node.title}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Target Persona: {selectedNodeData.node.persona}
                  </span>
                </div>

                {/* Incoming Preconditions */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Preconditions (Depends On):
                  </span>
                  {selectedNodeData.incoming.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-slate-500 italic text-[11px]">
                      No upstream story dependencies. Ready for sprint start!
                    </div>
                  ) : (
                    selectedNodeData.incoming.map((edge, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-purple-300 font-bold font-mono text-[11px]">
                          <span>Requires {edge.from}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200">
                            {edge.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{edge.reason}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Outgoing Blocked Stories */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Blocks Downstream Capabilities:
                  </span>
                  {selectedNodeData.outgoing.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-slate-500 italic text-[11px]">
                      No downstream stories blocked by this item.
                    </div>
                  ) : (
                    selectedNodeData.outgoing.map((edge, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1">
                        <div className="flex items-center justify-between text-rose-300 font-bold font-mono text-[11px]">
                          <span>Blocks {edge.to}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-200">
                            {edge.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{edge.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                Select a story node in the graph to inspect dependency relationships.
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Architectural Integrity: 100%
              </span>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close Mapper
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
