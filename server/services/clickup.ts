const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export interface ClickUpTaskLocation {
  list_id: string;
  folder_id: string;
  space_id: string;
}

export interface ClickUpTimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    status: { status: string };
  } | null;
  wid: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
  billable: boolean;
  start: string;
  end: string;
  duration: string;
  description: string;
  tags: { name: string }[];
  source: string;
  at: string;
  task_location?: ClickUpTaskLocation;
}

export interface ClickUpTimeEntriesResponse {
  data: ClickUpTimeEntry[];
}

export interface ClickUpTeam {
  id: string;
  name: string;
}

export interface ClickUpTeamsResponse {
  teams: ClickUpTeam[];
}

export interface ClickUpFolder {
  id: string;
  name: string;
}

export interface ClickUpFoldersResponse {
  folders: ClickUpFolder[];
}

export interface ClickUpGroup {
  id: string;
  name: string;
  members: { id: number; username: string; email?: string }[];
}

export interface ClickUpGroupsResponse {
  groups: ClickUpGroup[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
}

export interface ClickUpSpacesResponse {
  spaces: ClickUpSpace[];
}

export class ClickUpService {
  private apiKey: string;
  private folderCache: Map<string, string> = new Map();
  private spaceCache: Map<string, string> = new Map();
  private spaceCacheTeamId: string | null = null;
  private userTeamCache: Map<number, string> = new Map();
  private userTeamCacheTeamId: string | null = null;
  
  private static EXCLUDED_TEAMS = ["Exec Management", "SuncoastVS"];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${CLICKUP_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ClickUp API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getTeams(): Promise<ClickUpTeam[]> {
    const response = await this.request<ClickUpTeamsResponse>("/team");
    return response.teams;
  }

  async getTeamMembers(teamId: string): Promise<{ id: number; username: string; email: string }[]> {
    const response = await this.request<ClickUpTeamsResponse>("/team");
    const team = response.teams.find(t => t.id === teamId);
    if (!team) return [];
    
    const members: { id: number; username: string; email: string }[] = [];
    if ((team as any).members) {
      for (const member of (team as any).members) {
        if (member.user) {
          members.push({
            id: member.user.id,
            username: member.user.username,
            email: member.user.email || "",
          });
        }
      }
    }
    return members;
  }

  async getUserGroups(teamId: string): Promise<ClickUpGroup[]> {
    try {
      const response = await this.request<ClickUpGroupsResponse>(`/team/${teamId}/group`);
      return response.groups || [];
    } catch (error) {
      console.log(`Could not fetch user groups: ${error}`);
      return [];
    }
  }

  async loadUserTeamMapping(teamId: string): Promise<void> {
    if (this.userTeamCache.size > 0 && this.userTeamCacheTeamId === teamId) {
      return;
    }
    if (this.userTeamCacheTeamId !== teamId) {
      this.userTeamCache.clear();
      this.userTeamCacheTeamId = teamId;
    }

    const groups = await this.getUserGroups(teamId);
    
    const filteredGroups = groups.filter(
      group => !ClickUpService.EXCLUDED_TEAMS.includes(group.name)
    );

    for (const group of filteredGroups) {
      if (group.members) {
        for (const member of group.members) {
          if (!this.userTeamCache.has(member.id)) {
            this.userTeamCache.set(member.id, group.name);
          }
        }
      }
    }
  }

  getUserTeam(userId: number): string {
    return this.userTeamCache.get(userId) || "No Team";
  }

  async getFolderName(spaceId: string, folderId: string): Promise<string> {
    if (!folderId || folderId === "0") {
      return "No Folder";
    }

    const cacheKey = folderId;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    try {
      const response = await this.request<{ id: string; name: string }>(`/folder/${folderId}`);
      this.folderCache.set(cacheKey, response.name);
      return response.name;
    } catch (error) {
      console.log(`Could not fetch folder ${folderId}: ${error}`);
      return "Unknown Folder";
    }
  }

  async loadFoldersForSpace(spaceId: string): Promise<void> {
    try {
      const response = await this.request<ClickUpFoldersResponse>(`/space/${spaceId}/folder`);
      for (const folder of response.folders) {
        this.folderCache.set(folder.id, folder.name);
      }
    } catch (error) {
      console.log(`Could not load folders for space ${spaceId}: ${error}`);
    }
  }

  async loadSpacesForTeam(teamId: string): Promise<void> {
    if (this.spaceCache.size > 0 && this.spaceCacheTeamId === teamId) {
      return;
    }
    if (this.spaceCacheTeamId !== teamId) {
      this.spaceCache.clear();
      this.spaceCacheTeamId = teamId;
    }
    try {
      const response = await this.request<ClickUpSpacesResponse>(`/team/${teamId}/space`);
      for (const space of response.spaces) {
        this.spaceCache.set(space.id, space.name);
      }
    } catch (error) {
      console.log(`Could not load spaces for team ${teamId}: ${error}`);
    }
  }

  getSpaceName(spaceId: string): string {
    if (!spaceId || spaceId === "0") {
      return "No Space";
    }
    return this.spaceCache.get(spaceId) || "Unknown Space";
  }

  async getTimeEntries(
    teamId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      assignee?: string;
    } = {}
  ): Promise<ClickUpTimeEntry[]> {
    const params = new URLSearchParams();
    
    if (options.startDate) {
      params.append("start_date", options.startDate.getTime().toString());
    }
    if (options.endDate) {
      params.append("end_date", options.endDate.getTime().toString());
    }

    if (options.assignee) {
      params.append("assignee", options.assignee);
      const queryString = params.toString();
      const endpoint = `/team/${teamId}/time_entries${queryString ? `?${queryString}` : ""}`;
      const response = await this.request<ClickUpTimeEntriesResponse>(endpoint);
      return response.data || [];
    }

    const members = await this.getTeamMembers(teamId);
    const allEntries: ClickUpTimeEntry[] = [];
    
    for (const member of members) {
      try {
        const memberParams = new URLSearchParams(params);
        memberParams.append("assignee", member.id.toString());
        const queryString = memberParams.toString();
        const endpoint = `/team/${teamId}/time_entries${queryString ? `?${queryString}` : ""}`;
        const response = await this.request<ClickUpTimeEntriesResponse>(endpoint);
        if (response.data) {
          allEntries.push(...response.data);
        }
      } catch (error) {
        console.log(`Could not fetch time entries for ${member.username}: ${error}`);
      }
    }
    
    return allEntries;
  }

