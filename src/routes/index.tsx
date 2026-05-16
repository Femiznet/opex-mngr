import { createFileRoute } from "@tanstack/react-router";
import { TicketLookup } from "@/components/ticket-lookup";

export const Route = createFileRoute("/")({
  component: TicketLookup,
});
