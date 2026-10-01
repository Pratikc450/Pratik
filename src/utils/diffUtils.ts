export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffItem<T = any> {
  type: DiffChangeType;
  value: T;
  oldValue?: T;
  field?: string;
  changeNote?: string;
}

export interface PrdFunctionalRequirementDiff {
  id: string;
  type: DiffChangeType;
  priorityA?: 'MUST' | 'SHOULD' | 'COULD';
  priorityB?: 'MUST' | 'SHOULD' | 'COULD';
  requirementA?: string;
  requirementB?: string;
}

export interface PrdMetricDiff {
  metric: string;
  type: DiffChangeType;
  targetA?: string;
  targetB?: string;
  baselineA?: string;
  baselineB?: string;
}

export interface PrdStructuredDiff {
  title: DiffItem<string>;
  objective: DiffItem<string>;
  problemStatement: DiffItem<string>;
  targetUsers: DiffItem<string>[];
  functionalRequirements: PrdFunctionalRequirementDiff[];
  nonFunctionalRequirements: DiffItem<string>[];
  successMetrics: PrdMetricDiff[];
  mvpScope: DiffItem<string>[];
  outOfScope: DiffItem<string>[];
  risks: DiffItem<{ risk: string; mitigation: string }>[];
  openQuestions: DiffItem<string>[];
  summary: {
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
    unchangedCount: number;
  };
}

export interface RoadmapInitiativeDiff {
  id: string;
  title: string;
  type: DiffChangeType;
  quarterA?: string;
  quarterB?: string;
  priorityA?: 'P0' | 'P1' | 'P2';
  priorityB?: 'P0' | 'P1' | 'P2';
  effortWeeksA?: number;
  effortWeeksB?: number;
  targetOutcomeA?: string;
  targetOutcomeB?: string;
  descriptionA?: string;
  descriptionB?: string;
  dependenciesA?: string[];
  dependenciesB?: string[];
}

export interface RoadmapQuarterDiff {
  quarter: string;
  type: DiffChangeType;
  themeA?: string;
  themeB?: string;
  initiatives: RoadmapInitiativeDiff[];
}

export interface RoadmapStructuredDiff {
  vision: DiffItem<string>;
  strategicPillars: DiffItem<string>[];
  quarters: RoadmapQuarterDiff[];
  risks: DiffItem<{ risk: string; mitigation: string }>[];
  openQuestions: DiffItem<string>[];
  summary: {
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
    unchangedCount: number;
  };
}

export interface ProseLineDiff {
  lineA?: number;
  lineB?: number;
  contentA?: string;
  contentB?: string;
  type: DiffChangeType;
}

/**
 * Computes difference between two lists of simple strings (e.g. scope items, requirements)
 */
export function computeStringListDiff(listA: string[] = [], listB: string[] = []): DiffItem<string>[] {
  const result: DiffItem<string>[] = [];
  const setA = new Set(listA);
  const setB = new Set(listB);

  // Items in both
  for (const item of listA) {
    if (setB.has(item)) {
      result.push({ type: 'unchanged', value: item });
    } else {
      result.push({ type: 'removed', value: item });
    }
  }

  // Items added in B
  for (const item of listB) {
    if (!setA.has(item)) {
      result.push({ type: 'added', value: item });
    }
  }

  return result;
}

/**
 * Computes deep structured diff between two PRD schema objects
 */
