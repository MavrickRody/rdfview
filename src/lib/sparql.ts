import { QueryEngine } from '@comunica/query-sparql';
import type { QueryStringContext } from '@comunica/types';
import type * as N3 from 'n3';
import type { Quad, Term } from '@rdfjs/types';

let engine: QueryEngine | null = null;
function getEngine(): QueryEngine {
  if (!engine) engine = new QueryEngine();
  return engine;
}

export type QueryResult =
  | { type: 'quads'; quads: Quad[] }
  | { type: 'bindings'; variables: string[]; rows: Record<string, string>[] }
  | { type: 'boolean'; value: boolean };

/**
 * Execute a SPARQL query against an N3.Store.
 * Supports CONSTRUCT, SELECT, and ASK.
 * Pass an AbortSignal to cancel the query.
 */
export async function runSparql(
  store: N3.Store,
  sparql: string,
  signal?: AbortSignal
): Promise<QueryResult> {
  const eng = getEngine();

  const ctx: QueryStringContext = {
    sources: [store as unknown as QueryStringContext['sources'][0]],
    ...(signal ? { httpAbortSignal: signal } : {}),
  };

  // Detect query type using a simple regex heuristic (handles PREFIX declarations)
  const stripped = sparql.replace(/^\s*(PREFIX\s+\S+\s*:\s*<[^>]*>\s*)*/im, '').trimStart().toUpperCase();
  const isConstruct = stripped.startsWith('CONSTRUCT');
  const isAsk = stripped.startsWith('ASK');

  if (isConstruct) {
    const result = await eng.queryQuads(sparql, ctx);
    const quads: Quad[] = [];
    await new Promise<void>((resolve, reject) => {
      result.on('data', (q: Quad) => quads.push(q));
      result.on('error', reject);
      result.on('end', resolve);
    });
    return { type: 'quads', quads };
  }

  if (isAsk) {
    const value = await eng.queryBoolean(sparql, ctx);
    return { type: 'boolean', value };
  }

  // SELECT
  const result = await eng.queryBindings(sparql, ctx);

  const variables: string[] = [];
  const rows: Record<string, string>[] = [];
  let headersCollected = false;

  await new Promise<void>((resolve, reject) => {
    result.on('data', (binding) => {
      if (!headersCollected) {
        for (const key of binding.keys()) {
          variables.push((key as Term).value ?? String(key));
        }
        headersCollected = true;
      }
      const row: Record<string, string> = {};
      for (const [key, term] of binding as Iterable<[Term, Term]>) {
        row[(key as Term).value ?? String(key)] = (term as Term).value ?? '';
      }
      rows.push(row);
    });
    result.on('error', reject);
    result.on('end', resolve);
  });

  return { type: 'bindings', variables, rows };
}
