import { ArtifactType } from '../types.js';

export function renderArtifactToProse(taskType: ArtifactType, data: any): string {
  switch (taskType) {
    case 'PRD':
      return renderPrdToProse(data);
    case 'PRODUCT_VISION':
      return renderProductVisionToProse(data);
    case 'PROBLEM_STATEMENT':
      return renderProblemStatementToProse(data);
    case 'USER_PERSONAS':
    case 'PERSONAS':
      return renderPersonasToProse(data);
    case 'USER_STORIES':
      return renderUserStoriesToProse(data);
    case 'EPICS':
      return renderEpicsToProse(data);
    case 'FEATURES':
      return renderFeaturesToProse(data);
    case 'ACCEPTANCE_CRITERIA':
      return renderAcceptanceCriteriaToProse(data);
    case 'PRODUCT_REQUIREMENTS':
      return renderProductRequirementsToProse(data);
    case 'ROADMAP':
      return renderRoadmapToProse(data);
    case 'MVP_SCOPE':
      return renderMvpScopeToProse(data);
    case 'COMPETITOR_ANALYSIS':
      return renderCompetitorAnalysisToProse(data);
    case 'SWOT':
      return renderSwotToProse(data);
    case 'USER_JOURNEY':
      return renderUserJourneyToProse(data);
    case 'FEATURE_PRIORITIZATION':
      return renderFeaturePrioritizationToProse(data);
    case 'OKRS':
      return renderOkrsToProse(data);
    case 'KPIS':
      return renderKpisToProse(data);
    case 'RELEASE_PLAN':
      return renderReleasePlanToProse(data);
    case 'GTM_PLAN':
      return renderGtmPlanToProse(data);
    case 'EXPERIMENTS':
      return renderExperimentsToProse(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}

function renderPrdToProse(data: any): string {
  return `# ${data.title}
**Status:** DRAFT (Pending Human PM Approval)  
**Document Type:** Product Requirements Document (PRD)

---

## 1. Objective & Success Criteria
${data.objective}

### Success Metrics
| Metric | Target | Current Baseline |
| :--- | :--- | :--- |
${data.successMetrics.map((m: any) => `| **${m.metric}** | \`${m.target}\` | ${m.currentBaseline || 'unknown'} |`).join('\n')}

---

## 2. Problem Statement
${data.problemStatement}

### Target User Segments
${data.targetUsers.map((u: string) => `- **${u}**`).join('\n')}

---

## 3. Functional Requirements (MoSCoW Prioritized)
${data.functionalRequirements.map((r: any) => `### [${r.priority}] ${r.id}
${r.requirement}
`).join('\n')}

---

## 4. Non-Functional & System Requirements
${data.nonFunctionalRequirements.map((n: string) => `- ${n}`).join('\n')}

---

## 5. Scope Boundaries
### MVP In-Scope (Day 1)
${data.mvpScope.map((s: string) => `✅ ${s}`).join('\n')}

### Explicitly Out of Scope (Post-MVP)
${data.outOfScope.map((s: string) => `🚫 ${s}`).join('\n')}

---

## 6. Identified Risks & Mitigations
${data.risks.map((r: any) => `> **Risk:** ${r.risk}  
> **Mitigation:** ${r.mitigation}
`).join('\n\n')}

---

## 7. Open Questions & Missing Data (Gaps Flagged)
${data.openQuestions && data.openQuestions.length > 0 
  ? data.openQuestions.map((q: string) => `- ❓ ${q}`).join('\n')
  : '_No unresolved questions identified._'}
`;
}

function renderUserStoriesToProse(data: any): string {
  return `# Epic: ${data.epicTitle}
**Feature Summary:** ${data.featureSummary || 'Automated feature decomposition'}

---

## User Stories with Acceptance Criteria & Deterministic RICE Prioritization

${data.stories.map((s: any, idx: number) => `### Story ${idx + 1}: ${s.id}
> **As a** ${s.asA}  
> **I want** ${s.iWant}  
> **So that** ${s.soThat}

- **Target Persona:** \`${s.persona}\`
- **RICE Score:** **${s.riceScore !== undefined ? s.riceScore.toFixed(1) : 'Calculated in backend'}**  
  *(Reach: ${s.reach} · Impact: ${s.impact} · Confidence: ${s.confidence * 100}% · Effort: ${s.effort} wks)*
- **Estimation Justification:** ${s.estimationJustification}

#### Acceptance Criteria
${s.acceptanceCriteria.map((ac: string) => `- [ ] ${ac}`).join('\n')}
`).join('\n\n---\n\n')}

## Technical & Cross-Team Dependencies
${data.dependencies.map((d: string) => `- 🔗 ${d}`).join('\n')}

## Open Questions
${data.openQuestions.map((q: string) => `- ❓ ${q}`).join('\n')}
`;
}

function renderRoadmapToProse(data: any): string {
  return `# Strategic Roadmap
**Vision:** ${data.vision}

---

## Strategic Pillars
${data.strategicPillars.map((p: string, i: number) => `${i + 1}. **${p}**`).join('\n')}

---

## Horizons & Quarterly Milestones

${data.quarterHorizons.map((q: any) => `### 🗓️ ${q.quarter} — Theme: "${q.theme}"
${q.initiatives.map((init: any) => `#### [${init.priority}] ${init.title} (${init.estimatedEffortWeeks} weeks)
${init.description}
- **Target Outcome:** ${init.targetOutcome}
- **Dependencies:** ${init.dependencies.length > 0 ? init.dependencies.join(', ') : 'None'}
`).join('\n')}
`).join('\n---\n')}

## Delivery Risks & Strategic Mitigations
${data.risksAndMitigations.map((rm: any) => `- **Risk:** ${rm.risk} ➔ **Mitigation:** ${rm.mitigation}`).join('\n')}

## Open Strategic Unknowns
${data.openQuestions.map((q: string) => `- ❓ ${q}`).join('\n')}
`;
}

function renderPersonasToProse(data: any): string {
  return `# Target User Personas
**Document:** Validated Qualitative Archetypes

---

${data.personas.map((p: any) => `## 👤 ${p.name} — ${p.role}
> "${p.verbatimQuote}"

- **Demographics & Environment:** ${p.demographics}
- **Technical Proficiency:** \`${p.techProficiency}\`

### Core Jobs To Be Done (JTBD)
${p.jobsToBeDone.map((j: string) => `- 🎯 ${j}`).join('\n')}

### Critical Pain Points & Friction
${p.painPoints.map((pp: string) => `- ⚠️ ${pp}`).join('\n')}

### Core Motivations
${p.coreMotivations.map((m: string) => `- 💡 ${m}`).join('\n')}
`).join('\n---\n')}

## Unmet Market & Competitive Gaps
${data.unmetMarketNeeds.map((u: string) => `- ⚡ ${u}`).join('\n')}

## Open Research Gaps
${data.openQuestions.map((q: string) => `- ❓ ${q}`).join('\n')}
`;
}

function renderKpisToProse(data: any): string {
  return `# Product KPI & Telemetry Framework

## ⭐ North Star Metric
**${data.northStarMetric.metric}**
- **Definition:** ${data.northStarMetric.definition}
- **Target:** \`${data.northStarMetric.target}\` (Baseline: ${data.northStarMetric.currentBaseline})
- **Rationale:** ${data.northStarMetric.rationale}

---

## 📈 Leading Indicators (Predictive)
| Metric | Cadence | Target | Signal Intent |
| :--- | :--- | :--- | :--- |
${data.leadingIndicators.map((li: any) => `| **${li.metric}** | \`${li.cadence}\` | ${li.target} | ${li.signalIntent} |`).join('\n')}

