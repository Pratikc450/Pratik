import { z } from 'zod';

// Helper to check for falsifiable objectives (reject generic empty buzzwords)
const falsifiableObjectiveValidator = (val: string) => {
  if (val.length < 20) return false;
  const genericPatterns = [
    /^(help users|improve experience|make it better|make it faster|delight customers)\.?$/i,
    /^improve (the )?user experience$/i,
    /^make the product easier to use$/i,
  ];
  if (genericPatterns.some(pattern => pattern.test(val.trim()))) {
    return false;
  }
  return true;
};

// 1. PRD Schema (Section 4 Contract)
export const PrdSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  objective: z.string().min(20, 'Objective must be at least 20 characters').refine(
    falsifiableObjectiveValidator,
    'Objective must be specific and falsifiable (cannot be generic like "help users" or "improve experience" without concrete targets)'
  ),
  problemStatement: z.string().min(15, 'Problem statement must be at least 15 characters'),
  targetUsers: z.array(z.string()).min(1, 'At least 1 target user group must be specified'),
  functionalRequirements: z.array(z.object({
    id: z.string(),
    requirement: z.string().min(5),
    priority: z.enum(['MUST', 'SHOULD', 'COULD'])
  })).min(1, 'At least 1 functional requirement required'),
  nonFunctionalRequirements: z.array(z.string()).min(1, 'At least 1 non-functional requirement required'),
  successMetrics: z.array(z.object({
    metric: z.string(),
    target: z.string(),
    currentBaseline: z.string().default('unknown')
  })).min(1, 'At least 1 success metric required'),
  risks: z.array(z.object({
    risk: z.string(),
    mitigation: z.string()
  })),
  mvpScope: z.array(z.string()).min(1, 'MVP scope must have at least 1 item'),
  outOfScope: z.array(z.string()).min(1, 'Out of scope must have at least 1 item'),
  openQuestions: z.array(z.string()) // Essential for flagging gaps instead of hallucinating!
});

// 2. User Stories Schema
export const UserStoryItemSchema = z.object({
  id: z.string(),
  epicTitle: z.string().optional().default('Core Epic'),
  asA: z.string().min(3),
  iWant: z.string().min(5),
  soThat: z.string().min(5),
  acceptanceCriteria: z.array(z.string()).min(2, 'At least 2 acceptance criteria required per story'),
  persona: z.string(),
  // Numeric justification for RICE - model provides estimates, backend calculates formula!
  reach: z.number().min(1).max(100000),
  impact: z.number().min(0.25).max(3), // 0.25 minimal, 0.5 low, 1 medium, 2 high, 3 massive
  confidence: z.number().min(0.1).max(1.0), // 0.5 to 1.0
  effort: z.number().min(0.5).max(10), // Person-weeks
  riceScore: z.number().optional(),
  estimationJustification: z.string().min(10)
});

export const UserStoriesSchema = z.object({
  epicTitle: z.string().min(5),
  featureSummary: z.string(),
  stories: z.array(UserStoryItemSchema).min(1, 'At least 1 user story must be generated'),
  dependencies: z.array(z.string()),
  openQuestions: z.array(z.string())
});

// 3. Roadmap Schema
export const RoadmapInitiativeSchema = z.object({
  id: z.string().optional().default('INIT-1'),
  title: z.string().min(3),
  description: z.string().min(10),
  targetOutcome: z.string().min(10),
  priority: z.preprocess((val) => {
    if (typeof val === 'string') {
      const u = val.toUpperCase();
      if (u === 'P0' || u.includes('HIGH') || u.includes('MUST')) return 'P0';
      if (u === 'P1' || u.includes('MEDIUM') || u.includes('SHOULD')) return 'P1';
      return 'P2';
    }
    return val;
  }, z.enum(['P0', 'P1', 'P2'])),
  dependencies: z.array(z.string()),
  estimatedEffortWeeks: z.number().min(1)
});

export const RoadmapQuarterSchema = z.object({
  quarter: z.string(), // e.g. "Q1 2025"
  theme: z.string().min(5),
  initiatives: z.array(RoadmapInitiativeSchema).min(1)
});

