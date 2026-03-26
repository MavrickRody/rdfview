import React from 'react';
import type { NodeAttributes } from '../lib/graphBuilder';
import { compactIri } from '../lib/prefixes';

export interface SidePanelData {
  nodeId: string;
  attrs: NodeAttributes;
  outgoing: Array<{ predicate: string; target: string; targetAttrs: NodeAttributes }>;
  incoming: Array<{ predicate: string; source: string; sourceAttrs: NodeAttributes }>;
}

interface SidePanelProps {
  data: SidePanelData | null;
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ data, onClose, onNodeClick }) => {
  if (!data) return null;

  const { attrs, outgoing, incoming } = data;

  const nodeTypeLabel = {
    iri: 'IRI',
    bnode: 'Blank Node',
    literal: 'Literal',
  }[attrs.nodeType];

  const nodeTypeColor = {
    iri: '#4a90d9',
    bnode: '#f0a030',
    literal: '#4caf50',
  }[attrs.nodeType];

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <span
          className="node-type-badge"
          style={{ background: nodeTypeColor }}
        >
          {nodeTypeLabel}
        </span>
        <button className="btn-close" onClick={onClose} type="button" title="Close">
          ✕
        </button>
      </div>

      <div className="side-panel-body">
        <section>
          <h4>Full Value</h4>
          <code className="full-value">{attrs.fullLabel}</code>
        </section>

        {attrs.datatype && (
          <section>
            <h4>Datatype</h4>
            <code>{compactIri(attrs.datatype)}</code>
          </section>
        )}
        {attrs.language && (
          <section>
            <h4>Language</h4>
            <code>{attrs.language}</code>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h4>Outgoing ({outgoing.length})</h4>
            <ul className="edge-list">
              {outgoing.map((e, i) => (
                <li key={i}>
                  <span className="predicate-chip" title={e.predicate}>
                    {compactIri(e.predicate)}
                  </span>
                  {' → '}
                  <button
                    className="node-link"
                    onClick={() => onNodeClick?.(e.target)}
                    title={e.target}
                    type="button"
                  >
                    {e.targetAttrs.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {incoming.length > 0 && (
          <section>
            <h4>Incoming ({incoming.length})</h4>
            <ul className="edge-list">
              {incoming.map((e, i) => (
                <li key={i}>
                  <button
                    className="node-link"
                    onClick={() => onNodeClick?.(e.source)}
                    title={e.source}
                    type="button"
                  >
                    {e.sourceAttrs.label}
                  </button>
                  {' → '}
                  <span className="predicate-chip" title={e.predicate}>
                    {compactIri(e.predicate)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
