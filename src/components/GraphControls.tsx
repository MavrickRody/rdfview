import React from 'react';

interface GraphControlsProps {
  maxNodes: number;
  maxEdges: number;
  onMaxNodesChange: (v: number) => void;
  onMaxEdgesChange: (v: number) => void;
  onRelayout: () => void;
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  maxNodes,
  maxEdges,
  onMaxNodesChange,
  onMaxEdgesChange,
  onRelayout,
  nodeCount,
  edgeCount,
  truncated,
}) => {
  return (
    <div className="graph-controls">
      <div className="control-group">
        <label htmlFor="max-nodes">Max nodes:</label>
        <input
          id="max-nodes"
          type="number"
          min={10}
          max={50000}
          step={500}
          value={maxNodes}
          onChange={(e) => onMaxNodesChange(Number(e.target.value))}
          className="num-input"
        />
      </div>

      <div className="control-group">
        <label htmlFor="max-edges">Max edges:</label>
        <input
          id="max-edges"
          type="number"
          min={10}
          max={100000}
          step={1000}
          value={maxEdges}
          onChange={(e) => onMaxEdgesChange(Number(e.target.value))}
          className="num-input"
        />
      </div>

      <div className="stats">
        <span>Nodes: <strong>{nodeCount}</strong></span>
        <span>Edges: <strong>{edgeCount}</strong></span>
      </div>

      {truncated && (
        <div className="warning-badge">
          ⚠ Graph capped at limits. Increase caps or refine your SPARQL query.
        </div>
      )}

      <button className="btn-secondary" onClick={onRelayout} type="button">
        🔄 Re-run Layout
      </button>
    </div>
  );
};
