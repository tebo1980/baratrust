import { pgTable, serial, text, timestamp, varchar, uuid, integer } from 'drizzle-orm/pg-core';

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(), // Links to Clerk
  ownerName: text('owner_name').notNull(),
  businessName: text('business_name').notNull(),
  industry: text('industry'), // e.g., Plumbing, HVAC, Electrical
  region: text('region').default('Louisville/New Albany'), // Local context
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// This will store the settings for your 12 AI agents
export const agentConfigs = pgTable('agent_configs', {
  id: serial('id').primaryKey(),
  businessId: serial('business_id').references(() => businesses.id),
  agentName: text('agent_name').notNull(), 
  isActive: text('is_active').default('true'),
  configuration: text('configuration'), // JSON string of agent-specific settings
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
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
});

// 1. Brix's Domain: The Bidding & Estimate Table
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

// 2. Atlas's Domain: The Financial Gateway Table
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

// 3. Nova's Domain: The Inbound Leads Table
export const inbound_leads = pgTable('inbound_leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source'),
  jobScope: text('job_scope'),
  estimatedPay: integer('estimated_pay'),
  region: text('region'),
  sourceUrl: text('source_url'),
  status: text('status').default('new'),
});