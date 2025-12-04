import { 
  type User, 
  type InsertUser,
  type Configuration,
  type InsertConfiguration,
  type MappingRule,
  type InsertMappingRule,
  type SyncLog,
  type InsertSyncLog,
  users,
  configurations,
  mappingRules,
  syncLogs,
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
}

export const storage = new DatabaseStorage();
