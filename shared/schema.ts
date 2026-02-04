import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const configurations = pgTable("configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clickupApiKey: text("clickup_api_key"),
  clickupTeamId: text("clickup_team_id"),
  gustoAccessToken: text("gusto_access_token"),
  gustoRefreshToken: text("gusto_refresh_token"),
  gustoTokenExpiresAt: timestamp("gusto_token_expires_at"),
  gustoCompanyId: text("gusto_company_id"),
  gustoCompanyName: text("gusto_company_name"),
  quickbooksConnected: boolean("quickbooks_connected").default(false),
  syncEnabled: boolean("sync_enabled").default(true),
  syncFrequency: text("sync_frequency").default("daily"),
  syncTime: text("sync_time").default("00:00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Configuration = typeof configurations.$inferSelect;

export const mappingRules = pgTable("mapping_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pattern: text("pattern").notNull(),
  matchType: text("match_type").notNull(),
  quickbooksJob: text("quickbooks_job").notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMappingRuleSchema = createInsertSchema(mappingRules).omit({
  id: true,
  createdAt: true,
});

export type InsertMappingRule = z.infer<typeof insertMappingRuleSchema>;
export type MappingRule = typeof mappingRules.$inferSelect;

export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull(),
  recordsProcessed: integer("records_processed").default(0),
  duration: text("duration"),
  message: text("message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
});

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const userTeamMappings = pgTable("user_team_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clickupUserId: integer("clickup_user_id").notNull().unique(),
  clickupUsername: text("clickup_username").notNull(),
  teamId: varchar("team_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserTeamMappingSchema = createInsertSchema(userTeamMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserTeamMapping = z.infer<typeof insertUserTeamMappingSchema>;
export type UserTeamMapping = typeof userTeamMappings.$inferSelect;

export const clickupGustoUserMappings = pgTable("clickup_gusto_user_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clickupUserId: integer("clickup_user_id").notNull().unique(),
  clickupUsername: text("clickup_username").notNull(),
  clickupEmail: text("clickup_email"),
  gustoEmployeeId: text("gusto_employee_id"),
  gustoEmployeeName: text("gusto_employee_name"),
  gustoEmployeeEmail: text("gusto_employee_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClickupGustoUserMappingSchema = createInsertSchema(clickupGustoUserMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClickupGustoUserMapping = z.infer<typeof insertClickupGustoUserMappingSchema>;
export type ClickupGustoUserMapping = typeof clickupGustoUserMappings.$inferSelect;

export const clickupGustoSpaceMappings = pgTable("clickup_gusto_space_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clickupSpaceId: text("clickup_space_id").notNull().unique(),
  clickupSpaceName: text("clickup_space_name").notNull(),
  gustoProjectId: text("gusto_project_id"),
  gustoProjectName: text("gusto_project_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClickupGustoSpaceMappingSchema = createInsertSchema(clickupGustoSpaceMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClickupGustoSpaceMapping = z.infer<typeof insertClickupGustoSpaceMappingSchema>;
export type ClickupGustoSpaceMapping = typeof clickupGustoSpaceMappings.$inferSelect;