export function computePrdDiff(dataA: any = {}, dataB: any = {}): PrdStructuredDiff {
  let added = 0;
  let modified = 0;
  let removed = 0;
  let unchanged = 0;

  const countItem = (type: DiffChangeType) => {
    if (type === 'added') added++;
    else if (type === 'modified') modified++;
    else if (type === 'removed') removed++;
    else unchanged++;
  };

  // 1. Title
  const titleType: DiffChangeType = (dataA.title || '') === (dataB.title || '') ? 'unchanged' : 'modified';
  countItem(titleType);
  const title: DiffItem<string> = {
    type: titleType,
    value: dataB.title || dataA.title || '',
    oldValue: dataA.title
  };

  // 2. Objective
  const objType: DiffChangeType = (dataA.objective || '') === (dataB.objective || '') ? 'unchanged' : 'modified';
  countItem(objType);
  const objective: DiffItem<string> = {
    type: objType,
    value: dataB.objective || dataA.objective || '',
    oldValue: dataA.objective
  };

  // 3. Problem Statement
  const probType: DiffChangeType = (dataA.problemStatement || '') === (dataB.problemStatement || '') ? 'unchanged' : 'modified';
  countItem(probType);
  const problemStatement: DiffItem<string> = {
    type: probType,
    value: dataB.problemStatement || dataA.problemStatement || '',
    oldValue: dataA.problemStatement
  };

  // 4. Target Users
  const targetUsers = computeStringListDiff(dataA.targetUsers || [], dataB.targetUsers || []);
  targetUsers.forEach(i => countItem(i.type));

  // 5. Functional Requirements
  const frA: any[] = dataA.functionalRequirements || [];
  const frB: any[] = dataB.functionalRequirements || [];
  const mapA = new Map<string, any>();
  const mapB = new Map<string, any>();

  frA.forEach(f => mapA.set(f.id || f.requirement, f));
  frB.forEach(f => mapB.set(f.id || f.requirement, f));

  const functionalRequirements: PrdFunctionalRequirementDiff[] = [];

  for (const [id, itemA] of mapA.entries()) {
    if (mapB.has(id)) {
      const itemB = mapB.get(id);
      const isPriorityChanged = itemA.priority !== itemB.priority;
      const isRequirementChanged = itemA.requirement !== itemB.requirement;
      if (isPriorityChanged || isRequirementChanged) {
        functionalRequirements.push({
          id,
          type: 'modified',
          priorityA: itemA.priority,
          priorityB: itemB.priority,
          requirementA: itemA.requirement,
          requirementB: itemB.requirement
        });
        modified++;
      } else {
        functionalRequirements.push({
          id,
          type: 'unchanged',
          priorityA: itemA.priority,
          priorityB: itemB.priority,
          requirementA: itemA.requirement,
          requirementB: itemB.requirement
        });
        unchanged++;
      }
    } else {
      functionalRequirements.push({
        id,
        type: 'removed',
        priorityA: itemA.priority,
        requirementA: itemA.requirement
      });
      removed++;
    }
  }

  for (const [id, itemB] of mapB.entries()) {
    if (!mapA.has(id)) {
      functionalRequirements.push({
        id,
        type: 'added',
        priorityB: itemB.priority,
        requirementB: itemB.requirement
      });
      added++;
    }
  }

  // 6. Non-Functional Requirements
  const nonFunctionalRequirements = computeStringListDiff(dataA.nonFunctionalRequirements || [], dataB.nonFunctionalRequirements || []);
  nonFunctionalRequirements.forEach(i => countItem(i.type));

  // 7. Success Metrics
  const metA: any[] = dataA.successMetrics || [];
  const metB: any[] = dataB.successMetrics || [];
  const metricMapA = new Map<string, any>();
  const metricMapB = new Map<string, any>();
  metA.forEach(m => metricMapA.set(m.metric, m));
  metB.forEach(m => metricMapB.set(m.metric, m));

  const successMetrics: PrdMetricDiff[] = [];
  for (const [metric, itemA] of metricMapA.entries()) {
    if (metricMapB.has(metric)) {
      const itemB = metricMapB.get(metric);
      const isChanged = itemA.target !== itemB.target || itemA.currentBaseline !== itemB.currentBaseline;
      if (isChanged) {
        successMetrics.push({
          metric,
          type: 'modified',
          targetA: itemA.target,
          targetB: itemB.target,
          baselineA: itemA.currentBaseline,
          baselineB: itemB.currentBaseline
        });
        modified++;
      } else {
        successMetrics.push({
          metric,
          type: 'unchanged',
          targetA: itemA.target,
          targetB: itemB.target,
          baselineA: itemA.currentBaseline,
          baselineB: itemB.currentBaseline
        });
        unchanged++;
      }
    } else {
      successMetrics.push({
        metric,
        type: 'removed',
        targetA: itemA.target,
        baselineA: itemA.currentBaseline
      });
      removed++;
    }
  }

  for (const [metric, itemB] of metricMapB.entries()) {
    if (!metricMapA.has(metric)) {
      successMetrics.push({
        metric,
        type: 'added',
        targetB: itemB.target,
        baselineB: itemB.currentBaseline
      });
      added++;
    }
  }

  // 8. MVP Scope & Out of Scope
  const mvpScope = computeStringListDiff(dataA.mvpScope || [], dataB.mvpScope || []);
  mvpScope.forEach(i => countItem(i.type));

  const outOfScope = computeStringListDiff(dataA.outOfScope || [], dataB.outOfScope || []);
  outOfScope.forEach(i => countItem(i.type));

  // 9. Risks
  const risksA: any[] = dataA.risks || [];
  const risksB: any[] = dataB.risks || [];
  const riskMapA = new Map<string, any>(risksA.map(r => [r.risk, r]));
  const riskMapB = new Map<string, any>(risksB.map(r => [r.risk, r]));

  const risks: DiffItem<{ risk: string; mitigation: string }>[] = [];
  for (const [risk, rA] of riskMapA.entries()) {
    if (riskMapB.has(risk)) {
      const rB = riskMapB.get(risk);
      const isMitigationChanged = rA.mitigation !== rB.mitigation;
      if (isMitigationChanged) {
        risks.push({ type: 'modified', value: rB, oldValue: rA });
        modified++;
      } else {
        risks.push({ type: 'unchanged', value: rA });
        unchanged++;
      }
    } else {
      risks.push({ type: 'removed', value: rA });
      removed++;
    }
  }
  for (const [risk, rB] of riskMapB.entries()) {
    if (!riskMapA.has(risk)) {
      risks.push({ type: 'added', value: rB });
      added++;
    }
  }

  // 10. Open Questions
  const openQuestions = computeStringListDiff(dataA.openQuestions || [], dataB.openQuestions || []);
  openQuestions.forEach(i => countItem(i.type));

  return {
    title,
    objective,
    problemStatement,
    targetUsers,
    functionalRequirements,
    nonFunctionalRequirements,
    successMetrics,
    mvpScope,
    outOfScope,
    risks,
    openQuestions,
    summary: {
      addedCount: added,
      modifiedCount: modified,
      removedCount: removed,
      unchangedCount: unchanged
    }
  };
}

