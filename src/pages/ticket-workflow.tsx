import { useState, useMemo, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useTicket } from "@/hooks/use-tickets";
import { useSubmission, useSubmissionItems, useSaveSubmission, SubmissionItem } from "@/hooks/use-submissions";
import { useMaterials, useCategories } from "@/hooks/use-materials";
import { currentUser } from "@/lib/current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Minus, Trash2, ArrowLeft, Eye, UploadCloud, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { SubmissionStatusBadge } from "./tickets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

export default function TicketWorkflow() {
  const [, params] = useRoute("/tickets/:ticketId");
  const ticketId = params?.ticketId;
  const [, setLocation] = useLocation();

  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId || "");
  const { data: existingSubmission, isLoading: subLoading } = useSubmission(ticketId || "");
  const { data: existingItems } = useSubmissionItems(existingSubmission?.id);
  const { data: materials, isLoading: matLoading } = useMaterials();
  const { data: categories } = useCategories();
  const saveMutation = useSaveSubmission();

  const [matSearch, setMatSearch] = useState("");
  const [items, setItems] = useState<Omit<SubmissionItem, 'id' | 'submission_id'>[]>([]);
  const [contactEmail, setContactEmail] = useState(currentUser.email);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (existingSubmission) {
      setContactEmail(existingSubmission.contact_email || currentUser.email);
      setImagePreview(existingSubmission.image_url);
    }
  }, [existingSubmission]);

  useEffect(() => {
    if (existingItems && items.length === 0) {
      setItems(existingItems.map(i => ({
        material_id: i.material_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        is_custom: i.is_custom
      })));
    }
  }, [existingItems]);

  useEffect(() => {
    if (items.length === 0 || existingSubmission?.status === 'verified') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items.length, existingSubmission?.status]);

  const currentTicketCategoryId = useMemo(() => {
    if (!categories || !ticket?.request_category) return null;
    const found = categories.find((c: any) => c.name?.toLowerCase() === ticket.request_category?.toLowerCase());
    return found ? Number(found.id) : null;
  }, [categories, ticket?.request_category]);

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    const q = matSearch.toLowerCase();
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(q);
      const matchesCategory = ticket?.request_category ? Number(m.category_id) === currentTicketCategoryId : true;
      return matchesSearch && matchesCategory;
    });
  }, [materials, matSearch, currentTicketCategoryId, ticket?.request_category]);

  const getRemainingStock = (material: any) => {
    const item = items.find(i => i.material_id === material.id);
    return Math.max(0, material.qty_available - (item ? item.quantity : 0));
  };

  const addItem = (material: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.material_id === material.id);
      if (getRemainingStock(material) <= 0) {
        toast.error("Cannot add more. No units remaining in available warehouse stock.");
        return prev;
      }
      if (existing) {
        return prev.map(i => i.material_id === material.id ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price } : i);
      }
      return [...prev, { material_id: material.id, name: material.name, quantity: 1, unit_price: material.price, total_price: material.price, is_custom: false }];
    });
  };

  const updateItemQty = (index: number, delta: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = newItems[index];
      const originalMaterial = materials?.find(m => m.id === item.material_id);
      if (!originalMaterial) return prev;
      const newQty = item.quantity + delta;
      if (newQty < 1) return prev;
      if (newQty > originalMaterial.qty_available) {
        toast.error(`Only ${originalMaterial.qty_available} units of this item exist in stock.`);
        return prev;
      }
      newItems[index] = { ...item, quantity: newQty, total_price: newQty * item.unit_price };
      return newItems;
    });
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + Number(item.total_price), 0), [items]);
  const isReadOnly = existingSubmission?.status === 'verified';
  const isCustomEmail = contactEmail !== currentUser.email;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Please add at least one line item before submitting.");
      return;
    }
    if (!ticketId) return;
    try {
      setUploadingImage(true);
      let imageUrl = imagePreview;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${ticketId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(filePath, imageFile);
        if (uploadError) throw new Error("Failed to upload image: " + uploadError.message);
        imageUrl = supabase.storage.from('ticket-attachments').getPublicUrl(filePath).data.publicUrl;
      }
      await saveMutation.mutateAsync({
        submission: {
          ...(existingSubmission?.id && { id: Number(existingSubmission.id) }),
          ticket_id: String(ticketId),
          status: 'submitted',
          total_price: Number(totalPrice),
          contact_email: contactEmail || null,
          is_custom_email: !!isCustomEmail,
          image_url: imageUrl,
          image_attached: !!imageUrl,
          edited: !!existingSubmission,
          version_index: (Number(existingSubmission?.version_index) || 0) + 1
        },
        items: items.map(item => ({ ...item, material_id: Number(item.material_id), quantity: Number(item.quantity), unit_price: Number(item.unit_price), total_price: Number(item.total_price), is_custom: !!item.is_custom }))
      });
      toast.success("Submission saved successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save submission.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (ticketLoading || subLoading || matLoading) return <WorkflowSkeleton />;
  if (!ticket) return <WorkflowNotFound />;

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 lg:pb-6 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
      {/* Back & Export Control Bar */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="pl-0 gap-2 mb-4 text-muted-foreground hover:text-foreground group" onClick={() => setLocation('/tickets')}>
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to tickets
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight font-mono text-foreground">{ticket.ticket_id}</h1>
          {existingSubmission && existingSubmission.status !== 'draft' && (
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2 shadow-sm hover:bg-muted/50">
              <Eye className="h-4 w-4" /> Preview Export
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        {/* Left Column Component */}
        <MaterialsCatalog 
          matSearch={matSearch} 
          setMatSearch={setMatSearch} 
          filteredMaterials={filteredMaterials} 
          getRemainingStock={getRemainingStock} 
          addItem={addItem} 
          isReadOnly={isReadOnly} 
          categoryName={ticket.request_category} 
        />
        
        {/* Right Column Stack Components */}
        <div className="space-y-6">
          <TicketMetaDataCard ticket={ticket} />
          
          {existingSubmission && (
            <Card className="bg-blue-50/40 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/40 shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1.5">Existing Submission</div>
                  <div className="flex items-center gap-2">
                    <SubmissionStatusBadge status={existingSubmission.status} />
                    {existingSubmission.edited && <Badge variant="outline" className="text-[10px] bg-background border-blue-200 text-blue-700 font-bold">EDITED</Badge>}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-muted-foreground font-medium">Recorded Total</div>
                  <div className="text-xl font-black font-mono text-blue-900 dark:text-blue-300">${Number(existingSubmission.total_price).toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <LineItemsTable items={items} materials={materials} isReadOnly={isReadOnly} updateItemQty={updateItemQty} removeItem={removeItem} totalPrice={totalPrice} />
          
          <SubmissionDetailsCard 
            contactEmail={contactEmail} setContactEmail={setContactEmail} isCustomEmail={isCustomEmail} imagePreview={imagePreview} handleImageChange={handleImageChange} removeImage={removeImage} isReadOnly={isReadOnly} handleSubmit={handleSubmit} items={items} pending={saveMutation.isPending || uploadingImage} 
          />
        </div>
      </div>

      <ExportPreviewDialog previewOpen={previewOpen} setPreviewOpen={setPreviewOpen} ticket={ticket} items={items} contactEmail={contactEmail} isCustomEmail={isCustomEmail} imagePreview={imagePreview} totalPrice={totalPrice} />
    </div>
  );
}

/* ─── ISOLATED SYSTEM COMPONENTS FOR MANAGEABLE MAINTENANCE ──────────────── */

function MaterialsCatalog({ matSearch, setMatSearch, filteredMaterials, getRemainingStock, addItem, isReadOnly, categoryName }: any) {
  return (
    <Card className={`h-full flex flex-col shadow-sm border border-border/60 ${isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
      <CardHeader className="pb-3 border-b bg-muted/10"><CardTitle className="text-lg font-bold">Materials Catalog</CardTitle></CardHeader>
      <div className="p-4 border-b">
        <div className="relative group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search materials..." className="pl-9" value={matSearch} onChange={e => setMatSearch(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[60vh] p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMaterials.map((mat: any) => {
            const stock = getRemainingStock(mat);
            const canAdd = mat.qty_available > 0 && mat.price > 0 && stock > 0;
            const text = stock <= 0 && mat.qty_available > 0 ? "Max Added" : (!mat.qty_available ? "Not available" : (!mat.price ? "Price un-set" : "Add+"));
            return (
              <div key={mat.id} className={`flex flex-col justify-between p-3 border rounded-xl transition-all group ${canAdd ? 'hover:border-primary/60 hover:bg-primary/5 hover:scale-[1.01] cursor-pointer shadow-sm' : 'cursor-not-allowed opacity-60 bg-muted/30'}`} onClick={() => canAdd && addItem(mat)}>
                <div className="font-semibold text-sm mb-1 group-hover:text-primary">{mat.name}</div>
                <div className="text-xs text-muted-foreground mb-3 font-medium">Available: <span className={`font-bold text-sm ${stock === 0 ? "text-rose-500" : "text-emerald-600 font-extrabold"}`}>{stock} units</span></div>
                <div className="flex justify-between items-center mt-auto pt-2 border-t border-border/40">
                  <span className="font-mono font-bold text-foreground/80">${mat.price.toFixed(2)}</span>
                  <Badge variant="secondary" className={`text-[10px] uppercase font-bold tracking-wider ${canAdd ? 'bg-green-50 text-green-700 border-green-200/50' : 'bg-red-50 text-red-700 border-red-100/50'}`}>{text}</Badge>
                </div>
              </div>
            );
          })}
          {filteredMaterials.length === 0 && (
            <div className="col-span-1 sm:col-span-2 p-10 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/5">
              <div className="rounded-full bg-muted/60 p-3 mb-3 text-muted-foreground/60"><Search className="h-5 w-5" /></div>
              <h4 className="text-sm font-semibold">{matSearch ? "No search matches" : "Category empty"}</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">{matSearch ? `No matches found for "${matSearch}".` : `No allocated stock materials on "${categoryName}" shelf.`}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function TicketMetaDataCard({ ticket }: { ticket: any }) {
  return (
    <Card className="bg-card shadow-sm border-primary/30 border border-t-4">
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground line-clamp-2">{ticket.subject}</h3>
            <div className="text-sm text-muted-foreground mt-0.5">{ticket.ticket_owner}</div>
          </div>
          <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className={ticket.status === 'open' ? 'bg-blue-500' : ''}>{ticket.status.toUpperCase()}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-4 p-4 bg-muted/30 border rounded-xl">
          <div><span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider mb-1">Category</span><span className="font-semibold">{ticket.request_category || "—"}</span></div>
          <div><span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider mb-1">Location</span><span className="font-semibold block truncate" title={ticket.address}>{ticket.address || "—"}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

function LineItemsTable({ items, materials, isReadOnly, updateItemQty, removeItem, totalPrice }: any) {
  return (
    <Card className="flex flex-col border border-border/60 shadow-sm overflow-hidden">
      <div className="bg-muted/50 p-3 px-5 border-b flex justify-between items-center">
        <h3 className="font-bold text-sm">Line Items</h3>
        <Badge variant="secondary" className="font-mono font-bold">{items.length} items</Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="bg-muted/20"><TableHead className="w-[45%] font-bold">Item</TableHead><TableHead className="text-center w-[25%] font-bold">Qty</TableHead><TableHead className="text-right w-[20%] font-bold">Price</TableHead><TableHead className="w-[10%]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center h-28 text-muted-foreground italic bg-background/40">Select materials from the catalog to populate items</TableCell></TableRow>
            ) : (
              items.map((item: any, idx: number) => {
                const originalMat = materials?.find((m: any) => m.id === item.material_id);
                return (
                  <TableRow key={idx} className="hover:bg-muted/30 border-b border-border/40">
                    <TableCell className="font-semibold text-sm text-foreground/80">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" disabled={isReadOnly || item.quantity <= 1} onClick={() => updateItemQty(idx, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-7 text-center font-mono text-sm font-bold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" disabled={isReadOnly || item.quantity >= (originalMat ? originalMat.qty_available : 0)} onClick={() => updateItemQty(idx, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">${item.total_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" disabled={isReadOnly} onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-4 bg-muted/10 border-t flex justify-between items-center">
        <span className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Total Subtotal</span>
        <span className="text-2xl font-black font-mono">${totalPrice.toFixed(2)}</span>
      </div>
    </Card>
  );
}

function SubmissionDetailsCard({ contactEmail, setContactEmail, isCustomEmail, imagePreview, handleImageChange, removeImage, isReadOnly, handleSubmit, items, pending }: any) {
  return (
    <Card className={`shadow-sm border border-border/60 ${isReadOnly ? 'opacity-70 pointer-events-none' : ''}`}>
      <CardHeader className="pb-3 border-b bg-muted/20"><CardTitle className="text-xs font-bold uppercase tracking-widest text-foreground/80">Submission Details</CardTitle></CardHeader>
      <CardContent className="p-5 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground/80 block">Contact Email</label>
          <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email for communication" className="bg-background border-border/80" />
          {isCustomEmail && <p className="text-xs text-amber-600 dark:text-amber-500 font-semibold mt-1">⚠️ Custom email provided. Notifications will route here instead of default user bounds.</p>}
        </div>
        <Separator className="bg-border/60" />
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground/80 block">Attach ticket photo (optional)</label>
          {imagePreview ? (
            <div className="relative rounded-xl border overflow-hidden bg-muted/20 group shadow-inner">
              <img src={imagePreview} alt="Preview" className="w-full h-44 object-contain p-2" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 duration-200">
                <Button variant="secondary" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>Replace Photo</Button>
                <Button variant="destructive" size="sm" className="gap-1" onClick={removeImage}><X className="h-4 w-4" /> Remove</Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/40 hover:border-primary/40 bg-muted/5 group" onClick={() => document.getElementById('image-upload')?.click()}>
              <div className="p-3 bg-background rounded-full shadow-sm mb-2.5 group-hover:scale-110 transition-transform border"><ImageIcon className="h-5 w-5 text-muted-foreground/80 group-hover:text-primary" /></div>
              <p className="text-sm font-bold text-foreground/80 mb-0.5">Click to upload photo</p>
              <p className="text-xs text-muted-foreground">JPEG, PNG or WebP formats up to 5MB</p>
            </div>
          )}
          <input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
        </div>
      </CardContent>
      <CardFooter className="p-4 bg-muted/30 border-t flex flex-col sm:flex-row gap-3 items-center justify-between">
        {isReadOnly ? (
          <p className="text-xs font-semibold text-amber-700 flex-1 w-full flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 p-3 rounded-lg border">
            <Eye className="h-4 w-4 text-amber-600" /> This submission has been verified and cannot be edited further.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium">Submitting overrides any previous balance drafts.</p>
            <Button size="lg" className="w-full sm:w-auto font-bold px-8 shadow-sm" onClick={handleSubmit} disabled={items.length === 0 || pending}>
              {pending ? <span className="flex items-center gap-2">Uploading <UploadCloud className="h-4 w-4 animate-pulse" /></span> : "Submit Expenses"}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function ExportPreviewDialog({ previewOpen, setPreviewOpen, ticket, items, contactEmail, isCustomEmail, imagePreview, totalPrice }: any) {
  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl w-[95vw] rounded-xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submission export preview</DialogTitle>
          <DialogDescription className="text-xs">This details how your formatted submission entries parse inside the administrative backend sheet panel.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto border rounded-xl font-mono text-[11px] shadow-sm max-h-[55vh]">
          <Table>
            <TableHeader className="bg-muted/80 sticky top-0 z-20"><TableRow className="hover:bg-muted/80"><TableHead className="font-bold text-foreground">owner</TableHead><TableHead className="font-bold text-foreground">ticket</TableHead><TableHead className="font-bold text-foreground">subject</TableHead><TableHead className="font-bold text-foreground">category</TableHead><TableHead className="font-bold text-foreground">email</TableHead><TableHead className="font-bold text-foreground">material</TableHead><TableHead className="text-center font-bold text-foreground">qty</TableHead><TableHead className="text-right font-bold text-foreground">price</TableHead><TableHead className="text-right font-bold text-foreground">total</TableHead><TableHead className="text-center font-bold text-foreground">img</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((item: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/10 transition-colors">
                  {i === 0 && (
                    <>
                      <TableCell rowSpan={items.length} className="align-top border-r bg-background font-medium">{ticket.ticket_owner}</TableCell>
                      <TableCell rowSpan={items.length} className="align-top border-r bg-background font-bold">{ticket.ticket_id}</TableCell>
                      <TableCell rowSpan={items.length} className="align-top border-r bg-background truncate max-w-[130px]" title={ticket.subject}>{ticket.subject}</TableCell>
                      <TableCell rowSpan={items.length} className="align-top border-r bg-background">{ticket.request_category}</TableCell>
                      <TableCell rowSpan={items.length} className="align-top border-r bg-background max-w-[120px] truncate">{contactEmail} {isCustomEmail && '⚠'}</TableCell>
                    </>
                  )}
                  <TableCell className="font-sans font-medium">{item.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">${Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${Number(item.total_price).toFixed(2)}</TableCell>
                  {i === 0 && <TableCell rowSpan={items.length} className="text-center align-middle border-l bg-background font-medium">{imagePreview ? '{attached: true}' : '—'}</TableCell>}
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 border-t-2">
                <TableCell colSpan={8} className="text-right font-bold uppercase tracking-wider">Total Submission</TableCell>
                <TableCell className="text-right font-bold text-sm text-emerald-600">${totalPrice.toFixed(2)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4"><Button variant="outline" onClick={() => setPreviewOpen(false)}>Close Preview</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-pulse">
      <Skeleton className="h-10 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-[600px] rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl" /><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function WorkflowNotFound() {
  return (
    <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
      <p className="text-muted-foreground mb-6">The ticket you're looking for doesn't exist or you don't have access.</p>
      <Link href="/tickets"><Button>Return to Tickets</Button></Link>
    </div>
  );
}
