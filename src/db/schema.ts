import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (identifying Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  role: text('role').default('Product Lead'),
  createdAt: timestamp('created_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
});

// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  targetAudience: text('target_audience'),
  userUid: text('user_uid').references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Stories table
export const userStories = pgTable('user_stories', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  asA: text('as_a').notNull(),
  iWant: text('i_want').notNull(),
  soThat: text('so_that'),
  persona: text('persona'),
  priority: text('priority').default('P1'),
  status: text('status').default('BACKLOG'),
  reach: integer('reach').default(1000),
  impact: integer('impact').default(2),
  confidence: text('confidence').default('0.8'),
  effort: text('effort').default('2'),
  riceScore: integer('rice_score').default(1000),
  acceptanceCriteria: text('acceptance_criteria'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Personas table
export const personas = pgTable('personas', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  name: text('name').notNull(),
  role: text('role').notNull(),
  goal: text('goal'),
  painPoint: text('pain_point'),
  painPoints: text('pain_points'),
  techComfort: text('tech_comfort').default('Medium'),
  technicalLiteracy: text('technical_literacy'),
  demographics: text('demographics'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Trail Events table
export const auditTrailEvents = pgTable('audit_trail_events', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  action: text('action').notNull(),
  userId: text('user_id').notNull(),
  details: text('details').notNull(),
  category: text('category').default('WORKSPACE_ACTION'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Table relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  owner: one(users, {
    fields: [products.userUid],
    references: [users.uid],
  }),
  stories: many(userStories),
  personas: many(personas),
  auditEvents: many(auditTrailEvents),
}));

export const userStoriesRelations = relations(userStories, ({ one }) => ({
  product: one(products, {
    fields: [userStories.productId],
    references: [products.id],
  }),
}));

export const personasRelations = relations(personas, ({ one }) => ({
  product: one(products, {
    fields: [personas.productId],
    references: [products.id],
  }),
}));

export const auditTrailEventsRelations = relations(auditTrailEvents, ({ one }) => ({
  product: one(products, {
    fields: [auditTrailEvents.productId],
    references: [products.id],
  }),
}));
