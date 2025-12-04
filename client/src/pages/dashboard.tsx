import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  MoreHorizontal,
  Settings,
  ArrowRightLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your ClickUp to Gusto synchronization.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Configure
            </Button>
            <Button className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Scheduled Run</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">In 2 days</div>
              <p className="text-xs text-muted-foreground">Friday at 12:00 AM PST</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Success</div>
              <p className="text-xs text-muted-foreground">Synced 24 time entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Mappings</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12 Rules</div>
              <p className="text-xs text-muted-foreground">Matching 3 QuickBooks Jobs</p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Status */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Connection Health</CardTitle>
              <CardDescription>Status of your connected services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#7b68ee]/10 flex items-center justify-center">
                    <img src="https://cdn.iconscout.com/icon/free/png-256/free-clickup-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-vol-2-pack-logos-icons-2944809.png" className="w-6 h-6" alt="ClickUp" />
                  </div>
                  <div>
                    <div className="font-medium">ClickUp</div>
                    <div className="text-xs text-muted-foreground">Connected as admin@company.com</div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0a8080]/10 flex items-center justify-center">
                     {/* Placeholder for Gusto logo */}
                    <span className="font-bold text-[#0a8080] text-xs">G</span>
                  </div>
                  <div>
                    <div className="font-medium">Gusto</div>
                    <div className="text-xs text-muted-foreground">Connected to Engineering Team</div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#2ca01c]/10 flex items-center justify-center">
                    {/* Placeholder for QB logo */}
                    <span className="font-bold text-[#2ca01c] text-xs">QB</span>
                  </div>
                  <div>
                    <div className="font-medium">QuickBooks</div>
                    <div className="text-xs text-muted-foreground">Connected for Job Codes</div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest synchronization logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1">
                      {i === 1 ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-500/20" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {i === 1 ? "Sync completed successfully" : "Scheduled sync run"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {i === 1 ? "2 hours ago" : `${i} days ago`}
                      </p>
                    </div>
                    {i === 1 && (
                      <Badge variant="secondary" className="text-xs">24 records</Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-6 text-xs text-muted-foreground hover:text-primary">
                View All Logs <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
