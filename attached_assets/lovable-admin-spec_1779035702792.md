# opex-mngr — Admin View Spec
> Addendum to the enhancement spec. Add a separate /admin page. No auth yet — lock behind auth later.

---

## 0. IMPORTANT NOTE

This is a VIEW-ONLY admin panel for now.
- No admin actions (no verify, no delete, no edit)
- Auth is out of scope — the route is open but should be clearly marked as "Admin View"
- When auth is added later, wrap this route in a role check

---

## 1. NAVBAR UPDATE

Add `"Admin"` link to the existing navbar:

```
┌─────────────────────────────────────────────────────────┐
│  opex-mngr       [All Tickets]  [Admin]     [☀/🌙]      │
└─────────────────────────────────────────────────────────┘
```

- Links to `/admin`
- Style it subtly different — muted text or a small shield icon (`lucide-react: ShieldCheck`)
- No badge or highlight — it should feel like a secondary nav item

---

## 2. PAGE — `/admin`

### Page title
`"Admin overview"` — subtitle: `"Read-only view. Actions coming soon."`

### Layout
Three sections stacked vertically with clear separation:

```
┌─────────────────────────────────────┐
│  Stats bar                          │
├─────────────────────────────────────┤
│  Submissions table                  │
├─────────────────────────────────────┤
│  Submission detail panel (on click) │
└─────────────────────────────────────┘
```

---

## 3. STATS BAR

Four stat cards in a row (2x2 on mobile):

| Stat | Value |
|---|---|
| Total submissions | count of all submission rows |
| Submitted | count where status = `submitted` |
| Verified | count where status = `verified` |
| Flagged | count where status = `failed` or `invalid` |

Each card:
- Large bold number
- Label below in muted text
- Subtle colored left border matching status color token

---

## 4. SUBMISSIONS TABLE

### Columns
| Column | Notes |
|---|---|
| Ticket ID | bold, monospace |
| Owner | from ticket record |
| Category | badge |
| Submission status | colored badge |
| Total price | bold, right-aligned |
| Items | count of line items |
| Email | contact_email if set, else `—` |
| Custom email | ⚠ icon if `is_custom_email = true` |
| Image | paperclip icon if `image_attached = true`, else `—` |
| Last updated | formatted date |

### Filters (top of table)
- Status filter: `All` · `Submitted` · `Verified` · `Failed` · `Invalid` · `Cancelled`
- Category filter: dropdown of all 8 categories + `All`
- Search: by ticket ID or owner name

### Sorting
- Clickable column headers for: Last updated, Total price, Status
- Default sort: Last updated descending

### Pagination
- 20 rows per page
- Previous / Next controls at bottom

---

## 5. SUBMISSION DETAIL PANEL

Clicking any row opens a right-side slide-over panel (not a new page).

### Panel sections

**Header**
- Ticket ID (bold)
- Status badge
- Close button (×)

**Ticket info**
- Owner
- Subject
- Category
- Address
- Created time

**Submission info**
- Status
- Total price (bold)
- Version index
- `(edited)` tag if applicable
- Contact email + ⚠ if custom
- Last updated

**Line items**
- Read-only table: name · qty · unit price · subtotal
- Total row at bottom

**Image attachment**
- If `image_attached = true`: show the image thumbnail (fetch from `image_url`)
- If none: `"No image attached"`

**Version history**
- List of all snapshots from `submission_versions` for this submission
- Each entry: version number + timestamp
- Collapsed by default, expandable

**Admin note (placeholder)**
- Empty text area with label: `"Admin notes (coming soon)"`
- Disabled for now
- Styled as a grayed-out card so admin knows it's planned

---

## 6. EMPTY + LOADING STATES

- Loading: skeleton rows in the table
- No submissions yet: `"No submissions found."`
- No results after filter: `"No submissions match your filters."`

---

## 7. VISUAL TONE

- Slightly more data-dense than the user-facing pages
- Use `table` layout (not cards) for the main submissions list
- Muted header background to distinguish from the user-facing `/tickets` page
- Add a subtle `"Admin"` chip/badge in the top-left of the page so it's always clear which view you're in

---

## 8. DATA QUERIES NEEDED

All read-only. No writes.

```ts
// Fetch all submissions with joined ticket data
supabase
  .from("submissions")
  .select(`
    *,
    submission_items(count),
    tickets!inner(ticket_owner, subject, request_category, address, created_time)
  `)
  .order("updated_at", { ascending: false });

// Fetch submission versions for detail panel
supabase
  .from("submission_versions")
  .select("*")
  .eq("submission_id", submissionId)
  .order("created_at", { ascending: false });
```

---

## 9. CHECKLIST FOR LOVABLE

- [ ] Add `"Admin"` link to navbar → `/admin`
- [ ] Stats bar — 4 cards: total, submitted, verified, flagged
- [ ] Submissions table with all columns listed above
- [ ] Filters: status, category, search
- [ ] Sortable columns: last updated, total price, status
- [ ] Pagination: 20 rows per page
- [ ] Row click → slide-over detail panel
- [ ] Detail panel: ticket info, submission info, line items, image, version history
- [ ] Admin notes placeholder (disabled textarea)
- [ ] Skeleton loading states
- [ ] Empty and no-results states
- [ ] Subtle admin visual tone — muted header, `"Admin"` chip visible
