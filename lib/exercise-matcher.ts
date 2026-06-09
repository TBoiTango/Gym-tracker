// Fuzzy exercise name matching — handles user typos and compound-word variants.
// e.g. "Flat bar bell bench press" matches "Barbell Bench Press"

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function tokenize(name: string): string[] {
  return normalize(name).split(" ").filter(Boolean);
}

// Include merged adjacent tokens so "bar bell" matches "barbell"
function expandedTokenSet(tokens: string[]): Set<string> {
  const s = new Set(tokens);
  for (let i = 0; i < tokens.length - 1; i++) {
    s.add(tokens[i] + tokens[i + 1]);
  }
  return s;
}

// Dice coefficient: 2 * |intersection| / (|A| + |B|)
export function exerciseSimilarity(a: string, b: string): number {
  const tokA = tokenize(a);
  const tokB = tokenize(b);
  const setA = expandedTokenSet(tokA);
  const setB = expandedTokenSet(tokB);

  let intersection = 0;
  Array.from(setA).forEach((t) => { if (setB.has(t)) intersection++; });

  // Dice: 2 * |intersection| / (|A| + |B|) — avoids Set spread for TS target compat
  const denom = setA.size + setB.size;
  return denom === 0 ? 0 : (2 * intersection) / denom;
}

// Return the best matching candidate above the threshold, or null
export function findBestMatch(
  target: string,
  candidates: string[],
  threshold = 0.4
): string | null {
  let best: string | null = null;
  let bestScore = threshold;

  for (const c of candidates) {
    const score = exerciseSimilarity(target, c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
}

// Pull out the most exercise-specific tokens for a broadened DB search.
// Skips generic modifiers that appear in almost every exercise name.
const SKIP_TOKENS = new Set(["with", "and", "the", "a", "an", "using", "on", "at", "to", "in"]);

export function extractKeyTerms(name: string): string[] {
  return tokenize(name).filter((t) => t.length > 2 && !SKIP_TOKENS.has(t));
}
