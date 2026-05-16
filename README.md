# opex-mngr

A ticket-based material usage tracking system for estate maintenance operations.

## What it does

Maintenance technicians look up a job ticket, select the materials they used from a categorised inventory, enter quantities, and submit the material usage for that job. Admins verify submissions externally.

Each ticket has exactly one submission. Submissions can be edited and resubmitted until an admin verifies them — at which point they are permanently locked.

## Stack

- **Vite + React + TypeScript** — frontend
- **Supabase** — Postgres database + realtime
- **shadcn/ui + Tailwind** — UI components
- **Zod + react-hook-form** — form validation

## Features

- Ticket lookup by ID
- Materials filtered by ticket category (8 categories, 392 materials)
- Search and paginated material selector
- Line items table with quantity and price editing
- Submit, edit, and resubmit submissions
- One-step undo (restores previous version)
- Cancel submissions
- Status tracking: `draft → submitted → verified`
- Version snapshots on every submit
- Prices frozen at submission time

## Categories

`Carpentry` · `Civil` · `Electrical` · `HVAC` · `Painting` · `Plumbing` · `Water Treatment` · `Welding`

## Project Status

Work in progress. Admin verification UI is out of scope — verification is handled externally.
