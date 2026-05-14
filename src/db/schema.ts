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

export const grants = pgTable('grants', {
  id: serial('id').primaryKey(),
  state: text('state').notNull(),
  trade: text('trade'),
  amount: text('amount'), // Store as text or decimal for currency
  status: text('status'),
});

export const bids = pgTable('bids', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  status: text('status').notNull(), // e.g., 'presented'
  laborCost: integer('labor_cost').notNull().default(0), // stored in cents
  equipmentCost: integer('equipment_cost').notNull().default(0), // stored in cents
  materialsCost: integer('materials_cost').notNull().default(0), // stored in cents
  grantMoneyFound: integer('grant_money_found').notNull().default(0), // stored in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  status: text('status').notNull(), // e.g., 'captured'
  amountCaptured: integer('amount_captured').notNull().default(0), // stored in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
});