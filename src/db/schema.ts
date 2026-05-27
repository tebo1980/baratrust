import { pgTable, serial, text, timestamp, varchar, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  ownerName: text('owner_name').notNull(),
  businessName: text('business_name').notNull(),
  industry: text('industry'),
  region: text('region').default('Louisville/New Albany'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const agentConfigs = pgTable('agent_configs', {
  id: serial('id').primaryKey(),
  businessId: serial('business_id').references(() => businesses.id),
  agentName: text('agent_name').notNull(),
  isActive: text('is_active').default('true'),
  configuration: text('configuration'),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: text('business_id'),
  name: text('name').notNull(),
  address: text('address'),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
});

export const grants = pgTable('grants', {
  id: serial('id').primaryKey(),
  state: text('state').notNull(),
  trade: text('trade'),
  amount: text('amount'),
  status: text('status'),
});

export const bids = pgTable('bids', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  status: text('status').notNull(),
  laborCost: integer('labor_cost').notNull().default(0),
  equipmentCost: integer('equipment_cost').notNull().default(0),
  materialsCost: integer('materials_cost').notNull().default(0),
  grantMoneyFound: integer('grant_money_found').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  status: text('status').notNull(),
  amountCaptured: integer('amount_captured').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- MARINER / FETCH MEMORY BANK ---
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  title: text('title'),
  price: text('price'),
  summary: text('summary'),
  city: text('city'),
  status: text('status').default('new'),
  createdAt: timestamp('created_at').defaultNow(),
  source: text('source').unique(),
  originalText: text('original_text'),
  draftReply: text('draft_reply'),
});

// --- ORIGINAL SELF-PROSPECTING LEADS TABLE ---
export const selfProspectingLeads = pgTable('self_prospecting_leads', {
  id: serial('id').primaryKey(),
  sourceUrl: text('source_url').notNull().unique(),
  sourcePlatform: text('source_platform'),
  subreddit: text('subreddit'),
  author: text('author'),
  postExcerpt: text('post_excerpt'),
  postFullText: text('post_full_text'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  intentScore: integer('intent_score').notNull().default(0),
  intentTier: text('intent_tier'),
  specificity: integer('specificity').notNull().default(0),
  locationMatch: integer('location_match').notNull().default(0),
  recency: integer('recency').notNull().default(0),
  budgetSignals: integer('budget_signals').notNull().default(0),
  totalScore: integer('total_score').notNull().default(0),
  matchedKeywords: jsonb('matched_keywords').default('[]'),
  draftedMessage: text('drafted_message'),
  noMentionMode: boolean('no_mention_mode').default(false),
  subredditNote: text('subreddit_note'),
  status: text('status').notNull().default('new'),
  notes: text('notes'),
  contractorSlug: text('contractor_slug'),
  contractorName: text('contractor_name'),
  conversionValueMonthly: integer('conversion_value_monthly'),
  foundAt: timestamp('found_at', { withTimezone: true }).defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  discardedAt: timestamp('discarded_at', { withTimezone: true }),
});
