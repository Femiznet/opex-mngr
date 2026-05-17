import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketHeader } from "@/components/ticket-header";
import { SubmissionStatusBar } from "@/components/submission-status";
import { MaterialSelector, type DraftItem } from "@/components/material-selector";
import { LineItemsTable } from "@/components/line-items-table";
import { formatCurrency } from "@/lib/format";
import {
  cancelSubmission,
  fetchMaterialsByCategory,
  fetchSubmission,
  fetchTicket,
  submitItems,
  undoSubmission,
} from "@/lib/submissions";
import { ArrowLeft, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/tickets/$ticketId")({
  component: TicketPage,
});

function TicketPage() {
  const { ticketId } = Route.useParams();
  const qc = useQueryClient();

  const ticketQ = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });
  const submissionQ = useQuery({
    queryKey: ["submission", ticketId],
    queryFn: () => fetchSubmission(ticketId),
  });
  const category = ticketQ.data?.request_category?.toLowerCase() ?? undefined;
  const materialsQ = useQuery({
    queryKey: ["materials", category],
    queryFn: () => fetchMaterialsByCategory(category!),
    enabled: !!category,
  });

  const [items, setItems] = useState<DraftItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingCancelled, setEditingCancelled] = useState(false);

  // Hydrate draft from current submission
  useEffect(() => {
    if (!submissionQ.data) {
      setItems([]);
      return;
    }
    const matMap = new Map((materialsQ.data ?? []).map((m) => [m.id, m]));
    setItems(
      submissionQ.data.items.map((i) => {
        const mat = i.material_id ? matMap.get(i.material_id) : undefined;
        return {
          key: `s-${i.id}`,
          materialId: i.material_id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          isCustom: i.is_custom,
          isPriceEditable: i.is_custom || (mat ? mat.price === 0 : false),
        };
      }),
    );
  }, [submissionQ.data, materialsQ.data]);

  const sub = submissionQ.data;
  const locked = sub?.status === "verified";
  const isCancelled = sub?.status === "cancelled";
  // Editing is allowed when no submission, when cancelled (after user opts in), or when editable status
  const canEdit =
    !locked &&
    (!sub || editingCancelled || !["cancelled"].includes(sub.status) || editingCancelled);
  const editable = !locked && (!isCancelled || editingCancelled);

  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const invalid = items.some((i) => !i.name.trim() || i.quantity < 1 || i.unitPrice < 0);

  function addItem(it: DraftItem) {
    if (!editable) {
      toast.error("A cancelled submission already exists. Edit or resubmit it.");
      return;
    }
    setItems((prev) => {
      if (it.materialId) {
        const existing = prev.find((p) => p.materialId === it.materialId && !p.isCustom);
        if (existing) {
          toast.success("Quantity updated.");
          return prev.map((p) => (p === existing ? { ...p, quantity: p.quantity + 1 } : p));
        }
      } else if (it.isCustom) {
        const key = it.name.trim().toLowerCase();
        const existing = prev.find(
          (p) => p.isCustom && p.name.trim().toLowerCase() === key,
        );
        if (existing) {
          toast.success("Quantity updated.");
          return prev.map((p) =>
            p === existing ? { ...p, quantity: p.quantity + it.quantity } : p,
          );
        }
      }
      return [...prev, it];
    });
  }
  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((p) => p.key !== key));
  }

  async function doSubmit(itemsToSend: DraftItem[]) {
    const wasNew = !sub;
    setBusy(true);
    try {
      await submitItems(
        ticketId,
        itemsToSend.map((i) => ({
          materialId: i.materialId ?? null,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          isCustom: i.isCustom,
        })),
      );
      toast.success(wasNew ? "Submission saved." : "Submission updated.");
      setEditingCancelled(false);
      await qc.invalidateQueries({ queryKey: ["submission", ticketId] });
    } catch (err: any) {
      const msg = err?.message ?? "Failed to save submission";
      if (/verified/i.test(msg)) {
        toast.error("This submission has been verified and cannot be changed.");
      } else if (/out of stock/i.test(msg)) {
        toast.error("This material is out of stock.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (items.length === 0 || invalid || locked) return;
    await doSubmit(items);
  }

  async function onResubmit() {
    if (!sub || items.length === 0) return;
    await doSubmit(items);
  }

  async function onCancel() {
    setBusy(true);
    try {
      await cancelSubmission(ticketId);
      toast.success("Submission cancelled.");
      await qc.invalidateQueries({ queryKey: ["submission", ticketId] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to cancel");
    } finally {
      setBusy(false);
    }
  }

  async function onUndo() {
    setBusy(true);
    try {
      await undoSubmission(ticketId);
      toast.success("Last edit undone.");
      await qc.invalidateQueries({ queryKey: ["submission", ticketId] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to undo");
    } finally {
      setBusy(false);
    }
  }

  if (ticketQ.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticketQ.data) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">Ticket not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The ticket <code>{ticketId}</code> doesn't exist.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Back to lookup</Link>
        </Button>
      </div>
    );
  }

  const submitDisabled = busy || items.length === 0 || invalid || locked || (isCancelled && !editingCancelled);
  const submitTooltip =
    isCancelled && !editingCancelled
      ? "A cancelled submission already exists. Edit or resubmit it."
      : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-32 lg:p-8 lg:pb-32">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Lookup another ticket
      </Link>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ticket info
        </h2>
        <TicketHeader ticket={ticketQ.data} />
      </section>

      {sub && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Existing submission
          </h2>
          <SubmissionStatusBar
            submission={sub}
            onCancel={onCancel}
            onUndo={onUndo}
            onEdit={() => setEditingCancelled(true)}
            onResubmit={onResubmit}
            busy={busy}
          />
        </section>
      )}

      {editable && category && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Material selection
          </h2>
          {materialsQ.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <MaterialSelector
              materials={materialsQ.data ?? []}
              category={ticketQ.data.request_category ?? undefined}
              onAdd={addItem}
            />
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Line items
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <LineItemsTable
              items={items}
              onUpdate={updateItem}
              onRemove={removeItem}
              readOnly={!editable}
            />
          </CardContent>
        </Card>
      </section>

      {/* Sticky summary & submit footer */}
      {items.length > 0 && !locked && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-2">
              {sub && ["submitted", "failed"].includes(sub.status) && (
                <Button variant="outline" onClick={onCancel} disabled={busy}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={onSubmit}
                disabled={submitDisabled}
                title={submitTooltip}
                size="lg"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sub ? "Resubmit" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
