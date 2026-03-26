import React, { useRef, useCallback } from 'react';
import { SPARQL_TEMPLATES } from '../templates/sparqlTemplates';

interface SparqlEditorProps {
  query: string;
  onQueryChange: (q: string) => void;
  onRun: () => void;
  onAbort: () => void;
  running: boolean;
  disabled: boolean;
}

export const SparqlEditor: React.FC<SparqlEditorProps> = ({
  query,
  onQueryChange,
  onRun,
  onAbort,
  running,
  disabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTemplate = useCallback(
    (templateIdx: number) => {
      const t = SPARQL_TEMPLATES[templateIdx];
      if (t) {
        onQueryChange(t.query);
        textareaRef.current?.focus();
      }
    },
    [onQueryChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab key: insert 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = query.slice(0, start) + '  ' + query.slice(end);
        onQueryChange(newVal);
        // Restore cursor position after React re-render
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        }, 0);
      }
      // Ctrl+Enter / Cmd+Enter: run query
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!running && !disabled) onRun();
      }
    },
    [query, onQueryChange, onRun, running, disabled]
  );

  return (
    <div className="sparql-editor">
      <div className="sparql-toolbar">
        <span className="section-title">SPARQL Query</span>
        <div className="template-buttons">
          {SPARQL_TEMPLATES.map((t, i) => (
            <button
              key={i}
              className="btn-template"
              onClick={() => loadTemplate(i)}
              title={t.description}
              type="button"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        className="sparql-textarea"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        rows={8}
        placeholder="Enter a SPARQL query (CONSTRUCT or SELECT)…"
      />

      <div className="sparql-actions">
        <button
          className="btn-primary"
          onClick={onRun}
          disabled={running || disabled}
          type="button"
        >
          {running ? 'Running…' : '▶ Run Query'}
        </button>
        {running && (
          <button className="btn-danger" onClick={onAbort} type="button">
            ✕ Abort
          </button>
        )}
        <small className="hint">Ctrl+Enter to run</small>
      </div>
    </div>
  );
};
