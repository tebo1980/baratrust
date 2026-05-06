import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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