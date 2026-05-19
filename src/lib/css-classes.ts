/* ─────────────────────────────────────────────────────────────── */
/* SHARED TAILWIND CSS CLASS CONSTANTS */
/* ─────────────────────────────────────────────────────────────── */

/* Page Layout Classes */
export const PAGE_CONTAINER_CLASS =
  "container mx-auto p-4 md:p-6 pb-24 lg:pb-6 page-in";

export const PAGE_GRID_CLASS =
  "grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 items-start";

/* Typography Classes */
export const PAGE_TITLE_CLASS =
  "text-2xl font-bold tracking-tight font-mono text-foreground";

/* Button Classes */
export const BACK_BUTTON_CLASS =
  "pl-0 gap-2 mb-4 text-muted-foreground hover:text-foreground group";

export const BACK_ICON_CLASS =
  "h-4 w-4 group-hover:-translate-x-1 transition-transform";

export const PREVIEW_BUTTON_CLASS =
  "gap-2 shadow-sm hover:bg-muted/50";

/* Card Classes */
export const EXISTING_SUBMISSION_CARD_CLASS =
  "bg-card border-primary/20 dark:border-primary/10 shadow-sm border";

export const CARD_CONTENT_BETWEEN_CLASS =
  "p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";

/* Flex Utilities */
export const FLEX_BETWEEN_CLASS =
  "flex flex-col sm:flex-row sm:items-center justify-between gap-4";

/* Label & Badge Classes */
export const SECTION_LABEL_CLASS =
  "text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1.5";

export const EDITED_BADGE_CLASS =
  "text-[10px] bg-background border-red-200 text-red-700 font-bold";

export const TOTAL_PRICE_CLASS =
  "text-xl font-black font-mono text-blue-900 dark:text-blue-300";

export const MUTED_LABEL_CLASS =
  "text-xs text-muted-foreground font-medium";

/* Input & Select Classes */
export const SEARCH_INPUT_CLASS =
  "w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-muted/30 focus:bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors";

export const SELECT_CLASS =
  "h-10 px-3 pr-8 rounded-lg border border-input bg-muted/30 focus:bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://w3.org')] bg-no-repeat bg-[position:right_0.75rem_center] transition-colors";

/* Table Row Classes */
export const TABLE_ROW_HOVER_CLASS =
  "hover:bg-muted/30 transition-colors cursor-pointer group select-none";

export const TABLE_HEADER_CLASS =
  "bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider";

/* Toolbar/Control Classes */
export const TOOLBAR_CLASS =
  "flex flex-col md:flex-row gap-3 bg-card border border-border p-4 rounded-xl shadow-sm";

export const CONTROL_GROUP_CLASS =
  "flex flex-wrap items-center gap-3";

/* View Mode Toggle Classes */
export const VIEW_TOGGLE_CLASS =
  "flex h-10 rounded-lg border border-input p-1 bg-muted/50 items-center";

export const VIEW_TOGGLE_BUTTON_ACTIVE =
  "bg-card text-foreground shadow-sm";

export const VIEW_TOGGLE_BUTTON_INACTIVE =
  "text-muted-foreground hover:text-foreground";

/* Loading & Empty State Classes */
export const SKELETON_CARD_CLASS =
  "w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm";

export const SKELETON_ITEM_CLASS =
  "h-12 w-full bg-muted/40 animate-pulse rounded-lg";

export const EMPTY_STATE_CLASS =
  "flex flex-col items-center justify-center text-center p-12 border border-dashed border-border rounded-xl bg-card shadow-sm";

export const EMPTY_STATE_ICON_CLASS =
  "p-3 bg-muted rounded-full text-muted-foreground mb-4";

/* Modal & Sheet Classes */
export const DIALOG_HEADER_CLASS =
  "p-6 border-b bg-muted/20 flex-shrink-0";

export const SHEET_CONTENT_CLASS =
  "w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col";