/**
 * Computes deep structured diff between two Roadmap schema objects
 */
export function computeRoadmapDiff(dataA: any = {}, dataB: any = {}): RoadmapStructuredDiff {
  let added = 0;
  let modified = 0;
  let removed = 0;
  let unchanged = 0;

  const countItem = (type: DiffChangeType) => {
    if (type === 'added') added++;
    else if (type === 'modified') modified++;
    else if (type === 'removed') removed++;
    else unchanged++;
  };

  // Vision
  const visionType: DiffChangeType = (dataA.vision || '') === (dataB.vision || '') ? 'unchanged' : 'modified';
  countItem(visionType);
  const vision: DiffItem<string> = {
    type: visionType,
    value: dataB.vision || dataA.vision || '',
    oldValue: dataA.vision
  };

  // Strategic Pillars
  const strategicPillars = computeStringListDiff(dataA.strategicPillars || [], dataB.strategicPillars || []);
  strategicPillars.forEach(i => countItem(i.type));

  // Quarters & Initiatives
  const qA: any[] = dataA.quarterHorizons || [];
  const qB: any[] = dataB.quarterHorizons || [];

  const quartersMapA = new Map<string, any>(qA.map(q => [q.quarter, q]));
  const quartersMapB = new Map<string, any>(qB.map(q => [q.quarter, q]));

  const allQuarters = Array.from(new Set([...quartersMapA.keys(), ...quartersMapB.keys()]));
  const quartersDiff: RoadmapQuarterDiff[] = [];

  for (const quarter of allQuarters) {
    const itemA = quartersMapA.get(quarter);
    const itemB = quartersMapB.get(quarter);

    if (itemA && itemB) {
      const isThemeChanged = itemA.theme !== itemB.theme;
      const quarterType: DiffChangeType = isThemeChanged ? 'modified' : 'unchanged';
      countItem(quarterType);

      // Compare initiatives in this quarter
      const initA: any[] = itemA.initiatives || [];
      const initB: any[] = itemB.initiatives || [];

      const initMapA = new Map<string, any>(initA.map(i => [i.id || i.title, i]));
      const initMapB = new Map<string, any>(initB.map(i => [i.id || i.title, i]));

      const initiativesDiff: RoadmapInitiativeDiff[] = [];

      for (const [id, iA] of initMapA.entries()) {
        if (initMapB.has(id)) {
          const iB = initMapB.get(id);
          const isPChanged = iA.priority !== iB.priority;
          const isEffortChanged = iA.estimatedEffortWeeks !== iB.estimatedEffortWeeks;
          const isDescChanged = iA.description !== iB.description;
          const isOutcomeChanged = iA.targetOutcome !== iB.targetOutcome;

          if (isPChanged || isEffortChanged || isDescChanged || isOutcomeChanged) {
            initiativesDiff.push({
              id,
              title: iB.title || iA.title,
              type: 'modified',
              quarterA: quarter,
              quarterB: quarter,
              priorityA: iA.priority,
              priorityB: iB.priority,
              effortWeeksA: iA.estimatedEffortWeeks,
              effortWeeksB: iB.estimatedEffortWeeks,
              targetOutcomeA: iA.targetOutcome,
              targetOutcomeB: iB.targetOutcome,
              descriptionA: iA.description,
              descriptionB: iB.description,
              dependenciesA: iA.dependencies,
              dependenciesB: iB.dependencies
            });
            modified++;
          } else {
            initiativesDiff.push({
              id,
              title: iA.title,
              type: 'unchanged',
              quarterA: quarter,
              quarterB: quarter,
              priorityA: iA.priority,
              priorityB: iB.priority,
              effortWeeksA: iA.estimatedEffortWeeks,
              effortWeeksB: iB.estimatedEffortWeeks,
              targetOutcomeA: iA.targetOutcome,
              targetOutcomeB: iB.targetOutcome,
              descriptionA: iA.description,
              descriptionB: iB.description
            });
            unchanged++;
          }
        } else {
          initiativesDiff.push({
            id,
            title: iA.title,
            type: 'removed',
            quarterA: quarter,
            priorityA: iA.priority,
            effortWeeksA: iA.estimatedEffortWeeks,
            targetOutcomeA: iA.targetOutcome,
            descriptionA: iA.description
          });
          removed++;
        }
      }

      for (const [id, iB] of initMapB.entries()) {
        if (!initMapA.has(id)) {
          initiativesDiff.push({
            id,
            title: iB.title,
            type: 'added',
            quarterB: quarter,
            priorityB: iB.priority,
            effortWeeksB: iB.estimatedEffortWeeks,
            targetOutcomeB: iB.targetOutcome,
            descriptionB: iB.description
          });
          added++;
        }
      }

      quartersDiff.push({
        quarter,
        type: quarterType,
        themeA: itemA.theme,
        themeB: itemB.theme,
        initiatives: initiativesDiff
      });
    } else if (itemA && !itemB) {
      // Quarter removed
      removed++;
      const initA: any[] = itemA.initiatives || [];
      initA.forEach(() => removed++);

      quartersDiff.push({
        quarter,
        type: 'removed',
        themeA: itemA.theme,
        initiatives: initA.map(i => ({
          id: i.id || i.title,
          title: i.title,
          type: 'removed',
          quarterA: quarter,
          priorityA: i.priority,
          effortWeeksA: i.estimatedEffortWeeks,
          descriptionA: i.description
        }))
      });
    } else if (!itemA && itemB) {
      // Quarter added
      added++;
      const initB: any[] = itemB.initiatives || [];
      initB.forEach(() => added++);

      quartersDiff.push({
        quarter,
        type: 'added',
        themeB: itemB.theme,
        initiatives: initB.map(i => ({
          id: i.id || i.title,
          title: i.title,
          type: 'added',
          quarterB: quarter,
          priorityB: i.priority,
          effortWeeksB: i.estimatedEffortWeeks,
          descriptionB: i.description
        }))
      });
    }
  }

  // Risks & Mitigations
  const risksA: any[] = dataA.risksAndMitigations || [];
  const risksB: any[] = dataB.risksAndMitigations || [];
  const riskMapA = new Map<string, any>(risksA.map(r => [r.risk, r]));
  const riskMapB = new Map<string, any>(risksB.map(r => [r.risk, r]));

  const risks: DiffItem<{ risk: string; mitigation: string }>[] = [];
  for (const [risk, rA] of riskMapA.entries()) {
    if (riskMapB.has(risk)) {
      const rB = riskMapB.get(risk);
      const isMitigationChanged = rA.mitigation !== rB.mitigation;
      if (isMitigationChanged) {
        risks.push({ type: 'modified', value: rB, oldValue: rA });
        modified++;
      } else {
        risks.push({ type: 'unchanged', value: rA });
        unchanged++;
      }
    } else {
      risks.push({ type: 'removed', value: rA });
      removed++;
    }
  }
  for (const [risk, rB] of riskMapB.entries()) {
    if (!riskMapA.has(risk)) {
      risks.push({ type: 'added', value: rB });
      added++;
    }
  }

  const openQuestions = computeStringListDiff(dataA.openQuestions || [], dataB.openQuestions || []);
  openQuestions.forEach(i => countItem(i.type));

  return {
    vision,
    strategicPillars,
    quarters: quartersDiff,
    risks,
    openQuestions,
    summary: {
      addedCount: added,
      modifiedCount: modified,
      removedCount: removed,
      unchangedCount: unchanged
    }
  };
}

