import type { Configuration, MappingRule, SyncLog } from "@shared/schema";

const API_BASE = "/api";

export async function fetchConfiguration(): Promise<Configuration | null> {
  const res = await fetch(`${API_BASE}/configuration`);
  if (!res.ok) throw new Error("Failed to fetch configuration");
  const data = await res.json();
  return Object.keys(data).length === 0 ? null : data;
}

export async function updateConfiguration(config: Partial<Configuration>): Promise<Configuration> {
  const res = await fetch(`${API_BASE}/configuration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update configuration");
  return res.json();
}

export async function fetchMappingRules(): Promise<MappingRule[]> {
  const res = await fetch(`${API_BASE}/mapping-rules`);
  if (!res.ok) throw new Error("Failed to fetch mapping rules");
  return res.json();
}

export async function createMappingRule(rule: Omit<MappingRule, "id" | "createdAt">): Promise<MappingRule> {
  const res = await fetch(`${API_BASE}/mapping-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error("Failed to create mapping rule");
  return res.json();
}

export async function deleteMappingRule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/mapping-rules/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete mapping rule");
}

export async function fetchSyncLogs(limit?: number): Promise<SyncLog[]> {
  const url = limit ? `${API_BASE}/sync-logs?limit=${limit}` : `${API_BASE}/sync-logs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch sync logs");
  return res.json();
}

export async function runSync(): Promise<{ message: string; logId: string }> {
  const res = await fetch(`${API_BASE}/sync/run`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to run sync");
  }
  return res.json();
}

export interface ClickUpTeam {
  id: string;
  name: string;
}

export interface ClickUpTimeEntry {
  id: string;
  taskName: string;
  taskId?: string;
  user: string;
  email: string;
  duration: number;
  description: string;
  start: string;
  end: string;
  billable: boolean;
}

export async function testClickUpConnection(): Promise<{ success: boolean; teams: ClickUpTeam[] }> {
  const res = await fetch(`${API_BASE}/clickup/test`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Connection test failed");
  }
  return res.json();
}

export async function fetchClickUpTeams(): Promise<ClickUpTeam[]> {
  const res = await fetch(`${API_BASE}/clickup/teams`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch teams");
  }
  return res.json();
}

export async function fetchClickUpTimeEntries(): Promise<ClickUpTimeEntry[]> {
  const res = await fetch(`${API_BASE}/clickup/time-entries`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch time entries");
  }
  return res.json();
}
