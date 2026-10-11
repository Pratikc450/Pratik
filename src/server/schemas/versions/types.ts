import { z } from 'zod';

export type SchemaVersion = 1 | 2 | 3;

export interface ArtifactSchemaDefinition {
  taskType: string;
  version: SchemaVersion;
  description: string;
  schema: z.ZodTypeAny;
  changelog?: string;
  isLatest?: boolean;
  isDeprecated?: boolean;
}

export interface VersionValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  detectedVersion: SchemaVersion;
  targetVersion: SchemaVersion;
  migrated: boolean;
  issues?: Array<{
    path: string;
    message: string;
    code: string;
  }>;
}

export interface SchemaVersionMetadata {
  taskType: string;
  latestVersion: SchemaVersion;
  supportedVersions: SchemaVersion[];
  versionDetails: Record<number, {
    version: SchemaVersion;
    description: string;
    changelog: string;
    addedFields: string[];
    deprecatedFields: string[];
    breakingConstraints: string[];
  }>;
}
