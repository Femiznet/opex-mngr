import { supabase } from "@/integrations/supabase/client";
import type { SubmissionItemInput, SubmissionStatus } from "./validators";

export type TicketRow = {
  ticket_id: string;
  ticket_owner: string;
  subject: string;
  description: string | null;
  status: "open" | "closed";
  request_category: string | null;
  address: string | null;
  created_time: string;
  closed_time: string | null;
};

export type MaterialRow = {
  id: number;
  name: string;
  price: number;
  qty_available: number;
};

export type SubmissionItemRow = {
  id: number;
  submission_id: number;
  material_id: number | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom: boolean;
};

export type SubmissionRow = {
  id: number;
  ticket_id: string;
  status: SubmissionStatus;
  edited: boolean;
  total_price: number;
  created_at: string;
  updated_at: string;
  version_index: number;
  items: SubmissionItemRow[];
};

export async function fetchTicket(ticketId: string): Promise<TicketRow | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) throw error;
  return data as TicketRow | null;
}

export async function fetchMaterialsByCategory(category: string): Promise<MaterialRow[]> {
  const { data: cat, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("name", category)
    .maybeSingle();
  if (catErr) throw catErr;
  if (!cat) return [];
  const { data, error } = await supabase
    .from("materials")
    .select("id,name,price,qty_available")
    .eq("category_id", cat.id)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    price: Number(m.price),
    qty_available: Number(m.qty_available),
  })) as MaterialRow[];
}

export async function fetchSubmission(ticketId: string): Promise<SubmissionRow | null> {
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) throw error;
  if (!sub) return null;
  const { data: items, error: iErr } = await supabase
    .from("submission_items")
    .select("*")
    .eq("submission_id", sub.id)
    .order("id");
  if (iErr) throw iErr;
  return {
    ...(sub as any),
    total_price: Number(sub.total_price),
    items: (items ?? []).map((i: any) => ({
      ...i,
      unit_price: Number(i.unit_price),
      total_price: Number(i.total_price),
    })),
  } as SubmissionRow;
}

export async function submitItems(
  ticketId: string,
  items: SubmissionItemInput[],
): Promise<{ status: SubmissionStatus }> {
  const matIds = items.map((i) => i.materialId).filter((x): x is number => !!x);
  if (matIds.length) {
    const { data: mats, error: mErr } = await supabase
      .from("materials")
      .select("id,qty_available")
      .in("id", matIds);
    if (mErr) throw mErr;
    const oos = (mats ?? []).find((m: any) => Number(m.qty_available) === 0);
    if (oos) throw new Error("One or more selected materials are out of stock");
  }

  const computed = items.map((i) => ({
    ...i,
    totalPrice: i.quantity * i.unitPrice,
  }));
  const totalPrice = computed.reduce((s, i) => s + i.totalPrice, 0);
  const now = new Date().toISOString();

  const { data: existing, error: exErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (exErr) throw exErr;

  if (existing?.status === "verified") {
    throw new Error("Verified submissions cannot be modified");
  }
  // cancelled is explicitly allowed to resubmit — the upsert will flip status back to 'submitted'

  const { data: upserted, error: upsertErr } = await supabase
    .from("submissions")
    .upsert(
      {
        ticket_id: ticketId,
        status: "submitted",
        edited: existing ? true : false,
        total_price: totalPrice,
        updated_at: now,
        version_index: existing ? existing.version_index + 1 : 1,
        ...(existing ? {} : { created_at: now }),
      },
      { onConflict: "ticket_id" },
    )
    .select("id")
    .single();
  if (upsertErr) throw upsertErr;
  const submissionId = upserted.id as number;

  if (existing) {
    const { error: dErr } = await supabase
      .from("submission_items")
      .delete()
      .eq("submission_id", submissionId);
    if (dErr) throw dErr;
  }

  if (computed.length) {
    const { error: insErr } = await supabase.from("submission_items").insert(
      computed.map((i) => ({
        submission_id: submissionId,
        material_id: i.materialId ?? null,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total_price: i.totalPrice,
        is_custom: i.isCustom ?? false,
      })),
    );
    if (insErr) throw insErr;
  }

  const { error: vErr } = await supabase.from("submission_versions").insert({
    submission_id: submissionId,
    snapshot: { ticketId, items: computed, totalPrice, timestamp: now },
    created_at: now,
  });
  if (vErr) throw vErr;

  return { status: "submitted" };
}

export async function cancelSubmission(ticketId: string): Promise<void> {
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("id,status")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) throw error;
  if (!sub) throw new Error("Submission not found");
  if (!["submitted", "failed"].includes(sub.status)) {
    throw new Error("Can only cancel submitted or failed submissions");
  }
  const { error: uErr } = await supabase
    .from("submissions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sub.id);
  if (uErr) throw uErr;
}

export async function undoSubmission(ticketId: string): Promise<void> {
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) throw error;
  if (!sub) throw new Error("Submission not found");
  if (sub.status === "verified") throw new Error("Cannot undo verified submission");

  const { data: versions, error: vErr } = await supabase
    .from("submission_versions")
    .select("*")
    .eq("submission_id", sub.id)
    .order("created_at", { ascending: false })
    .limit(2);
  if (vErr) throw vErr;
  if (!versions || versions.length < 2) throw new Error("Nothing to undo");

  const previous = versions[1];
  const snapshot = previous.snapshot as {
    items: Array<{
      materialId?: number | null;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      isCustom: boolean;
    }>;
    totalPrice: number;
  };
  const now = new Date().toISOString();

  const { error: dErr } = await supabase
    .from("submission_items")
    .delete()
    .eq("submission_id", sub.id);
  if (dErr) throw dErr;

  if (snapshot.items.length) {
    const { error: insErr } = await supabase.from("submission_items").insert(
      snapshot.items.map((i) => ({
        submission_id: sub.id,
        material_id: i.materialId ?? null,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total_price: i.totalPrice,
        is_custom: i.isCustom,
      })),
    );
    if (insErr) throw insErr;
  }

  const { error: delVerErr } = await supabase
    .from("submission_versions")
    .delete()
    .eq("id", versions[0].id);
  if (delVerErr) throw delVerErr;

  const { error: upErr } = await supabase
    .from("submissions")
    .update({
      total_price: snapshot.totalPrice,
      version_index: Math.max(1, sub.version_index - 1),
      updated_at: now,
      edited: sub.version_index - 1 <= 1 ? false : true,
    })
    .eq("id", sub.id);

  if (upErr) throw upErr;
}