export const RoadmapSchema = z.object({
  vision: z.string().min(15),
  strategicPillars: z.array(z.string()).min(1),
  quarterHorizons: z.array(RoadmapQuarterSchema).min(1),
  risksAndMitigations: z.array(z.object({
    risk: z.string(),
    mitigation: z.string()
  })),
  openQuestions: z.array(z.string())
});

// 4. Personas Schema
export const PersonaItemSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(3),
  demographics: z.string(),
  jobsToBeDone: z.array(z.string()).min(1),
  painPoints: z.array(z.string()).min(1),
  coreMotivations: z.array(z.string()).min(1),
  techProficiency: z.preprocess((val) => {
    if (typeof val === 'string') {
      const u = val.toUpperCase();
      if (u.includes('HIGH')) return 'HIGH';
      if (u.includes('LOW')) return 'LOW';
      return 'MEDIUM';
    }
    return val;
  }, z.enum(['LOW', 'MEDIUM', 'HIGH'])),
  verbatimQuote: z.string()
});

export const PersonasSchema = z.object({
  personas: z.array(PersonaItemSchema).min(1),
  unmetMarketNeeds: z.array(z.string()),
  openQuestions: z.array(z.string())
});

// 5. KPIs Schema
export const KpisSchema = z.object({
  northStarMetric: z.object({
    metric: z.string().min(3),
    definition: z.string().min(10),
    target: z.string(),
    currentBaseline: z.string().default('unknown'),
    rationale: z.string()
  }),
  leadingIndicators: z.array(z.object({
    metric: z.string(),
    cadence: z.preprocess((val) => {
      if (typeof val === 'string') {
        const u = val.toUpperCase();
        if (u.includes('DAY') || u.includes('DAILY') || u.includes('HOUR') || u.includes('REAL-TIME') || u.includes('REALTIME')) return 'DAILY';
        if (u.includes('WEEK')) return 'WEEKLY';
        return 'MONTHLY';
      }
      return val;
    }, z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])),
    target: z.string(),
    signalIntent: z.string()
  })).min(1),
  laggingIndicators: z.array(z.object({
    metric: z.string(),
    cadence: z.preprocess((val) => {
      if (typeof val === 'string') {
        const u = val.toUpperCase();
        if (u.includes('YEAR') || u.includes('ANNUAL')) return 'ANNUALLY';
        if (u.includes('QUARTER')) return 'QUARTERLY';
        return 'MONTHLY';
      }
      return val;
    }, z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY'])),
    target: z.string(),
    businessImpact: z.string()
  })).min(1),
  guardrailMetrics: z.array(z.object({
    metric: z.string(),
    threshold: z.string(),
    breachAction: z.string()
  })),
  openQuestions: z.array(z.string())
});

// 6. Experiments Schema
export const ExperimentItemSchema = z.object({
  id: z.string(),
  hypothesis: z.string().min(15), // "If we [action], then [outcome], because [rationale]"
  controlVariant: z.string(),
  testVariant: z.string(),
  primaryMetric: z.string(),
  minimumDetectableEffect: z.string(),
  sampleSizeTarget: z.string(),
  durationWeeks: z.number().min(1),
  decisionCriteria: z.string(),
  potentialRisks: z.string()
});

export const ExperimentsSchema = z.object({
  experiments: z.array(ExperimentItemSchema).min(1),
  testingMethodology: z.string(),
  openAssumptions: z.array(z.string())
});

// 7. Product Vision Schema
export const ProductVisionSchema = z.object({
  title: z.string().min(3),
  northStarStatement: z.string().min(20),
  coreValueProposition: z.string().min(15),
  strategicPillars: z.array(z.object({
    pillar: z.string().min(3),
    objective: z.string().min(10),
    competitiveEdge: z.string()
  })).min(2),
  targetImpact3Year: z.string().min(15),
  antiGoals: z.array(z.string()).min(1),
  openQuestions: z.array(z.string())
});

// 8. Problem Statement Schema
export const ProblemStatementSchema = z.object({
  title: z.string().min(3),
  coreProblem: z.string().min(20),
  quantifiedImpact: z.string().min(10),
  affectedUserSegments: z.array(z.object({
    segment: z.string(),
    frequency: z.string(),
    severity: z.string(),
    quote: z.string().optional()
  })).min(1),
  rootCauses: z.array(z.string()).min(1),
  costOfInaction: z.string().min(15),
  openQuestions: z.array(z.string())
});

