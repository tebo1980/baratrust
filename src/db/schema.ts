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