# opex-mngr — UI/Feature Enhancement Spec
> Enhancement pass only. Do not rebuild from scratch. Apply changes to existing implementation.

---

## 0. HARDCODED TEST USER (AUTH PLACEHOLDER)

Login is out of scope. Use a hardcoded current user object for now:

```ts
// src/lib/current-user.ts
export const currentUser = {
  id: "test-user-001",
  name: "Test User",
  email: "testuser@opex.com",
};
```

Import and use this wherever user context is needed (email field, submission record).
When real auth is added later, replace this with `supabase.auth.getUser()`.

---

## 1. THEME SYSTEM — LIGHT + DARK MODE

### Implementation
- Use `shadcn/ui` built-in dark mode support via `class` strategy on `<html>`
- Store preference in `localStorage` key: `opex-theme`
- On load: read from localStorage, apply class, default to `light` if not set

### Toggle
- Add a theme toggle button (sun/moon icon) in the top-right of the navbar/header
- Use `lucide-react` icons: `Sun` and `Moon`
- Toggling switches between `light` and `dark` class on `<html>` and saves to localStorage

### All existing components must support both themes
- Use Tailwind `dark:` variants throughout
- Do not hardcode white backgrounds — use `bg-background`, `text-foreground` tokens

---

## 2. RESPONSIVE LAYOUT (MOBILE-FIRST)

### Breakpoints
- Mobile: single column, full width
- Tablet (md): two column where applicable
- Desktop (lg+): full two-column ticket workflow layout

### Ticket workflow page layout (desktop)
```
┌──────────────────┬───────────────────────┐
│                  │  Ticket info           │
│  Material        ├───────────────────────┤
│  selection       │  Existing submission   │
│  (search +       ├───────────────────────┤
│  grid)           │  Line items table      │
│                  ├───────────────────────┤
│                  │  Summary + submit      │
└──────────────────┴───────────────────────┘
```

### Mobile layout
Stack in this order:
1. Ticket info
2. Existing submission (if exists)
3. Material selection
4. Line items
5. Summary + submit

---

## 3. VISUAL DESIGN — DASHBOARD FEEL

### Overall direction
- Modern ops/admin system aesthetic
- Card-based layout with clear section separation
- Not a plain white form — structured, purposeful

### Typography hierarchy
- Page titles: `text-2xl font-bold`
- Section headers: `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- Key values (ticket ID, total, status): `font-bold`
- Supporting text: `text-sm text-muted-foreground`

### Color tokens (apply consistently)
| Semantic | Usage |
|---|---|
| `success` | verified — green |
| `warning` | submitted / pending — blue |
| `error` | failed / invalid — red |
| `neutral` | draft / cancelled — grey |

### Spacing
- Section gap: `space-y-6`
- Card padding: `p-5` or `p-6`
- Use `Separator` between major sections

---

## 4. ALL TICKETS VIEW — `/tickets`

### New page at `/tickets`
A dashboard-style page showing all tickets in the system.

### Layout
- Top bar: page title + search input + filter dropdowns
- Main area: card/table hybrid — cards on mobile, table on desktop

### Search
- Search by ticket number OR owner name
- Live filtering as user types (client-side on loaded data)

### Filters
- Filter by status: `All` · `Open` · `Closed`
- Filter by category: dropdown of all 8 categories + `All`

### Columns / card fields
| Field | Display |
|---|---|
| Ticket ID | bold, monospace |
| Owner | normal |
| Subject | normal, truncated at 40 chars |
| Category | badge |
| Status | colored badge |
| Submission status | colored badge (or `—` if none) |
| Action | "View" button → goes to `/tickets/:id` |

### Category grouping toggle
- Add a toggle: `List view` / `Group by category`
- Group by category: accordion-style, each category header expands to show its tickets
- Default: list view

### Submitted tickets search
- In the search bar, user can type a ticket number to find their submitted ticket directly
- Hitting enter or clicking the result navigates to `/tickets/:ticketId`

---

## 5. EMAIL FIELD

### Where it lives
- On the submission form, above the submit button
- Label: `"Contact email"`
- Placeholder: `"Email for admin communication"`

### Default value
- Pre-fill with `currentUser.email` from `src/lib/current-user.ts`
- User can clear and type a different email

### Unknown email flag
If the user changes the email from the default `currentUser.email`:
- Store a flag on the submission: `is_custom_email: true`
- Admin-side preview (section 7) shows a warning badge:
  > ⚠ Custom email — not the account email

### Schema addition
Add to `submissions` table:

```sql
ALTER TABLE public.submissions
  ADD COLUMN contact_email TEXT,
  ADD COLUMN is_custom_email BOOLEAN NOT NULL DEFAULT false;
