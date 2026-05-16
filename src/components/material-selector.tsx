import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { MaterialRow } from "@/lib/submissions";

export type DraftItem = {
  key: string;
  materialId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
  isPriceEditable: boolean;
};

const PAGE_SIZE = 10;

export function MaterialSelector({
  materials,
  onAdd,
}: {
  materials: MaterialRow[];
  onAdd: (item: DraftItem) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? materials.filter((m) => m.name.toLowerCase().includes(q)) : materials;
  }, [materials, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function pick(m: MaterialRow) {
    if (m.qty_available === 0) return;
    onAdd({
      key: `m-${m.id}-${Date.now()}`,
      materialId: m.id,
      name: m.name,
      quantity: 1,
      unitPrice: m.price,
      isCustom: false,
      isPriceEditable: m.price === 0,
    });
  }

  function addCustom() {
    if (!customName.trim() || customQty < 1 || customPrice < 0) return;
    onAdd({
      key: `c-${Date.now()}`,
      materialId: null,
      name: customName.trim(),
      quantity: customQty,
      unitPrice: customPrice,
      isCustom: true,
      isPriceEditable: true,
    });
    setCustomName("");
    setCustomQty(1);
    setCustomPrice(0);
    setCustomOpen(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Materials</CardTitle>
        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Custom item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add custom item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customQty}
                    onChange={(e) => setCustomQty(Math.max(1, +e.target.value || 1))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unit price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Math.max(0, +e.target.value || 0))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addCustom}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No materials in this category. Use a custom item instead.
          </p>
        ) : paginated.length === 0 ? (
          <p className="text-sm text-muted-foreground"> No materials match "{search}".</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((m) => {
              const oos = m.qty_available === 0;
              const priceMissing = m.price === 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pick(m)}
                  disabled={oos}
                  className={`group flex flex-col items-start gap-1 rounded-md border p-3 text-left transition ${
                    oos ? "cursor-not-allowed opacity-60" : "hover:border-blue-500 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="font-medium">{m.name}</span>
                    {oos ? (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Out of stock
                      </Badge>
                    ) : priceMissing ? (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        Price required
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {priceMissing ? "—" : formatCurrency(m.price)} · {m.qty_available} available
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex gap-2">
              {hasPrev && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
                  ← Previous
                </Button>
              )}
              {hasNext && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                  Next →
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
