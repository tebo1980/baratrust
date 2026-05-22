import { pgTable, serial, text, timestamp, varchar, uuid, integer } from 'drizzle-orm/pg-core';

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
  projectId: uuid('project_id').notNull(), // Foreign key to your existing projects table

  // Brix's Calculations (Stored in cents to avoid decimal math errors)
  laborCost: integer('labor_cost').notNull(),
  equipmentCost: integer('equipment_cost').notNull(),
  materialsCost: integer('materials_cost').notNull(),

  // Brix's Grant Discoveries
  grantMoneyFound: integer('grant_money_found').default(0),

  // State Tracking
  status: text('status').default('draft'), // 'draft', 'presented', 'won', 'lost'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  bidId: uuid('bid_id').notNull(), // Ties the payment directly to Brix's winning bid

  // Atlas's Stripe Integration
  stripePaymentIntentId: text('stripe_payment_intent_id'),

  // Financial State
  amountAuthorized: integer('amount_authorized').notNull(),
  amountCaptured: integer('amount_captured').default(0),

  // State Tracking
  status: text('status').default('pending_authorization'), // 'authorized', 'captured', 'refunded'
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- MARINER / FETCH MEMORY BANK ---
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  title: text('title').unique(),
  price: text('price'),
  summary: text('summary'),
  city: text('city'),
  status: text('status').default('new'),
  createdAt: timestamp('created_at').defaultNow(),
  source: text('source'),
  originalText: text('original_text'),
  draftReply: text('draft_reply'),
});