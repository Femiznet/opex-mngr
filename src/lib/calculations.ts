import { CURRENCY_SYMBOL, STATUS, STOCK_ACTION_TEXT } from "./constants";

/* ─────────────────────────────────────────────────────────────── */
/* CURRENCY & FORMATTING */
/* ─────────────────────────────────────────────────────────────── */

export const formatCurrency = (amount: number): string =>
  `${CURRENCY_SYMBOL}${Number(amount).toFixed(2)}`;

/* ─────────────────────────────────────────────────────────────── */
/* ITEM & SUBMISSION CALCULATIONS */
/* ─────────────────────────────────────────────────────────────── */

export const calculateItemTotal = (quantity: number, unitPrice: number): number =>
  quantity * unitPrice;

export const calculateTotalPrice = (items: any[]): number =>
  items.reduce((sum, item) => sum + Number(item.total_price), 0);

export const buildUpdatedItem = (item: any, quantity: number) => ({
  ...item,
  quantity,
  total_price: calculateItemTotal(quantity, item.unit_price),
});

export const normalizeSubmissionItems = (items: any[]) =>
  items.map((item) => ({
    ...item,
    material_id: Number(item.material_id),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
    is_custom: !!item.is_custom,
  }));

/* ─────────────────────────────────────────────────────────────── */
/* STOCK & AVAILABILITY LOGIC */
/* ─────────────────────────────────────────────────────────────── */

export const getStockActionText = (
  stock: number,
  qtyAvailable: number,
  price: number
): string => {
  if (stock <= 0 && qtyAvailable > 0) {
    return STOCK_ACTION_TEXT.maxAdded;
  }

  if (!qtyAvailable) {
    return STOCK_ACTION_TEXT.unavailable;
  }

  if (!price) {
    return STOCK_ACTION_TEXT.unsetPrice;
  }

  return STOCK_ACTION_TEXT.add;
};

/* ─────────────────────────────────────────────────────────────── */
/* BADGE & STATUS STYLING HELPERS */
/* ─────────────────────────────────────────────────────────────── */

export const getStatusBadgeClasses = (status: string): string =>
  status === STATUS.OPEN
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";

export const getTicketStatusClasses = (status: string): string => {
  const key = status?.toLowerCase();
  if (key === STATUS.OPEN) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
  }
  if (key === STATUS.CLOSED) {
    return "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30";
  }
  return "bg-muted text-muted-foreground border border-border";
};

export const getSubmissionStatusClasses = (status: string): string => {
  if (!status) return "text-muted-foreground/40";
  const key = status.toLowerCase();
  if (key === STATUS.VERIFIED) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
  }
  if (key === STATUS.SUBMITTED) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  }
  if (key === STATUS.FAILED || key === STATUS.INVALID) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
  }
  return "bg-muted text-muted-foreground border border-border";
};

/* ─────────────────────────────────────────────────────────────── */
/* BLOB URL MANAGEMENT */
/* ─────────────────────────────────────────────────────────────── */

export const revokeBlobUrl = (url?: string | null): void => {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

/* ─────────────────────────────────────────────────────────────── */
/* FILE & IMAGE UTILITIES */
/* ─────────────────────────────────────────────────────────────── */

export const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts[parts.length - 1];
};
