import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMappingRules, createMappingRule, deleteMappingRule } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";

export default function Mapping() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newRule, setNewRule] = useState({
    pattern: "",
    matchType: "contains",
    quickbooksJob: "",
    priority: 0,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["mapping-rules"],
    queryFn: fetchMappingRules,
  });

  const createMutation = useMutation({
    mutationFn: createMappingRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-rules"] });
      toast.success("Mapping rule created");
      setIsDialogOpen(false);
      setNewRule({ pattern: "", matchType: "contains", quickbooksJob: "", priority: 0 });
    },
    onError: () => {
      toast.error("Failed to create mapping rule");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMappingRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-rules"] });
      toast.success("Mapping rule deleted");
    },
    onError: () => {
      toast.error("Failed to delete mapping rule");
    },
  });

  const filteredRules = rules.filter(rule => 
    rule.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.quickbooksJob.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!newRule.pattern || !newRule.quickbooksJob) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate(newRule);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-mapping">Mapping Rules</h1>
            <p className="text-muted-foreground mt-1">Define how ClickUp tasks map to QuickBooks Jobs.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-rule">
                <Plus className="w-4 h-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-rule">
              <DialogHeader>
                <DialogTitle>Create Mapping Rule</DialogTitle>
                <DialogDescription>
                  Define a pattern to match ClickUp task names to QuickBooks jobs.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pattern">ClickUp Task Pattern</Label>
                  <Input
                    id="pattern"
                    placeholder="e.g., Client: Acme Corp"
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                    data-testid="input-pattern"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matchType">Match Type</Label>
                  <Select 
                    value={newRule.matchType} 
                    onValueChange={(value) => setNewRule({ ...newRule, matchType: value })}
                  >
                    <SelectTrigger data-testid="select-match-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="starts_with">Starts With</SelectItem>
                      <SelectItem value="ends_with">Ends With</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qbJob">QuickBooks Job</Label>
                  <Input
                    id="qbJob"
                    placeholder="e.g., Acme Consulting"
                    value={newRule.quickbooksJob}
                    onChange={(e) => setNewRule({ ...newRule, quickbooksJob: e.target.value })}
                    data-testid="input-qb-job"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending}
                  data-testid="button-create-rule"
                >
                  {createMutation.isPending ? "Creating..." : "Create Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Active Rules</CardTitle>
                <CardDescription>Rules are processed in order from top to bottom</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search rules..." 
                  className="pl-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-rules"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRules.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-rules">
                  {searchQuery ? "No matching rules found" : "No mapping rules yet. Create one to get started."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ClickUp Task Pattern</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>QuickBooks Job</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
                      <TableCell className="font-medium">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground">
                          {rule.pattern}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {rule.matchType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {rule.quickbooksJob}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(rule.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
