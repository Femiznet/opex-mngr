import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fetchTicket } from "@/lib/submissions";
import { Loader2, Package } from "lucide-react";

export function TicketLookup() {
  const navigate = useNavigate();
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = ticketId.trim();
    if (!id) return setError("Ticket ID is required");
    setLoading(true);
    try {
      const t = await fetchTicket(id);
      if (!t) {
        setError("Ticket not found");
        return;
      }
      navigate({ to: "/tickets/$ticketId", params: { ticketId: id } });
    } catch (err: any) {
      setError(err.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Package className="h-6 w-6 text-blue-700" />
          </div>
          <CardTitle className="text-2xl">Enter Ticket ID</CardTitle>
          <p className="text-sm text-muted-foreground">
            Look up a ticket to record materials used.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticketId">Ticket ID</Label>
              <Input
                id="ticketId"
                placeholder="Enter your ticket ID"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                aria-invalid={!!error}
                className={error ? "border-red-500" : ""}
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
