import { 
  type User, 
  type InsertUser,
  type Configuration,
  type InsertConfiguration,
  type MappingRule,
  type InsertMappingRule,
  type SyncLog,
  type InsertSyncLog,
  type Team,
  type InsertTeam,
  type UserTeamMapping,
  type InsertUserTeamMapping,
  users,
  configurations,
  mappingRules,
  syncLogs,
  teams,
  userTeamMappings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getConfiguration(): Promise<Configuration | undefined>;
  upsertConfiguration(config: InsertConfiguration): Promise<Configuration>;
  
  getMappingRules(): Promise<MappingRule[]>;
  createMappingRule(rule: InsertMappingRule): Promise<MappingRule>;
  deleteMappingRule(id: string): Promise<void>;
  
  getSyncLogs(limit?: number): Promise<SyncLog[]>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  updateSyncLog(id: string, updates: Partial<SyncLog>): Promise<SyncLog>;
  
  getTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  
  getUserTeamMappings(): Promise<UserTeamMapping[]>;
  upsertUserTeamMapping(mapping: InsertUserTeamMapping): Promise<UserTeamMapping>;
  getUserTeamMapping(clickupUserId: number): Promise<UserTeamMapping | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getConfiguration(): Promise<Configuration | undefined> {
    const [config] = await db.select().from(configurations).limit(1);
    return config || undefined;
  }

  async upsertConfiguration(config: InsertConfiguration): Promise<Configuration> {
    const existing = await this.getConfiguration();
    
    if (existing) {
      const [updated] = await db
        .update(configurations)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(configurations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(configurations)
        .values(config)
        .returning();
      return created;
    }
  }

  async getMappingRules(): Promise<MappingRule[]> {
    return db.select().from(mappingRules).orderBy(mappingRules.priority);
  }

  async createMappingRule(rule: InsertMappingRule): Promise<MappingRule> {
    const [created] = await db
      .insert(mappingRules)
      .values(rule)
      .returning();
    return created;
  }

  async deleteMappingRule(id: string): Promise<void> {
    await db.delete(mappingRules).where(eq(mappingRules.id, id));
  }

  async getSyncLogs(limit: number = 50): Promise<SyncLog[]> {
    return db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(limit);
  }

  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const [created] = await db
      .insert(syncLogs)
      .values(log)
      .returning();
    return created;
  }

  async updateSyncLog(id: string, updates: Partial<SyncLog>): Promise<SyncLog> {
    const [updated] = await db
      .update(syncLogs)
      .set(updates)
      .where(eq(syncLogs.id, id))
      .returning();
    return updated;
  }

  async getTeams(): Promise<Team[]> {
    return db.select().from(teams).orderBy(teams.name);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db
      .insert(teams)
      .values(team)
      .returning();
    return created;
  }

  async deleteTeam(id: string): Promise<void> {
    await db.update(userTeamMappings)
      .set({ teamId: null })
      .where(eq(userTeamMappings.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
  }

  async getUserTeamMappings(): Promise<UserTeamMapping[]> {
    return db.select().from(userTeamMappings).orderBy(userTeamMappings.clickupUsername);
  }

  async upsertUserTeamMapping(mapping: InsertUserTeamMapping): Promise<UserTeamMapping> {
    const existing = await this.getUserTeamMapping(mapping.clickupUserId);
    
    if (existing) {
      const [updated] = await db
        .update(userTeamMappings)
        .set({ ...mapping, updatedAt: new Date() })
        .where(eq(userTeamMappings.clickupUserId, mapping.clickupUserId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userTeamMappings)
        .values(mapping)
        .returning();
      return created;
    }
  }

  async getUserTeamMapping(clickupUserId: number): Promise<UserTeamMapping | undefined> {
    const [mapping] = await db.select().from(userTeamMappings).where(eq(userTeamMappings.clickupUserId, clickupUserId));
    return mapping || undefined;
  }
}

export const storage = new DatabaseStorage();
