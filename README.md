# RDF Graph Viewer

A **web-only, offline RDF graph viewer** built with Vite + React + TypeScript. Runs entirely in the browser — no server required, works offline after the page loads.

![RDF Graph Viewer Screenshot](https://github.com/user-attachments/assets/509fc77e-6c62-4614-b6c2-24cbe1a0a2eb)

## Features

- 📂 **Load RDF files** via drag-and-drop or file picker
- 🔤 **Supported formats**: Turtle (`.ttl`), RDF/XML (`.rdf`/`.xml`), JSON-LD (`.jsonld`/`.json`), N-Quads (`.nq`)
- 🔍 **Local SPARQL engine** via Comunica — query your dataset entirely offline
- 📊 **Interactive graph** rendered with sigma.js (WebGL) + graphology
  - **Literals are nodes** (distinct green style) alongside IRI and blank nodes
  - Pan, zoom, hover tooltips, click-to-focus with neighbor highlighting
  - Side panel shows full node value, datatype/language, outgoing/incoming edges
  - Search box to find nodes by label or IRI substring
- ⚡ **Performance guardrails**: configurable `maxNodes` / `maxEdges` caps; ForceAtlas2 layout with a fixed time budget
- 🔢 **SELECT query results** shown as a sortable table

---

## How to Run Locally

**Requirements**: Node.js ≥ 18, npm ≥ 9

```bash
# Clone and install
git clone https://github.com/MavrickRody/rdfview.git
cd rdfview
npm install

# Start development server
npm run dev
# → Open http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

---

## Supported RDF Formats

| Extension | Format | Parser |
|---|---|---|
| `.ttl`, `.turtle` | Turtle | `n3` |
| `.rdf`, `.xml` | RDF/XML | `rdfxml-streaming-parser` |
| `.jsonld`, `.json` | JSON-LD | `jsonld` → N-Quads → `n3` |
| `.nq`, `.nquads` | N-Quads | `n3` |

Format is auto-detected from the file extension. Use the **Format override** dropdown to force a specific parser.

---

## Example SPARQL Queries

### 1. Predicate Frequency (SELECT)

Discover which predicates appear most often in your dataset:

```sparql
SELECT ?predicate (COUNT(*) AS ?count)
WHERE {
  ?s ?predicate ?o .
}
GROUP BY ?predicate
ORDER BY DESC(?count)
LIMIT 50
```

### 2. Seed Neighborhood — 1-hop (CONSTRUCT)

Visualize all triples directly connected to a specific node:

```sparql
CONSTRUCT { ?s ?p ?o }
WHERE {
  {
    BIND(<http://example.org/MyThing> AS ?s)
    ?s ?p ?o .
  }
  UNION
  {
    BIND(<http://example.org/MyThing> AS ?o)
    ?s ?p ?o .
  }
}
LIMIT 500
```

### 3. Labels & Types (CONSTRUCT)

Show only type and label triples — great safe default for large datasets:

```sparql
CONSTRUCT { ?s ?p ?o }
WHERE {
  ?s ?p ?o .
  FILTER(?p IN (
    <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>,
    <http://www.w3.org/2000/01/rdf-schema#label>,
    <http://www.w3.org/2004/02/skos/core#prefLabel>
  ))
}
LIMIT 2000
```

### 4. Two-hop Neighborhood (CONSTRUCT)

```sparql
CONSTRUCT { ?s ?p ?o . ?o ?p2 ?o2 . }
WHERE {
  BIND(<http://example.org/MyThing> AS ?s)
  ?s ?p ?o .
  OPTIONAL { ?o ?p2 ?o2 . }
}
LIMIT 1000
```

---

## Performance Tips

| Scenario | Recommendation |
|---|---|
| Large dataset (100k+ triples) | Never render the full dataset. Start with a CONSTRUCT query with `LIMIT 500–2000`. |
| Reduce visual clutter | Use the **Labels & Types** template to show only type/label edges. |
| Cap explosions | Lower **Max nodes** and **Max edges** before running a query; the app shows a warning when the cap is hit. |
| Predicate filter | Add `FILTER(?p = <...>)` or `FILTER(?p IN (...))` to restrict which edges appear. |
| Re-layout | Click **🔄 Re-run Layout** after the graph settles to improve readability. |
| Abort long queries | Click **✕ Abort** to cancel a running SPARQL query. |

---

## Architecture

```
src/
├── App.tsx                  # Main app shell
├── components/
│   ├── FileLoader.tsx        # Drag-drop / file picker + format detection
│   ├── SparqlEditor.tsx      # SPARQL text area + template buttons + abort
│   ├── GraphView.tsx         # Sigma.js renderer + ForceAtlas2 layout
│   ├── SidePanel.tsx         # Node detail panel
│   ├── SearchBox.tsx         # Label/IRI substring search
│   └── GraphControls.tsx     # maxNodes / maxEdges / relayout
├── lib/
│   ├── parser.ts             # Turtle / RDF/XML / JSON-LD → N3.Store
│   ├── sparql.ts             # Comunica query engine wrapper
│   ├── graphBuilder.ts       # Quads → graphology Graph (literals as nodes)
│   └── prefixes.ts           # IRI compaction utilities
└── templates/
    └── sparqlTemplates.ts    # Built-in query templates
```

## Tech Stack

| Layer | Library |
|---|---|
| App framework | Vite + React + TypeScript |
| Turtle / N-Quads parsing | `n3` |
| RDF/XML parsing | `rdfxml-streaming-parser` |
| JSON-LD parsing | `jsonld` |
| In-memory dataset | `n3` Store |
| SPARQL engine | `@comunica/query-sparql` |
| Graph data structure | `graphology` |
| Graph renderer | `sigma` (WebGL) |
| Layout | `graphology-layout-forceatlas2` |
