const GUSTO_API_BASE = "https://api.gusto.com";
const GUSTO_DEMO_API_BASE = "https://api.gusto-demo.com";
const GUSTO_AUTH_BASE = "https://api.gusto.com/oauth";
const GUSTO_DEMO_AUTH_BASE = "https://api.gusto-demo.com/oauth";
const API_VERSION = "2024-04-01";

export interface GustoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface GustoCompany {
  uuid: string;
  name: string;
}

export interface GustoEmployee {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  jobs: Array<{
    uuid: string;
    title: string;
    current_compensation_uuid: string;
  }>;
}

export interface GustoTimeSheet {
  entity_uuid: string;
  entity_type: "Employee";
  job_uuid: string;
  time_zone: string;
  shift_started_at: string;
  shift_ended_at: string;
  entries: Array<{
    hours_worked: number;
    pay_classification: string;
  }>;
  metadata?: Record<string, string>;
}

export interface GustoProject {
  uuid: string;
  name: string;
  active: boolean;
}

export class GustoService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken?: string;
  private useDemo: boolean;

  constructor(options: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    accessToken?: string;
    useDemo?: boolean;
  }) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
    this.accessToken = options.accessToken;
    this.useDemo = options.useDemo ?? false;
  }

  private get apiBase(): string {
    return this.useDemo ? GUSTO_DEMO_API_BASE : GUSTO_API_BASE;
  }

  private get authBase(): string {
    return this.useDemo ? GUSTO_DEMO_AUTH_BASE : GUSTO_AUTH_BASE;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
    });
    return `${this.authBase}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<GustoTokens> {
    const response = await fetch(`${this.authBase}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gusto token exchange failed:", error);
      throw new Error(`Failed to exchange code for tokens: ${response.status}`);
    }

    const data = await response.json();
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 7200));

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  async refreshTokens(refreshToken: string): Promise<GustoTokens> {
    const response = await fetch(`${GUSTO_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gusto token refresh failed:", error);
      throw new Error(`Failed to refresh tokens: ${response.status}`);
    }

    const data = await response.json();
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 7200));

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "X-Gusto-API-Version": API_VERSION,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Gusto API error: ${response.status}`, error);
      throw new Error(`Gusto API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<{ email: string }> {
    return this.apiRequest("/v1/me");
  }

  async getCompanies(): Promise<GustoCompany[]> {
    const user = await this.apiRequest<{ roles: { entities: { uuid: string; type: string }[] }[] }>("/v1/me");
    
    const companies: GustoCompany[] = [];
    for (const role of user.roles || []) {
      for (const entity of role.entities || []) {
        if (entity.type === "Company") {
          try {
            const company = await this.apiRequest<{ uuid: string; name: string }>(
              `/v1/companies/${entity.uuid}`
            );
            companies.push({
              uuid: company.uuid,
              name: company.name,
            });
          } catch (e) {
            console.error(`Failed to fetch company ${entity.uuid}:`, e);
          }
        }
      }
    }
    
    return companies;
  }

  async getEmployees(companyUuid: string): Promise<GustoEmployee[]> {
    return this.apiRequest<GustoEmployee[]>(
      `/v1/companies/${companyUuid}/employees`
    );
  }

  async getProjects(companyUuid: string): Promise<GustoProject[]> {
    try {
      const response = await this.apiRequest<GustoProject[]>(
        `/v1/companies/${companyUuid}/projects`
      );
      return response;
    } catch (error) {
      console.log("Projects API not available, returning empty list:", error);
      return [];
    }
  }

  async createTimeSheet(
    companyUuid: string,
    timeSheet: GustoTimeSheet
  ): Promise<{ uuid: string }> {
    return this.apiRequest(
      `/v1/companies/${companyUuid}/time_tracking/time_sheets`,
      {
        method: "POST",
        body: JSON.stringify(timeSheet),
      }
    );
  }

  async createTimeSheetsForEntries(
    companyUuid: string,
    entries: Array<{
      employeeUuid: string;
      jobUuid: string;
      hours: number;
      date: Date;
      description?: string;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const entry of entries) {
      try {
        const startOfDay = new Date(entry.date);
        startOfDay.setHours(9, 0, 0, 0);
        
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(startOfDay.getHours() + entry.hours);

        const timeSheet: GustoTimeSheet = {
          entity_uuid: entry.employeeUuid,
          entity_type: "Employee",
          job_uuid: entry.jobUuid,
          time_zone: "America/New_York",
          shift_started_at: startOfDay.toISOString(),
          shift_ended_at: endOfDay.toISOString(),
          entries: [
            {
              hours_worked: entry.hours,
              pay_classification: "Regular",
            },
          ],
          metadata: entry.description ? { source: "clickup", note: entry.description } : undefined,
        };

        await this.createTimeSheet(companyUuid, timeSheet);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Employee ${entry.employeeUuid}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  }
}
