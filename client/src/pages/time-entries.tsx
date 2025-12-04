import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, RefreshCw, AlertCircle, User, Search, FolderOpen, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchClickUpTimeEntries, fetchConfiguration } from "@/lib/api";
import { Link } from "wouter";
import { useState, useMemo } from "react";

export default function TimeEntries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const { data: config } = useQuery({
    queryKey: ["configuration"],
    queryFn: fetchConfiguration,
  });

  const { data: entries = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["clickup-time-entries"],
    queryFn: fetchClickUpTimeEntries,
    enabled: !!config?.clickupApiKey && !!config?.clickupTeamId,
    retry: false,
  });

  const isConfigured = config?.clickupApiKey && config?.clickupTeamId;

  // Get unique folders and users for filter dropdowns
  const { uniqueFolders, uniqueUsers } = useMemo(() => {
    const folders = new Set<string>();
    const users = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.folderName) folders.add(entry.folderName);
      if (entry.user) users.add(entry.user);
    });
    
    return {
      uniqueFolders: Array.from(folders).sort(),
      uniqueUsers: Array.from(users).sort(),
    };
  }, [entries]);

  // Filter entries based on search and filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = searchQuery === "" || 
        entry.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.user.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFolder = folderFilter === "all" || entry.folderName === folderFilter;
      const matchesUser = userFilter === "all" || entry.user === userFilter;
      
      return matchesSearch && matchesFolder && matchesUser;
    });
  }, [entries, searchQuery, folderFilter, userFilter]);

  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);

  const clearFilters = () => {
    setSearchQuery("");
    setFolderFilter("all");
    setUserFilter("all");
  };

  const hasActiveFilters = searchQuery !== "" || folderFilter !== "all" || userFilter !== "all";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-time-entries">Time Entries</h1>
            <p className="text-muted-foreground mt-1">View time tracked in ClickUp over the last 7 days.</p>
          </div>
          <Button 
            onClick={() => refetch()}
            disabled={!isConfigured || isRefetching}
            className="gap-2"
            data-testid="button-refresh-entries"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
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
        ) : isLoading ? (
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
                  <p className="text-xs text-muted-foreground">From the last 7 days</p>
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
                  
                  <div className="flex gap-3">
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

            <Card>
              <CardHeader>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>
                  {hasActiveFilters 
                    ? `Showing ${filteredEntries.length} matching entries`
                    : "All tracked time from ClickUp"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground" data-testid="text-no-entries">
                      {hasActiveFilters 
                        ? "No entries match your filters."
                        : "No time entries found in the last 7 days."
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
                        <TableHead>User</TableHead>
                        <TableHead>Billable</TableHead>
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
                              <User className="w-3 h-3 text-muted-foreground" />
                              {entry.user}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.billable ? "default" : "outline"}>
                              {entry.billable ? "Billable" : "Non-billable"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
