import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchConfiguration, 
  updateConfiguration, 
  testClickUpConnection,
  fetchTeams,
  createTeam,
  deleteTeam,
  fetchClickUpUsers,
  fetchUserTeamMappings,
  updateUserTeamMapping,
  type ClickUpTeam,
  type ClickUpUser,
} from "@/lib/api";
import type { Team, UserTeamMapping } from "@shared/schema";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertCircle, Plus, Trash2, Users } from "lucide-react";

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
    syncEnabled: true,
    syncFrequency: "daily",
    syncTime: "00:00",
  });

  const [clickupTeams, setClickupTeams] = useState<ClickUpTeam[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [newTeamName, setNewTeamName] = useState("");

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const { data: clickupUsers = [] } = useQuery({
    queryKey: ["clickup-users"],
    queryFn: fetchClickUpUsers,
    enabled: !!config?.clickupApiKey && !!config?.clickupTeamId,
  });

  const { data: userMappings = [] } = useQuery({
    queryKey: ["user-team-mappings"],
    queryFn: fetchUserTeamMappings,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        clickupApiKey: config.clickupApiKey || "",
        clickupTeamId: config.clickupTeamId || "",
        gustoAccessToken: config.gustoAccessToken || "",
        gustoCompanyId: config.gustoCompanyId || "",
        syncEnabled: config.syncEnabled ?? true,
        syncFrequency: config.syncFrequency || "daily",
        syncTime: config.syncTime || "00:00",
      });
      if (config.clickupApiKey) {
        setConnectionStatus("success");
      }
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

  const testConnectionMutation = useMutation({
    mutationFn: testClickUpConnection,
    onMutate: () => {
      setConnectionStatus("testing");
    },
    onSuccess: (result) => {
      if (result.success) {
        setConnectionStatus("success");
        setClickupTeams(result.teams);
        toast.success(`Connected! Found ${result.teams.length} workspace(s).`);
      } else {
        setConnectionStatus("error");
        toast.error("Connection failed");
      }
    },
    onError: (error: Error) => {
      setConnectionStatus("error");
      toast.error(error.message);
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setNewTeamName("");
      toast.success("Team created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["user-team-mappings"] });
      toast.success("Team deleted");
    },
    onError: () => {
      toast.error("Failed to delete team");
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: ({ clickupUserId, clickupUsername, teamId }: { clickupUserId: number; clickupUsername: string; teamId: string | null }) =>
      updateUserTeamMapping(clickupUserId, clickupUsername, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-team-mappings"] });
      toast.success("User assigned to team");
    },
    onError: () => {
      toast.error("Failed to assign user to team");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleTestConnection = async () => {
    await updateMutation.mutateAsync(formData);
    testConnectionMutation.mutate();
  };

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      createTeamMutation.mutate(newTeamName.trim());
    }
  };

  const getUserTeamId = (clickupUserId: number): string | null => {
    const mapping = userMappings.find(m => m.clickupUserId === clickupUserId);
    return mapping?.teamId || null;
  };

  const handleUserTeamChange = (user: ClickUpUser, teamId: string) => {
    updateMappingMutation.mutate({
      clickupUserId: user.id,
      clickupUsername: user.username,
      teamId: teamId === "none" ? null : teamId,
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-settings">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your integrations, teams, and sync preferences.</p>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-teams">CU Team Management</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ClickUp Configuration</CardTitle>
                    <CardDescription>Connect to ClickUp to pull time tracking data.</CardDescription>
                  </div>
                  {connectionStatus === "success" && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  )}
                  {connectionStatus === "error" && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Error
                    </Badge>
                  )}
                </div>
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
                    Get your API key from ClickUp Settings → Apps → API Token
                  </p>
                </div>

                {clickupTeams.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="clickupTeam">Workspace</Label>
                    <Select 
                      value={formData.clickupTeamId}
                      onValueChange={(value) => setFormData({ ...formData, clickupTeamId: value })}
                    >
                      <SelectTrigger data-testid="select-clickup-team">
                        <SelectValue placeholder="Select a workspace" />
                      </SelectTrigger>
                      <SelectContent>
                        {clickupTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!clickupTeams.length && (
                  <div className="grid gap-2">
                    <Label htmlFor="clickupTeamId">Team ID</Label>
                    <Input
                      id="clickupTeamId"
                      placeholder="123456"
                      value={formData.clickupTeamId}
                      onChange={(e) => setFormData({ ...formData, clickupTeamId: e.target.value })}
                      data-testid="input-clickup-team-id"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your Team ID, or test the connection to auto-discover workspaces
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/50 border-t px-6 py-4 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={!formData.clickupApiKey || testConnectionMutation.isPending || updateMutation.isPending}
                  data-testid="button-test-clickup"
                >
                  {testConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-clickup"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gusto Configuration</CardTitle>
                <CardDescription>Connect to Gusto to push payroll hours (coming soon).</CardDescription>
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
              <CardFooter className="bg-muted/50 border-t px-6 py-4 flex justify-end">
                <Button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-gusto"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Teams
                </CardTitle>
                <CardDescription>Create teams and assign ClickUp users to them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter team name..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                    data-testid="input-new-team"
                  />
                  <Button 
                    onClick={handleAddTeam}
                    disabled={!newTeamName.trim() || createTeamMutation.isPending}
                    data-testid="button-add-team"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team
                  </Button>
                </div>

                {teams.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {teams.map((team) => (
                      <Badge 
                        key={team.id} 
                        variant="secondary"
                        className="text-sm py-1 px-3 flex items-center gap-2"
                      >
                        {team.name}
                        <button
                          onClick={() => deleteTeamMutation.mutate(team.id)}
                          className="hover:text-destructive transition-colors"
                          data-testid={`button-delete-team-${team.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Assignments</CardTitle>
                <CardDescription>
                  Assign each ClickUp user to a team. These assignments will appear in the Time Entries table.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!config?.clickupApiKey || !config?.clickupTeamId ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Configure ClickUp in the Integrations tab first to see users.
                    </p>
                  </div>
                ) : clickupUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                    <p className="text-muted-foreground">Loading users from ClickUp...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ClickUp User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[200px]">Assigned Team</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clickupUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={getUserTeamId(user.id) || "none"}
                              onValueChange={(value) => handleUserTeamChange(user, value)}
                            >
                              <SelectTrigger data-testid={`select-team-${user.id}`}>
                                <SelectValue placeholder="Select team..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Team</SelectItem>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
