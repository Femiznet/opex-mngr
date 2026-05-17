import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Undo2, Ban, Pencil, Send } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { SubmissionRow } from "@/lib/submissions";

export function SubmissionStatusBar({
  submission,
  onUndo,
  onCancel,
  onEdit,
  onResubmit,
  busy,
}: {
  submission: SubmissionRow;
  onUndo: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onResubmit: () => void;
  busy: boolean;
}) {
  const canUndo = submission.version_index > 1 && submission.status !== "verified";
  const canCancel = ["submitted", "failed"].includes(submission.status);
  const isCancelled = submission.status === "cancelled";

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={submission.status} />
            {submission.edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-lg font-bold">{formatCurrency(submission.total_price)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Last updated {formatDateTime(submission.updated_at)}
          </span>
          <div className="flex flex-wrap gap-2">
            {isCancelled && (
              <>
                <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit submission
                </Button>
                <Button size="sm" onClick={onResubmit} disabled={busy}>
                  <Send className="mr-1 h-4 w-4" /> Resubmit
                </Button>
              </>
            )}
            {canUndo && (
              <Button variant="outline" size="sm" onClick={onUndo} disabled={busy}>
                <Undo2 className="mr-1 h-4 w-4" /> Undo
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={busy}
                className="text-red-600 hover:text-red-700"
              >
                <Ban className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
            {submission.status === "verified" && (
              <span className="text-xs font-medium text-green-600">
                Locked — contact admin to make changes
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