---

## 📊 Lagging Indicators (Business Impact)
| Metric | Cadence | Target | Business Impact |
| :--- | :--- | :--- | :--- |
${data.laggingIndicators.map((li: any) => `| **${li.metric}** | \`${li.cadence}\` | ${li.target} | ${li.businessImpact} |`).join('\n')}

---

## 🛡️ Guardrail Metrics (Constraints)
${data.guardrailMetrics.map((gm: any) => `- **${gm.metric}**: Must not breach \`${gm.threshold}\`. *Breach Action:* ${gm.breachAction}`).join('\n')}

## Open Telemetry Gaps
${data.openQuestions.map((q: string) => `- ❓ ${q}`).join('\n')}
`;
}

function renderExperimentsToProse(data: any): string {
  return `# Experimentation & Growth Plan
**Testing Methodology:** ${data.testingMethodology}

---

${data.experiments.map((e: any, idx: number) => `## Experiment ${idx + 1}: ${e.id}
**Hypothesis:** ${e.hypothesis}

- **Control Variant:** ${e.controlVariant}
- **Test Variant:** ${e.testVariant}
- **Primary Metric:** \`${e.primaryMetric}\` (MDE: ${e.minimumDetectableEffect})
- **Target Sample Size:** ${e.sampleSizeTarget} (Duration: ${e.durationWeeks} weeks)
- **Decision Criteria:** ${e.decisionCriteria}
- **Potential Downside Risk:** ${e.potentialRisks}
`).join('\n---\n')}

