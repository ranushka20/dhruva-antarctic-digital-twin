// OWNER: Dev B (created because src/engine/similarity.ts did not exist yet —
// FRONTEND.md §12 places engine/ in Dev A's folder, so Dev A should adopt or
// replace this; logged in PROGRESS.md under Contract changes.)
//
// Fault similarity: TF-IDF cosine over {symptom + diagnosis + asset category},
// top 5, minimum score 0.35, over THIS PLATFORM'S OWN RECORDS ONLY.
//
// No external model, no embeddings service, no training claim. It is a
// classic information-retrieval method over a few hundred local records, and
// describing it as anything more would be a lie an examiner can check.

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
