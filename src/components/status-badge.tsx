import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/validators";

const STYLES: Record<SubmissionStatus | "open" | "closed", string> = {
  draft: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  submitted: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  verified: "bg-green-100 text-green-700 hover:bg-green-100",
  failed: "bg-red-100 text-red-700 hover:bg-red-100",
  invalid: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  cancelled: "bg-slate-100 text-slate-500 line-through hover:bg-slate-100",
  open: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  closed: "bg-slate-100 text-slate-500 hover:bg-slate-100",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
  failed: "Failed",
  invalid: "Invalid",
  cancelled: "Cancelled",
  open: "Open",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: SubmissionStatus | "open" | "closed" }) {
  return (
    <Badge variant="secondary" className={STYLES[status]}>
      {LABELS[status] ?? status}
    </Badge>
  );
}
