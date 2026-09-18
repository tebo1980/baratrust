import { pgTable, serial, varchar, timestamp, integer, boolean, text, jsonb } from 'drizzle-orm/pg-core';

export const shieldProjects = pgTable('shield_projects', {
  id: serial('id').primaryKey(),
  clientDetails: text('client_details').notNull(),
  contractorRole: varchar('contractor_role', { length: 100 }).notNull(),
  projectType: varchar('project_type', { length: 100 }).notNull(),
  contractAmount: integer('contract_amount').notNull(),
  firstFurnishedDate: timestamp('first_furnished_date'),
  lastFurnishedDate: timestamp('last_furnished_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shieldStatutoryDeadlines = pgTable('shield_statutory_deadlines', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => shieldProjects.id).notNull(),
  statuteCode: varchar('statute_code', { length: 100 }).notNull(),
  noticeType: varchar('notice_type', { length: 255 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  trackingFlags: jsonb('tracking_flags').default('{}'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shieldSiteTelemetryProofs = pgTable('shield_site_telemetry_proofs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => shieldProjects.id).notNull(),
  gpsLat: varchar('gps_lat', { length: 50 }).notNull(),
  gpsLng: varchar('gps_lng', { length: 50 }).notNull(),
  accuracyMeters: integer('accuracy_meters'),
  photoVaultLink: text('photo_vault_link').notNull(),
  cryptographicTamperHash: text('cryptographic_tamper_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shieldArcPackets = pgTable('shield_arc_packets', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => shieldProjects.id).notNull(),
  hoaName: varchar('hoa_name', { length: 255 }).notNull(),
  tradeType: varchar('trade_type', { length: 100 }).notNull(),
  specSheetJson: jsonb('spec_sheet_json'),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  submittedAt: timestamp('submitted_at'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
