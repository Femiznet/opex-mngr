import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useTickets } from "@/hooks/use-tickets";
import { useSubmissions } from "@/hooks/use-submissions";
import { useCategories } from "@/hooks/use-materials";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutList, Layers, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function StatusBadge({ status }: { status: string }) {
  const lowerStatus = status?.toLowerCase();
  
  // 🟢 Open is now soft Green, 🔴 Closed is soft Red
  if (lowerStatus === 'open') {
    return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent">Open</Badge>;
  }
  if (lowerStatus === 'closed') {
    return <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-transparent">Closed</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

export function SubmissionStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const lower = status.toLowerCase();
  if (lower === 'verified') return <Badge className="bg-green-500 hover:bg-green-600 text-white border-transparent">Verified</Badge>;
  if (lower === 'submitted') return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-transparent">Submitted</Badge>;
  if (lower === 'failed' || lower === 'invalid') return <Badge variant="destructive" className="capitalize">{status}</Badge>;
  return <Badge variant="secondary" className="capitalize">{status}</Badge>;
}


// ♻️ REUSABLE ROW COMPONENT: Handles full-row clicks cleanly via CSS overlay
function TicketItemRow({ ticket, submissionStatus, showCategory = true }: { ticket: any; submissionStatus?: string; showCategory?: boolean }) {
  return (
    <TableRow className="relative group hover:bg-muted/50 transition-colors">
      <TableCell className="font-mono font-bold">
        <Link 
          href={`/tickets/${ticket.ticket_id}`} 
          className="text-primary hover:underline after:absolute after:inset-0 after:z-0"
        >
          {ticket.ticket_id}
        </Link>
      </TableCell>
      <TableCell className="font-medium text-muted-foreground z-10 relative pointer-events-none md:table-cell hidden">
        {ticket.ticket_owner}
      </TableCell>
      <TableCell className="max-w-[180px] sm:max-w-[300px] truncate z-10 relative pointer-events-none" title={ticket.subject}>
        {ticket.subject}
      </TableCell>
      {showCategory && (
        <TableCell className="z-10 relative md:table-cell hidden">
          {ticket.request_category ? (
            <Badge variant="outline" className="font-normal">{ticket.request_category}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
      <TableCell className="z-10 relative"><StatusBadge status={ticket.status} /></TableCell>
      <TableCell className="z-10 relative"><SubmissionStatusBadge status={submissionStatus} /></TableCell>
    </TableRow>
  );
}

export default function Tickets() {
  const { data: tickets, isLoading: ticketsLoading } = useTickets();
  const { data: submissions, isLoading: submissionsLoading } = useSubmissions();
  const { data: categories } = useCategories();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "group">("list");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const getSubmissionStatus = (ticketId: string) => {
    if (!submissions) return undefined;
    return submissions.find(s => s.ticket_id === ticketId)?.status;
  };

  // 🔄 FIXED: Normalized strings to lowercase to ensure absolute consistency across components
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => {
      const matchSearch = t.ticket_id.toLowerCase().includes(search.toLowerCase()) || 
                          t.ticket_owner.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchCategory = categoryFilter === "all" || t.request_category?.toLowerCase() === categoryFilter.toLowerCase();
      return matchSearch && matchStatus && matchCategory;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const pagedTickets = filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const groupedTickets = useMemo(() => {
    const groups: Record<string, typeof filteredTickets> = {};
    filteredTickets.forEach(t => {
      const cat = t.request_category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [filteredTickets]);

  if (ticketsLoading || submissionsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="space-y-4 mt-8">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track material requests</p>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search by ID or owner..." 
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              data-testid="input-search-tickets"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); resetPage(); }}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); resetPage(); }}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex bg-muted rounded-md p-1 ml-auto w-full md:w-auto">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 md:flex-none h-8 px-3 gap-2 ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">List</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 md:flex-none h-8 px-3 gap-2 ${viewMode === 'group' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewMode('group')}
            >
              <Layers className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">Grouped</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredTickets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No tickets found</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            Try adjusting your search query or filters to find what you're looking for.
          </p>
        </Card>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          {viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Ticket ID</TableHead>
                  <TableHead className="md:table-cell hidden">Owner</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="md:table-cell hidden">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTickets.map((ticket) => (
                  <TicketItemRow 
                    key={ticket.id} 
                    ticket={ticket} 
                    submissionStatus={getSubmissionStatus(ticket.ticket_id)} 
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedTickets).map(([cat, tkts]) => (
                <AccordionItem value={cat} key={cat} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-4 py-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{cat}</span> 
                      <Badge variant="secondary" className="ml-2 font-normal rounded-full">{tkts.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-0">
                    <Table>
                      <TableBody>
                        {tkts.map((ticket) => (
                          <TicketItemRow 
                            key={ticket.id} 
                            ticket={ticket} 
                            submissionStatus={getSubmissionStatus(ticket.ticket_id)} 
                            showCategory={false}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>            
          )}
        </div>
      )}

      {viewMode === 'list' && filteredTickets.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredTickets.length)}–{Math.min(page * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length} tickets
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              data-testid="button-pagination-prev"
            >
              Previous
            </Button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              data-testid="button-pagination-next"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
