import { useState, useMemo } from "react";
import { useSubmissions } from "@/hooks/use-submissions";
import { useCategories, useMaterials } from "@/hooks/use-materials";
import { useTickets } from "@/hooks/use-tickets";
import { supabase } from "@/lib/supabase";
import { SubmissionStatusBadge } from "@/components/status-badge";
import { STATUS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Search, ChevronDown, Paperclip, AlertTriangle, X, Download } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { useSubmissionItems, useSubmissionVersions, Submission } from "@/hooks/use-submissions";
import { toast } from "sonner";

export default function Admin() {
  const { data: submissions, isLoading } = useSubmissions();
  const { data: categories } = useCategories();
  const { data: tickets } = useTickets();
  const { data: materials } = useMaterials();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [exporting, setExporting] = useState(false);

  const stats = useMemo(() => {
    if (!submissions) return { total: 0, submitted: 0, verified: 0, flagged: 0 };
    return {
      total: submissions.length,
      submitted: submissions.filter(s => s.status === STATUS.SUBMITTED).length,
      verified: submissions.filter(s => s.status === STATUS.VERIFIED).length,
      flagged: submissions.filter(s => s.status === STATUS.FAILED || s.status === STATUS.INVALID).length,
    };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter(s => {
      const matchSearch = s.ticket_id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusTab === "all" || s.status === statusTab;
      return matchSearch && matchStatus;
    });
  }, [submissions, search, statusTab]);

  const handleExportExcel = async () => {
    if (!submissions || !tickets || !materials) {
      toast.error("Data still loading, please try again in a moment.");
      return;
    }
    setExporting(true);
    try {
      const exportable = submissions.filter(
        s => s.status === STATUS.SUBMITTED || s.status === STATUS.VERIFIED
      );
      if (exportable.length === 0) {
        toast.error("No submitted or verified records to export.");
        setExporting(false);
        return;
      }
  
      const ids = exportable.map(s => s.id);
      const { data: allItems, error } = await supabase
        .from('submission_items')
        .select('*')
        .in('submission_id', ids);
      if (error) throw error;
  
      const ticketByTid = new Map(tickets.map(t => [t.ticket_id, t]));
      const materialById = new Map(materials.map(m => [m.id, m]));
   
      // Group submissions by category, then by ISO week number
      const byCategory = new Map<string, Map<number, typeof exportable>>();
      for (const sub of exportable) {
        const ticket = ticketByTid.get(sub.ticket_id);
        const category = ticket?.request_category ?? "UNCATEGORISED";
        const weekNum = getISOWeek(new Date(sub.updated_at)); // use your date-fns getISOWeek
  
        if (!byCategory.has(category)) byCategory.set(category, new Map());
        const weekMap = byCategory.get(category)!;
        if (!weekMap.has(weekNum)) weekMap.set(weekNum, []);
        weekMap.get(weekNum)!.push(sub);
      }
  
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
  
      // Colours
      const BLUE_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } } as const;
      const YELLOW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as const;
      const RED_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } } as const;
      const GREY_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } } as const;
  
      const boldFont   = { bold: true, name: 'Arial', size: 10 };
      const normalFont = { bold: false, name: 'Arial', size: 10 };
      const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true } as const;
      const leftAlign   = { horizontal: 'left',   vertical: 'middle', wrapText: true } as const;
  
      const thin = { style: 'thin', color: { argb: 'FF000000' } } as const;
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
  
      // Columns: B=SN, C=TicketNo, D=JC Date, E=Material, F=UOM, G=Qty, H=Rate, I=Total, J=Remarks, K=TotalCost, L=Image
      const COL = { SN: 2, TICKET: 3, JC: 4, MAT: 5, UOM: 6, QTY: 7, RATE: 8, TOTAL: 9, REMARKS: 10, TOTALCOST: 11, IMAGE: 12 };
  
      for (const [category, weekMap] of byCategory) {
        const ws = wb.addWorksheet(category.toUpperCase());
  
        ws.columns = [
          { width: 4  },  // A - spacer
          { width: 6  },  // B - S/N
          { width: 14 },  // C - Ticket No
          { width: 14 },  // D - J-C Date
          { width: 30 },  // E - Material
          { width: 8  },  // F - UOM
          { width: 8  },  // G - Qty
          { width: 12 },  // H - Rate
          { width: 12 },  // I - Total
          { width: 20 },  // J - Remarks
          { width: 14 },  // K - Total Cost
          { width: 28 },  // L - Image Attachment
        ];
  
        let rowIdx = 1;
  
        const sortedWeeks = [...weekMap.keys()].sort((a, b) => a - b);
  
        for (const weekNum of sortedWeeks) {
          const weekSubs = weekMap.get(weekNum)!;
  
          // ── WEEK HEADER ROW ──────────────────────────────────────────
          const weekRow = ws.getRow(rowIdx);
          weekRow.height = 20;
  
          const snCell = weekRow.getCell(COL.SN);
          snCell.value = 'S/NO';
          snCell.font = boldFont;
          snCell.fill = GREY_FILL;
          snCell.alignment = centerAlign;
          snCell.border = allBorders;
  
          const ticketCell = weekRow.getCell(COL.TICKET);
          ticketCell.value = 'TICKET NO';
          ticketCell.font = boldFont;
          ticketCell.fill = GREY_FILL;
          ticketCell.alignment = centerAlign;
          ticketCell.border = allBorders;
  
          const weekCell = weekRow.getCell(COL.JC);
          weekCell.value = `WEEK ${weekNum}`;
          weekCell.font = boldFont;
          weekCell.fill = GREY_FILL;
          weekCell.alignment = centerAlign;
          weekCell.border = allBorders;
          ws.mergeCells(rowIdx, COL.JC, rowIdx, COL.REMARKS);
  
          const imgHeaderCell = weekRow.getCell(COL.IMAGE);
          imgHeaderCell.value = 'DOCUMENT ATTACHMENT';
          imgHeaderCell.font = { ...boldFont, color: { argb: 'FFFFFFFF' } };
          imgHeaderCell.fill = RED_FILL;
          imgHeaderCell.alignment = centerAlign;
          imgHeaderCell.border = allBorders;
  
          rowIdx++;
  
          // ── TICKET BLOCKS ─────────────────────────────────────────────
          let snCounter = 1;
          for (const sub of weekSubs) {
            const ticket = ticketByTid.get(sub.ticket_id);
            const items = (allItems ?? []).filter(i => i.submission_id === sub.id);
            const blockSize = Math.max(items.length, 1);
  
            const jcDate = ticket?.closed_time
              ? format(new Date(ticket.closed_time), 'dd/MM/yyyy')
              : '';
  
            // Subject line row
            const subjRow = ws.getRow(rowIdx);
            subjRow.height = 18;
            const subjCell = subjRow.getCell(COL.JC);
            subjCell.value = `${ticket?.subject ?? ''} (Ticket Number: ${sub.ticket_id})`;
            subjCell.font = { ...boldFont, color: { argb: 'FF000000' } };
            subjCell.fill = BLUE_FILL;
            subjCell.alignment = leftAlign;
            subjCell.border = allBorders;
            ws.mergeCells(rowIdx, COL.JC, rowIdx, COL.REMARKS);
  
            const tcLabelCell = subjRow.getCell(COL.TOTALCOST);
            tcLabelCell.value = 'TOTAL COST';
            tcLabelCell.font = boldFont;
            tcLabelCell.alignment = centerAlign;
            tcLabelCell.border = allBorders;
  
            rowIdx++;
  
            // Column header row
            const hdrRow = ws.getRow(rowIdx);
            hdrRow.height = 16;
            const headers: [number, string][] = [
              [COL.JC, 'J-C DATE'], [COL.MAT, 'MATERIAL USED'], [COL.UOM, 'UOM'],
              [COL.QTY, 'QTY'], [COL.RATE, 'RATE'], [COL.TOTAL, 'TOTAL'], [COL.REMARKS, 'REMARKS'],
            ];
            for (const [col, label] of headers) {
              const c = hdrRow.getCell(col);
              c.value = label;
              c.font = boldFont;
              c.fill = YELLOW_FILL;
              c.alignment = centerAlign;
              c.border = allBorders;
            }
            rowIdx++;
  
            // Material rows
            const matStartRow = rowIdx;
            let blockTotal = 0;
  
            for (let i = 0; i < items.length; i++) {
              const it = items[i];
              const mat = it.material_id != null ? materialById.get(it.material_id) : null;
              const lineTotal = Number(it.total_price);
              blockTotal += lineTotal;
  
              const matRow = ws.getRow(rowIdx);
              matRow.height = 15;
  
              const setCell = (col: number, val: any, fmt?: string) => {
                const c = matRow.getCell(col);
                c.value = val;
                c.font = normalFont;
                c.alignment = col === COL.MAT ? leftAlign : centerAlign;
                c.border = allBorders;
                if (fmt) c.numFmt = fmt;
              };
  
              setCell(COL.MAT, it.name);
              setCell(COL.UOM, '');
              setCell(COL.QTY, Number(it.quantity));
              setCell(COL.RATE, Number(it.unit_price), '#,##0.00');
              setCell(COL.TOTAL, lineTotal, '#,##0.00');
  
              rowIdx++;
            }
  
            // Total row
            const totalRow = ws.getRow(rowIdx);
            totalRow.height = 15;
            const totalLabelCell = totalRow.getCell(COL.RATE);
            totalLabelCell.value = 'TOTAL';
            totalLabelCell.font = boldFont;
            totalLabelCell.alignment = centerAlign;
            totalLabelCell.border = allBorders;
  
            const totalValCell = totalRow.getCell(COL.TOTAL);
            totalValCell.value = blockTotal;
            totalValCell.font = boldFont;
            totalValCell.numFmt = '#,##0.00';
            totalValCell.alignment = centerAlign;
            totalValCell.border = allBorders;
  
            const tcValCell = totalRow.getCell(COL.TOTALCOST);
            tcValCell.value = blockTotal;
            tcValCell.font = boldFont;
            tcValCell.numFmt = '#,##0.00';
            tcValCell.alignment = centerAlign;
            tcValCell.border = allBorders;
  
            rowIdx++;
  
            // ── Merge S/N, Ticket No, J-C Date vertically across block ──
            const mergeStart = matStartRow - 1; // from header row
            const mergeEnd   = rowIdx - 1;      // up to and including total row
  
            // S/N — merged from subject row to total row
            ws.mergeCells(mergeStart - 1, COL.SN, mergeEnd, COL.SN);
            const snMergedCell = ws.getCell(mergeStart - 1, COL.SN);
            snMergedCell.value = snCounter++;
            snMergedCell.font = boldFont;
            snMergedCell.alignment = centerAlign;
            snMergedCell.border = allBorders;
  
            ws.mergeCells(matStartRow, COL.TICKET, mergeEnd, COL.TICKET);
            const ticketMergedCell = ws.getCell(matStartRow, COL.TICKET);
            ticketMergedCell.value = sub.ticket_id;
            ticketMergedCell.font = normalFont;
            ticketMergedCell.alignment = centerAlign;
            ticketMergedCell.border = allBorders;
  
            ws.mergeCells(matStartRow, COL.JC, mergeEnd, COL.JC);
            const jcMergedCell = ws.getCell(matStartRow, COL.JC);
            jcMergedCell.value = jcDate;
            jcMergedCell.font = normalFont;
            jcMergedCell.alignment = centerAlign;
            jcMergedCell.border = allBorders;
  
            // ── Image ─────────────────────────────────────────────────────
            const imgMergeStart = mergeStart - 1;
            const imgMergeEnd   = mergeEnd;
            ws.mergeCells(imgMergeStart, COL.IMAGE, imgMergeEnd, COL.IMAGE);
  
            if (sub.image_attached && sub.image_url) {
              try {
                const resp = await fetch(sub.image_url);
                const arrayBuf = await resp.arrayBuffer();
                const ext = sub.image_url.split('.').pop()?.toLowerCase() ?? 'jpeg';
                const mimeMap: Record<string, 'jpeg'|'png'|'gif'> = {
                  jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif',
                };
                const imgType = mimeMap[ext] ?? 'jpeg';
  
                const imageId = wb.addImage({
                  buffer: arrayBuf,
                  extension: imgType,
                });
  
                // Calculate row positions for image placement
                ws.addImage(imageId, {
                  tl: { col: COL.IMAGE - 1, row: imgMergeStart - 1 } as any,
                  br: { col: COL.IMAGE,     row: imgMergeEnd } as any,
                  editAs: 'oneCell',
                });
              } catch {
                ws.getCell(imgMergeStart, COL.IMAGE).value = 'Image unavailable';
              }
            }
  
            rowIdx++; // spacer between ticket blocks
          }
  
          rowIdx++; // spacer between weeks
        }
      }
  
      // ── Write file in browser ─────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opex-submissions-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
  
      toast.success(`Exported ${exportable.length} submission(s).`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 page-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Admin overview</h1>
            <Badge variant="outline" className="bg-muted text-muted-foreground shadow-sm">Read-only</Badge>
          </div>
          <p className="text-muted-foreground text-sm">Submitted and verified materials across all tickets.</p>
        </div>
        <Button onClick={handleExportExcel} disabled={exporting || isLoading} className="gap-2">
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Total Submissions</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.submitted}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Submitted</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.verified}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Verified</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="text-3xl font-bold">{stats.flagged}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Flagged</div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-muted/30">
          <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full overflow-x-auto">
            <TabsList className="w-full sm:w-auto flex justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="invalid">Invalid</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search Ticket ID..." 
              className="pl-9 h-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Ticket ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Image</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No submissions match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((sub) => (
                  <TableRow 
                    key={sub.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSubmission(sub)}
                  >
                    <TableCell className="font-mono font-bold">{sub.ticket_id}</TableCell>
                    <TableCell><SubmissionStatusBadge status={sub.status} /></TableCell>
                    <TableCell className="text-right font-semibold">${Number(sub.total_price).toFixed(2)}</TableCell>
                    <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[150px]">{sub.contact_email || "—"}</span>
                      {sub.is_custom_email && (
                        <span title="Custom email" className="flex items-center">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        </span>
                      )}
                    </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {sub.image_attached ? <Paperclip className="h-4 w-4 mx-auto text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(sub.updated_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SubmissionSidePanel 
        submission={selectedSubmission} 
        open={!!selectedSubmission} 
        onOpenChange={(o) => !o && setSelectedSubmission(null)} 
      />
    </div>
  );
}

