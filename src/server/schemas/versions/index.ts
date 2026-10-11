import { z } from 'zod';
import { PrdSchemaV1, UserStoriesSchemaV1, RoadmapSchemaV1, FeaturesSchemaV1 } from './v1.js';
import { PrdSchemaV2, UserStoriesSchemaV2, RoadmapSchemaV2, FeaturesSchemaV2 } from './v2.js';

export * from './types.js';
export * from './v1.js';
export * from './v2.js';
export * from './migrators.js';
export * from './registry.js';

/**
 * Backwards-compatible union schemas that accept EITHER v2 (modern) OR v1 (legacy)
 * without requiring upfront schema migration.
 */
export const PrdSchemaAnyVersion = z.union([PrdSchemaV2, PrdSchemaV1]);
export const UserStoriesSchemaAnyVersion = z.union([UserStoriesSchemaV2, UserStoriesSchemaV1]);
export const RoadmapSchemaAnyVersion = z.union([RoadmapSchemaV2, RoadmapSchemaV1]);
export const FeaturesSchemaAnyVersion = z.union([FeaturesSchemaV2, FeaturesSchemaV1]);
