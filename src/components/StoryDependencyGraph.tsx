import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  GitMerge, 
  Sparkles, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  ArrowRight,
  Maximize2,
  Minimize2,
  X,
  Target
} from 'lucide-react';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  persona: string;
  epicTitle: string;
  tier: 'P0' | 'P1' | 'P2' | 'P3';
  riceScore: number;
  status: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'BLOCKS' | 'ENABLES' | 'SEQUENTIAL' | 'DATA_FEED';
  rationale: string;
  strength: number;
}

interface StoryDependencyGraphProps {
  stories: any[];
  recommendations?: any[];
  onSelectStory?: (storyId: string) => void;
  onClose?: () => void;
}

export const StoryDependencyGraph: React.FC<StoryDependencyGraphProps> = ({
  stories,
  recommendations = [],
  onSelectStory,
  onClose
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Transform stories and Next Best Action recommendations into Nodes & Links
  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    
    // 1. Build Nodes from stories
    stories.forEach(s => {
      const rice = s.riceScore || Math.round(((s.reach || 1000) * (s.impact || 2) * (s.confidence || 0.8)) / (s.effort || 2));
      const tier = rice >= 3000 ? 'P0' : rice >= 1500 ? 'P1' : rice >= 600 ? 'P2' : 'P3';
      
      nodeMap.set(s.id, {
        id: s.id,
        persona: s.persona || 'User',
        epicTitle: s.epicTitle || 'Feature Module',
        tier,
        riceScore: rice,
        status: s.status || 'READY_FOR_DEV'
      });
    });

    const graphLinks: GraphLink[] = [];

    // 2. Build Links from Next Best Action recommendations or infer dependencies
    if (recommendations.length > 0) {
      recommendations.forEach(rec => {
        if (rec.sourceStoryId && rec.suggestedStory?.id) {
          // Ensure target node exists
          if (!nodeMap.has(rec.suggestedStory.id)) {
            const sugRice = rec.suggestedStory.riceScore || 2000;
            nodeMap.set(rec.suggestedStory.id, {
              id: rec.suggestedStory.id,
              persona: rec.suggestedStory.persona || 'Stakeholder',
              epicTitle: rec.suggestedStory.epicTitle || 'Recommended Next Action',
              tier: sugRice >= 3000 ? 'P0' : 'P1',
              riceScore: sugRice,
              status: 'PROPOSED_NEXT'
            });
          }

          graphLinks.push({
            source: rec.sourceStoryId,
            target: rec.suggestedStory.id,
            type: (rec.dependencyType as any) || 'ENABLES',
            rationale: rec.rationale || 'Next best action trajectory',
            strength: 0.7
          });
        }
      });
    }

    // Default topological links if recommendations are sparse
    const storyIds = Array.from(nodeMap.keys());
    if (graphLinks.length === 0 && storyIds.length >= 2) {
      graphLinks.push({
        source: storyIds[0],
        target: storyIds[1],
        type: 'BLOCKS',
        rationale: 'Core decision engine outputs required before ERP ledger dispatch',
        strength: 0.9
      });
      if (storyIds.length >= 3) {
        graphLinks.push({
          source: storyIds[0],
          target: storyIds[2],
          type: 'ENABLES',
          rationale: 'Underwriting state machine exposes credit balance feed',
          strength: 0.8
        });
      }
      if (storyIds.length >= 4) {
        graphLinks.push({
          source: storyIds[2],
          target: storyIds[3],
          type: 'DATA_FEED',
          rationale: 'Trade line balance informs temporary limit extension requests',
          strength: 0.6
        });
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links: graphLinks
    };
  }, [stories, recommendations]);

  // D3 Force Simulation Setup
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = 800;
    const height = 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Define Arrow Marker Definitions
    const defs = svg.append('defs');

    ['BLOCKS', 'ENABLES', 'SEQUENTIAL', 'DATA_FEED'].forEach(type => {
      const color = 
        type === 'BLOCKS' ? '#ef4444' :
        type === 'ENABLES' ? '#10b981' :
        type === 'DATA_FEED' ? '#38bdf8' : '#a855f7';

      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 24)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Container Group for Zoom/Pan
    const g = svg.append('g').attr('class', 'graph-container');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Filtered links
    const visibleLinks = filterType === 'ALL' 
      ? links 
      : links.filter(l => l.type === filterType);

    // Create D3 Force Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(visibleLinks).id(d => d.id).distance(130))
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(48));

    // Render Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(visibleLinks)
      .enter()
      .append('line')
      .attr('stroke', d => {
        return d.type === 'BLOCKS' ? '#ef4444' :
               d.type === 'ENABLES' ? '#10b981' :
               d.type === 'DATA_FEED' ? '#38bdf8' : '#a855f7';
      })
      .attr('stroke-width', d => d.type === 'BLOCKS' ? 2.5 : 1.8)
      .attr('stroke-dasharray', d => d.type === 'DATA_FEED' ? '4 4' : 'none')
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .attr('opacity', 0.85);

    // Link Labels (Relationship Type)
    const linkText = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(visibleLinks)
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .text(d => d.type);

    // Render Node Groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node Outer Glow / Circle
    node.append('circle')
      .attr('r', d => d.tier === 'P0' ? 26 : d.tier === 'P1' ? 22 : 18)
      .attr('fill', d => {
        return d.tier === 'P0' ? '#064e3b' :
               d.tier === 'P1' ? '#0e7490' :
               d.tier === 'P2' ? '#78350f' : '#1e293b';
      })
      .attr('stroke', d => {
        return d.tier === 'P0' ? '#10b981' :
               d.tier === 'P1' ? '#06b6d4' :
               d.tier === 'P2' ? '#f59e0b' : '#64748b';
      })
      .attr('stroke-width', d => d.tier === 'P0' ? 3 : 2)
      .attr('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.5))');

    // Node Story ID Label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .text(d => d.id);

    // Node Score Badge
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('fill', d => d.tier === 'P0' ? '#6ee7b7' : '#67e8f9')
      .text(d => `${d.riceScore}`);

    // Click Handler for node inspection
    node.on('click', (event, d) => {
      setSelectedNode(d);
      if (onSelectStory) onSelectStory(d.id);
    });

    // Tick Handler
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      linkText
        .attr('x', d => (((d.source as GraphNode).x || 0) + ((d.target as GraphNode).x || 0)) / 2)
        .attr('y', d => (((d.source as GraphNode).y || 0) + ((d.target as GraphNode).y || 0)) / 2 - 5);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, filterType]);

  return (
    <div 
      ref={containerRef}
      className={`rounded-2xl bg-slate-950 border border-purple-500/40 shadow-2xl overflow-hidden flex flex-col transition-all ${
        isFullScreen ? 'fixed inset-4 z-50' : 'w-full my-4'
      }`}
    >
      {/* Header Toolbar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <GitMerge className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Force-Directed Story Dependency Graph
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                D3 Simulation Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive topological dependency mapping synthesized from Next Best Action recommendations.
            </p>
          </div>
        </div>

        {/* Filter & Window Controls */}
        <div className="flex items-center gap-2">
          {/* Dependency Type Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-500 px-2 font-medium">Link Filter:</span>
            {['ALL', 'BLOCKS', 'ENABLES', 'DATA_FEED'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-0.5 rounded transition-all font-semibold ${
                  filterType === type 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close Graph"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 min-h-[380px] bg-slate-950">
        <svg 
          ref={svgRef} 
          className="w-full h-full min-h-[380px]"
          viewBox="0 0 800 480"
        />

        {/* Graph Legend Overlay */}
        <div className="absolute bottom-3 left-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm text-[10px] space-y-1.5 shadow-lg">
          <span className="font-bold text-slate-300 block uppercase tracking-wider text-[9px]">Dependency Types</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-rose-300">
              <span className="w-2.5 h-0.5 bg-rose-500 rounded" />
              <span>BLOCKS</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded" />
              <span>ENABLES</span>
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="w-2.5 h-0.5 border-t border-dashed border-cyan-400" />
              <span>DATA_FEED</span>
            </span>
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 max-w-xs p-3.5 rounded-xl bg-slate-900/95 border border-purple-500/40 shadow-xl backdrop-blur-md text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-purple-300">{selectedNode.id}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {selectedNode.tier}
                </span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-slate-200 font-semibold">{selectedNode.persona}</div>
              <div className="text-slate-400 text-[11px]">{selectedNode.epicTitle}</div>
              <div className="text-emerald-400 font-mono text-[11px] font-bold">
                RICE Score: {selectedNode.riceScore.toLocaleString()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Drag to reposition node</span>
              <button
                onClick={() => onSelectStory && onSelectStory(selectedNode.id)}
                className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1"
              >
                <span>View Story</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
