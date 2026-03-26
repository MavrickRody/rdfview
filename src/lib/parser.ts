import * as N3 from 'n3';
import type { Quad } from '@rdfjs/types';

export type ParseFormat = 'turtle' | 'rdfxml' | 'jsonld' | 'nquads';

/**
 * Detect format from file extension / MIME type.
 */
export function detectFormat(filename: string, mimeType?: string): ParseFormat {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ttl' || ext === 'turtle') return 'turtle';
  if (ext === 'rdf' || ext === 'xml') return 'rdfxml';
  if (ext === 'jsonld') return 'jsonld';
  if (ext === 'json') return 'jsonld';
  if (ext === 'nq' || ext === 'nquads') return 'nquads';
  if (mimeType) {
    if (mimeType.includes('turtle')) return 'turtle';
    if (mimeType.includes('rdf+xml') || mimeType.includes('xml')) return 'rdfxml';
    if (mimeType.includes('ld+json') || mimeType.includes('json')) return 'jsonld';
    if (mimeType.includes('n-quads')) return 'nquads';
  }
  return 'turtle';
}

/**
 * Parse a file into an N3.Store.
 * Returns { store, quadCount, prefixes }.
 */
export async function parseFile(
  file: File,
  formatOverride?: ParseFormat,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ store: N3.Store; quadCount: number; prefixes: Record<string, string> }> {
  const format = formatOverride ?? detectFormat(file.name, file.type);
  const text = await readFileAsText(file, onProgress);

  if (format === 'turtle' || format === 'nquads') {
    return parseTurtle(text, format);
  } else if (format === 'jsonld') {
    return parseJsonLd(text);
  } else if (format === 'rdfxml') {
    return parseRdfXml(text);
  }
  throw new Error(`Unsupported format: ${format}`);
}

async function readFileAsText(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function parseTurtle(
  text: string,
  format: 'turtle' | 'nquads'
): Promise<{ store: N3.Store; quadCount: number; prefixes: Record<string, string> }> {
  const store = new N3.Store();
  const prefixes: Record<string, string> = {};
  const parser = new N3.Parser({
    format: format === 'nquads' ? 'N-Quads' : 'text/turtle',
  });

  return new Promise((resolve, reject) => {
    const quads: N3.Quad[] = [];
    parser.parse(text, (error, quad, prefixDeclarations) => {
      if (error) {
        reject(error);
        return;
      }
      if (quad) {
        quads.push(quad);
      }
      if (prefixDeclarations) {
        Object.assign(prefixes, prefixDeclarations);
      }
      if (!quad && !error) {
        // Done
        store.addQuads(quads);
        resolve({ store, quadCount: quads.length, prefixes });
      }
    });
  });
}

async function parseJsonLd(
  text: string
): Promise<{ store: N3.Store; quadCount: number; prefixes: Record<string, string> }> {
  // Dynamically import jsonld to keep bundle splitting clean
  const jsonld = (await import('jsonld')).default;
  const doc = JSON.parse(text);
  // Convert JSON-LD to N-Quads string
  const nquadsStr = (await jsonld.toRDF(doc, {
    format: 'application/n-quads',
  })) as string;

  return parseTurtle(nquadsStr, 'nquads');
}

async function parseRdfXml(
  text: string
): Promise<{ store: N3.Store; quadCount: number; prefixes: Record<string, string> }> {
  const { RdfXmlParser } = await import('rdfxml-streaming-parser');
  const store = new N3.Store();
  const quads: Quad[] = [];

  return new Promise((resolve, reject) => {
    const parser = new RdfXmlParser();

    parser.on('data', (quad: Quad) => {
      quads.push(quad);
    });

    parser.on('error', (err: Error) => {
      reject(err);
    });

    parser.on('end', () => {
      store.addQuads(quads as N3.Quad[]);
      resolve({ store, quadCount: quads.length, prefixes: {} });
    });

    parser.write(text);
    parser.end();
  });
}
