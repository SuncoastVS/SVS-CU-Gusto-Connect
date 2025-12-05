import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, RefreshCw, AlertCircle, User, Search, FolderOpen, X, ExternalLink, Users, CalendarDays, CalendarRange, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchClickUpTimeEntries, fetchConfiguration, fetchGustoEmployees, syncTimeToGusto, type GustoEmployee, type ClickUpTimeEntry } from "@/lib/api";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { format, getDaysInMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface BiweeklyPeriod {
  label: string;
  start: Date;
  end: Date;
  value: string;
}

function generateBiweeklyPeriods(year: number): BiweeklyPeriod[] {
  const periods: BiweeklyPeriod[] = [];
  
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(year, month, 1);
    const lastDay = getDaysInMonth(monthStart);
    const monthName = format(monthStart, "MMM");
    
    periods.push({
      label: `${monthName} 1 – ${monthName} 15`,
      start: new Date(year, month, 1, 0, 0, 0, 0),
      end: new Date(year, month, 15, 23, 59, 59, 999),
      value: `${year}-${month}-first`,
    });
    
    periods.push({
      label: `${monthName} 16 – ${monthName} ${lastDay}`,
      start: new Date(year, month, 16, 0, 0, 0, 0),
      end: new Date(year, month, lastDay, 23, 59, 59, 999),
      value: `${year}-${month}-second`,
    });
  }
  
  return periods;
}

function getCurrentPeriodValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  
  if (day <= 15) {
    return `${year}-${month}-first`;
  } else {
    return `${year}-${month}-second`;
  }
}

function findPeriodByValue(periods: BiweeklyPeriod[], value: string): BiweeklyPeriod | undefined {
  return periods.find(p => p.value === value);
}