function SubmissionSidePanel({ submission, open, onOpenChange }: { submission: Submission | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: items } = useSubmissionItems(submission?.id);
  const { data: versions } = useSubmissionVersions(submission?.id);

  if (!submission) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        <div className="p-6 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-2xl font-mono">{submission.ticket_id}</SheetTitle>
              <SubmissionStatusBadge status={submission.status} />
            </div>
          </div>
          <SheetDescription>
            Last updated {format(new Date(submission.updated_at), 'PPpp')}
          </SheetDescription>
        </div>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto">
          
          {/* Submission Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Submission Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Total Price</div>
                <div className="font-bold text-lg">${Number(submission.total_price).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Version</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">v{submission.version_index}</span>
                  {submission.edited && <Badge variant="outline" className="text-[10px] uppercase">Edited</Badge>}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Contact Email</div>
                <div className="flex items-center gap-2">
                  <span>{submission.contact_email || "None provided"}</span>
                  {submission.is_custom_email && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border-transparent hover:bg-yellow-100">Custom</Badge>}
                </div>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Line Items</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right w-16">Qty</TableHead>
                    <TableHead className="text-right w-24">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!items || items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No items</TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.name}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">${Number(item.total_price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-muted/10 font-bold">
                    <TableCell colSpan={2} className="text-right">Total</TableCell>
                    <TableCell className="text-right">${Number(submission.total_price).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Attachment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Attachment</h3>
            {submission.image_attached && submission.image_url ? (
              <div className="rounded-md border overflow-hidden bg-muted/20">
                <img src={submission.image_url} alt="Receipt" className="w-full h-auto object-contain max-h-[300px]" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-md text-center">
                No image attached to this submission.
              </div>
            )}
          </section>

          {/* Admin Notes */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">Admin Notes (Coming Soon)</h3>
            <Textarea disabled placeholder="Notes functionality is disabled in read-only mode." className="resize-none bg-muted/30" />
          </section>

          {/* History */}
          <section className="space-y-3 pt-4 border-t">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md hover:bg-muted/50 transition-colors border">
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Version History</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                {!versions ? (
                  <div className="text-sm text-muted-foreground">Loading history...</div>
                ) : versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No history available</div>
                ) : (
                  <div className="space-y-3 border-l-2 border-muted ml-3 pl-4 py-2">
                    {versions.map((v, i) => (
                      <div key={v.id} className="relative">
                        <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                        <div className="text-sm font-medium">Snapshot recorded</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(v.created_at), 'PPpp')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}