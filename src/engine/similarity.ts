// OWNER: Dev A (engine/ is Dev A's folder per FRONTEND.md §12).
//
// MERGE NOTE — dashboard-a × yash-dashboard, 2026-09-21.
// Both branches shipped a TF-IDF implementation here. This file is the single
// surviving one: Dev B's scoring core, with Dev A's fault-record API and
// disclosure string layered on top as a thin adapter. Nothing calls a second
// implementation any more, which is what the integration checklist requires
// ("both sides call the SAME function — no local reimplementation").
//
// Dev B's core was kept for one substantive reason: Dev A's IDF was
// `log(N / (1 + docsWithTerm))`, which goes NEGATIVE for any term appearing
// in most of the corpus. Over a few dozen local fault records that is most of
// the vocabulary, and a negative weight flips the sign of a term's
// contribution to the cosine. The smoothed form below, `log((n+1)/(df+1)) + 1`,
// is the standard fix and stays positive at every corpus size. Dev A's
// tokeniser also dropped hyphens, splitting "sub-zero" into two tokens, and
// carried no stopword list.
//
// Fault similarity: TF-IDF cosine over {symptom + diagnosis + asset category},
// top 5, minimum score 0.35, over THIS PLATFORM'S OWN RECORDS ONLY.
//
// No external model, no embeddings service, no training claim. It is a
// classic information-retrieval method over a few hundred local records, and
// describing it as anything more would be a lie an examiner can check.

import { type Fault } from '@/shared/contracts';

export interface SimilarityDoc {
  id: string;
  /** symptom + diagnosis + asset category, concatenated by the caller. */
  text: string;
}

export interface SimilarityHit {
  id: string;
  score: number;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with',
  'is', 'was', 'are', 'were', 'be', 'been', 'it', 'this', 'that', 'by', 'as',
  'from', 'no', 'not', 'has', 'have', 'had', 'its',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  for (const [k, v] of tf) tf.set(k, v / total);
  return tf;
}

function inverseDocumentFrequency(corpus: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const tokens of corpus) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const n = corpus.length || 1;
  const idf = new Map<string, number>();
  // Smoothed and offset: never zero, never negative, at any corpus size.
  for (const [term, count] of df) idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
  return idf;
}

function vectorise(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens);
  const vec = new Map<string, number>();
  for (const [term, freq] of tf) vec.set(term, freq * (idf.get(term) ?? 1));
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [term, weight] of a) {
    const other = b.get(term);
    if (other) dot += weight * other;
  }
  const magA = Math.sqrt(Array.from(a.values()).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Array.from(b.values()).reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export const MIN_SIMILARITY = 0.35;
export const MAX_SIMILAR = 5;

/** Top matches for `query` among `corpus`, excluding the query's own id. */
export function findSimilar(
  query: SimilarityDoc,
  corpus: SimilarityDoc[],
  limit = MAX_SIMILAR,
  minScore = MIN_SIMILARITY
): SimilarityHit[] {
  const others = corpus.filter((d) => d.id !== query.id);
  if (others.length === 0) return [];

  const tokenised = others.map((d) => tokenize(d.text));
  const queryTokens = tokenize(query.text);
  const idf = inverseDocumentFrequency([queryTokens, ...tokenised]);
  const queryVec = vectorise(queryTokens, idf);

  return others
    .map((doc, i) => ({ id: doc.id, score: cosine(queryVec, vectorise(tokenised[i], idf)) }))
    .filter((hit) => hit.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Groups documents that recur — used for the handover capsule's "recurring
 * faults" section, where the same problem appearing three times matters far
 * more than three separate rows.
 */
export function groupRecurring(
  corpus: SimilarityDoc[],
  minScore = MIN_SIMILARITY
): { representative: SimilarityDoc; members: string[] }[] {
  const assigned = new Set<string>();
  const groups: { representative: SimilarityDoc; members: string[] }[] = [];

  for (const doc of corpus) {
    if (assigned.has(doc.id)) continue;
    const hits = findSimilar(doc, corpus, 20, minScore).filter((h) => !assigned.has(h.id));
    if (hits.length === 0) continue;
    assigned.add(doc.id);
    hits.forEach((h) => assigned.add(h.id));
    groups.push({ representative: doc, members: [doc.id, ...hits.map((h) => h.id)] });
  }

  return groups.sort((a, b) => b.members.length - a.members.length);
}

// ---------------------------------------------------------------------------
// Fault-record API (Dev A's signature, kept verbatim so /assets is unchanged)
// ---------------------------------------------------------------------------

export interface SimilarFaultResult {
  fault: Fault;
  score: number;
}

/** The text a fault contributes to the index: symptom + diagnosis + category. */
function faultText(fault: Fault, category: string): string {
  return [fault.symptom, fault.diagnosis ?? '', category].join(' ');
}

/**
 * Find similar past faults. A thin projection of `findSimilar` onto Fault
 * records — the scoring is the shared core above, not a second copy.
 *
 * @param query             the fault to find similar records for
 * @param queryCategory     asset category for the query fault
 * @param corpus            all fault records to search over
 * @param corpusCategories  fault id → asset category
 * @param topN              results to return (default 5)
 * @param minScore          minimum cosine score (default 0.35)
 */
export function findSimilarFaults(
  query: Fault,
  queryCategory: string,
  corpus: Fault[],
  corpusCategories: Map<string, string>,
  topN = MAX_SIMILAR,
  minScore = MIN_SIMILARITY,
): SimilarFaultResult[] {
  if (corpus.length === 0) return [];

  const byId = new Map(corpus.map((f) => [f.id, f]));
  const docs: SimilarityDoc[] = corpus.map((f) => ({
    id: f.id,
    text: faultText(f, corpusCategories.get(f.id) ?? ''),
  }));

  return findSimilar(
    { id: query.id, text: faultText(query, queryCategory) },
    docs,
    topN,
    minScore,
  ).map((hit) => ({ fault: byId.get(hit.id)!, score: hit.score }));
}

/** The disclosure string required wherever similar-fault results appear. */
export const SIMILARITY_METHOD_DISCLOSURE =
  'TF-IDF similarity over this platform\'s own records — no external model, no training';
