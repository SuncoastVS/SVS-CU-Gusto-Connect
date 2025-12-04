import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertConfigurationSchema, 
  insertMappingRuleSchema,
} from "@shared/schema";
import { z } from "zod";

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

  // Sync execution endpoint
  app.post("/api/sync/run", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey || !config?.gustoAccessToken) {
        return res.status(400).json({ 
          error: "Missing API credentials. Please configure ClickUp and Gusto connections." 
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
        try {
          const startTime = Date.now();
          const rules = await storage.getMappingRules();
          
          const mockRecordsProcessed = Math.floor(Math.random() * 30) + 10;
          const duration = `${Math.floor((Date.now() - startTime) / 1000)}s`;
          
          await storage.updateSyncLog(log.id, {
            status: "success",
            recordsProcessed: mockRecordsProcessed,
            duration,
            completedAt: new Date(),
          });
        } catch (error) {
          console.error("Sync job failed:", error);
          await storage.updateSyncLog(log.id, {
            status: "failed",
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
