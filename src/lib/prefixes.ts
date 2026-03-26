// Common RDF prefix mappings for compact display
export const WELL_KNOWN_PREFIXES: Record<string, string> = {
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf:',
  'http://www.w3.org/2000/01/rdf-schema#': 'rdfs:',
  'http://www.w3.org/2002/07/owl#': 'owl:',
  'http://www.w3.org/2001/XMLSchema#': 'xsd:',
  'http://www.w3.org/2004/02/skos/core#': 'skos:',
  'http://xmlns.com/foaf/0.1/': 'foaf:',
  'http://schema.org/': 'schema:',
  'http://purl.org/dc/terms/': 'dcterms:',
  'http://purl.org/dc/elements/1.1/': 'dc:',
  'http://www.w3.org/ns/shacl#': 'sh:',
  'http://www.w3.org/ns/prov#': 'prov:',
};

/**
 * Compact an IRI using well-known prefixes or extract local name.
 */
export function compactIri(iri: string, extra: Record<string, string> = {}): string {
  const all = { ...WELL_KNOWN_PREFIXES, ...extra };
  for (const [ns, prefix] of Object.entries(all)) {
    if (iri.startsWith(ns)) {
      return prefix + iri.slice(ns.length);
    }
  }
  // Try to extract local name after # or last /
  const hashIdx = iri.lastIndexOf('#');
  if (hashIdx !== -1 && hashIdx < iri.length - 1) {
    return iri.slice(hashIdx + 1);
  }
  const slashIdx = iri.lastIndexOf('/');
  if (slashIdx !== -1 && slashIdx < iri.length - 1) {
    return iri.slice(slashIdx + 1);
  }
  return iri;
}

/**
 * Truncate a string to maxLen characters, adding ellipsis if needed.
 */
export function truncate(s: string, maxLen = 60): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}
