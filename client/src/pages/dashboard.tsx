import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Settings
} from "lucide-react";
import { fetchConfiguration, fetchSyncLogs, runSync } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const { data: config } = useQuery({
    queryKey: ["configuration"],
    queryFn: fetchConfiguration,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: () => fetchSyncLogs(5),
  });

  const syncMutation = useMutation({
    mutationFn: runSync,
    onSuccess: () => {
      toast.success("Sync job started successfully");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      }, 2000);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const latestLog = logs[0];
  const isConfigured = (config as any)?.clickupApiKeyConfigured && config?.clickupTeamId;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-dashboard">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your ClickUp to Gusto synchronization.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/settings">
              <Button variant="outline" className="gap-2" data-testid="button-configure">
                <Settings className="w-4 h-4" />
                Configure
              </Button>
            </Link>
            <Button 
              className="gap-2" 
              onClick={() => syncMutation.mutate()}
              disabled={!isConfigured || syncMutation.isPending}
              data-testid="button-sync-now"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-next-run">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Scheduled Run</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-next-run">
                {config?.syncEnabled ? "In 2 days" : "Disabled"}
              </div>
              <p className="text-xs text-muted-foreground">
                {config?.syncTime || "00:00"} - {config?.syncFrequency || "daily"}
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-last-sync">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync Status</CardTitle>
              {latestLog?.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {latestLog?.status === "failed" && <AlertCircle className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                latestLog?.status === "success" ? "text-green-600" : 
                latestLog?.status === "failed" ? "text-destructive" : ""
              }`} data-testid="text-sync-status">
                {latestLog ? latestLog.status.charAt(0).toUpperCase() + latestLog.status.slice(1) : "No syncs yet"}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestLog ? `Synced ${latestLog.recordsProcessed} time entries` : "Run your first sync"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-connection-health">
            <CardHeader>
              <CardTitle>Connection Health</CardTitle>
              <CardDescription>Status of your connected services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card" data-testid="connection-clickup">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#7b68ee]/10 flex items-center justify-center">
                    <span className="font-bold text-[#7b68ee] text-xs">CU</span>
                  </div>
                  <div>
                    <div className="font-medium">ClickUp</div>
                    <div className="text-xs text-muted-foreground">
                      {(config as any)?.clickupApiKeyConfigured ? "Connected" : "Not configured"}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={(config as any)?.clickupApiKeyConfigured 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"}
                  data-testid="badge-clickup-status"
                >
                  {(config as any)?.clickupApiKeyConfigured ? "Active" : "Pending"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card" data-testid="connection-gusto">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0a8080]/10 flex items-center justify-center">
                    <span className="font-bold text-[#0a8080] text-xs">G</span>
                  </div>
                  <div>
                    <div className="font-medium">Gusto</div>
                    <div className="text-xs text-muted-foreground">
                      {config?.gustoAccessToken ? "Connected" : "Not configured"}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={config?.gustoAccessToken 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"}
                  data-testid="badge-gusto-status"
                >
                  {config?.gustoAccessToken ? "Active" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-recent-activity">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest synchronization logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No sync history yet. Click "Sync Now" to get started.
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={log.id} className="flex items-start gap-4" data-testid={`activity-log-${i}`}>
                      <div className="mt-1">
                        {i === 0 ? (
                          <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-500/20" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {log.status === "success" ? "Sync completed successfully" : 
                           log.status === "failed" ? "Sync failed" : "Sync in progress"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.startedAt || new Date()).toLocaleDateString()}
                        </p>
                      </div>
                      {(log.recordsProcessed || 0) > 0 && (
                        <Badge variant="secondary" className="text-xs">{log.recordsProcessed} records</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
              <Link href="/logs">
                <Button variant="ghost" className="w-full mt-6 text-xs text-muted-foreground hover:text-primary" data-testid="button-view-all-logs">
                  View All Logs <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
