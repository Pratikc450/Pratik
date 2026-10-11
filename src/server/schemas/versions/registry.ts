import { z } from 'zod';
import { SchemaVersion, VersionValidationResult, SchemaVersionMetadata } from './types.js';
import {
  PrdSchemaV1,
  UserStoriesSchemaV1,
  RoadmapSchemaV1,
  FeaturesSchemaV1,
  ProductVisionSchemaV1,
  PersonasSchemaV1,
  KpisSchemaV1
} from './v1.js';
import {
  PrdSchemaV2,
  UserStoriesSchemaV2,
  RoadmapSchemaV2,
  FeaturesSchemaV2,
  ProductVisionSchemaV2,
  PersonasSchemaV2,
  KpisSchemaV2
} from './v2.js';
import { migrateArtifactData } from './migrators.js';

// Import remaining schemas from the base schemas file to ensure full coverage of all 19 task types
import {
  ProblemStatementSchema,
  EpicsSchema,
  AcceptanceCriteriaSchema,
  ProductRequirementsSchema,
  MvpScopeSchema,
  CompetitorAnalysisSchema,
  SwotSchema,
  UserJourneySchema,
  FeaturePrioritizationSchema,
  OkrsSchema,
  ReleasePlanSchema,
  GtmPlanSchema,
  ExperimentsSchema
} from '../../schemas.js';

/**
 * ============================================================================
 * VERSIONED SCHEMA REGISTRY
 * ============================================================================
 * Dual-revision multi-version registry allowing concurrent support for v1 (legacy)
 * and v2 (current) artifact schemas with automated version detection and migration.
 */

// Version Matrix: [taskType][version] -> Zod Schema
const VERSIONED_REGISTRY: Record<string, Partial<Record<SchemaVersion, z.ZodTypeAny>>> = {
  PRD: {
    1: PrdSchemaV1,
    2: PrdSchemaV2
  },
  USER_STORIES: {
    1: UserStoriesSchemaV1,
    2: UserStoriesSchemaV2
  },
  ROADMAP: {
    1: RoadmapSchemaV1,
    2: RoadmapSchemaV2
  },
  FEATURES: {
    1: FeaturesSchemaV1,
    2: FeaturesSchemaV2
  },
  PRODUCT_VISION: {
    1: ProductVisionSchemaV1,
    2: ProductVisionSchemaV2
  },
  USER_PERSONAS: {
    1: PersonasSchemaV1,
    2: PersonasSchemaV2
  },
  PERSONAS: {
    1: PersonasSchemaV1,
    2: PersonasSchemaV2
  },
  KPIS: {
    1: KpisSchemaV1,
    2: KpisSchemaV2
  },
  // Task types where v1 and v2 share standard contract
  PROBLEM_STATEMENT: { 1: ProblemStatementSchema, 2: ProblemStatementSchema },
  EPICS: { 1: EpicsSchema, 2: EpicsSchema },
  ACCEPTANCE_CRITERIA: { 1: AcceptanceCriteriaSchema, 2: AcceptanceCriteriaSchema },
  PRODUCT_REQUIREMENTS: { 1: ProductRequirementsSchema, 2: ProductRequirementsSchema },
  MVP_SCOPE: { 1: MvpScopeSchema, 2: MvpScopeSchema },
  COMPETITOR_ANALYSIS: { 1: CompetitorAnalysisSchema, 2: CompetitorAnalysisSchema },
  SWOT: { 1: SwotSchema, 2: SwotSchema },
  USER_JOURNEY: { 1: UserJourneySchema, 2: UserJourneySchema },
  FEATURE_PRIORITIZATION: { 1: FeaturePrioritizationSchema, 2: FeaturePrioritizationSchema },
  OKRS: { 1: OkrsSchema, 2: OkrsSchema },
  RELEASE_PLAN: { 1: ReleasePlanSchema, 2: ReleasePlanSchema },
  GTM_PLAN: { 1: GtmPlanSchema, 2: GtmPlanSchema },
  EXPERIMENTS: { 1: ExperimentsSchema, 2: ExperimentsSchema }
};

/**
 * Returns the highest available schema version for a task type (defaults to 2)
 */
export function getLatestSchemaVersion(taskType: string): SchemaVersion {
  const versions = VERSIONED_REGISTRY[taskType];
  if (!versions) return 2;
  const numVersions = Object.keys(versions).map(Number) as SchemaVersion[];
  return Math.max(...numVersions, 2) as SchemaVersion;
}