export default function TimeEntries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  
  const [dateMode, setDateMode] = useState<"biweekly" | "custom">("biweekly");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriodValue());
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const biweeklyPeriods = useMemo(() => generateBiweeklyPeriods(currentYear), [currentYear]);

  const { data: config } = useQuery({
    queryKey: ["configuration"],
    queryFn: fetchConfiguration,
  });

  const isConfigured = config?.clickupApiKey && config?.clickupTeamId;

  const getActiveDateRange = useMemo(() => {
    if (dateMode === "biweekly") {
      const period = findPeriodByValue(biweeklyPeriods, selectedPeriod);
      if (period) {
        return { start: period.start, end: period.end };
      }
    } else if (customDateRange?.from) {
      const endDate = customDateRange.to || customDateRange.from;
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      return {
        start: customDateRange.from,
        end: endOfDay,
      };
    }
    return null;
  }, [dateMode, selectedPeriod, customDateRange, biweeklyPeriods]);

  const { data: entries = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["clickup-time-entries", getActiveDateRange?.start?.getTime(), getActiveDateRange?.end?.getTime()],
    queryFn: () => {
      if (getActiveDateRange) {
        return fetchClickUpTimeEntries(getActiveDateRange.start, getActiveDateRange.end);
      }
      return fetchClickUpTimeEntries();
    },
    enabled: !!isConfigured && !!getActiveDateRange,
    retry: false,
  });

  const isGustoConnected = !!config?.gustoAccessToken && !!config?.gustoCompanyId;

  const { data: gustoEmployees = [] } = useQuery({
    queryKey: ["gusto-employees"],
    queryFn: fetchGustoEmployees,
    enabled: isGustoConnected,
  });

  const syncToGustoMutation = useMutation({
    mutationFn: syncTimeToGusto,
    onSuccess: (result) => {
      if (result.success > 0) {
        toast.success(`Successfully synced ${result.success} time entries to Gusto`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} entries: ${result.errors.join(', ')}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const { uniqueFolders, uniqueTeams, uniqueUsers } = useMemo(() => {
    const folders = new Set<string>();
    const teams = new Set<string>();
    const users = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.folderName) folders.add(entry.folderName);
      if (entry.teamName) teams.add(entry.teamName);
      if (entry.user) users.add(entry.user);
    });
    
    return {
      uniqueFolders: Array.from(folders).sort(),
      uniqueTeams: Array.from(teams).sort(),
      uniqueUsers: Array.from(users).sort(),
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = searchQuery === "" || 
        entry.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.user.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFolder = folderFilter === "all" || entry.folderName === folderFilter;
      const matchesTeam = teamFilter === "all" || entry.teamName === teamFilter;
      const matchesUser = userFilter === "all" || entry.user === userFilter;
      
      return matchesSearch && matchesFolder && matchesTeam && matchesUser;
    });
  }, [entries, searchQuery, folderFilter, teamFilter, userFilter]);

  const matchedEntries = useMemo(() => {
    if (!gustoEmployees.length) return [];
    
    const emailToEmployee = new Map<string, GustoEmployee>();
    gustoEmployees.forEach(emp => {
      if (emp.email) {
        emailToEmployee.set(emp.email.toLowerCase(), emp);
      }
    });

    return filteredEntries
      .filter(entry => {
        const email = entry.userEmail?.toLowerCase();
        return email && emailToEmployee.has(email);
      })
      .map(entry => {
        const employee = emailToEmployee.get(entry.userEmail.toLowerCase())!;
        return {
          entry,
          employee,
        };
      });
  }, [filteredEntries, gustoEmployees]);

  const unmatchedUsers = useMemo(() => {
    if (!gustoEmployees.length) return [];
    
    const emailToEmployee = new Map<string, GustoEmployee>();
    gustoEmployees.forEach(emp => {
      if (emp.email) {
        emailToEmployee.set(emp.email.toLowerCase(), emp);
      }
    });

    const unmatchedSet = new Set<string>();
    filteredEntries.forEach(entry => {
      const email = entry.userEmail?.toLowerCase();
      if (!email || !emailToEmployee.has(email)) {
        unmatchedSet.add(entry.user);
      }
    });

    return Array.from(unmatchedSet);
  }, [filteredEntries, gustoEmployees]);

  const handleSendToGusto = () => {
    if (!matchedEntries.length) {
      toast.error("No time entries could be matched to Gusto employees");
      return;
    }

    const entriesToSync = matchedEntries.map(({ entry, employee }) => ({
      employeeUuid: employee.uuid,
      jobUuid: employee.jobUuid || "",
      hours: entry.duration,
      date: new Date(entry.start),
      description: `${entry.taskName} - ${entry.folderName}`,
    }));

    syncToGustoMutation.mutate(entriesToSync);
  };

  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);

  const clearFilters = () => {
    setSearchQuery("");
    setFolderFilter("all");
    setTeamFilter("all");
    setUserFilter("all");
  };

  const hasActiveFilters = searchQuery !== "" || folderFilter !== "all" || teamFilter !== "all" || userFilter !== "all";

  const getDateRangeLabel = () => {
    if (dateMode === "biweekly") {
      const period = findPeriodByValue(biweeklyPeriods, selectedPeriod);
      return period?.label || "Select period";
    } else if (customDateRange?.from) {
      if (customDateRange.to) {
        return `${format(customDateRange.from, "MMM d")} – ${format(customDateRange.to, "MMM d, yyyy")}`;
      }
      return format(customDateRange.from, "MMM d, yyyy");
    }
    return "Select dates";
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-time-entries">Time Entries</h1>
          <p className="text-muted-foreground mt-1">View time tracked in ClickUp.</p>
        </div>

        {!isConfigured ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">ClickUp Not Configured</h3>
                  <p className="text-muted-foreground mt-1">
                    Add your ClickUp API key and Team ID in Settings to view time entries.
                  </p>
                </div>
                <Link href="/settings">
                  <Button data-testid="button-go-to-settings">Go to Settings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {hasActiveFilters ? "Filtered Entries" : "Total Entries"}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-entries">
                    {filteredEntries.length}
                    {hasActiveFilters && entries.length !== filteredEntries.length && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        of {entries.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {hasActiveFilters ? "Filtered Hours" : "Total Hours"}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-hours">{totalHours.toFixed(2)} hrs</div>
                  <p className="text-xs text-muted-foreground">
                    {hasActiveFilters ? "Matching your filters" : "Across all tasks"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Date Range Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <ToggleGroup
                      type="single"
                      value={dateMode}
                      onValueChange={(value) => {
                        if (value) setDateMode(value as "biweekly" | "custom");
                      }}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="biweekly" aria-label="Bi-weekly periods" data-testid="toggle-biweekly">
                        <CalendarDays className="w-4 h-4 mr-2" />
                        Bi-weekly
                      </ToggleGroupItem>
                      <ToggleGroupItem value="custom" aria-label="Custom date range" data-testid="toggle-custom">
                        <CalendarRange className="w-4 h-4 mr-2" />
                        Custom Range
                      </ToggleGroupItem>
                    </ToggleGroup>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateMode("biweekly");
                        setSelectedPeriod(getCurrentPeriodValue());
                      }}
                      data-testid="button-today"
                    >
                      Today
                    </Button>

                    {dateMode === "biweekly" ? (
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[220px]" data-testid="select-biweekly-period">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {biweeklyPeriods.map((period) => (
                            <SelectItem key={period.value} value={period.value}>
                              {period.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[280px] justify-start text-left font-normal"
                            data-testid="button-custom-dates"
                          >
                            <CalendarRange className="mr-2 h-4 w-4" />
                            {customDateRange?.from ? (
                              customDateRange.to ? (
                                <>
                                  {format(customDateRange.from, "LLL dd, y")} –{" "}
                                  {format(customDateRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(customDateRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span className="text-muted-foreground">Pick a date range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={customDateRange?.from}
                            selected={customDateRange}
                            onSelect={(range) => {
                              setCustomDateRange(range);
                              if (range?.to) {
                                setCalendarOpen(false);
                              }
                            }}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <Button 
                    onClick={() => refetch()}
                    disabled={!isConfigured || isRefetching || !getActiveDateRange}
                    className="gap-2"
                    data-testid="button-refresh-entries"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    {isRefetching ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search and Filter Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by folder, task, or user..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Select value={folderFilter} onValueChange={setFolderFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-folder-filter">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Folders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Folders</SelectItem>
                        {uniqueFolders.map(folder => (
                          <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-team-filter">
                        <Users className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {uniqueTeams.map(team => (
                          <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-user-filter">
                        <User className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {uniqueUsers.map(user => (
                          <SelectItem key={user} value={user}>{user}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="gap-2"
                        data-testid="button-clear-filters"
                      >
                        <X className="w-4 h-4" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto animate-spin" />
                    <p className="text-muted-foreground">Loading time entries from ClickUp...</p>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                    <div>
                      <h3 className="font-semibold text-lg">Failed to Load Time Entries</h3>
                      <p className="text-muted-foreground mt-1">
                        {error instanceof Error ? error.message : "An error occurred"}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => refetch()} data-testid="button-retry">
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle>Time Entries</CardTitle>
                      <CardDescription>
                        {hasActiveFilters 
                          ? `Showing ${filteredEntries.length} matching entries`
                          : `Showing ${filteredEntries.length} entries for ${getDateRangeLabel()}`
                        }
                      </CardDescription>
                    </div>
                    
                    {isGustoConnected && filteredEntries.length > 0 && (
                      <div className="flex flex-col sm:items-end gap-2">
                        <Button
                          onClick={handleSendToGusto}
                          disabled={syncToGustoMutation.isPending || matchedEntries.length === 0}
                          className="gap-2"
                          data-testid="button-send-to-gusto"
                        >
                          {syncToGustoMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send to Gusto ({matchedEntries.length})
                            </>
                          )}
                        </Button>
                        {matchedEntries.length < filteredEntries.length && (
                          <p className="text-xs text-muted-foreground">
                            {filteredEntries.length - matchedEntries.length} entries could not be matched to Gusto employees
                            {unmatchedUsers.length > 0 && ` (${unmatchedUsers.join(", ")})`}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {!isGustoConnected && filteredEntries.length > 0 && (
                      <Link href="/settings">
                        <Button variant="outline" className="gap-2" data-testid="button-connect-gusto-prompt">
                          <Send className="w-4 h-4" />
                          Connect Gusto to Sync
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground" data-testid="text-no-entries">
                        {hasActiveFilters 
                          ? "No entries match your filters."
                          : `No time entries found for ${getDateRangeLabel()}.`
                        }
                      </p>
                      {hasActiveFilters && (
                        <Button 
                          variant="link" 
                          onClick={clearFilters}
                          className="mt-2"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Folder</TableHead>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Billable</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id} data-testid={`entry-row-${entry.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{entry.folderName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={entry.taskName}>
                                {entry.taskName}
                              </div>
                              {entry.description && (
                                <div className="text-xs text-muted-foreground truncate" title={entry.description}>
                                  {entry.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {entry.duration.toFixed(2)} hrs
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{entry.teamName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                {entry.user}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.billable ? "default" : "outline"}>
                                {entry.billable ? "Billable" : "Non-billable"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.taskId && (
                                <a
                                  href={`https://app.clickup.com/t/${entry.taskId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
                                  title="Open in ClickUp"
                                  data-testid={`link-clickup-${entry.id}`}
                                >
                                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
