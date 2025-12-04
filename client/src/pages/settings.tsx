import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your integrations and sync preferences.</p>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ClickUp Configuration</CardTitle>
                <CardDescription>Manage your connection to ClickUp.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="pk_49385_..." readOnly className="bg-muted font-mono" />
                    <Button variant="outline">Update</Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Workspace</Label>
                  <Select defaultValue="ws1">
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ws1">Acme Corp Main</SelectItem>
                      <SelectItem value="ws2">Acme Sandbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gusto Configuration</CardTitle>
                <CardDescription>Manage your connection to Gusto Payroll.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 border-green-200">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                     <span className="text-sm font-medium text-green-900">Connected to Gusto Production</span>
                   </div>
                   <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20">Reconnect</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
             <Card>
              <CardHeader>
                <CardTitle>Sync Schedule</CardTitle>
                <CardDescription>Control when the data synchronization runs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Sync</Label>
                    <p className="text-sm text-muted-foreground">Run the job automatically on a schedule</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="grid gap-2">
                   <Label>Frequency</Label>
                   <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every Day</SelectItem>
                      <SelectItem value="weekly">Every Week</SelectItem>
                      <SelectItem value="custom">Custom Interval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                   <Label>Run Time</Label>
                   <Input type="time" defaultValue="00:00" />
                   <p className="text-xs text-muted-foreground">Time zone: PST (Local)</p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 border-t px-6 py-4">
                <Button>Save Schedule</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
