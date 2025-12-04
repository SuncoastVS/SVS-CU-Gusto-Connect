import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Pencil } from "lucide-react";

const MOCK_RULES = [
  { id: 1, pattern: "Client: Acme Corp", qb_job: "Acme Consulting", type: "Contains" },
  { id: 2, pattern: "[Internal]", qb_job: "Internal Overhead", type: "Starts With" },
  { id: 3, pattern: "Project: Website Redesign", qb_job: "Web Dev - Fixed", type: "Exact Match" },
  { id: 4, pattern: "Support Ticket #", qb_job: "Support Retainer", type: "Contains" },
];

export default function Mapping() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mapping Rules</h1>
            <p className="text-muted-foreground mt-1">Define how ClickUp tasks map to QuickBooks Jobs.</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Rule
          </Button>
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
                <Input placeholder="Search rules..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                {MOCK_RULES.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground">
                        {rule.pattern}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {rule.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {rule.qb_job}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
