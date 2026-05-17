import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { formatDateTime } from "@/lib/format";
import type { TicketRow } from "@/lib/submissions";

export function TicketHeader({ ticket }: { ticket: TicketRow }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{ticket.subject}</h2>
            {ticket.description && (
              <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ticket ID</div>
            <div className="font-semibold font-mono">{ticket.ticket_id}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
            <div className="font-semibold">
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Category</div>
            <div className="font-semibold">{ticket.request_category ?? "Uncategorised"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Owner</div>
            <div className="font-semibold">{ticket.ticket_owner}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Address</div>
            <div>{ticket.address ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Created</div>
            <div>{formatDateTime(ticket.created_time)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
