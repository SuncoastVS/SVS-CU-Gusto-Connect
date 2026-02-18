import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertConfigurationSchema, 
  insertMappingRuleSchema,
  insertTeamSchema,
  insertUserTeamMappingSchema,
  insertClickupGustoUserMappingSchema,
  insertClickupGustoSpaceMappingSchema,
} from "@shared/schema";
import { z } from "zod";
import { ClickUpService, matchTaskToRule, convertMillisecondsToHours } from "./services/clickup";
import { GustoService } from "./services/gusto";

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

  // Teams endpoints
  app.get("/api/teams", async (req, res) => {
    try {
      const teamsList = await storage.getTeams();
      res.json(teamsList);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const validated = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validated);
      res.json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating team:", error);
        res.status(500).json({ error: "Failed to create team" });
      }
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // User-Team mapping endpoints
  app.get("/api/user-team-mappings", async (req, res) => {
    try {
      const mappings = await storage.getUserTeamMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching user-team mappings:", error);
      res.status(500).json({ error: "Failed to fetch user-team mappings" });
    }
  });

  app.post("/api/user-team-mappings", async (req, res) => {
    try {
      const validated = insertUserTeamMappingSchema.parse(req.body);
      const mapping = await storage.upsertUserTeamMapping(validated);
      res.json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating user-team mapping:", error);
        res.status(500).json({ error: "Failed to update user-team mapping" });
      }
    }
  });

  // Get ClickUp users for mapping
  app.get("/api/clickup/users", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey || !config?.clickupTeamId) {
        return res.status(400).json({ error: "ClickUp not fully configured" });
      }

      const clickup = new ClickUpService(config.clickupApiKey);
      const members = await clickup.getTeamMembers(config.clickupTeamId);
      
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch ClickUp users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
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
      
      let startDate: Date;
      let endDate: Date;
      
      if (req.query.startDate && req.query.endDate) {
        const startTs = parseInt(req.query.startDate as string);
        const endTs = parseInt(req.query.endDate as string);
        
        if (isNaN(startTs) || isNaN(endTs)) {
          return res.status(400).json({ error: "Invalid date parameters" });
        }
        
        startDate = new Date(startTs);
        endDate = new Date(endTs);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid date values" });
        }
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      }

      const entries = await clickup.getTimeEntriesWithFolders(config.clickupTeamId, {
        startDate,
        endDate,
      });

      const userMappings = await storage.getUserTeamMappings();
      const teamsList = await storage.getTeams();
      
      const userTeamMap = new Map<number, string>();
      for (const mapping of userMappings) {
        if (mapping.teamId) {
          const team = teamsList.find(t => t.id === mapping.teamId);
          if (team) {
            userTeamMap.set(mapping.clickupUserId, team.name);
          }
        }
      }

      const formattedEntries = entries.map(entry => ({
        id: entry.id,
        folderName: entry.folderName,
        spaceName: entry.spaceName,
        teamName: entry.user?.id ? (userTeamMap.get(entry.user.id) || "No Team") : "No Team",
        taskName: entry.task?.name || "No task",
        taskId: entry.task?.id,
        user: entry.user?.username || "Unknown",
        userEmail: entry.user?.email || "",
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
              user: entry.user?.username || "Unknown",
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

  // Gusto API endpoints
  const createGustoService = async () => {
    const config = await storage.getConfiguration();
    if (!config?.gustoAccessToken) {
      return { gusto: null, config };
    }
    const gusto = new GustoService({
      accessToken: config.gustoAccessToken,
      useDemo: true,
    });
    return { gusto, config };
  };

  app.post("/api/gusto/test", async (req, res) => {
    try {
      const { gusto, config } = await createGustoService();

      if (!gusto) {
        return res.status(400).json({ error: "Gusto access token is required. Enter it in Settings." });
      }

      const tokenInfo = await gusto.getTokenInfo();

      let companyName: string | null = null;
      if (config?.gustoCompanyId) {
        try {
          const company = await gusto.getCompany(config.gustoCompanyId);
          companyName = company.name;
        } catch (e) {
          // Company ID might be invalid, but token is valid
        }
      }

      res.json({
        success: true,
        scope: tokenInfo.scope,
        companyUuid: tokenInfo.resource?.uuid,
        companyName,
      });
    } catch (error) {
      console.error("Gusto test connection failed:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Connection test failed" });
    }
  });

  app.get("/api/gusto/employees", async (req, res) => {
    try {
      const { gusto, config } = await createGustoService();

      if (!gusto || !config?.gustoCompanyId) {
        return res.status(400).json({ error: "Gusto not connected. Enter Access Token and Company ID in Settings." });
      }

      const [employees, contractors] = await Promise.all([
        gusto.getEmployees(config.gustoCompanyId),
        gusto.getContractors(config.gustoCompanyId),
      ]);
      
      const formattedEmployees = employees.map(emp => ({
        uuid: emp.uuid,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        jobUuid: emp.jobs?.[0]?.uuid || null,
        jobTitle: emp.jobs?.[0]?.title || null,
        type: "Employee" as const,
      }));

      const formattedContractors = contractors.map(contractor => ({
        uuid: contractor.uuid,
        name: `${contractor.first_name} ${contractor.last_name}`,
        email: contractor.email,
        jobUuid: null,
        jobTitle: "Contractor",
        type: "Contractor" as const,
      }));

      const allPeople = [...formattedEmployees, ...formattedContractors].sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      res.json(allPeople);
    } catch (error) {
      console.error("Failed to fetch Gusto employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/gusto/sync-time", async (req, res) => {
    try {
      const { gusto, config } = await createGustoService();

      if (!gusto || !config?.gustoCompanyId) {
        return res.status(400).json({ error: "Gusto not connected" });
      }

      const { entries } = req.body;

      if (!entries || !Array.isArray(entries)) {
        return res.status(400).json({ error: "Invalid entries data" });
      }

      const results = await gusto.createTimeSheetsForEntries(
        config.gustoCompanyId,
        entries
      );

      res.json(results);
    } catch (error) {
      console.error("Failed to sync time to Gusto:", error);
      res.status(500).json({ error: "Failed to sync time entries" });
    }
  });

  app.get("/api/gusto/projects", async (req, res) => {
    try {
      const { gusto, config } = await createGustoService();

      if (!gusto || !config?.gustoCompanyId) {
        return res.status(400).json({ error: "Gusto not connected" });
      }

      const projects = await gusto.getProjects(config.gustoCompanyId);
      res.json(projects);
    } catch (error) {
      console.error("Failed to fetch Gusto projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/clickup/spaces", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config?.clickupApiKey || !config?.clickupTeamId) {
        return res.status(400).json({ error: "ClickUp not fully configured" });
      }

      const clickup = new ClickUpService(config.clickupApiKey);
      await clickup.loadSpacesForTeam(config.clickupTeamId);
      
      const response = await clickup.getSpaces(config.clickupTeamId);
      res.json(response);
    } catch (error) {
      console.error("Failed to fetch ClickUp spaces:", error);
      res.status(500).json({ error: "Failed to fetch spaces" });
    }
  });

  app.get("/api/mappings/users", async (req, res) => {
    try {
      const mappings = await storage.getClickupGustoUserMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Failed to fetch user mappings:", error);
      res.status(500).json({ error: "Failed to fetch user mappings" });
    }
  });

  app.post("/api/mappings/users", async (req, res) => {
    try {
      const validated = insertClickupGustoUserMappingSchema.parse(req.body);
      const mapping = await storage.upsertClickupGustoUserMapping(validated);
      res.json(mapping);
    } catch (error) {
      console.error("Failed to save user mapping:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mapping data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save user mapping" });
    }
  });

  app.get("/api/mappings/spaces", async (req, res) => {
    try {
      const mappings = await storage.getClickupGustoSpaceMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Failed to fetch space mappings:", error);
      res.status(500).json({ error: "Failed to fetch space mappings" });
    }
  });

  app.post("/api/mappings/spaces", async (req, res) => {
    try {
      const validated = insertClickupGustoSpaceMappingSchema.parse(req.body);
      const mapping = await storage.upsertClickupGustoSpaceMapping(validated);
      res.json(mapping);
    } catch (error) {
      console.error("Failed to save space mapping:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mapping data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save space mapping" });
    }
  });

  return httpServer;
}
