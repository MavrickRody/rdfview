import { useState, useCallback, useRef } from 'react';
import './App.css';
import { FileLoader } from './components/FileLoader';
import { SparqlEditor } from './components/SparqlEditor';
import { GraphView, type GraphViewHandle } from './components/GraphView';
import { SidePanel, type SidePanelData } from './components/SidePanel';
import { SearchBox } from './components/SearchBox';
import { GraphControls } from './components/GraphControls';
import { parseFile, type ParseFormat } from './lib/parser';
import { runSparql } from './lib/sparql';
import { buildGraph } from './lib/graphBuilder';
import type { QueryResult } from './lib/sparql';
import { SPARQL_TEMPLATES } from './templates/sparqlTemplates';
import type Graph from 'graphology';
import type * as N3 from 'n3';

type AppTab = 'query' | 'results';

export default function App() {
  // Dataset state
  const [store, setStore] = useState<N3.Store | null>(null);
  const [prefixes, setPrefixes] = useState<Record<string, string>>({});
  const [quadCount, setQuadCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);

  // Query state
  const [sparqlQuery, setSparqlQuery] = useState(SPARQL_TEMPLATES[3].query);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Results state
  const [selectResult, setSelectResult] = useState<Extract<QueryResult, { type: 'bindings' }> | null>(null);
  const [booleanResult, setBooleanResult] = useState<boolean | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [graphTruncated, setGraphTruncated] = useState(false);

  // Graph config
  const [maxNodes, setMaxNodes] = useState(5000);
  const [maxEdges, setMaxEdges] = useState(10000);

  // UI state
  const [activeTab, setActiveTab] = useState<AppTab>('query');
  const [sidePanelData, setSidePanelData] = useState<SidePanelData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultCount, setSearchResultCount] = useState(0);

  const graphViewRef = useRef<GraphViewHandle>(null);

  // ── File Loading ──────────────────────────────────────────────────────────

  const handleFileSelected = useCallback(async (file: File, format: ParseFormat) => {
    setParseError(null);
    setParseLoading(true);
    setParseProgress(0);
    setStore(null);
    setGraph(null);
    setSidePanelData(null);
    setSelectResult(null);
    setBooleanResult(null);

    try {
      const result = await parseFile(file, format, (loaded, total) => {
        setParseProgress(Math.round((loaded / total) * 100));
      });
      setStore(result.store);
      setQuadCount(result.quadCount);
      setPrefixes(result.prefixes);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setParseLoading(false);
    }
  }, []);

  // ── SPARQL ────────────────────────────────────────────────────────────────

  const handleRunQuery = useCallback(async () => {
    if (!store || queryRunning) return;

    setQueryError(null);
    setQueryRunning(true);
    setSelectResult(null);
    setBooleanResult(null);
    setGraph(null);
    setSidePanelData(null);

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const result = await runSparql(store, sparqlQuery, ac.signal);

      if (result.type === 'quads') {
        const { graph: g, truncated } = buildGraph(result.quads, {
          maxNodes,
          maxEdges,
          prefixes,
        });
        setGraph(g);
        setGraphTruncated(truncated);
        setActiveTab('query');
      } else if (result.type === 'bindings') {
        setSelectResult(result);
        setActiveTab('results');
      } else if (result.type === 'boolean') {
        setBooleanResult(result.value);
        setActiveTab('results');
      }
    } catch (err) {
      if (ac.signal.aborted) {
        setQueryError('Query was aborted.');
      } else {
        setQueryError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setQueryRunning(false);
      abortControllerRef.current = null;
    }
  }, [store, queryRunning, sparqlQuery, maxNodes, maxEdges, prefixes]);

  const handleAbort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // ── Node selection / navigation ───────────────────────────────────────────

  const handleNodeSelect = useCallback((data: SidePanelData | null) => {
    setSidePanelData(data);
  }, []);

  const handleSidePanelNodeClick = useCallback((nodeId: string) => {
    graphViewRef.current?.focusNode(nodeId);
  }, []);

  const handleRelayout = useCallback(() => {
    graphViewRef.current?.relayout();
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>RDF Graph Viewer</h1>
        <span className="header-subtitle">Offline · SPARQL · WebGL</span>
      </header>

      <div className="app-body">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <section className="sidebar-section">
            <h3>Load File</h3>
            <FileLoader onFileSelected={handleFileSelected} loading={parseLoading} />
            {parseLoading && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${parseProgress}%` }} />
              </div>
            )}
            {parseError && <div className="error-msg">Parse error: {parseError}</div>}
            {store && (
              <div className="dataset-info">
                ✅ Loaded <strong>{quadCount.toLocaleString()}</strong> triples
              </div>
            )}
          </section>

          <section className="sidebar-section">
            <SparqlEditor
              query={sparqlQuery}
              onQueryChange={setSparqlQuery}
              onRun={handleRunQuery}
              onAbort={handleAbort}
              running={queryRunning}
              disabled={!store}
            />
            {queryError && <div className="error-msg">{queryError}</div>}
          </section>

          <section className="sidebar-section">
            <GraphControls
              maxNodes={maxNodes}
              maxEdges={maxEdges}
              onMaxNodesChange={setMaxNodes}
              onMaxEdgesChange={setMaxEdges}
              onRelayout={handleRelayout}
              nodeCount={graph?.order ?? 0}
              edgeCount={graph?.size ?? 0}
              truncated={graphTruncated}
            />
          </section>

          {/* Legend */}
          <section className="sidebar-section legend">
            <h4>Legend</h4>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#4a90d9' }} /> IRI node
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#f0a030' }} /> Blank node
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#4caf50' }} /> Literal node
            </div>
          </section>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab${activeTab === 'query' ? ' active' : ''}`}
              onClick={() => setActiveTab('query')}
              type="button"
            >
              Graph View
            </button>
            <button
              className={`tab${activeTab === 'results' ? ' active' : ''}`}
              onClick={() => setActiveTab('results')}
              type="button"
            >
              Table Results
            </button>
            <div className="tab-spacer" />
            <SearchBox
              onSearch={handleSearch}
              onClear={handleSearchClear}
              resultCount={searchQuery ? searchResultCount : undefined}
            />
          </div>

          {/* Graph View */}
          {activeTab === 'query' && (
            <div className="graph-area">
              <GraphView
                ref={graphViewRef}
                graph={graph}
                searchQuery={searchQuery}
                onNodeSelect={handleNodeSelect}
                onSearchResults={setSearchResultCount}
              />
            </div>
          )}

          {/* Table Results */}
          {activeTab === 'results' && (
            <div className="results-area">
              {booleanResult !== null && (
                <div className="boolean-result">
                  ASK result: <strong>{booleanResult ? 'true' : 'false'}</strong>
                </div>
              )}
              {selectResult && (
                <div className="table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        {selectResult.variables.map((v) => (
                          <th key={v}>{v}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectResult.rows.map((row, i) => (
                        <tr key={i}>
                          {selectResult.variables.map((v) => (
                            <td key={v} title={row[v]}>
                              {row[v] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="table-footer">
                    {selectResult.rows.length} rows
                  </div>
                </div>
              )}
              {!selectResult && booleanResult === null && (
                <div className="graph-empty">Run a SELECT or ASK query to see results here.</div>
              )}
            </div>
          )}
        </main>

        {/* Side Panel */}
        {sidePanelData && (
          <SidePanel
            data={sidePanelData}
            onClose={() => setSidePanelData(null)}
            onNodeClick={handleSidePanelNodeClick}
          />
        )}
      </div>
    </div>
  );
}
