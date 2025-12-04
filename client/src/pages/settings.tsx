import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConfiguration, updateConfiguration } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["configuration"],
    queryFn: fetchConfiguration,
  });

  const [formData, setFormData] = useState({
    clickupApiKey: "",
    clickupTeamId: "",
    gustoAccessToken: "",
    gustoCompanyId: "",
    quickbooksConnected: false,
    syncEnabled: true,
    syncFrequency: "daily",
    syncTime: "00:00",
  });

  useEffect(() => {
    if (config) {
      setFormData({
        clickupApiKey: config.clickupApiKey || "",
        clickupTeamId: config.clickupTeamId || "",
        gustoAccessToken: config.gustoAccessToken || "",
        gustoCompanyId: config.gustoCompanyId || "",
        quickbooksConnected: config.quickbooksConnected || false,
        syncEnabled: config.syncEnabled || true,
        syncFrequency: config.syncFrequency || "daily",
        syncTime: config.syncTime || "00:00",
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: updateConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuration"] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-settings">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your integrations and sync preferences.</p>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ClickUp Configuration</CardTitle>
                <CardDescription>Manage your connection to ClickUp.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="clickupKey">API Key</Label>
                  <Input
                    id="clickupKey"
                    type="password"
                    placeholder="pk_..."
                    value={formData.clickupApiKey}
                    onChange={(e) => setFormData({ ...formData, clickupApiKey: e.target.value })}
                    data-testid="input-clickup-key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from ClickUp Settings → Apps
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clickupTeam">Team ID</Label>
                  <Input
                    id="clickupTeam"
                    placeholder="123456"
                    value={formData.clickupTeamId}
                    onChange={(e) => setFormData({ ...formData, clickupTeamId: e.target.value })}
                    data-testid="input-clickup-team"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gusto Configuration</CardTitle>
                <CardDescription>Manage your connection to Gusto Payroll.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="gustoToken">Access Token</Label>
                  <Input
                    id="gustoToken"
                    type="password"
                    placeholder="Bearer token"
                    value={formData.gustoAccessToken}
                    onChange={(e) => setFormData({ ...formData, gustoAccessToken: e.target.value })}
                    data-testid="input-gusto-token"
                  />
                  <p className="text-xs text-muted-foreground">
                    OAuth2 access token from Gusto API
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gustoCompany">Company ID</Label>
                  <Input
                    id="gustoCompany"
                    placeholder="123456"
                    value={formData.gustoCompanyId}
                    onChange={(e) => setFormData({ ...formData, gustoCompanyId: e.target.value })}
                    data-testid="input-gusto-company"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QuickBooks Configuration</CardTitle>
                <CardDescription>Connect to QuickBooks for job code mapping.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>QuickBooks Connection</Label>
                    <p className="text-sm text-muted-foreground">Enable QuickBooks job mapping</p>
                  </div>
                  <Switch 
                    checked={formData.quickbooksConnected}
                    onCheckedChange={(checked) => setFormData({ ...formData, quickbooksConnected: checked })}
                    data-testid="switch-quickbooks"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-integrations"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
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
                  <Switch 
                    checked={formData.syncEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncEnabled: checked })}
                    data-testid="switch-sync-enabled"
                  />
                </div>
                
                <div className="grid gap-2">
                   <Label htmlFor="frequency">Frequency</Label>
                   <Select 
                     value={formData.syncFrequency}
                     onValueChange={(value) => setFormData({ ...formData, syncFrequency: value })}
                   >
                    <SelectTrigger data-testid="select-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every Day</SelectItem>
                      <SelectItem value="weekly">Every Week</SelectItem>
                      <SelectItem value="biweekly">Every Two Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                   <Label htmlFor="syncTime">Run Time</Label>
                   <Input 
                     id="syncTime"
                     type="time" 
                     value={formData.syncTime}
                     onChange={(e) => setFormData({ ...formData, syncTime: e.target.value })}
                     data-testid="input-sync-time"
                   />
                   <p className="text-xs text-muted-foreground">Time zone: Local</p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 border-t px-6 py-4">
                <Button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Schedule"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