/**
 * Computes side-by-side line diff for Markdown prose
 */
export function computeProseLineDiff(textA: string = '', textB: string = ''): ProseLineDiff[] {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: ProseLineDiff[] = [];

  let idxA = 0;
  let idxB = 0;

  while (idxA < linesA.length || idxB < linesB.length) {
    const lineA = linesA[idxA];
    const lineB = linesB[idxB];

    if (idxA >= linesA.length) {
      // Only B left -> added
      result.push({
        lineB: idxB + 1,
        contentB: lineB,
        type: 'added'
      });
      idxB++;
    } else if (idxB >= linesB.length) {
      // Only A left -> removed
      result.push({
        lineA: idxA + 1,
        contentA: lineA,
        type: 'removed'
      });
      idxA++;
    } else if (lineA === lineB) {
      // Unchanged
      result.push({
        lineA: idxA + 1,
        lineB: idxB + 1,
        contentA: lineA,
        contentB: lineB,
        type: 'unchanged'
      });
      idxA++;
      idxB++;
    } else {
      // Lookahead check for insertion/deletion vs modification
      const nextMatchInB = linesB.indexOf(lineA, idxB);
      const nextMatchInA = linesA.indexOf(lineB, idxA);

      if (nextMatchInB !== -1 && (nextMatchInA === -1 || nextMatchInB - idxB < nextMatchInA - idxA)) {
        // Line added in B
        result.push({
          lineB: idxB + 1,
          contentB: lineB,
          type: 'added'
        });
        idxB++;
      } else if (nextMatchInA !== -1 && (nextMatchInB === -1 || nextMatchInA - idxA <= nextMatchInB - idxB)) {
        // Line removed in A
        result.push({
          lineA: idxA + 1,
          contentA: lineA,
          type: 'removed'
        });
        idxA++;
      } else {
        // Modified line
        result.push({
          lineA: idxA + 1,
          lineB: idxB + 1,
          contentA: lineA,
          contentB: lineB,
          type: 'modified'
        });
        idxA++;
        idxB++;
      }
    }
  }

  return result;
}
