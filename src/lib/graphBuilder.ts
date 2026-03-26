import Graph from 'graphology';
import type { Quad } from '@rdfjs/types';
import { compactIri, truncate } from './prefixes';

export interface NodeAttributes {
  label: string;
  fullLabel: string;
  nodeType: 'iri' | 'bnode' | 'literal';
  datatype?: string;
  language?: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface EdgeAttributes {
  label: string;
  fullLabel: string;
  color: string;
  size: number;
}

export interface GraphBuildResult {
  graph: Graph;
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
}

const NODE_COLORS = {
  iri: '#4a90d9',
  bnode: '#f0a030',
  literal: '#4caf50',
};

function rnd(): number {
  return (Math.random() - 0.5) * 1000;
}

/**
 * Build a graphology Graph from RDFJS quads.
 * Literals are represented as nodes (per requirement).
 */
export function buildGraph(
  quads: Quad[],
  options: {
    maxNodes?: number;
    maxEdges?: number;
    prefixes?: Record<string, string>;
  } = {}
): GraphBuildResult {
  const { maxNodes = 5000, maxEdges = 10000, prefixes = {} } = options;
  const graph = new Graph({ multi: true, type: 'directed' });
  let truncated = false;

  const ensureNode = (
    nodeId: string,
    nodeType: 'iri' | 'bnode' | 'literal',
    fullLabel: string,
    extra?: { datatype?: string; language?: string }
  ): boolean => {
    if (graph.hasNode(nodeId)) return true;
    if (graph.order >= maxNodes) {
      truncated = true;
      return false;
    }

    let displayLabel: string;
    if (nodeType === 'iri') {
      displayLabel = compactIri(fullLabel, prefixes);
    } else if (nodeType === 'bnode') {
      displayLabel = nodeId;
    } else {
      displayLabel = fullLabel;
    }

    graph.addNode(nodeId, {
      label: truncate(displayLabel, 40),
      fullLabel,
      nodeType,
      datatype: extra?.datatype,
      language: extra?.language,
      x: rnd(),
      y: rnd(),
      size: nodeType === 'literal' ? 5 : nodeType === 'bnode' ? 6 : 8,
      color: NODE_COLORS[nodeType],
    } satisfies NodeAttributes);
    return true;
  };

  for (const quad of quads) {
    if (graph.size >= maxEdges) {
      truncated = true;
      break;
    }

    const { subject, predicate, object } = quad;

    // Subject node
    const subjId =
      subject.termType === 'BlankNode' ? `_:${subject.value}` : subject.value;
    const subjType = subject.termType === 'BlankNode' ? 'bnode' : 'iri';
    if (!ensureNode(subjId, subjType, subjId)) continue;

    // Object node
    let objId: string;
    if (object.termType === 'Literal') {
      // Deduplicate literals by value + datatype + language
      const lang = object.language ?? '';
      const dt = object.datatype?.value ?? '';
      objId = `lit:${object.value}\x00${dt}\x00${lang}`;
      if (
        !ensureNode(objId, 'literal', object.value, {
          datatype: dt || undefined,
          language: lang || undefined,
        })
      ) {
        continue;
      }
    } else {
      objId =
        object.termType === 'BlankNode' ? `_:${object.value}` : object.value;
      const objType = object.termType === 'BlankNode' ? 'bnode' : 'iri';
      if (!ensureNode(objId, objType, objId)) continue;
    }

    if (graph.size >= maxEdges) {
      truncated = true;
      break;
    }

    const predicateLabel = compactIri(predicate.value, prefixes);
    graph.addDirectedEdge(subjId, objId, {
      label: truncate(predicateLabel, 30),
      fullLabel: predicate.value,
      color: '#999999',
      size: 1,
    } satisfies EdgeAttributes);
  }

  return {
    graph,
    nodeCount: graph.order,
    edgeCount: graph.size,
    truncated,
  };
}
