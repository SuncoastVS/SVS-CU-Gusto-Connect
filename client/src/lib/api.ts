import type { Configuration, SyncLog, Team, UserTeamMapping, ClickupGustoUserMapping, ClickupGustoSpaceMapping } from "@shared/schema";

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
  folderName: string;
  spaceName: string;
  teamName: string;
  taskName: string;
  taskId?: string;
  user: string;
  userEmail: string;
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

export async function fetchClickUpTimeEntries(startDate?: Date, endDate?: Date): Promise<ClickUpTimeEntry[]> {
  let url = `${API_BASE}/clickup/time-entries`;
  if (startDate && endDate) {
    const params = new URLSearchParams({
      startDate: startDate.getTime().toString(),
      endDate: endDate.getTime().toString(),
    });
    url += `?${params.toString()}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch time entries");
  }
  return res.json();
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
}

export async function fetchClickUpUsers(): Promise<ClickUpUser[]> {
  const res = await fetch(`${API_BASE}/clickup/users`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch users");
  }
  return res.json();
}

export async function fetchTeams(): Promise<Team[]> {
  const res = await fetch(`${API_BASE}/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export async function createTeam(name: string): Promise<Team> {
  const res = await fetch(`${API_BASE}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create team");
  }
  return res.json();
}

export async function deleteTeam(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/teams/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete team");
}

export async function fetchUserTeamMappings(): Promise<UserTeamMapping[]> {
  const res = await fetch(`${API_BASE}/user-team-mappings`);
  if (!res.ok) throw new Error("Failed to fetch user-team mappings");
  return res.json();
}

export async function updateUserTeamMapping(
  clickupUserId: number,
  clickupUsername: string,
  teamId: string | null
): Promise<UserTeamMapping> {
  const res = await fetch(`${API_BASE}/user-team-mappings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clickupUserId, clickupUsername, teamId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update user-team mapping");
  }
  return res.json();
}

export async function getGustoAuthUrl(): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/gusto/auth-url`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to get auth URL");
  }
  return res.json();
}

export async function disconnectGusto(): Promise<void> {
  const res = await fetch(`${API_BASE}/gusto/disconnect`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to disconnect");
  }
}

export interface GustoEmployee {
  uuid: string;
  name: string;
  email: string;
  jobUuid: string | null;
  jobTitle: string | null;
}

export async function fetchGustoEmployees(): Promise<GustoEmployee[]> {
  const res = await fetch(`${API_BASE}/gusto/employees`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch employees");
  }
  return res.json();
}

export interface GustoSyncResult {
  success: number;
  failed: number;
  errors: string[];
}

export async function syncTimeToGusto(entries: Array<{
  employeeUuid: string;
  jobUuid: string;
  hours: number;
  date: Date;
  description?: string;
}>): Promise<GustoSyncResult> {
  const res = await fetch(`${API_BASE}/gusto/sync-time`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to sync time");
  }
  return res.json();
}

export interface GustoProject {
  uuid: string;
  name: string;
  active: boolean;
}

export async function fetchGustoProjects(): Promise<GustoProject[]> {
  const res = await fetch(`${API_BASE}/gusto/projects`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch projects");
  }
  return res.json();
}

export interface ClickUpSpace {
  id: string;
  name: string;
}

export async function fetchClickUpSpaces(): Promise<ClickUpSpace[]> {
  const res = await fetch(`${API_BASE}/clickup/spaces`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch spaces");
  }
  return res.json();
}

export async function fetchClickupGustoUserMappings(): Promise<ClickupGustoUserMapping[]> {
  const res = await fetch(`${API_BASE}/mappings/users`);
  if (!res.ok) throw new Error("Failed to fetch user mappings");
  return res.json();
}

export async function saveClickupGustoUserMapping(mapping: {
  clickupUserId: number;
  clickupUsername: string;
  clickupEmail?: string | null;
  gustoEmployeeId?: string | null;
  gustoEmployeeName?: string | null;
  gustoEmployeeEmail?: string | null;
}): Promise<ClickupGustoUserMapping> {
  const res = await fetch(`${API_BASE}/mappings/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapping),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to save user mapping");
  }
  return res.json();
}

export async function fetchClickupGustoSpaceMappings(): Promise<ClickupGustoSpaceMapping[]> {
  const res = await fetch(`${API_BASE}/mappings/spaces`);
  if (!res.ok) throw new Error("Failed to fetch space mappings");
  return res.json();
}

export async function saveClickupGustoSpaceMapping(mapping: {
  clickupSpaceId: string;
  clickupSpaceName: string;
  gustoProjectId?: string | null;
  gustoProjectName?: string | null;
}): Promise<ClickupGustoSpaceMapping> {
  const res = await fetch(`${API_BASE}/mappings/spaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapping),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to save space mapping");
  }
  return res.json();
}
