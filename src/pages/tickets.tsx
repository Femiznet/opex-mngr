import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useTickets } from "@/hooks/use-tickets";
import { useSubmissions } from "@/hooks/use-submissions";
import { useCategories } from "@/hooks/use-materials";
import { LayoutList, Layers, Search, ChevronDown } from "lucide-react";

/* ─── Badge helpers with adaptive Tailwind styles ────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase();
  const cls =
    key === "open"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
      : key === "closed"
      ? "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"
      : "bg-muted text-muted-foreground border border-border";

  return <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${cls}`}>{status}</span>;
}

export function SubmissionStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const key = status.toLowerCase();
  const cls =
    key === "verified"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
      : key === "submitted"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      : key === "failed" || key === "invalid"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
      : "bg-muted text-muted-foreground border border-border";
      
  return <span className={`px-2.5 py-0.5 text-xs font-medium rounded-md capitalize ${cls}`}>{status}</span>;
}

function CategoryBadge({ name }: { name?: string }) {
  if (!name) return <span className="text-muted-foreground/40 text-xs">—</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded border border-border bg-muted/40 text-muted-foreground">{name}</span>;
}

export default function Tickets() {
  const { data: tickets, isLoading: ticketsLoading } = useTickets();
  const { data: submissions, isLoading: submissionsLoading } = useSubmissions();
  const { data: categories } = useCategories();
  const [, setLocation] = useLocation();

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode]           = useState<"list" | "group">("list");
  const [page, setPage]                   = useState(1);
  const [openGroups, setOpenGroups]       = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 10;

  const getSubmissionStatus = (ticketId: string) =>
    submissions?.find((s) => s.ticket_id === ticketId)?.status;

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchSearch = t.ticket_id.toLowerCase().includes(q) || t.ticket_owner.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter;
      const matchCategory = categoryFilter === "all" || t.request_category?.toLowerCase() === categoryFilter.toLowerCase();
      return matchSearch && matchStatus && matchCategory;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const totalPages  = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const pagedTickets = filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const groupedTickets = useMemo(() => {
    const groups: Record<string, typeof filteredTickets> = {};
    filteredTickets.forEach((t) => {
      const cat = t.request_category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [filteredTickets]);

  const toggleGroup = (cat: string) => {
    setOpenGroups(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const resetPage = () => setPage(1);
  const isLoading = ticketsLoading || submissionsLoading;

  return (
    <div className="container mx-auto px-4 max-w-7xl py-6 space-y-6">
      {/* Header Block */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
          All tickets
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage and track material expense sheets
        </p>
      </div>

      {/* Toolbar Controls Card */}
      {/* FIXED: Swapped out legacy background rules for explicit bg-card (pure white in light mode) to lift it off the soft gray canvas background */}
      <div className="flex flex-col md:flex-row gap-3 bg-card border border-border p-4 rounded-xl shadow-sm">
        {/* Input Search Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          {/* FIXED: Changed bg-background/bg-muted rules to let the search block render crisply in relation to the primary container canvas */}
          <input
            type="search"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-muted/30 focus:bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
            placeholder="Search by ID or owner…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            data-testid="input-search-tickets"
          />
        </div>

        {/* Filters and Switcher controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="h-10 px-3 pr-8 rounded-lg border border-input bg-muted/30 focus:bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://w3.org')] bg-no-repeat bg-[position:right_0.75rem_center] transition-colors" 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <select 
            className="h-10 px-3 pr-8 rounded-lg border border-input bg-muted/30 focus:bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer max-w-[200px] appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://w3.org')] bg-no-repeat bg-[position:right_0.75rem_center] transition-colors" 
            value={categoryFilter} 
            onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
          >
            <option value="all">All categories</option>
            {categories?.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          {/* Tab View Layout Toggles */}
          <div className="flex h-10 rounded-lg border border-input p-1 bg-muted/50 items-center">
            <button 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} 
              onClick={() => setViewMode("list")} 
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
              <span>List</span>
            </button>
            <button 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "group" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} 
              onClick={() => setViewMode("group")} 
              aria-label="Grouped view"
            >
              <Layers className="h-4 w-4" />
              <span>Grouped</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Context Dashboard Router View */}
      {isLoading ? (
        <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-muted/40 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-border rounded-xl bg-card shadow-sm">
          <div className="p-3 bg-muted rounded-full text-muted-foreground mb-4">
            <Search className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="font-semibold text-lg text-foreground">No records found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            Try adjusting your search term or filter criteria to find what you're looking for.
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* Data Grid Layout View Mode */
        /* FIXED: Enforced explicit bg-card layer context onto table components so background lines remain completely distinct */
        <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-foreground">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Ticket ID</th>
                  <th className="p-4 hidden md:table-cell">Owner</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4 hidden sm:table-cell">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedTickets.map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => setLocation(`/tickets/${t.ticket_id}`)} 
                    className="hover:bg-muted/30 transition-colors cursor-pointer group select-none"
                  >
                    <td className="p-4 font-mono font-bold text-violet-600 dark:text-violet-400 group-hover:underline">{t.ticket_id}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{t.ticket_owner}</td>
                    <td className="p-4 font-medium max-w-xs truncate" title={t.subject}>{t.subject}</td>
                    <td className="p-4 hidden sm:table-cell"><CategoryBadge name={t.request_category ?? "-"} /></td>
                    <td className="p-4"><StatusBadge status={t.status} /></td>
                    <td className="p-4"><SubmissionStatusBadge status={getSubmissionStatus(t.ticket_id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Accordion Stack View Mode */
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {Object.entries(groupedTickets).map(([cat, tkts]) => {
            const isOpen = !!openGroups[cat];
            return (
              <div key={cat} className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
                <button 
                  type="button" 
                  className="w-full flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/20 transition-colors font-semibold"
                  onClick={() => toggleGroup(cat)}
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-base text-foreground font-bold tracking-tight">{cat}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground font-medium">{tkts.length}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isOpen && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-foreground">
                      <tbody className="divide-y divide-border">
                        {tkts.map((t) => (
                          <tr 
                            key={t.id} 
                            onClick={() => setLocation(`/tickets/${t.ticket_id}`)} 
                            className="hover:bg-muted/30 transition-colors cursor-pointer group select-none"
                          >
                            <td className="p-4 font-mono font-bold text-violet-600 dark:text-violet-400 w-32 group-hover:underline">{t.ticket_id}</td>
                            <td className="p-4 text-muted-foreground hidden md:table-cell w-48">{t.ticket_owner}</td>
                            <td className="p-4 font-medium" title={t.subject}>{t.subject}</td>
                            <td className="p-4 w-28"><StatusBadge status={t.status} /></td>
                            <td className="p-4 w-32"><SubmissionStatusBadge status={getSubmissionStatus(t.ticket_id)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controller Row footer */}
      {viewMode === "list" && !isLoading && filteredTickets.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-border bg-card rounded-xl shadow-sm">
          <span className="text-sm text-muted-foreground font-medium">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredTickets.length)}–{Math.min(page * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length} items
          </span>
          <div className="flex items-center gap-3">
            <button 
              className="h-9 px-4 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page === 1} 
              data-testid="button-pagination-prev"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-foreground bg-muted/60 px-3 py-1.5 rounded-md min-w-[60px] text-center">
              {page} / {totalPages}
            </span>
            <button 
              className="h-9 px-4 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages} 
              data-testid="button-pagination-next"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
