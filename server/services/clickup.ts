const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

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

export class ClickUpService {
  private apiKey: string;

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
    
    // Extract member user IDs from the team
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

    // If no specific assignee, fetch for all team members
    if (options.assignee) {
      params.append("assignee", options.assignee);
      const queryString = params.toString();
      const endpoint = `/team/${teamId}/time_entries${queryString ? `?${queryString}` : ""}`;
      const response = await this.request<ClickUpTimeEntriesResponse>(endpoint);
      return response.data || [];
    }

    // Fetch team members and get time entries for each
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
