import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, Calendar, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchSyncLogs } from "@/lib/api";
import { format } from "date-fns";

export default function Logs() {
  const { data: logs = [] } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: () => fetchSyncLogs(),
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-logs">Sync History</h1>
          <p className="text-muted-foreground mt-1">Audit log of all synchronization jobs.</p>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Job History</CardTitle>
             <CardDescription>Showing all sync jobs</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-logs">
                  No sync history yet. Run your first sync from the dashboard.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Records Processed</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {log.status === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          {log.status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
                          {log.status === "running" && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                          <span className={
                            log.status === "success" ? "text-green-700 font-medium" :
                            log.status === "warning" ? "text-amber-700 font-medium" :
                            log.status === "failed" ? "text-destructive font-medium" :
                            "text-blue-700 font-medium"
                          }>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.startedAt || new Date()), "MMM d, yyyy h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {log.recordsProcessed || 0} Entries
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {log.duration || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.message ? (
                          <span className="text-xs text-muted-foreground italic">{log.message}</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
