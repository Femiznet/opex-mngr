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

  const locked = submissionQ.data?.status === "verified";
  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const invalid = items.some((i) => !i.name.trim() || i.quantity < 1 || i.unitPrice < 0);

  function addItem(it: DraftItem) {
    setItems((prev) => {
      if (it.materialId) {
        const existing = prev.find((p) => p.materialId === it.materialId && !p.isCustom);
        if (existing) {
          return prev.map((p) => (p === existing ? { ...p, quantity: p.quantity + 1 } : p));
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

  async function onSubmit() {
    if (items.length === 0 || invalid || locked) return;
    setBusy(true);
    try {
      await submitItems(
        ticketId,
        items.map((i) => ({
          materialId: i.materialId ?? null,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          isCustom: i.isCustom,
        })),
      );
      toast.success("Submission saved");
      await qc.invalidateQueries({ queryKey: ["submission", ticketId] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save submission");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    setBusy(true);
    try {
      await cancelSubmission(ticketId);
      toast.success("Submission cancelled");
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
      toast.success("Restored previous version");
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

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-8">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Lookup another ticket
      </Link>

      <TicketHeader ticket={ticketQ.data} />

      {submissionQ.data && (
        <SubmissionStatusBar
          submission={submissionQ.data}
          onCancel={onCancel}
          onUndo={onUndo}
          busy={busy}
        />
      )}

      {!locked && category && (
        <>
          {materialsQ.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <MaterialSelector materials={materialsQ.data ?? []} onAdd={addItem} />
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineItemsTable
            items={items}
            onUpdate={updateItem}
            onRemove={removeItem}
            readOnly={locked}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold">{formatCurrency(total)}</div>
            </div>
            {!locked && (
              <Button onClick={onSubmit} disabled={busy || items.length === 0 || invalid} size="lg">
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {submissionQ.data ? "Re-submit" : "Submit"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
