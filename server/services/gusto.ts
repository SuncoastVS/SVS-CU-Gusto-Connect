const GUSTO_API_BASE = "https://api.gusto.com";
const GUSTO_DEMO_API_BASE = "https://api.gusto-demo.com";
const API_VERSION = "2025-06-15";

export interface GustoTokenInfo {
  scope: string;
  resource: {
    type: string;
    uuid: string;
  };
  resource_owner: {
    type: string;
    uuid: string;
  };
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
  terminated: boolean;
  current_employment_status: string;
  jobs: Array<{
    uuid: string;
    title: string;
    current_compensation_uuid: string;
  }>;
}

export interface GustoContractor {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  type: string;
  is_active: boolean;
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
  private accessToken: string;
  private useDemo: boolean;

  constructor(options: {
    accessToken: string;
    useDemo?: boolean;
  }) {
    this.accessToken = options.accessToken;
    this.useDemo = options.useDemo ?? false;
  }

  private get apiBase(): string {
    return this.useDemo ? GUSTO_DEMO_API_BASE : GUSTO_API_BASE;
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
        Accept: "application/json",
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

  async getTokenInfo(): Promise<GustoTokenInfo> {
    return this.apiRequest("/v1/token_info");
  }

  async getCompany(companyUuid: string): Promise<GustoCompany> {
    return this.apiRequest<GustoCompany>(`/v1/companies/${companyUuid}`);
  }

  async getEmployees(companyUuid: string): Promise<GustoEmployee[]> {
    return this.apiRequest<GustoEmployee[]>(
      `/v1/companies/${companyUuid}/employees?per=100`
    );
  }

  async getContractors(companyUuid: string): Promise<GustoContractor[]> {
    try {
      return this.apiRequest<GustoContractor[]>(
        `/v1/companies/${companyUuid}/contractors?per=100`
      );
    } catch (error) {
      console.log("Contractors API not available, returning empty list:", error);
      return [];
    }
  }

  async getProjects(companyUuid: string): Promise<GustoProject[]> {
    try {
      const response = await this.apiRequest<GustoProject[]>(
        `/v1/companies/${companyUuid}/projects?per=100`
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