## Core Assumptions Under Test
${data.openAssumptions.map((a: string) => `- 🧪 ${a}`).join('\n')}
`;
}

function renderProductVisionToProse(data: any): string {
  return `# 🌟 ${data.title}
**Status:** DRAFT (Pending Human PM Approval)  
**Document Type:** Strategic Product Vision & North Star

---

## 🧭 North Star Statement
> "${data.northStarStatement}"

### Core Value Proposition
${data.coreValueProposition}

---

## 🏛️ Strategic Pillars
${data.strategicPillars.map((p: any) => `### ${p.pillar}
- **Objective:** ${p.objective}
- **Competitive Edge:** ${p.competitiveEdge}
`).join('\n')}

---

## 🎯 3-Year Target Impact
${data.targetImpact3Year}

### 🚫 Anti-Goals (Explicit Exclusions)
${data.antiGoals.map((g: string) => `- ❌ ${g}`).join('\n')}

${data.openQuestions?.length ? `### Open Strategic Questions\n${data.openQuestions.map((q: string) => `- ❓ ${q}`).join('\n')}` : ''}
`;
}

function renderProblemStatementToProse(data: any): string {
  return `# ⚠️ ${data.title}
**Document Type:** Problem Statement & Root Cause Breakdown

---

## 💥 Core Customer Problem
${data.coreProblem}

### Quantified Business & Customer Impact
**${data.quantifiedImpact}**

---

## 👥 Affected User Segments
${data.affectedUserSegments.map((s: any) => `### ${s.segment}
- **Frequency of Occurrence:** \`${s.frequency}\`
- **Severity Level:** **${s.severity}**
${s.quote ? `> "${s.quote}"` : ''}
`).join('\n')}

---

## 🔍 Root Cause Analysis
${data.rootCauses.map((r: string, idx: number) => `${idx + 1}. **${r}**`).join('\n')}

---

## ⏳ Measurable Cost of Inaction
${data.costOfInaction}
`;
}

function renderEpicsToProse(data: any): string {
  return `# 📦 Product Epics Catalog: ${data.productTitle}
**Document Type:** Delivery Epics & Strategic Themes

---

${data.epics.map((e: any) => `## [${e.priority}] ${e.id}: ${e.title}
**Summary:** ${e.summary}  
**Business Value:** ${e.businessValue}  
**Milestone:** \`${e.targetMilestone}\` | **Estimated Sprints:** ${e.estimatedSprints}  
**Dependencies:** ${e.dependencies?.length ? e.dependencies.join(', ') : 'None'}
`).join('\n---\n')}
`;
}

function renderFeaturesToProse(data: any): string {
  return `# 🧩 Features Catalog
**Document Type:** Functional Capabilities Breakdown

---

| ID | Feature Name | Tier | Category | Complexity | User Benefit |
| :--- | :--- | :--- | :--- | :--- | :--- |
${data.features.map((f: any) => `| **${f.id}** | ${f.name} | \`${f.tier}\` | ${f.category} | ${f.technicalComplexity} | ${f.userBenefit} |`).join('\n')}

---

## Detailed Feature Specifications
${data.features.map((f: any) => `### ${f.id} — ${f.name} (\`${f.tier}\`)
**Category:** ${f.category} | **Technical Complexity:** ${f.technicalComplexity}  
**Description:** ${f.description}  
**Core User Benefit:** ${f.userBenefit}
`).join('\n')}
`;
}

function renderAcceptanceCriteriaToProse(data: any): string {
  return `# ✅ Acceptance Criteria: ${data.featureTitle}
**Format:** Gherkin Given / When / Then Specification

---

