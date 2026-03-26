import {
  useEffect,
  useRef,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import type { NodeAttributes, EdgeAttributes } from '../lib/graphBuilder';
import type { SidePanelData } from './SidePanel';

interface GraphViewProps {
  graph: Graph | null;
  searchQuery: string;
  onNodeSelect: (data: SidePanelData | null) => void;
  onSearchResults: (count: number) => void;
}

export interface GraphViewHandle {
  focusNode: (nodeId: string) => void;
  relayout: () => void;
}

const LAYOUT_DURATION_MS = 2000;

export const GraphView = forwardRef<GraphViewHandle, GraphViewProps>(
  ({ graph, searchQuery, onNodeSelect, onSearchResults }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

    const runLayout = useCallback((g: Graph) => {
      if (g.order === 0) return;
      // Assign random initial positions if not set
      g.forEachNode((nodeId, attrs) => {
        if (attrs.x === undefined || attrs.x === null) {
          g.setNodeAttribute(nodeId, 'x', (Math.random() - 0.5) * 1000);
        }
        if (attrs.y === undefined || attrs.y === null) {
          g.setNodeAttribute(nodeId, 'y', (Math.random() - 0.5) * 1000);
        }
      });

      const settings = forceAtlas2.inferSettings(g);
      const start = Date.now();
      const iterations = 50;

      const step = () => {
        if (Date.now() - start > LAYOUT_DURATION_MS) return;
        forceAtlas2.assign(g, { iterations, settings });
        if (sigmaRef.current) sigmaRef.current.refresh();
        if (Date.now() - start < LAYOUT_DURATION_MS) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }, []);

    // Initialize / re-initialize Sigma when graph changes
    useEffect(() => {
      if (!containerRef.current) return;

      // Destroy old sigma instance
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }

      if (!graph || graph.order === 0) return;

      const sigma = new Sigma(graph, containerRef.current, {
        renderEdgeLabels: true,
        defaultEdgeType: 'arrow',
        labelRenderedSizeThreshold: 6,
        labelSize: 11,
      });

      sigmaRef.current = sigma;

      // Hover events
      sigma.on('enterNode', ({ node, event }) => {
        setHoveredNode(node);
        const attrs = graph.getNodeAttributes(node) as NodeAttributes;
        const { x, y } = event;
        setTooltip({ x, y, label: attrs.fullLabel });
        containerRef.current!.style.cursor = 'pointer';
      });

      sigma.on('leaveNode', () => {
        setHoveredNode(null);
        setTooltip(null);
        containerRef.current!.style.cursor = 'default';
      });

      sigma.on('moveBody', () => {
        setTooltip(null);
      });

      // Click node
      sigma.on('clickNode', ({ node }) => {
        const attrs = graph.getNodeAttributes(node) as NodeAttributes;

        const outgoing: SidePanelData['outgoing'] = [];
        graph.forEachOutEdge(node, (_edgeId, edgeAttrs, _src, target) => {
          const targetAttrs = graph.getNodeAttributes(target) as NodeAttributes;
          outgoing.push({
            predicate: (edgeAttrs as EdgeAttributes).fullLabel,
            target,
            targetAttrs,
          });
        });

        const incoming: SidePanelData['incoming'] = [];
        graph.forEachInEdge(node, (_edgeId, edgeAttrs, source) => {
          const sourceAttrs = graph.getNodeAttributes(source) as NodeAttributes;
          incoming.push({
            predicate: (edgeAttrs as EdgeAttributes).fullLabel,
            source,
            sourceAttrs,
          });
        });

        onNodeSelect({
          nodeId: node,
          attrs,
          outgoing,
          incoming,
        });

        // Highlight neighborhood
        highlightNeighborhood(graph, sigma, node);
      });

      // Click on background: clear selection
      sigma.on('clickStage', () => {
        onNodeSelect(null);
        clearHighlights(graph, sigma);
      });

      // Run force layout
      runLayout(graph);

      return () => {
        sigma.kill();
        sigmaRef.current = null;
      };
    }, [graph, runLayout, onNodeSelect]);

    // Search highlighting
    useEffect(() => {
      if (!graph || !sigmaRef.current) return;

      if (!searchQuery) {
        clearHighlights(graph, sigmaRef.current);
        onSearchResults(0);
        return;
      }

      const lower = searchQuery.toLowerCase();
      let count = 0;
      const matching = new Set<string>();

      graph.forEachNode((nodeId, attrs) => {
        const na = attrs as NodeAttributes;
        if (
          na.label.toLowerCase().includes(lower) ||
          na.fullLabel.toLowerCase().includes(lower)
        ) {
          matching.add(nodeId);
          count++;
        }
      });

      // Dim non-matching nodes
      graph.forEachNode((nodeId, attrs) => {
        const na = attrs as NodeAttributes;
        if (matching.has(nodeId)) {
          graph.setNodeAttribute(nodeId, 'color', na.color || '#4a90d9');
          graph.setNodeAttribute(nodeId, 'size', (na.size || 8) * 1.5);
        } else {
          graph.setNodeAttribute(nodeId, 'color', '#dddddd');
        }
      });

      sigmaRef.current.refresh();
      onSearchResults(count);
    }, [searchQuery, graph, onSearchResults]);

    // Expose handles
    useImperativeHandle(
      ref,
      () => ({
        focusNode: (nodeId: string) => {
          if (!sigmaRef.current || !graph) return;
          if (!graph.hasNode(nodeId)) return;
          highlightNeighborhood(graph, sigmaRef.current, nodeId);
          const { x, y } = graph.getNodeAttributes(nodeId) as NodeAttributes;
          sigmaRef.current.getCamera().animate({ x, y, ratio: 0.3 }, { duration: 500 });
        },
        relayout: () => {
          if (graph) runLayout(graph);
        },
      }),
      [graph, runLayout]
    );

    // Tooltip position relative to container
    const containerRect = containerRef.current?.getBoundingClientRect();

    return (
      <div className="graph-view-wrapper">
        <div ref={containerRef} className="sigma-container" />
        {tooltip && (
          <div
            className="tooltip"
            style={{
              left: tooltip.x - (containerRect?.left ?? 0) + 12,
              top: tooltip.y - (containerRect?.top ?? 0) - 8,
            }}
          >
            {tooltip.label}
          </div>
        )}
        {hoveredNode === null && graph && graph.order === 0 && (
          <div className="graph-empty">No graph data. Run a CONSTRUCT query to visualize.</div>
        )}
        {!graph && (
          <div className="graph-empty">
            Load an RDF file and run a CONSTRUCT query to start.
          </div>
        )}
      </div>
    );
  }
);

GraphView.displayName = 'GraphView';

function highlightNeighborhood(graph: Graph, sigma: Sigma, nodeId: string) {
  const neighbors = new Set(graph.neighbors(nodeId));
  neighbors.add(nodeId);

  graph.forEachNode((id, attrs) => {
    const na = attrs as NodeAttributes;
    if (neighbors.has(id)) {
      graph.setNodeAttribute(id, 'color', na.color);
      graph.setNodeAttribute(id, 'highlighted', true);
    } else {
      graph.setNodeAttribute(id, 'color', '#e0e0e0');
      graph.setNodeAttribute(id, 'highlighted', false);
    }
  });

  graph.forEachEdge((edgeId, _attrs, source, target) => {
    if (neighbors.has(source) && neighbors.has(target)) {
      graph.setEdgeAttribute(edgeId, 'color', '#555555');
      graph.setEdgeAttribute(edgeId, 'size', 2);
    } else {
      graph.setEdgeAttribute(edgeId, 'color', '#f0f0f0');
      graph.setEdgeAttribute(edgeId, 'size', 0.5);
    }
  });

  sigma.refresh();
}

function clearHighlights(graph: Graph, sigma: Sigma) {
  const COLOR_MAP: Record<string, string> = {
    iri: '#4a90d9',
    bnode: '#f0a030',
    literal: '#4caf50',
  };

  graph.forEachNode((nodeId, attrs) => {
    const na = attrs as NodeAttributes;
    graph.setNodeAttribute(nodeId, 'color', COLOR_MAP[na.nodeType] || '#4a90d9');
    graph.setNodeAttribute(nodeId, 'highlighted', false);
    graph.setNodeAttribute(nodeId, 'size', na.nodeType === 'literal' ? 5 : na.nodeType === 'bnode' ? 6 : 8);
  });

  graph.forEachEdge((edgeId) => {
    graph.setEdgeAttribute(edgeId, 'color', '#999999');
    graph.setEdgeAttribute(edgeId, 'size', 1);
  });

  sigma.refresh();
}
