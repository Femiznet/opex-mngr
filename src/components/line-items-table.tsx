import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DraftItem } from "./material-selector";

export function LineItemsTable({
  items,
  onUpdate,
  onRemove,
  readOnly,
}: {
  items: DraftItem[];
  onUpdate: (key: string, patch: Partial<DraftItem>) => void;
  onRemove: (key: string) => void;
  readOnly?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
        No items added yet.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="w-24">Qty</TableHead>
          <TableHead className="w-36">Unit price</TableHead>
          <TableHead className="w-32 text-right">Subtotal</TableHead>
          {!readOnly && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => {
          const subtotal = it.quantity * it.unitPrice;
          const priceEditable = !readOnly && (it.isCustom || it.isPriceEditable);
          const nameEditable = !readOnly && it.isCustom;
          return (
            <TableRow key={it.key}>
              <TableCell>
                {nameEditable ? (
                  <Input
                    value={it.name}
                    onChange={(e) => onUpdate(it.key, { name: e.target.value })}
                  />
                ) : (
                  <span className="font-medium">{it.name}</span>
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  it.quantity
                ) : (
                  <Input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) =>
                      onUpdate(it.key, {
                        quantity: Math.max(1, +e.target.value || 1),
                      })
                    }
                  />
                )}
              </TableCell>
              <TableCell>
                {priceEditable ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.unitPrice}
                    onChange={(e) =>
                      onUpdate(it.key, {
                        unitPrice: Math.max(0, +e.target.value || 0),
                      })
                    }
                  />
                ) : (
                  formatCurrency(it.unitPrice)
                )}
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(subtotal)}</TableCell>
              {!readOnly && (
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onRemove(it.key)}>
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
