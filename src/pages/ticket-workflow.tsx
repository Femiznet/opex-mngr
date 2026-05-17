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

  // Initialize state parameters from existing submission structures
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

  // Unsaved Changes Navigation Guard Interceptor
  useEffect(() => {
    if (items.length === 0 || existingSubmission?.status === 'verified') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items.length, existingSubmission?.status]);

  // Map string ticket request categories to raw numeric database category IDs
  const currentTicketCategoryId = useMemo(() => {
    const requestCategory = ticket?.request_category;
    if (!categories || !requestCategory) return null;

    const normalizedCategory = requestCategory.toLowerCase();
    const found = categories.find((c: any) => c.name?.toLowerCase() === normalizedCategory);

    return found ? Number(found.id) : null;
  }, [categories, ticket?.request_category]);

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    
    const normalizedSearch = matSearch.toLowerCase();
  
    return materials.filter(m => {
      // 1. Validate search bar input string match
      const matchesSearch = m.name.toLowerCase().includes(normalizedSearch);
      
      // 🔄 THE FIX: If the ticket has a category, strictly require m.category_id to match it.
      // Do not fall back to "true" unless the ticket itself has no category string set at all.
      const matchesCategory = ticket?.request_category
        ? Number(m.category_id) === currentTicketCategoryId
        : true;
        
      return matchesSearch && matchesCategory;
    });
  }, [materials, matSearch, currentTicketCategoryId, ticket?.request_category]);
  
  // Helper calculation to figure out accurate, remaining warehouse inventory counts on the fly
  const getRemainingStock = (material: any) => {
    const activeLineItem = items.find(i => i.material_id === material.id);
    const currentlyAllocated = activeLineItem ? activeLineItem.quantity : 0;
    return Math.max(0, material.qty_available - currentlyAllocated);
  };

  const addItem = (material: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.material_id === material.id);
      const remainingStock = getRemainingStock(material);
      
      if (remainingStock <= 0) {
        toast.error("Cannot add more. No units remaining in available warehouse stock.");
        return prev;
      }

      if (existing) {
        return prev.map(i => i.material_id === material.id ? 
          { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price } : i);
      }
      return [...prev, {
        material_id: material.id,
        name: material.name,
        quantity: 1,
        unit_price: material.price,
        total_price: material.price,
        is_custom: false
      }];
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

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + Number(item.total_price), 0), [items]);

  const isReadOnly = existingSubmission?.status === 'verified';
  const isCustomEmail = contactEmail !== currentUser.email;

  // Clean Up Object temporary blob URLs to resolve browser memory leakage
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  // ✨ NEW: Clear and remove photos from the workspace cleanly
  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
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
      let imageUrl = imagePreview; // Retain existing URL if it wasn't removed

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${ticketId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, imageFile);
          
        if (uploadError) {
          throw new Error("Failed to upload image: " + uploadError.message);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }
  
      const formattedItems = items.map(item => ({
        ...item,
        material_id: item.material_id ? Number(item.material_id) : null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        is_custom: !!item.is_custom
      }));
  
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
        items: formattedItems
      });

      toast.success("Submission saved successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save submission. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (ticketLoading || subLoading || matLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[600px] rounded-lg" />
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
        <p className="text-muted-foreground mb-6">The ticket you're looking for doesn't exist or you don't have access.</p>
        <Link href="/tickets">
          <Button>Return to Tickets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 lg:pb-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="pl-0 gap-2 mb-4 text-muted-foreground hover:text-foreground" onClick={() => setLocation('/tickets')}>
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight font-mono">{ticket.ticket_id}</h1>
          {existingSubmission && existingSubmission.status !== 'draft' && (
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
              <Eye className="h-4 w-4" /> Preview Export
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        
        {/* Left Column: Materials */}
        <Card className={`h-full flex flex-col ${isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-lg">Materials Catalog</CardTitle>
          </CardHeader>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search materials..." 
                className="pl-9"
                value={matSearch}
                onChange={e => setMatSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[60vh] p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredMaterials.map(mat => {
                const liveRemainingStock = getRemainingStock(mat);
                const isQtySet = mat.qty_available > 0;
                const isPriceSet = mat.price > 0;
                
                const canAddItem = isQtySet && isPriceSet && liveRemainingStock > 0;
                const canAddText = liveRemainingStock <= 0 && isQtySet
                  ? "Max Added" 
                  : (!isQtySet ? "Not available" : (!isPriceSet ? "Price is not set" : "Add+"));

                return (
                  <div 
                    key={mat.id} 
                    className={`flex flex-col justify-between p-3 border rounded-lg transition-colors group
                      ${canAddItem 
                        ? 'hover:border-primary hover:bg-primary/5 cursor-pointer' 
                        : 'cursor-not-allowed opacity-60 bg-muted/30 dark:bg-muted/10'
                      }
                    `}
                    onClick={() => canAddItem && addItem(mat)}
                  >
                    <div className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">{mat.name}</div>
                    
                    {/* 🟢/🔴 COLOR-CODED UNITS: Dark green if > 0, red if 0 */}
                    <div className="text-xs text-muted-foreground mb-3 font-medium">
                      Available: <span className={`font-bold text-sm ${liveRemainingStock === 0 ? "text-rose-500" : "text-emerald-600 font-extrabold"}`}>{liveRemainingStock} units</span>
                    </div>

                    <div className="flex justify-between items-center mt-auto pt-2 border-t border-border/50">
                      <span className="font-mono font-semibold">${mat.price.toFixed(2)}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] uppercase font-bold tracking-wider 
                          ${canAddItem 
                            ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                          }`}
                      >
                        {canAddText}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              
              {filteredMaterials.length === 0 && (
                <div className="col-span-1 sm:col-span-2 p-10 flex flex-col items-center justify-center text-center border border-dashed rounded-xl bg-muted/10 my-2">
                  {/* 🔄 Visual Anchor: High-utility layout icon descriptor */}
                  <div className="rounded-full bg-muted p-3 mb-3 text-muted-foreground/70">
                    <Search className="h-5 w-5" />
                  </div>
                  
                  {matSearch ? (
                    <>
                      <h4 className="text-sm font-semibold text-foreground">No search matches</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        We couldn't find any catalog items matching your term <span className="font-mono bg-muted px-1 py-0.5 rounded text-foreground">"{matSearch}"</span>.
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-foreground">Category is empty</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        There are currently no inventory materials allocated to the <span className="font-bold text-foreground capitalize">"{ticket.request_category}"</span> department shelf.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Right Column: Workflow Layout Panels */}
        <div className="space-y-6">
          <Card className="bg-card shadow-sm border-primary/20 border-t-4">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold line-clamp-2">{ticket.subject}</h3>
                  <div className="text-sm text-muted-foreground mt-1">{ticket.ticket_owner}</div>
                </div>
                <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className={ticket.status === 'open' ? 'bg-blue-500' : ''}>
                  {ticket.status.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase font-semibold mb-1">Category</span>
                  <span className="font-medium">{ticket.request_category || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase font-semibold mb-1">Location</span>
                  <span className="font-medium truncate block" title={ticket.address || ""}>{ticket.address || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {existingSubmission && (
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Existing Submission</div>
                  <div className="flex items-center gap-3">
                    <SubmissionStatusBadge status={existingSubmission.status} />
                    {/* Versions clean up update */}
                    {existingSubmission.edited && <Badge variant="outline" className="text-[10px] bg-background font-bold">EDITED</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Recorded Total</div>
                  <div className="text-xl font-bold font-mono">${Number(existingSubmission.total_price).toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-col border shadow-sm overflow-hidden">
            <div className="bg-muted/50 p-3 px-5 border-b flex justify-between items-center">
              <h3 className="font-semibold">Line Items</h3>
              <Badge variant="secondary" className="font-mono">{items.length} items</Badge>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Item</TableHead>
                    <TableHead className="text-center w-[20%]">Qty</TableHead>
                    <TableHead className="text-right w-[20%]">Price</TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-muted-foreground italic">
                        Select materials from the catalog to add items
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, idx) => {
                      const originalMat = materials?.find(m => m.id === item.material_id);
                      const maxStock = originalMat ? originalMat.qty_available : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-sm">{item.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6" disabled={isReadOnly || item.quantity <= 1} onClick={() => updateItemQty(idx, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center font-mono text-sm">{item.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6" 
                                disabled={isReadOnly || item.quantity >= maxStock} 
                                onClick={() => updateItemQty(idx, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">${item.total_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={isReadOnly} onClick={() => removeItem(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 bg-muted/20 border-t flex justify-between items-center">
              <span className="font-bold text-muted-foreground uppercase tracking-wider text-sm">Total Subtotal</span>
              <span className="text-2xl font-bold font-mono">${totalPrice.toFixed(2)}</span>
            </div>
          </Card>

          <Card className={isReadOnly ? 'opacity-70 pointer-events-none' : ''}>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none block">Contact Email</label>
                <Input 
                  type="email" 
                  value={contactEmail} 
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="Email for admin communication"
                  className="bg-background"
                />
                {isCustomEmail && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">
                    Custom email provided. Notifications will be sent here instead of the default address.
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <label className="text-sm font-medium leading-none block">Attach ticket photo (optional)</label>
                
                {imagePreview ? (
                  <div className="relative rounded-lg border overflow-hidden bg-muted/30 group">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain" />
                    
                    {/* 🛠️ REMOVABLE ACTION CONTAINER: Replaces or discards current photo selection completely */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>
                        Replace Photo
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-1" onClick={removeImage}>
                        <X className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors bg-muted/10"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <div className="p-3 bg-background rounded-full shadow-sm mb-3">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">Click to upload image</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG or WebP up to 5MB</p>
                  </div>
                )}
                <input 
                  id="image-upload" 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </div>

            </CardContent>
            <CardFooter className="p-5 bg-muted/30 border-t flex flex-col sm:flex-row gap-3 items-center justify-between">
              {isReadOnly ? (
                <p className="text-sm font-medium text-amber-600 flex-1 w-full flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 p-3 rounded border border-amber-200 dark:border-amber-900/50">
                  <Eye className="h-4 w-4" /> This submission has been verified and cannot be edited.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                    Submitting will overwrite any previous drafts.
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto font-bold px-8 shadow-md hover:shadow-lg transition-all"
                    onClick={handleSubmit}
                    disabled={items.length === 0 || saveMutation.isPending || uploadingImage}
                  >
                    {saveMutation.isPending || uploadingImage ? (
                      <span className="flex items-center gap-2">Uploading <UploadCloud className="h-4 w-4 animate-pulse" /></span>
                    ) : (
                      "Submit Expenses"
                    )}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* RowSpan Column Block Export Previews Container */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">Submission export preview</DialogTitle>
            <DialogDescription>
              This is how your submission will appear in the admin export.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-x-auto border rounded-md mt-4 font-mono text-xs">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>owner</TableHead>
                  <TableHead>ticket</TableHead>
                  <TableHead>subject</TableHead>
                  <TableHead>category</TableHead>
                  <TableHead>email</TableHead>
                  <TableHead>material</TableHead>
                  <TableHead className="text-right">qty</TableHead>
                  <TableHead className="text-right">price</TableHead>
                  <TableHead className="text-right">total</TableHead>
                  <TableHead className="text-center">img</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/10">
                    {i === 0 && (
                      <>
                        <TableCell rowSpan={items.length} className="align-top border-r bg-background font-medium">
                          {ticket.ticket_owner}
                        </TableCell>
                        <TableCell rowSpan={items.length} className="align-top border-r bg-background font-bold">
                          {ticket.ticket_id}
                        </TableCell>
                        <TableCell rowSpan={items.length} className="align-top border-r bg-background truncate max-w-[130px]" title={ticket.subject}>
                          {ticket.subject}
                        </TableCell>
                        <TableCell rowSpan={items.length} className="align-top border-r bg-background">
                          {ticket.request_category}
                        </TableCell>
                        <TableCell rowSpan={items.length} className="align-top border-r bg-background max-w-[120px] truncate">
                          {contactEmail} {isCustomEmail && '⚠'}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="font-sans font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${Number(item.unit_price).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">${Number(item.total_price).toFixed(2)}</TableCell>
                    {i === 0 && (
                      <TableCell rowSpan={items.length} className="text-center align-middle border-l bg-background font-medium">
                        {imagePreview ? '{attached: true}' : '—'}
                      </TableCell>
                    )}
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
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
