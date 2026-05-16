import { z } from "zod";

export const TicketIdSchema = z.string().min(1).max(50);

export const SubmissionItemSchema = z.object({
  materialId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1, "Item name required").max(200),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  isCustom: z.boolean().default(false),
});

export const CreateSubmissionSchema = z.object({
  ticketId: TicketIdSchema,
  items: z
    .array(SubmissionItemSchema)
    .min(1, "At least one item required")
    .max(100, "Too many items"),
});

export type SubmissionItemInput = z.infer<typeof SubmissionItemSchema>;
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "failed"
  | "invalid"
  | "cancelled";
