import { getTicketStatusClasses, getSubmissionStatusClasses } from "@/lib/calculations";

/* ─────────────────────────────────────────────────────────────── */
/* STATUS BADGE COMPONENTS */
/* ─────────────────────────────────────────────────────────────── */

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider border ${getTicketStatusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

export function SubmissionStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground/40 text-xs">—</span>;
  
  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium rounded-md capitalize border ${getSubmissionStatusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

export function CategoryBadge({ name }: { name?: string }) {
  if (!name || name === "-")
    return <span className="text-muted-foreground/40 text-xs">—</span>;

  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded border border-border bg-muted/40 text-muted-foreground">
      {name}
    </span>
  );
}
