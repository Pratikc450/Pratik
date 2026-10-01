import { db } from './mockDb.js';
import { ArtifactType } from '../types.js';

interface CachedContext {
  contextString: string;
  itemCount: number;
  timestamp: number;
  estimatedTokens: number;
}

// 60-second TTL context cache as mandated in §6
const contextCache = new Map<string, CachedContext>();
const CONTEXT_CACHE_TTL_MS = 60 * 1000;

export interface GatheredContextResult {
  contextString: string;
  itemCount: number;
  estimatedTokens: number;
  isCached: boolean;
}

// Approximate token estimation: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Simple text relevance scorer for ranking research chunks
function scoreRelevance(query: string, content: string): number {
  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return 1;
  const contentLower = content.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      score += 10;
      // Extra weight for occurrences
      const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
      score += Math.min(matches, 5) * 2;
    }
  }
  return score;
}

export function getCachedContext(cacheKey: string): GatheredContextResult | null {
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONTEXT_CACHE_TTL_MS) {
    return {
      contextString: cached.contextString,
      itemCount: cached.itemCount,
      estimatedTokens: cached.estimatedTokens,
      isCached: true
    };
  }
  return null;
}

export function setCachedContext(cacheKey: string, result: Omit<GatheredContextResult, 'isCached'>) {
  contextCache.set(cacheKey, {
    contextString: result.contextString,
    itemCount: result.itemCount,
    timestamp: Date.now(),
    estimatedTokens: result.estimatedTokens
  });
}

