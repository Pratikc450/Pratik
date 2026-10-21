/**
 * High-performance Fuzzy Search Utility for Navigator PM Platform
 * Supports exact prefix, word boundary matching, multi-token queries,
 * and character subsequence matching with acronym bonuses.
 */

export interface SearchableItem {
  id: string;
  type: 'PRD' | 'USER_STORY' | 'ROADMAP' | 'PRODUCT' | 'PERSONA' | 'ACTION';
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  productId?: string;
  productName?: string;
  targetTab: string;
  metadata?: Record<string, any>;
}

export function calculateFuzzySubsequenceScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let qIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;

  for (let tIdx = 0; tIdx < t.length && qIdx < q.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
      consecutiveMatches++;
      // Base score for match + bonus for consecutive sequences
      score += 8 + consecutiveMatches * 4;

      // Word boundary bonus (start of word, after space, dash, or bracket)
      if (tIdx === 0 || /[\s\-_/.[\]]/.test(t[tIdx - 1])) {
        score += 20;
      }
    } else {
      consecutiveMatches = 0;
    }
  }

  // Only consider valid if entire query string matched sequentially
  return qIdx === q.length ? score : 0;
}

export function fuzzySearchItems(
  query: string,
  items: SearchableItem[],
  filterType: string = 'ALL'
): SearchableItem[] {
  let filtered = items;
  if (filterType !== 'ALL') {
    filtered = items.filter(item => {
      if (filterType === 'PRDS') return item.type === 'PRD';
      if (filterType === 'STORIES') return item.type === 'USER_STORY';
      if (filterType === 'ROADMAPS') return item.type === 'ROADMAP';
      if (filterType === 'WORKSPACES') return item.type === 'PRODUCT';
      if (filterType === 'ACTIONS') return item.type === 'ACTION';
      return true;
    });
  }

  if (!query || !query.trim()) {
    // Return sorted default priority (PRDs, Roadmaps, Stories, Products, Actions)
    const typePriority: Record<string, number> = {
      PRD: 1,
      ROADMAP: 2,
      USER_STORY: 3,
      PRODUCT: 4,
      ACTION: 5,
      PERSONA: 6
    };
    return [...filtered].sort((a, b) => (typePriority[a.type] || 99) - (typePriority[b.type] || 99));
  }

  const q = query.trim().toLowerCase();
  const qTokens = q.split(/\s+/).filter(Boolean);

  const scored = filtered.map(item => {
    const title = item.title.toLowerCase();
    const subtitle = (item.subtitle || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const prodName = (item.productName || '').toLowerCase();
    const badge = (item.badge || '').toLowerCase();

    let score = 0;

    // 1. Exact string matches
    if (title === q) {
      score += 1200;
    } else if (title.startsWith(q)) {
      score += 600;
    } else if (title.includes(q)) {
      score += 350;
    }

    if (subtitle.startsWith(q)) score += 200;
    else if (subtitle.includes(q)) score += 120;

    if (badge.includes(q)) score += 140;
    if (prodName.includes(q)) score += 100;
    if (desc.includes(q)) score += 60;

    // 2. Multi-token evaluation
    let tokensMatched = 0;
    for (const token of qTokens) {
      let tokenFound = false;
      if (title.includes(token)) {
        score += 50;
        tokenFound = true;
      } else if (subtitle.includes(token)) {
        score += 35;
        tokenFound = true;
      } else if (badge.includes(token)) {
        score += 30;
        tokenFound = true;
      } else if (prodName.includes(token)) {
        score += 25;
        tokenFound = true;
      } else if (desc.includes(token)) {
        score += 15;
        tokenFound = true;
      } else {
        const subScore = calculateFuzzySubsequenceScore(token, title);
        if (subScore > 0) {
          score += subScore;
          tokenFound = true;
        }
      }

      if (tokenFound) tokensMatched++;
    }

    // High bonus if all search tokens were satisfied
    if (tokensMatched === qTokens.length) {
      score += 150;
    }

    // 3. Subsequence search across title & badge
    const titleSubScore = calculateFuzzySubsequenceScore(q, title);
    score += titleSubScore;

    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
}