// 9. Epics Schema
export const EpicsSchema = z.object({
  productTitle: z.string().min(3),
  epics: z.array(z.object({
    id: z.string(),
    title: z.string().min(3),
    summary: z.string().min(10),
    businessValue: z.string().min(10),
    priority: z.enum(['MUST', 'SHOULD', 'COULD']),
    estimatedSprints: z.number().min(1),
    targetMilestone: z.string(),
    dependencies: z.array(z.string())
  })).min(2),
  openQuestions: z.array(z.string())
});

// 10. Features Schema
export const FeaturesSchema = z.object({
  features: z.array(z.object({
    id: z.string(),
    name: z.string().min(3),
    category: z.string(),
    tier: z.enum(['CORE', 'VALUE_ADD', 'DELIGHT']),
    description: z.string().min(10),
    userBenefit: z.string().min(10),
    technicalComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
  })).min(3),
  openQuestions: z.array(z.string())
});

// 11. Acceptance Criteria Schema (Gherkin format)
export const AcceptanceCriteriaSchema = z.object({
  featureTitle: z.string().min(3),
  scenarios: z.array(z.object({
    id: z.string(),
    scenarioTitle: z.string().min(5),
    userPersona: z.string(),
    given: z.array(z.string()).min(1),
    when: z.array(z.string()).min(1),
    then: z.array(z.string()).min(1),
    edgeCases: z.array(z.string())
  })).min(2),
  openQuestions: z.array(z.string())
});

// 12. Product Requirements Schema
export const ProductRequirementsSchema = z.object({
  title: z.string().min(3),
  functionalSpecs: z.array(z.object({
    id: z.string(),
    module: z.string(),
    requirement: z.string().min(10),
    priority: z.enum(['MUST', 'SHOULD', 'COULD']),
    rationale: z.string()
  })).min(3),
  nonFunctionalSpecs: z.array(z.object({
    category: z.string(),
    targetSLA: z.string(),
    testMethod: z.string()
  })).min(2),
  securityAndCompliance: z.array(z.string()).min(1),
  openQuestions: z.array(z.string())
});

// 13. MVP Scope Schema
export const MvpScopeSchema = z.object({
  initiativeTitle: z.string().min(3),
  coreHypothesis: z.string().min(20),
  mustHaveDayOne: z.array(z.object({
    capability: z.string().min(3),
    rationale: z.string().min(10)
  })).min(2),
  fastFollowersPostMvp: z.array(z.object({
    capability: z.string().min(3),
    deferralReason: z.string().min(10)
  })).min(1),
  strictlyOutOfScope: z.array(z.string()).min(1),
  mvpLaunchReadinessCriteria: z.array(z.string()).min(2),
  openQuestions: z.array(z.string())
});

// 14. Competitor Analysis Schema
export const CompetitorAnalysisSchema = z.object({
  marketOverview: z.string().min(15),
  directCompetitors: z.array(z.object({
    name: z.string().min(2),
    marketPosition: z.string(),
    strengths: z.array(z.string()).min(1),
    weaknesses: z.array(z.string()).min(1),
    pricingSummary: z.string()
  })).min(2),
  indirectCompetitors: z.array(z.object({
    name: z.string(),
    alternativeApproach: z.string()
  })),
  ourCompetitiveMoat: z.string().min(15),
  parityMatrix: z.array(z.object({
    capability: z.string(),
    us: z.string(),
    competitorA: z.string(),
    competitorB: z.string()
  })).min(2),
  openQuestions: z.array(z.string())
});

// 15. SWOT Schema
export const SwotSchema = z.object({
  strengths: z.array(z.string()).min(2),
  weaknesses: z.array(z.string()).min(2),
  opportunities: z.array(z.string()).min(2),
  threats: z.array(z.string()).min(2),
  strategicPlays: z.array(z.object({
    play: z.string().min(5),
    quadrantFocus: z.string(),
    rationale: z.string()
  })).min(2),
  openQuestions: z.array(z.string())
});