// 1. Dedicated Context Gatherer for PRD
export function gatherPRDContext(productId: string, userRequest: string): GatheredContextResult {
  const cacheKey = `prd_${productId}_${userRequest.slice(0, 30)}`;
  const cached = getCachedContext(cacheKey);
  if (cached) return cached;

  const product = db.getProduct(productId);
  if (!product) {
    throw new Error(`Product ${productId} not found in workspace.`);
  }

  // Pull up to 3 most relevant non-deleted problems
  const problems = db.getProblems(productId)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 3);

  // Pull up to 3 personas
  const personas = db.getPersonas(productId).slice(0, 3);

  // Existing PRD if exists (revision context)
  const existingPRD = Array.from(db.artifacts.values())
    .filter(a => a.productId === productId && a.taskType === 'PRD' && a.status === 'APPROVED')
    .pop();

  // Retrieve research documents ranked by relevance to the user's request
  const allDocs = db.getResearchDocs(productId);
  const rankedDocs = allDocs
    .map(doc => ({ doc, score: scoreRelevance(userRequest, doc.title + ' ' + doc.content) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.doc);

  // Build context payload
  const sections: string[] = [];
  sections.push(`PRODUCT CORE:
- Name: ${product.name}
- Vision: ${product.vision}
- Description: ${product.description}
- Target Audience: ${product.targetAudience}
- Industry: ${product.industry}`);

  if (problems.length > 0) {
    sections.push(`TARGET PROBLEMS (Max 3 active):
${problems.map((p, idx) => `[Problem ${idx + 1}] Title: ${p.title}\nDescription: ${p.description}\nImpact: ${p.impactScore}/10 | Frequency: ${p.frequency}`).join('\n\n')}`);
  } else {
    sections.push(`TARGET PROBLEMS: None defined in workspace.`);
  }

  if (personas.length > 0) {
    sections.push(`TARGET PERSONAS (Max 3):
${personas.map((p, idx) => `[Persona ${idx + 1}] ${p.name} (${p.role})\nGoal: ${p.goal}\nPain Point: ${p.painPoint}`).join('\n\n')}`);
  } else {
    sections.push(`TARGET PERSONAS: None defined in workspace.`);
  }

  if (existingPRD) {
    sections.push(`PRIOR APPROVED PRD (Revision Base):
Version: v${existingPRD.version}
Title: ${existingPRD.schemaData?.title || 'Unknown'}
Objective: ${existingPRD.schemaData?.objective || 'Unknown'}`);
  }

  if (rankedDocs.length > 0) {
    // §5 Untrusted boundary wrapping for research documents
    const docContexts = rankedDocs.map(doc => {
      return `<untrusted_context source="doc:${doc.id}" type="${doc.type}" title="${doc.title}">
${doc.content}
</untrusted_context>`;
    }).join('\n\n');

    sections.push(`RESEARCH & RELEVANT EVIDENCE (Top 5 Ranked):
${docContexts}`);
  } else {
    sections.push(`RESEARCH & EVIDENCE: No research documents available.`);
  }

  let fullContext = sections.join('\n\n════════════════════════════════════════\n\n');

  // Explicit Token Budget Cap: 6,000 tokens MAX
  const MAX_TOKENS = 6000;
  let estimated = estimateTokens(fullContext);
  if (estimated > MAX_TOKENS) {
    // Summarize lowest relevance items first if exceeding token limit
    if (rankedDocs.length > 2) {
      rankedDocs.pop();
      return gatherPRDContext(productId, userRequest);
    }
  }

  const result = {
    contextString: fullContext,
    itemCount: 1 + problems.length + personas.length + rankedDocs.length + (existingPRD ? 1 : 0),
    estimatedTokens: estimated
  };

  setCachedContext(cacheKey, result);
  return { ...result, isCached: false };
}

// 2. Dedicated Context Gatherer for User Stories
export function gatherUserStoriesContext(productId: string, featureId?: string, userRequest?: string): GatheredContextResult {
  const product = db.getProduct(productId);
  if (!product) throw new Error(`Product ${productId} not found.`);

  const features = db.getFeatures(productId);
  const targetFeature = featureId 
    ? features.find(f => f.id === featureId) || features[0]
    : features[0];

  const personas = db.getPersonas(productId);
  const taggedPersonas = targetFeature 
    ? personas.filter(p => targetFeature.personaIds.includes(p.id))
    : personas.slice(0, 2);

  // Existing stories for this feature (to avoid duplicating)
  const existingStoriesArtifact = Array.from(db.artifacts.values())
    .filter(a => a.productId === productId && a.taskType === 'USER_STORIES')
    .pop();

  const sections: string[] = [];
  sections.push(`PRODUCT: ${product.name}`);
  if (targetFeature) {
    sections.push(`PARENT FEATURE:
- Title: ${targetFeature.title}
- Description: ${targetFeature.description}
- Priority: ${targetFeature.priority}`);
  } else {
    sections.push(`FEATURE: Not specified in workspace — derive stories based on request.`);
  }

  if (taggedPersonas.length > 0) {
    sections.push(`ASSOCIATED PERSONAS:
${taggedPersonas.map(p => `- ${p.name} (${p.role}): Goal=${p.goal}, Pain=${p.painPoint}`).join('\n')}`);
  }

  if (existingStoriesArtifact?.schemaData?.stories) {
    sections.push(`EXISTING STORIES FOR THIS FEATURE (DO NOT DUPLICATE):
${existingStoriesArtifact.schemaData.stories.map((s: any) => `- As a ${s.asA}, I want ${s.iWant}`).join('\n')}`);
  }

  const fullContext = sections.join('\n\n');
  return {
    contextString: fullContext,
    itemCount: (targetFeature ? 1 : 0) + taggedPersonas.length,
    estimatedTokens: estimateTokens(fullContext),
    isCached: false
  };
}

// 3. Dedicated Context Gatherer for Roadmap
export function gatherRoadmapContext(productId: string): GatheredContextResult {
  const product = db.getProduct(productId);
  if (!product) throw new Error(`Product ${productId} not found.`);

  const features = db.getFeatures(productId);
  const problems = db.getProblems(productId);

  const sections = [
    `PRODUCT VISION & STRATEGY:\nName: ${product.name}\nVision: ${product.vision}\nDescription: ${product.description}`,
    `CORE PROBLEMS TO SOLVE:\n${problems.map(p => `- [Impact ${p.impactScore}/10] ${p.title}: ${p.description}`).join('\n')}`,
    `FEATURE INVENTORY CANDIDATES:\n${features.map(f => `- [Priority: ${f.priority}] ${f.title}: ${f.description}`).join('\n')}`
  ];

  const fullContext = sections.join('\n\n');
  return {
    contextString: fullContext,
    itemCount: 1 + problems.length + features.length,
    estimatedTokens: estimateTokens(fullContext),
    isCached: false
  };
}

// 4. Dedicated Context Gatherer for Personas
export function gatherPersonasContext(productId: string): GatheredContextResult {
  const product = db.getProduct(productId);
  if (!product) throw new Error(`Product ${productId} not found.`);

  const docs = db.getResearchDocs(productId);
  const problems = db.getProblems(productId);

  const sections = [
    `PRODUCT TARGET AUDIENCE: ${product.targetAudience} in ${product.industry}`,
    `OBSERVED USER PROBLEMS:\n${problems.map(p => `- ${p.title}: ${p.description}`).join('\n')}`,
    `RAW RESEARCH & CUSTOMER QUOTES:\n${docs.map(d => `<untrusted_context source="doc:${d.id}">\n${d.content}\n</untrusted_context>`).join('\n\n')}`
  ];

  const fullContext = sections.join('\n\n');
  return {
    contextString: fullContext,
    itemCount: 1 + problems.length + docs.length,
    estimatedTokens: estimateTokens(fullContext),
    isCached: false
  };
}

// 5. Dedicated Context Gatherer for KPIs
export function gatherKPIsContext(productId: string): GatheredContextResult {
  const product = db.getProduct(productId);
  if (!product) throw new Error(`Product ${productId} not found.`);

  const problems = db.getProblems(productId);
  const docs = db.getResearchDocs(productId).filter(d => d.type === 'Analytics Report' || d.type === 'User Interview');

  const sections = [
    `PRODUCT NORTH STAR CANDIDATE:\n${product.name} - ${product.vision}`,
    `BASELINE PROBLEMS & METRICS IN WORKSPACE:\n${problems.map(p => `- Friction: ${p.title} (${p.description})`).join('\n')}`,
    `ANALYTICS EVIDENCE:\n${docs.map(d => `<untrusted_context source="doc:${d.id}">\n${d.content}\n</untrusted_context>`).join('\n\n')}`
  ];

  const fullContext = sections.join('\n\n');
  return {
    contextString: fullContext,
    itemCount: 1 + problems.length + docs.length,
    estimatedTokens: estimateTokens(fullContext),
    isCached: false
  };
}

// 6. Dedicated Context Gatherer for Experiments
export function gatherExperimentsContext(productId: string): GatheredContextResult {
  const product = db.getProduct(productId);
  if (!product) throw new Error(`Product ${productId} not found.`);

  const features = db.getFeatures(productId);
  const problems = db.getProblems(productId);

  const sections = [
    `PRODUCT: ${product.name}`,
    `KEY HYPOTHESES TO VALIDATE FROM PROBLEMS:\n${problems.map(p => `- ${p.title}: ${p.description}`).join('\n')}`,
    `UNVALIDATED FEATURES:\n${features.map(f => `- ${f.title}: ${f.description}`).join('\n')}`
  ];

  const fullContext = sections.join('\n\n');
  return {
    contextString: fullContext,
    itemCount: 1 + problems.length + features.length,
    estimatedTokens: estimateTokens(fullContext),
    isCached: false
  };
}

// Dispatcher for dedicated context functions
export function gatherContextForTask(
  taskType: ArtifactType,
  productId: string,
  userRequest: string,
  featureId?: string
): GatheredContextResult {
  switch (taskType) {
    case 'PRD':
      return gatherPRDContext(productId, userRequest);
    case 'USER_STORIES':
      return gatherUserStoriesContext(productId, featureId, userRequest);
    case 'ROADMAP':
      return gatherRoadmapContext(productId);
    case 'USER_PERSONAS':
    case 'PERSONAS':
      return gatherPersonasContext(productId);
    case 'KPIS':
      return gatherKPIsContext(productId);
    case 'EXPERIMENTS':
      return gatherExperimentsContext(productId);
    case 'PRODUCT_VISION':
    case 'PROBLEM_STATEMENT':
    case 'EPICS':
    case 'FEATURES':
    case 'ACCEPTANCE_CRITERIA':
    case 'PRODUCT_REQUIREMENTS':
    case 'MVP_SCOPE':
    case 'COMPETITOR_ANALYSIS':
    case 'SWOT':
    case 'USER_JOURNEY':
    case 'FEATURE_PRIORITIZATION':
    case 'OKRS':
    case 'RELEASE_PLAN':
    case 'GTM_PLAN':
      // Rich context pulling product, problems, personas, and research docs
      return gatherPRDContext(productId, userRequest);
    default:
      return gatherPRDContext(productId, userRequest);
  }
}
