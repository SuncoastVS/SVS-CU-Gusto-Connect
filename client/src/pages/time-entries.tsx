import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, RefreshCw, AlertCircle, User, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchClickUpTimeEntries, fetchConfiguration } from "@/lib/api";
import { Link } from "wouter";

export default function TimeEntries() {
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

  const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);

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
                  <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-entries">{entries.length}</div>
                  <p className="text-xs text-muted-foreground">From the last 7 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-hours">{totalHours.toFixed(2)} hrs</div>
                  <p className="text-xs text-muted-foreground">Across all tasks</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>All tracked time from ClickUp</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {entries.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground" data-testid="text-no-entries">
                      No time entries found in the last 7 days.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Billable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`entry-row-${entry.id}`}>
                          <TableCell className="font-medium max-w-xs">
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
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Mail className="w-3 h-3" />
                              {entry.email}
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
