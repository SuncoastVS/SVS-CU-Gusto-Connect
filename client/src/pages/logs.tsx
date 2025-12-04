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
import { CheckCircle2, XCircle, AlertTriangle, Calendar, Clock, ArrowRight } from "lucide-react";

const MOCK_LOGS = [
  { id: "sync_123", date: "2024-03-20 12:00 AM", status: "Success", records: 24, duration: "45s" },
  { id: "sync_122", date: "2024-03-18 12:00 AM", status: "Success", records: 18, duration: "32s" },
  { id: "sync_121", date: "2024-03-16 12:00 AM", status: "Warning", records: 15, duration: "28s", message: "3 tasks skipped (no match)" },
  { id: "sync_120", date: "2024-03-14 12:00 AM", status: "Success", records: 22, duration: "41s" },
  { id: "sync_119", date: "2024-03-12 12:00 AM", status: "Failed", records: 0, duration: "5s", message: "ClickUp API Rate Limit" },
];

export default function Logs() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sync History</h1>
          <p className="text-muted-foreground mt-1">Audit log of all synchronization jobs.</p>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Job History</CardTitle>
             <CardDescription>Showing last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Records Processed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_LOGS.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.status === "Success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {log.status === "Warning" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        {log.status === "Failed" && <XCircle className="w-4 h-4 text-destructive" />}
                        <span className={
                          log.status === "Success" ? "text-green-700 font-medium" :
                          log.status === "Warning" ? "text-amber-700 font-medium" :
                          "text-destructive font-medium"
                        }>
                          {log.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {log.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {log.records} Entries
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {log.duration}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.message ? (
                        <span className="text-xs text-muted-foreground italic mr-4">{log.message}</span>
                      ) : null}
                      <Button variant="ghost" size="sm">
                        View
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
