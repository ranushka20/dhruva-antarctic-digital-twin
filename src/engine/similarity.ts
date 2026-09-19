/**
 * src/engine/similarity.ts — TF-IDF cosine similarity over fault records.
 *
 * Pure, synchronous, client-side only. No external model, no embeddings
 * service, no training. TF-IDF cosine over {symptom + diagnosis + category}.
 * Top 5 results, minimum score 0.35, over this platform's OWN records only.
 *
 * The method is stated in the UI wherever results appear:
 * "TF-IDF similarity over this platform's own records — no external model, no training"
 */

import { type Fault } from '@/shared/contracts';

interface SimilarFaultResult {
  fault: Fault;
  score: number;
}

/** Tokenise text into lowercase terms, removing punctuation. */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Build a term-frequency map from a list of tokens. */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  // normalise by document length
  for (const [k, v] of tf) {
    tf.set(k, v / tokens.length);
  }
  return tf;
}

/** Compute IDF for a corpus of documents. */
function inverseDocumentFrequency(docs: Map<string, number>[]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = docs.length;
  const allTerms = new Set<string>();
  for (const doc of docs) {
    for (const term of doc.keys()) allTerms.add(term);
  }
  for (const term of allTerms) {
    const docsWithTerm = docs.filter((d) => d.has(term)).length;
    idf.set(term, Math.log(N / (1 + docsWithTerm)));
  }
  return idf;
}

/** Cosine similarity between two TF-IDF vectors. */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const allTerms = new Set([...a.keys(), ...b.keys()]);
  for (const term of allTerms) {
    const va = a.get(term) ?? 0;
    const vb = b.get(term) ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

/** Build a TF-IDF vector for a fault record. */
function faultToTokens(fault: Fault, category: string): string[] {
  return tokenise(
    [fault.symptom, fault.diagnosis ?? '', category].join(' ')
  );
}

/**
 * Find similar past faults using TF-IDF cosine similarity.
 *
 * @param query - The fault to find similar records for
 * @param queryCategory - The asset category for the query fault
 * @param corpus - All fault records to search over
 * @param corpusCategories - Map of fault id → asset category
 * @param topN - Number of results to return (default 5)
 * @param minScore - Minimum similarity score (default 0.35)
 * @returns Ranked list of similar faults with scores
 */
export function findSimilarFaults(
  query: Fault,
  queryCategory: string,
  corpus: Fault[],
  corpusCategories: Map<string, string>,
  topN = 5,
  minScore = 0.35,
): SimilarFaultResult[] {
  if (corpus.length === 0) return [];

  // Tokenise all documents
  const queryTokens = faultToTokens(query, queryCategory);
  const queryTf = termFrequency(queryTokens);

  const corpusTfs = corpus.map((f) => {
    const cat = corpusCategories.get(f.id) ?? '';
    return termFrequency(faultToTokens(f, cat));
  });

  // Compute IDF across the entire corpus + query
  const allTfs = [queryTf, ...corpusTfs];
  const idf = inverseDocumentFrequency(allTfs);

  // Build TF-IDF vectors
  const toTfIdf = (tf: Map<string, number>): Map<string, number> => {
    const tfidf = new Map<string, number>();
    for (const [term, freq] of tf) {
      tfidf.set(term, freq * (idf.get(term) ?? 0));
    }
    return tfidf;
  };

  const queryVec = toTfIdf(queryTf);

  // Score each corpus document
  const results: SimilarFaultResult[] = [];
  for (let i = 0; i < corpus.length; i++) {
    const fault = corpus[i];
    if (fault.id === query.id) continue; // skip self
    const score = cosineSimilarity(queryVec, toTfIdf(corpusTfs[i]));
    if (score >= minScore) {
      results.push({ fault, score });
    }
  }

  // Sort descending by score, take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN);
}

/** The disclosure string required wherever similar fault results appear. */
export const SIMILARITY_METHOD_DISCLOSURE =
  'TF-IDF similarity over this platform\'s own records — no external model, no training';
