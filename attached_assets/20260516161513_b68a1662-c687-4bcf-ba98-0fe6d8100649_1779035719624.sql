
-- Enums
CREATE TYPE public.ticket_status AS ENUM ('open', 'closed');
CREATE TYPE public.submission_status AS ENUM ('draft', 'submitted', 'verified', 'failed', 'invalid', 'cancelled');

-- Categories
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Materials
CREATE TABLE public.materials (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  qty_available INTEGER NOT NULL DEFAULT 0
);

-- Tickets
CREATE TABLE public.tickets (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  ticket_owner TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_time TIMESTAMPTZ,
  status public.ticket_status NOT NULL DEFAULT 'open',
  address TEXT,
  location TEXT,
  request_coverage TEXT,
  request_category TEXT
);

-- Submissions
CREATE TABLE public.submissions (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  status public.submission_status NOT NULL DEFAULT 'draft',
  edited BOOLEAN NOT NULL DEFAULT false,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version_index INTEGER NOT NULL DEFAULT 1
);

-- Submission items
CREATE TABLE public.submission_items (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  material_id INTEGER,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false
);

-- Submission versions
CREATE TABLE public.submission_versions (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_versions ENABLE ROW LEVEL SECURITY;

-- Public policies (no auth on this app)

CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "public write categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "public write materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "public write tickets" ON public.tickets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "public write submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read submission_items" ON public.submission_items FOR SELECT USING (true);
CREATE POLICY "public write submission_items" ON public.submission_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read submission_versions" ON public.submission_versions FOR SELECT USING (true);
CREATE POLICY "public write submission_versions" ON public.submission_versions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "block writes on verified submissions" ON public.submissions FOR UPDATE USING (status != 'verified');

-- Seed data
INSERT INTO public.categories (name) VALUES ('Electrical'), ('Plumbing'), ('HVAC');

INSERT INTO public.materials (category_id, name, price, qty_available) VALUES
  ((SELECT id FROM public.categories WHERE name='Electrical'), 'Cable 2.5mm', 12.50, 100),
  ((SELECT id FROM public.categories WHERE name='Electrical'), 'MCB 16A', 8.00, 0),
  ((SELECT id FROM public.categories WHERE name='Electrical'), 'Conduit 20mm', 0, 50),
  ((SELECT id FROM public.categories WHERE name='Plumbing'), 'Copper Pipe 15mm', 22.00, 30),
  ((SELECT id FROM public.categories WHERE name='Plumbing'), 'Ball Valve', 14.00, 20),
  ((SELECT id FROM public.categories WHERE name='HVAC'), 'Filter HEPA', 45.00, 10);

INSERT INTO public.tickets (ticket_id, ticket_owner, subject, description, status, request_category, address) VALUES
  ('T-001', 'Amara Osei', 'Office Rewire – Floor 3', 'Full rewire of floor 3 electrical system', 'open', 'Electrical', '12 Victoria Island, Lagos'),
  ('T-002', 'Kemi Adewale', 'Burst Pipe – Server Room', 'Emergency pipe repair needed', 'open', 'Plumbing', '4 Lekki Phase 1, Lagos');