/**
 * Returns all supported schema revisions for a task type
 */
export function getSupportedSchemaVersions(taskType: string): SchemaVersion[] {
  const versions = VERSIONED_REGISTRY[taskType];
  if (!versions) return [1, 2];
  return (Object.keys(versions).map(Number) as SchemaVersion[]).sort((a, b) => a - b);
}

/**
 * Retrieves the specific Zod schema for a taskType and revision version
 */
export function getArtifactSchema(taskType: string, version?: number | string): z.ZodTypeAny {
  const typeMap = VERSIONED_REGISTRY[taskType];
  if (!typeMap) {
    // Fallback to generic pass-through if unknown
    return z.record(z.string(), z.any());
  }

  const numericVersion = version ? (Number(version) as SchemaVersion) : getLatestSchemaVersion(taskType);
  const foundSchema = typeMap[numericVersion];

  if (foundSchema) {
    return foundSchema;
  }

  // Fallback to latest version
  const latestVer = getLatestSchemaVersion(taskType);
  return typeMap[latestVer] || z.record(z.string(), z.any());
}

/**
 * Detects which schema version a given artifact payload matches
 */
export function detectArtifactSchemaVersion(taskType: string, data: any): { version: SchemaVersion; isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { version: 1, isValid: false, error: 'Payload is not an object' };
  }

  // If explicit schemaVersion field exists, verify it
  if (data.schemaVersion === 2 || data.schemaVersion === '2') {
    const v2Schema = getArtifactSchema(taskType, 2);
    const result2 = v2Schema.safeParse(data);
    if (result2.success) return { version: 2, isValid: true };
  }

  // First try v2 (current production)
  const v2Schema = getArtifactSchema(taskType, 2);
  const result2 = v2Schema.safeParse(data);
  if (result2.success) {
    return { version: 2, isValid: true };
  }

  // Then try v1 (legacy)
  const v1Schema = getArtifactSchema(taskType, 1);
  const result1 = v1Schema.safeParse(data);
  if (result1.success) {
    return { version: 1, isValid: true };
  }

  // If neither strictly parsed, return error from latest v2
  const issues = result2.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  return { version: 2, isValid: false, error: issues };
}

/**
 * Validates artifact data against a specifically requested schema version
 */
export function validateArtifactWithVersion<T = any>(
  taskType: string,
  data: any,
  requestedVersion?: number | string
): VersionValidationResult<T> {
  const targetVer = requestedVersion ? (Number(requestedVersion) as SchemaVersion) : getLatestSchemaVersion(taskType);
  const schema = getArtifactSchema(taskType, targetVer);
  const parseResult = schema.safeParse(data);

  if (parseResult.success) {
    return {
      success: true,
      data: parseResult.data as T,
      detectedVersion: targetVer,
      targetVersion: targetVer,
      migrated: false
    };
  }

  const issues = parseResult.error.issues.map(i => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code
  }));
  const errorMsg = issues.map(i => `${i.path}: ${i.message}`).join('; ');

  return {
    success: false,
    error: errorMsg,
    detectedVersion: targetVer,
    targetVersion: targetVer,
    migrated: false,
    issues
  };
}

/**
 * Validates artifact data against ANY supported version, with optional auto-migration
 * If a legacy v1 artifact is encountered, it seamlessly validates against v1 and
 * can optionally upgrade it to v2 without breaking legacy consumers!
 */