```

### Validation
- Must be valid email format (Zod: `z.string().email()`) if provided
- Optional — user can leave it blank

### Data layer
Add `contact_email` and `is_custom_email` to:
- `submitItems` function params and upsert payload
- `SubmissionRow` type
- `fetchSubmission` return shape

---

## 6. IMAGE UPLOAD — SUPABASE STORAGE

### Supabase Storage setup
- Create a bucket called `ticket-attachments`
- Bucket policy: public read, authenticated write (for now: public write since auth is out of scope)

```sql
-- Run in Supabase SQL editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true);

CREATE POLICY "public upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "public read ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');
```

### Schema addition
Add to `submissions` table:

```sql
ALTER TABLE public.submissions
  ADD COLUMN image_url TEXT,
  ADD COLUMN image_attached BOOLEAN NOT NULL DEFAULT false;
```

### UI — upload component
Location: in the submission form, between line items and the email field.

Label: `"Attach ticket photo (optional)"`

Behavior:
- Click or drag to upload
- Accept: `image/jpeg, image/png, image/webp` only
- Max size: 5MB — show error if exceeded
- On upload: show thumbnail preview of selected image
- Upload path: `ticket-attachments/{ticketId}/{timestamp}.jpg`
- On submit: include `image_url` in submission payload
- If image already attached: show existing thumbnail with option to replace

### Data layer
Add `image_url` and `image_attached` to `submitItems` params and upsert payload.

---

## 7. SUBMISSION PREVIEW MODAL — "EXCEL VIEW"

### Trigger
Add a button to the submission summary section (only visible when submission exists and status ≠ draft):

**"Preview export"** (eye icon)

### Behavior
Opens a full-width modal (not a page). No download. Preview only.

### Modal content
Title: `"Submission export preview"`
Subtitle: `"This is how your submission will appear in the admin export."`

Render a styled table with these exact columns:

| ticket_owner | ticket_number | subject | category | email | material | quantity | unit_price | total | image |
|---|---|---|---|---|---|---|---|---|---|

One row per line item. Shared fields (owner, number, subject, category, email) repeat on each row.

### Image column
- If `image_attached = true`: show `{ attached: true }`
- If no image: show `—`

### Unknown email indicator
- If `is_custom_email = true`: show email value with ⚠ icon next to it

### Styling
- Monospace font for the table
- Zebra striping for rows
- Horizontally scrollable on mobile
- Total row at the bottom: bold, spanning material columns, showing grand total

### No download button
Do not add any export or download functionality. Preview only.

---

## 8. NAVBAR

Add a simple top navbar across all pages:

```
┌─────────────────────────────────────────────────┐
│  opex-mngr          [All Tickets]    [☀/🌙]      │
└─────────────────────────────────────────────────┘
```

- Left: app name / logo (links to `/tickets`)
- Center/right: navigation link — `"All Tickets"` → `/tickets`
- Far right: theme toggle (sun/moon)
- Sticky at top, `z-50`
- `bg-background border-b` so it works in both light and dark mode

---

## 9. MIGRATION SQL (RUN IN SUPABASE SQL EDITOR)

Run this against your Supabase project to add the new columns:

```sql
-- Add email fields to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS is_custom_email BOOLEAN NOT NULL DEFAULT false;

-- Add image fields to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_attached BOOLEAN NOT NULL DEFAULT false;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "public upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "public read ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');
```

---

## 10. UPDATED SubmissionRow TYPE

After applying schema changes, update `src/lib/submissions.ts`:

```ts
export type SubmissionRow = {
  id: number;
  ticket_id: string;
  status: SubmissionStatus;
  edited: boolean;
  total_price: number;
  created_at: string;
  updated_at: string;
  version_index: number;
  contact_email: string | null;
  is_custom_email: boolean;
  image_url: string | null;
  image_attached: boolean;
  items: SubmissionItemRow[];
};
```

---

## 11. FINAL CHECKLIST FOR LOVABLE

- [ ] Hardcoded test user in `src/lib/current-user.ts`
- [ ] Light/dark mode toggle — persisted to localStorage
- [ ] All components use `dark:` variants — no hardcoded white backgrounds
- [ ] Responsive two-column layout on desktop, stacked on mobile
- [ ] Dashboard-style visual design with card layouts and section headers
- [ ] `/tickets` page with search, filters, list + category group view
- [ ] Submitted ticket search by number on `/tickets` page
- [ ] Email field on submission form — pre-filled from currentUser
- [ ] Custom email flagged with `is_custom_email = true`
- [ ] Image upload to Supabase Storage bucket `ticket-attachments`
- [ ] Image thumbnail preview in form
- [ ] Submission preview modal — table format, no download
- [ ] Image shown as `{ attached: true }` in preview
- [ ] Unknown email shown with ⚠ in preview
- [ ] Navbar with theme toggle and All Tickets link
- [ ] Run migration SQL for new columns + storage bucket