// 16. User Journey Schema
export const UserJourneySchema = z.object({
  persona: z.string().min(2),
  stages: z.array(z.object({
    stageName: z.string(),
    stepTitle: z.string(),
    userAction: z.string(),
    userThoughts: z.string(),
    emotionalState: z.enum(['CONFUSED', 'FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'DELIGHTED']),
    painPoint: z.string(),
    delightOpportunity: z.string()
  })).min(4),
  criticalDropOffRisks: z.array(z.string()).min(1),
  openQuestions: z.array(z.string())
});

// 17. Feature Prioritization Schema (RICE)
export const FeaturePrioritizationSchema = z.object({
  prioritizationMethod: z.string(),
  rankedFeatures: z.array(z.object({
    id: z.string(),
    title: z.string(),
    reach: z.number().min(1),
    impact: z.number(),
    confidence: z.number(),
    effort: z.number(),
    riceScore: z.number(),
    moscow: z.enum(['MUST', 'SHOULD', 'COULD', 'WONT']),
    reasoning: z.string()
  })).min(3),
  strategicRecommendations: z.array(z.string()).min(1),
  openQuestions: z.array(z.string())
});

// 18. OKRs Schema
export const OkrsSchema = z.object({
  quarter: z.string(),
  objectives: z.array(z.object({
    id: z.string(),
    objective: z.string().min(10),
    strategicTheme: z.string(),
    keyResults: z.array(z.object({
      krId: z.string(),
      description: z.string().min(10),
      metric: z.string(),
      baseline: z.string(),
      target: z.string(),
      confidence: z.string()
    })).min(2)
  })).min(2),
  openQuestions: z.array(z.string())
});

// 19. Release Plan Schema
export const ReleasePlanSchema = z.object({
  releaseName: z.string().min(3),
  phases: z.array(z.object({
    phaseName: z.string(),
    targetWindow: z.string(),
    targetCohort: z.string(),
    exitCriteria: z.array(z.string()).min(1),
    rollbackTriggers: z.array(z.string()).min(1)
  })).min(3),
  releaseChecklist: z.array(z.string()).min(2),
  openQuestions: z.array(z.string())
});

// 20. Go-to-Market Plan Schema
export const GtmPlanSchema = z.object({
  positioningStatement: z.string().min(20),
  idealCustomerProfile: z.string().min(15),
  valuePropsBySegment: z.array(z.object({
    segment: z.string(),
    valueProp: z.string(),
    keyProofPoint: z.string()
  })).min(2),
  distributionChannels: z.array(z.object({
    channel: z.string(),
    tactic: z.string(),
    expectedConversion: z.string()
  })).min(2),
  pricingAndPackaging: z.string().min(10),
  launchMilestones: z.array(z.object({
    week: z.string(),
    milestone: z.string(),
    leadOwner: z.string()
  })).min(3),
  openQuestions: z.array(z.string())
});

export const SchemaRegistry: Record<string, z.ZodTypeAny> = {
  PRD: PrdSchema,
  PRODUCT_VISION: ProductVisionSchema,
  PROBLEM_STATEMENT: ProblemStatementSchema,
  USER_PERSONAS: PersonasSchema,
  PERSONAS: PersonasSchema,
  USER_STORIES: UserStoriesSchema,
  EPICS: EpicsSchema,
  FEATURES: FeaturesSchema,
  ACCEPTANCE_CRITERIA: AcceptanceCriteriaSchema,
  PRODUCT_REQUIREMENTS: ProductRequirementsSchema,
  ROADMAP: RoadmapSchema,
  MVP_SCOPE: MvpScopeSchema,
  COMPETITOR_ANALYSIS: CompetitorAnalysisSchema,
  SWOT: SwotSchema,
  USER_JOURNEY: UserJourneySchema,
  FEATURE_PRIORITIZATION: FeaturePrioritizationSchema,
  OKRS: OkrsSchema,
  KPIS: KpisSchema,
  RELEASE_PLAN: ReleasePlanSchema,
  GTM_PLAN: GtmPlanSchema,
  EXPERIMENTS: ExperimentsSchema
};