${data.scenarios.map((s: any) => `## ${s.id}: ${s.scenarioTitle}
**Target Persona:** ${s.userPersona}

\`\`\`gherkin
GIVEN:
${s.given.map((g: string) => `  - ${g}`).join('\n')}
WHEN:
${s.when.map((w: string) => `  - ${w}`).join('\n')}
THEN:
${s.then.map((t: string) => `  - ${t}`).join('\n')}
\`\`\`

**Edge Cases & Error Handling:**
${s.edgeCases.map((ec: string) => `- ⚠️ ${ec}`).join('\n')}
`).join('\n---\n')}
`;
}

function renderProductRequirementsToProse(data: any): string {
  return `# 📋 ${data.title}
**Document Type:** Exhaustive Functional & Non-Functional Requirements

---

## 1. Functional Specifications
${data.functionalSpecs.map((s: any) => `### [${s.priority}] ${s.id}: ${s.module}
**Requirement:** ${s.requirement}  
*Rationale:* ${s.rationale}
`).join('\n')}

---

## 2. Non-Functional Specifications & SLAs
| Category | Target SLA | Test / Verification Method |
| :--- | :--- | :--- |
${data.nonFunctionalSpecs.map((n: any) => `| **${n.category}** | \`${n.targetSLA}\` | ${n.testMethod} |`).join('\n')}

---

## 3. Security, Privacy & Compliance
${data.securityAndCompliance.map((sc: string) => `- 🔒 ${sc}`).join('\n')}
`;
}

function renderMvpScopeToProse(data: any): string {
  return `# 🎯 ${data.initiativeTitle}
**Document Type:** MVP Definition, Boundaries & Launch Gates

---

## 💡 Core MVP Hypothesis
> "${data.coreHypothesis}"

---

## 🟢 Must-Have Capabilities (Day 1 Release)
${data.mustHaveDayOne.map((m: any) => `### ✅ ${m.capability}
*Justification:* ${m.rationale}
`).join('\n')}

---

## 🟡 Fast-Followers (Post-MVP Backlog)
${data.fastFollowersPostMvp.map((f: any) => `### ⏳ ${f.capability}
*Deferral Reason:* ${f.deferralReason}
`).join('\n')}

---

## 🔴 Strictly Out-of-Scope (Non-Goals)
${data.strictlyOutOfScope.map((s: string) => `- ❌ ${s}`).join('\n')}

---

## 🏁 Launch Readiness Criteria
${data.mvpLaunchReadinessCriteria.map((c: string) => `- [ ] ${c}`).join('\n')}
`;
}

function renderCompetitorAnalysisToProse(data: any): string {
  return `# ⚔️ Competitor Analysis & Market Landscape
**Document Type:** Strategic Competitive Intelligence

---

## 🌐 Market Overview
${data.marketOverview}

---

## 🥊 Direct Competitors
${data.directCompetitors.map((c: any) => `### ${c.name}
- **Market Position:** ${c.marketPosition}
- **Key Strengths:** ${c.strengths.join(', ')}
- **Key Weaknesses:** ${c.weaknesses.join(', ')}
- **Pricing:** \`${c.pricingSummary}\`
`).join('\n')}

---

## 🏰 Our Competitive Moat & Wedge
> "${data.ourCompetitiveMoat}"

---

## 📊 Capability Parity Matrix
| Capability | Navigator (Us) | Competitor A | Competitor B |
| :--- | :--- | :--- | :--- |
${data.parityMatrix.map((p: any) => `| **${p.capability}** | \`${p.us}\` | ${p.competitorA} | ${p.competitorB} |`).join('\n')}
`;
}

function renderSwotToProse(data: any): string {
  return `# ⚖️ SWOT Strategic Matrix
**Document Type:** 2x2 Strategic Quadrant Analysis

---

## 2x2 Quadrant Grid

| 🟢 STRENGTHS (Internal) | 🔴 WEAKNESSES (Internal) |
| :--- | :--- |
| ${data.strengths.map((s: string) => `• ${s}`).join('<br>')} | ${data.weaknesses.map((w: string) => `• ${w}`).join('<br>')} |

| 🔵 OPPORTUNITIES (External) | 🟠 THREATS (External) |
| :--- | :--- |
| ${data.opportunities.map((o: string) => `• ${o}`).join('<br>')} | ${data.threats.map((t: string) => `• ${t}`).join('<br>')} |

---

## ♟️ Strategic Plays
${data.strategicPlays.map((p: any) => `### ${p.play}
- **Focus Quadrant:** \`${p.quadrantFocus}\`
- **Strategic Rationale:** ${p.rationale}
`).join('\n')}
`;
}

function renderUserJourneyToProse(data: any): string {
  return `# 🗺️ User Journey Map: ${data.persona}
