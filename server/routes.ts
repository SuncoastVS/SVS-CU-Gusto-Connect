import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertConfigurationSchema, 
  insertMappingRuleSchema,
} from "@shared/schema";
import { z } from "zod";
import { ClickUpService, matchTaskToRule, convertMillisecondsToHours } from "./services/clickup";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Configuration endpoints
  app.get("/api/configuration", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      res.json(config || {});
    } catch (error) {
      console.error("Error fetching configuration:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  app.post("/api/configuration", async (req, res) => {
    try {
      const validated = insertConfigurationSchema.parse(req.body);
      const config = await storage.upsertConfiguration(validated);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating configuration:", error);
        res.status(500).json({ error: "Failed to update configuration" });
      }
    }
  });

  // Mapping rules endpoints
  app.get("/api/mapping-rules", async (req, res) => {
    try {
      const rules = await storage.getMappingRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching mapping rules:", error);
      res.status(500).json({ error: "Failed to fetch mapping rules" });
    }
  });

  app.post("/api/mapping-rules", async (req, res) => {
    try {
      const validated = insertMappingRuleSchema.parse(req.body);
      const rule = await storage.createMappingRule(validated);
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating mapping rule:", error);
        res.status(500).json({ error: "Failed to create mapping rule" });
      }
    }
  });

  app.delete("/api/mapping-rules/:id", async (req, res) => {
    try {
      await storage.deleteMappingRule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting mapping rule:", error);
      res.status(500).json({ error: "Failed to delete mapping rule" });
    }
  });

  // Sync logs endpoints
  app.get("/api/sync-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getSyncLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  // ClickUp API endpoints
  app.post("/api/clickup/test", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey) {
        return res.status(400).json({ error: "ClickUp API key not configured" });
      }

      const clickup = new ClickUpService(config.clickupApiKey);
      const result = await clickup.testConnection();
      
      res.json(result);
    } catch (error) {
      console.error("ClickUp test failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Connection test failed" 
      });
    }
  });

  app.get("/api/clickup/teams", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey) {
        return res.status(400).json({ error: "ClickUp API key not configured" });
      }

      const clickup = new ClickUpService(config.clickupApiKey);
      const teams = await clickup.getTeams();
      
      res.json(teams);
    } catch (error) {
      console.error("Failed to fetch ClickUp teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/clickup/time-entries", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey || !config?.clickupTeamId) {
        return res.status(400).json({ error: "ClickUp not fully configured" });
      }

      const clickup = new ClickUpService(config.clickupApiKey);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const entries = await clickup.getTimeEntries(config.clickupTeamId, {
        startDate,
        endDate,
      });

      const formattedEntries = entries.map(entry => ({
        id: entry.id,
        taskName: entry.task?.name || "No task",
        taskId: entry.task?.id,
        user: entry.user?.username || "Unknown",
        email: entry.user?.email || "N/A",
        duration: convertMillisecondsToHours(entry.duration),
        description: entry.description || "",
        start: entry.start,
        end: entry.end,
        billable: entry.billable ?? false,
      }));

      res.json(formattedEntries);
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  // Sync execution endpoint
  app.post("/api/sync/run", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey) {
        return res.status(400).json({ 
          error: "ClickUp API key not configured. Go to Settings to add it." 
        });
      }

      if (!config?.clickupTeamId) {
        return res.status(400).json({ 
          error: "ClickUp Team ID not configured. Go to Settings to add it." 
        });
      }

      const log = await storage.createSyncLog({
        status: "running",
        startedAt: new Date(),
      });

      res.json({ 
        message: "Sync job started",
        logId: log.id 
      });

      setImmediate(async () => {
        const startTime = Date.now();
        try {
          const clickup = new ClickUpService(config.clickupApiKey!);
          const rules = await storage.getMappingRules();
          
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 3);

          console.log(`Fetching time entries from ${startDate.toISOString()} to ${endDate.toISOString()}`);
          
          const entries = await clickup.getTimeEntries(config.clickupTeamId!, {
            startDate,
            endDate,
          });

          console.log(`Found ${entries.length} time entries`);

          const processedEntries: {
            taskName: string;
            hours: number;
            matchedJob: string | null;
            user: string;
          }[] = [];

          for (const entry of entries) {
            const taskName = entry.task?.name || entry.description || "Untitled";
            const hours = convertMillisecondsToHours(entry.duration);
            const matchedJob = matchTaskToRule(taskName, rules);

            processedEntries.push({
              taskName,
              hours,
              matchedJob,
              user: entry.user.username,
            });
          }

          const matchedCount = processedEntries.filter(e => e.matchedJob !== null).length;
          const unmatchedCount = processedEntries.length - matchedCount;

          const duration = `${Math.floor((Date.now() - startTime) / 1000)}s`;
          
          let status = "success";
          let message = `Processed ${entries.length} entries. ${matchedCount} matched, ${unmatchedCount} unmatched.`;
          
          if (unmatchedCount > 0 && matchedCount > 0) {
            status = "warning";
            message = `${unmatchedCount} entries had no matching rules`;
          } else if (entries.length === 0) {
            message = "No time entries found in the last 3 days";
          }

          await storage.updateSyncLog(log.id, {
            status,
            recordsProcessed: entries.length,
            duration,
            message,
            completedAt: new Date(),
          });

          console.log("Sync completed:", message);
        } catch (error) {
          console.error("Sync job failed:", error);
          const duration = `${Math.floor((Date.now() - startTime) / 1000)}s`;
          await storage.updateSyncLog(log.id, {
            status: "failed",
            duration,
            message: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          });
        }
      });

    } catch (error) {
      console.error("Error starting sync:", error);
      res.status(500).json({ error: "Failed to start sync" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
