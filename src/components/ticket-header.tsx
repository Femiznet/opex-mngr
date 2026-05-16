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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{ticket.ticket_id}</span>
              <span>·</span>
              <span>{ticket.request_category ?? "Uncategorised"}</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold">{ticket.subject}</h1>
            {ticket.description && (
              <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
            )}
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Owner</div>
            <div>{ticket.ticket_owner}</div>
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
