import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useSubmissions } from "@/hooks/use-submissions";
import { useCategories } from "@/hooks/use-materials";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Search, ChevronDown, Paperclip, AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";
import { useSubmissionItems, useSubmissionVersions, Submission } from "@/hooks/use-submissions";

function AdminSubmissionStatusBadge({ status }: { status: string }) {
  if (status === 'verified') return <Badge className="bg-green-500 text-white border-transparent">Verified</Badge>;
  if (status === 'submitted') return <Badge className="bg-blue-500 text-white border-transparent">Submitted</Badge>;
  if (status === 'failed' || status === 'invalid') return <Badge variant="destructive" className="capitalize">{status}</Badge>;
  return <Badge variant="secondary" className="capitalize text-muted-foreground">{status}</Badge>;
}

export default function Admin() {
  const { data: submissions, isLoading } = useSubmissions();
  const { data: categories } = useCategories();
  
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const stats = useMemo(() => {
    if (!submissions) return { total: 0, submitted: 0, verified: 0, flagged: 0 };
    return {
      total: submissions.length,
      submitted: submissions.filter(s => s.status === 'submitted').length,
      verified: submissions.filter(s => s.status === 'verified').length,
      flagged: submissions.filter(s => s.status === 'failed' || s.status === 'invalid').length,
    };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter(s => {
      const matchSearch = s.ticket_id.toLowerCase().includes(search.toLowerCase()); // we don't have ticket_owner joined easily here, but good enough for ID
      const matchStatus = statusTab === "all" || s.status === statusTab;
      return matchSearch && matchStatus;
    });
  }, [submissions, search, statusTab]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Admin overview</h1>
          <Badge variant="outline" className="bg-muted text-muted-foreground shadow-sm">Read-only</Badge>
        </div>
        <p className="text-muted-foreground text-sm">Actions coming soon.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Total Submissions</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.submitted}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Submitted</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.verified}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Verified</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.flagged}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Flagged</div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-muted/30">
          <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full overflow-x-auto">
            <TabsList className="w-full sm:w-auto flex justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="invalid">Invalid</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search Ticket ID..." 
              className="pl-9 h-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Ticket ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Image</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No submissions match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((sub) => (
                  <TableRow 
                    key={sub.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSubmission(sub)}
                  >
                    <TableCell className="font-mono font-bold">{sub.ticket_id}</TableCell>
                    <TableCell><AdminSubmissionStatusBadge status={sub.status} /></TableCell>
                    <TableCell className="text-right font-semibold">${Number(sub.total_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[150px]">{sub.contact_email || "—"}</span>
                        {sub.is_custom_email && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" title="Custom email" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {sub.image_attached ? <Paperclip className="h-4 w-4 mx-auto text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(sub.updated_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SubmissionSidePanel 
        submission={selectedSubmission} 
        open={!!selectedSubmission} 
        onOpenChange={(o) => !o && setSelectedSubmission(null)} 
      />
    </div>
  );
}

function SubmissionSidePanel({ submission, open, onOpenChange }: { submission: Submission | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: items } = useSubmissionItems(submission?.id);
  const { data: versions } = useSubmissionVersions(submission?.id);

  if (!submission) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        <div className="p-6 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-2xl font-mono">{submission.ticket_id}</SheetTitle>
              <AdminSubmissionStatusBadge status={submission.status} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SheetDescription>
            Last updated {format(new Date(submission.updated_at), 'PPpp')}
          </SheetDescription>
        </div>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto">
          
          {/* Submission Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Submission Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Total Price</div>
                <div className="font-bold text-lg">${Number(submission.total_price).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Version</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">v{submission.version_index}</span>
                  {submission.edited && <Badge variant="outline" className="text-[10px] uppercase">Edited</Badge>}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Contact Email</div>
                <div className="flex items-center gap-2">
                  <span>{submission.contact_email || "None provided"}</span>
                  {submission.is_custom_email && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border-transparent hover:bg-yellow-100">Custom</Badge>}
                </div>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Line Items</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right w-16">Qty</TableHead>
                    <TableHead className="text-right w-24">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!items || items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No items</TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.name}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">${Number(item.total_price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-muted/10 font-bold">
                    <TableCell colSpan={2} className="text-right">Total</TableCell>
                    <TableCell className="text-right">${Number(submission.total_price).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Attachment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Attachment</h3>
            {submission.image_attached && submission.image_url ? (
              <div className="rounded-md border overflow-hidden bg-muted/20">
                <img src={submission.image_url} alt="Receipt" className="w-full h-auto object-contain max-h-[300px]" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-md text-center">
                No image attached to this submission.
              </div>
            )}
          </section>

          {/* Admin Notes */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Admin Notes (Coming Soon)</h3>
            <Textarea disabled placeholder="Notes functionality is disabled in read-only mode." className="resize-none bg-muted/30" />
          </section>

          {/* History */}
          <section className="space-y-3 pt-4 border-t">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md hover:bg-muted/50 transition-colors border">
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Version History</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                {!versions ? (
                  <div className="text-sm text-muted-foreground">Loading history...</div>
                ) : versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No history available</div>
                ) : (
                  <div className="space-y-3 border-l-2 border-muted ml-3 pl-4 py-2">
                    {versions.map((v, i) => (
                      <div key={v.id} className="relative">
                        <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                        <div className="text-sm font-medium">Snapshot recorded</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(v.created_at), 'PPpp')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}