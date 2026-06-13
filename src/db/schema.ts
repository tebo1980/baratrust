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
  businessId: integer('business_id').references(() => businesses.id), // FIXED: Now integer instead of serial!
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
  tradeSector: text('trade_sector'),
  prospectContact: text('prospect_contact'),
  geographicMetadata: text('geographic_metadata'),
  status: text('status').default('Inbound Intercepts'),
  createdAt: timestamp('created_at').defaultNow(),
  source: text('source').unique(), // ADDED UNIQUE to source URL
  originalText: text('original_text'),
  draftReply: text('draft_reply'),
});

export const partsOrders = pgTable('parts_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  requiredMaterials: jsonb('required_materials').$type<string[]>().notNull().default([]),
  supplierName: text('supplier_name'),
  quotedPrice: integer('quoted_price').default(0),
  status: text('status').notNull().default('Sourcing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- ORIGINAL SELF-PROSPECTING LEADS TABLE (DO NOT DELETE) ---
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

export const agentActions = pgTable('agent_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: text('agent_id').notNull(),
  referenceId: uuid('reference_id'),
  actionType: text('action_type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- FLYNN / FLEET MANAGEMENT ---
export const fleetVehicles = pgTable('fleet_vehicles', {
  id: serial('id').primaryKey(),
  truckIdentifier: text('truck_identifier').notNull().unique(), // e.g., 'Truck #1 - HVAC Response'
  assignedTechnician: text('assigned_technician'),
  currentOdometer: integer('current_odometer').notNull().default(0),
  status: text('status').default('Available'), // Available, Dispatched, Maintenance
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mileageLogs = pgTable('mileage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  vehicleId: integer('vehicle_id').references(() => fleetVehicles.id).notNull(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  tripRoute: text('trip_route'), // Start/End coordinate paths or regional string
  estimatedMileage: integer('estimated_mileage').default(0),
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
});

// --- COLE / FINANCIAL ANALYTICS ---
export const cogsLedger = pgTable('cogs_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  totalRevenue: integer('total_revenue').notNull().default(0),
  materialCost: integer('material_cost').notNull().default(0),
  laborCost: integer('labor_cost').notNull().default(0),
  netProfitMargin: text('net_profit_margin').notNull(),
  marginAlert: boolean('margin_alert').default(false),
  analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
});

// --- WAREHOUSE INVENTORY ---
export const warehouseInventory = pgTable('warehouse_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  partNumber: text('part_number').notNull().unique(), // Unique SKU
  partName: text('part_name').notNull(), // e.g., 'Universal Dual Run Capacitor'
  category: text('category').notNull(), // e.g., 'HVAC', 'Plumbing', 'Electrical'
  stockQuantity: integer('stock_quantity').notNull().default(0), // Current count
  reorderThreshold: integer('reorder_threshold').notNull().default(5), // Trigger for external order
  unitCost: integer('unit_cost').notNull().default(0), // Wholesale value in cents
  lastRestocked: timestamp('last_restocked').defaultNow().notNull(),
});

// --- WALLET TELEMETRY (LLM CREDITS) ---
export const walletBalances = pgTable('wallet_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  balanceCents: integer('balance_cents').notNull().default(0), // Total available LLM proxy credits
  status: text('status').notNull().default('Active'), // 'Active', 'Low Fuel'
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  amountCents: integer('amount_cents').notNull(), // Amount injected or consumed
  type: text('type').notNull(), // 'Credit' | 'Debit'
  description: text('description').notNull(), // e.g., 'Auto-Refuel Injection'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});