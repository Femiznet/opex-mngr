/* ─────────────────────────────────────────────────────────────── */
/* SHARED APPLICATION CONSTANTS */
/* ─────────────────────────────────────────────────────────────── */

/* Domain Status Constants */
export const STATUS = {
  VERIFIED: "verified",
  SUBMITTED: "submitted",
  DRAFT: "draft",
  OPEN: "open",
  CLOSED: "closed",
  FAILED: "failed",
  INVALID: "invalid",
  CANCELLED: "cancelled",
} as const;

/* Currency & Formatting */
export const CURRENCY_SYMBOL = "$";

/* Image Upload Configuration */
export const IMAGE_BUCKET = "ticket-attachments";
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/* Pagination */
export const DEFAULT_PAGE_SIZE = 10;

/* Toast & UI Messages */
export const EMPTY_STATE_MESSAGES = {
  search: "No search matches",
  category: "Category empty",
} as const;

export const STOCK_ACTION_TEXT = {
  maxAdded: "Max added",
  unavailable: "Not available",
  unsetPrice: "Price unset",
  add: "Add +",
} as const;

/* Routes */
export const ROUTES = {
  TICKETS: "/tickets",
  ADMIN: "/admin",
  HOME: "/",
} as const;

/* Mobile Breakpoint */
export const MOBILE_BREAKPOINT = 768;

/* Toast Limits */
export const TOAST_LIMIT = 1;
export const TOAST_REMOVE_DELAY = 1000000;