  async getTimeEntriesWithFolders(
    teamId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<(ClickUpTimeEntry & { folderName: string; spaceName: string; teamName: string })[]> {
    const entries = await this.getTimeEntries(teamId, options);
    
    // Load user-to-team mapping and spaces
    await Promise.all([
      this.loadUserTeamMapping(teamId),
      this.loadSpacesForTeam(teamId),
    ]);
    
    // Collect unique space IDs and preload folders (safely handle missing task_location)
    const spaceIds = new Set<string>();
    for (const entry of entries) {
      const spaceId = entry.task_location?.space_id;
      if (spaceId && spaceId !== "0") {
        spaceIds.add(spaceId);
      }
    }
    
    // Load all folders for each space
    if (spaceIds.size > 0) {
      await Promise.all(Array.from(spaceIds).map(spaceId => this.loadFoldersForSpace(spaceId)));
    }
    
    // Map entries with folder names, space names, and team names (safely handle missing task_location)
    const entriesWithFolders = entries.map((entry) => {
      let folderName = "No Folder";
      let spaceName = "No Space";
      
      const folderId = entry.task_location?.folder_id;
      const spaceId = entry.task_location?.space_id;
      
      if (folderId && folderId !== "0" && spaceId) {
        folderName = this.folderCache.get(folderId) || "Unknown Folder";
      }
      
      if (spaceId) {
        spaceName = this.getSpaceName(spaceId);
      }
      
      const teamName = this.getUserTeam(entry.user.id);
      
      return { ...entry, folderName, spaceName, teamName };
    });
    
    return entriesWithFolders;
  }

  async testConnection(): Promise<{ success: boolean; teams: ClickUpTeam[] }> {
    try {
      const teams = await this.getTeams();
      return { success: true, teams };
    } catch (error) {
      console.error("ClickUp connection test failed:", error);
      return { success: false, teams: [] };
    }
  }
}

export function matchTaskToRule(
  taskName: string,
  rules: { pattern: string; matchType: string; quickbooksJob: string }[]
): string | null {
  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();
    const name = taskName.toLowerCase();

    let matches = false;
    switch (rule.matchType) {
      case "exact":
        matches = name === pattern;
        break;
      case "contains":
        matches = name.includes(pattern);
        break;
      case "starts_with":
        matches = name.startsWith(pattern);
        break;
      case "ends_with":
        matches = name.endsWith(pattern);
        break;
      default:
        matches = name.includes(pattern);
    }

    if (matches) {
      return rule.quickbooksJob;
    }
  }
  return null;
}

export function convertMillisecondsToHours(ms: string | number): number {
  const milliseconds = typeof ms === "string" ? parseInt(ms, 10) : ms;
  return Math.round((milliseconds / 3600000) * 100) / 100;
}