export function validateArtifactAnyVersion<T = any>(
  taskType: string,
  data: any,
  autoMigrateToLatest: boolean = true
): VersionValidationResult<T> {
  const latestVer = getLatestSchemaVersion(taskType);

  // 1. Try latest schema (v2) first
  const latestSchema = getArtifactSchema(taskType, latestVer);
  const latestResult = latestSchema.safeParse(data);

  if (latestResult.success) {
    return {
      success: true,
      data: latestResult.data as T,
      detectedVersion: latestVer,
      targetVersion: latestVer,
      migrated: false
    };
  }

  // 2. If latest fails, check legacy versions (v1)
  const legacySchema = getArtifactSchema(taskType, 1);
  const legacyResult = legacySchema.safeParse(data);

  if (legacyResult.success) {
    if (autoMigrateToLatest && latestVer > 1) {
      // Safely migrate v1 -> v2
      const migration = migrateArtifactData(taskType, legacyResult.data, 1, latestVer);
      const migratedParse = latestSchema.safeParse(migration.migratedData);

      if (migratedParse.success) {
        return {
          success: true,
          data: migratedParse.data as T,
          detectedVersion: 1,
          targetVersion: latestVer,
          migrated: true
        };
      }
    }

    // Return valid v1 data directly if not auto-migrated
    return {
      success: true,
      data: legacyResult.data as T,
      detectedVersion: 1,
      targetVersion: 1,
      migrated: false
    };
  }

  // 3. Neither version parsed cleanly
  const issues = latestResult.error.issues.map(i => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code
  }));
  const errorMsg = issues.map(i => `${i.path}: ${i.message}`).join('; ');

  return {
    success: false,
    error: errorMsg,
    detectedVersion: latestVer,
    targetVersion: latestVer,
    migrated: false,
    issues
  };
}

/**
 * Metadata introspection for all supported versions
 */
export function getAllSchemaVersionsMetadata(): SchemaVersionMetadata[] {
  return [
    {
      taskType: 'PRD',
      latestVersion: 2,
      supportedVersions: [1, 2],
      versionDetails: {
        1: {
          version: 1,
          description: 'Legacy Baseline PRD Specification',
          changelog: 'Initial artifact generation format with flexible priority strings and optional scope items.',
          addedFields: [],
          deprecatedFields: [],
          breakingConstraints: []
        },
        2: {
          version: 2,
          description: 'Production MoSCoW Specification with SLA Boundaries',
          changelog: 'Added strict MoSCoW enum validation (MUST, SHOULD, COULD), required falsifiable objectives, explicit MVP & Out-of-Scope boundaries, and structured risk mitigations.',
          addedFields: ['mvpScope', 'outOfScope', 'successMetrics.currentBaseline', 'risks.mitigation'],
          deprecatedFields: [],
          breakingConstraints: ['falsifiableObjectiveValidator', 'MoSCoW priority enum']
        }
      }
    },
    {
      taskType: 'USER_STORIES',
      latestVersion: 2,
      supportedVersions: [1, 2],
      versionDetails: {
        1: {
          version: 1,
          description: 'Legacy User Story Backlog',
          changelog: 'Initial user story generation format.',
          addedFields: [],
          deprecatedFields: [],
          breakingConstraints: []
        },
        2: {
          version: 2,
          description: 'RICE-Prioritized Agile User Stories',
          changelog: 'Enforced numerical bounds for reach, impact, confidence, and effort, plus mandatory estimation justification.',
          addedFields: ['reach', 'impact', 'confidence', 'effort', 'estimationJustification'],
          deprecatedFields: [],
          breakingConstraints: ['estimationJustification minimum 10 characters']
        }
      }
    },
    {
      taskType: 'ROADMAP',
      latestVersion: 2,
      supportedVersions: [1, 2],
      versionDetails: {
        1: {
          version: 1,
          description: 'Legacy Milestone Roadmap',
          changelog: 'High-level phase themes and milestones.',
          addedFields: [],
          deprecatedFields: [],
          breakingConstraints: []
        },
        2: {
          version: 2,
          description: 'Quarterly Horizon Execution Roadmap',
          changelog: 'Enforced quarter deliverables, dependencies, and strategic alignment.',
          addedFields: ['quarterHorizons', 'phases.dependencies'],
          deprecatedFields: [],
          breakingConstraints: ['Strict deliverables array']
        }
      }
    },
    {
      taskType: 'FEATURES',
      latestVersion: 2,
      supportedVersions: [1, 2],
      versionDetails: {
        1: {
          version: 1,
          description: 'Legacy Feature List',
          changelog: 'Baseline feature requirements.',
          addedFields: [],
          deprecatedFields: [],
          breakingConstraints: []
        },
        2: {
          version: 2,
          description: 'Engineering-Grade Feature Specifications',
          changelog: 'Enforced complexity enums (LOW, MEDIUM, HIGH), user value propositions, and technical edge cases.',
          addedFields: ['userValueProposition', 'coreRequirements.edgeCases', 'coreRequirements.complexity'],
          deprecatedFields: [],
          breakingConstraints: ['complexity enum']
        }
      }
    }
  ];
}
