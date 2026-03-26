export interface SparqlTemplate {
  name: string;
  description: string;
  query: string;
}

export const SPARQL_TEMPLATES: SparqlTemplate[] = [
  {
    name: 'Predicate Frequency',
    description: 'Count how many times each predicate appears in the dataset.',
    query: `SELECT ?predicate (COUNT(*) AS ?count)
WHERE {
  ?s ?predicate ?o .
}
GROUP BY ?predicate
ORDER BY DESC(?count)
LIMIT 50`,
  },
  {
    name: 'Seed Neighborhood (1-hop)',
    description: 'Show all triples connected to a given seed IRI (replace the IRI).',
    query: `CONSTRUCT { ?s ?p ?o }
WHERE {
  {
    BIND(<http://example.org/seed> AS ?s)
    ?s ?p ?o .
  }
  UNION
  {
    BIND(<http://example.org/seed> AS ?o)
    ?s ?p ?o .
  }
}
LIMIT 500`,
  },
  {
    name: 'Labels & Types',
    description: 'Show rdf:type, rdfs:label, skos:prefLabel for all subjects.',
    query: `CONSTRUCT { ?s ?p ?o }
WHERE {
  ?s ?p ?o .
  FILTER(?p IN (
    <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>,
    <http://www.w3.org/2000/01/rdf-schema#label>,
    <http://www.w3.org/2004/02/skos/core#prefLabel>,
    <http://www.w3.org/2004/02/skos/core#altLabel>,
    <http://xmlns.com/foaf/0.1/name>,
    <http://schema.org/name>
  ))
}
LIMIT 2000`,
  },
  {
    name: 'Sample Graph (first 500 triples)',
    description: 'Render a small random sample of the dataset for quick inspection.',
    query: `CONSTRUCT { ?s ?p ?o }
WHERE {
  ?s ?p ?o .
}
LIMIT 500`,
  },
];