**Document Type:** End-to-End Customer Experience & Emotion Arc

---

${data.stages.map((st: any, idx: number) => `### Stage ${idx + 1}: ${st.stageName} — ${st.stepTitle}
- **User Action:** ${st.userAction}
- **User Thoughts:** *"${st.userThoughts}"*
- **Emotional State:** \`${st.emotionalState}\`
- **⚠️ Friction / Pain Point:** ${st.painPoint}
- **✨ Delight Opportunity:** ${st.delightOpportunity}
`).join('\n---\n')}

---

## 🚨 Critical Drop-Off Risks
${data.criticalDropOffRisks.map((r: string) => `- ⚠️ ${r}`).join('\n')}
`;
}

function renderFeaturePrioritizationToProse(data: any): string {
  return `# ⚖️ Feature Prioritization Matrix (RICE)
**Methodology:** ${data.prioritizationMethod}

---

| Rank | Feature Title | Reach | Impact | Confidence | Effort | RICE Score | MoSCoW |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${data.rankedFeatures.sort((a: any, b: any) => b.riceScore - a.riceScore).map((f: any, idx: number) => `| **#${idx + 1}** | ${f.title} | ${f.reach} | ${f.impact}x | ${Math.round(f.confidence * 100)}% | ${f.effort}w | **${Math.round(f.riceScore)}** | \`${f.moscow}\` |`).join('\n')}

---

## Strategic Recommendations
${data.strategicRecommendations.map((r: string) => `- 💡 ${r}`).join('\n')}
`;
}

function renderOkrsToProse(data: any): string {
  return `# 🎯 Strategic OKRs: ${data.quarter}
**Document Type:** Objectives & Quantitative Key Results

---

${data.objectives.map((obj: any) => `## 🏆 ${obj.id}: ${obj.objective}
*Strategic Theme:* \`${obj.strategicTheme}\`

| Key Result ID | Description | Metric | Baseline | Target | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
${obj.keyResults.map((kr: any) => `| **${kr.krId}** | ${kr.description} | ${kr.metric} | \`${kr.baseline}\` | **${kr.target}** | ${kr.confidence} |`).join('\n')}
`).join('\n---\n')}
`;
}

function renderReleasePlanToProse(data: any): string {
  return `# 🚀 ${data.releaseName}
**Document Type:** Phased Rollout & Deployment Schedule

---

${data.phases.map((ph: any) => `## 📍 ${ph.phaseName}
**Target Window:** \`${ph.targetWindow}\` | **Target Cohort:** ${ph.targetCohort}

### Exit Criteria
${ph.exitCriteria.map((ec: string) => `- [ ] ${ec}`).join('\n')}

### 🚨 Rollback Triggers
${ph.rollbackTriggers.map((rt: string) => `- ⚠️ ${rt}`).join('\n')}
`).join('\n---\n')}

---

## 📋 Release Readiness Checklist
${data.releaseChecklist.map((c: string) => `- [ ] ${c}`).join('\n')}
`;
}

function renderGtmPlanToProse(data: any): string {
  return `# 📢 Go-to-Market Plan
**Document Type:** Commercial Positioning & Distribution Strategy

---

## 🎯 Positioning Statement
> "${data.positioningStatement}"

### Ideal Customer Profile (ICP)
${data.idealCustomerProfile}

---

## 💎 Value Propositions by Segment
${data.valuePropsBySegment.map((v: any) => `### ${v.segment}
- **Value Proposition:** ${v.valueProp}
- **Proof Point:** *${v.keyProofPoint}*
`).join('\n')}

---

## 🚀 Distribution Channels
| Channel | Tactic | Expected Conversion |
| :--- | :--- | :--- |
${data.distributionChannels.map((c: any) => `| **${c.channel}** | ${c.tactic} | \`${c.expectedConversion}\` |`).join('\n')}

---

## 💰 Pricing & Packaging Strategy
${data.pricingAndPackaging}

---

## 📅 Launch Milestone Timeline
| Week | Milestone | Lead Owner |
| :--- | :--- | :--- |
${data.launchMilestones.map((m: any) => `| **${m.week}** | ${m.milestone} | \`${m.leadOwner}\` |`).join('\n')}
`;
}

