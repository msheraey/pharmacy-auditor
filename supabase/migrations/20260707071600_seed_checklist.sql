-- ============ SEED: CHECKLIST SECTIONS & POINTS ============
-- Run after the base schema migration. Idempotent — skips if sections exist.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.checklist_sections LIMIT 1) THEN RETURN; END IF;
END $$;

-- ── Branch sections ──────────────────────────────────────────

INSERT INTO public.checklist_sections (code, name, scope, delivery_only, weight, sort_order, active) VALUES
  ('A1', 'Exterior & First Impression', 'branch', false, 1.0, 10, true),
  ('A2', 'Retail Floor & Merchandising',  'branch', false, 1.0, 20, true),
  ('A3', 'Pharmacy Counter & Dispensing', 'branch', false, 1.0, 30, true),
  ('A4', 'Stockroom & Inventory',         'branch', false, 1.0, 40, true),
  ('A5', 'Cold Chain & Controlled Storage','branch', false, 1.5, 50, true),
  ('A6', 'Regulatory & Compliance',       'branch', false, 1.5, 60, true),
  ('A7', 'Safety & Security',             'branch', false, 1.0, 70, true),
  ('A8', 'Systems, POS & Back Office',    'branch', false, 1.0, 80, true),
  ('A9', 'Delivery & Fulfillment',        'branch', true,  1.0, 90, true),
  ('A10','Readiness & Resetability',      'branch', false, 1.0, 100, true),
  ('A11','Drivers & Bikes Condition',     'branch', true,  1.0, 110, true);

-- ── A1 · Exterior & First Impression ─────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A1' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Signage & facade condition', 'All external signage lit, clean, undamaged; branding per guidelines', false, 10),
  ('Entrance & windows',         'Glass clean, door working, entrance unobstructed', false, 20),
  ('Window promotional display','Current campaign shown, no expired promos', false, 30),
  ('External cleanliness',       'Frontage litter-free, no storage visible outside', false, 40),
  ('Opening hours displayed & accurate','Posted hours match actual and online listing', false, 50)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A2 · Retail Floor & Merchandising ──────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A2' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Planogram compliance',             'Spot-check 3 random bays against current planogram', false, 10),
  ('Shelf fullness & facing',          'No gaps, products faced, shelf strips intact', false, 20),
  ('Price tag accuracy',               'Scan 10 random items: shelf price = POS price', false, 30),
  ('Promotional execution',            'Promo stock displayed, old material removed', false, 40),
  ('Product expiry on shelf',          'Check 10 fast + 5 slow movers vs short-expiry policy', false, 50),
  ('Floor & shelf cleanliness',        'Floor clean, no dust (top-shelf finger test), no damaged stock', false, 60),
  ('Lighting & ambience',              'All lights working, AC functional', false, 70),
  ('Aisle accessibility',              'No boxes/trolleys blocking aisles in trading hours', false, 80),
  ('Category signage & navigation',    'Headers correct and matching shelf content', false, 90)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A3 · Pharmacy Counter & Dispensing ─────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A3' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Counter cleanliness & clutter',            'No personal items, food, or unfiled paperwork', false, 10),
  ('Behind-counter organization',              'Fast-movers accessible, shelves labeled, no mixed stock', false, 20),
  ('POM segregation',                          'Prescription-only stock not customer-accessible', true, 30),
  ('Counseling area / privacy',                'Private consultation space clean and usable', false, 40),
  ('Reference access',                         'Drug interaction reference reachable within 30 seconds', false, 50),
  ('Waiting experience',                       'Queue flow clear; note observed average serve time', false, 60)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A4 · Stockroom & Inventory ────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A4' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Organization & labeling',           'Locations labeled; test-retrieve an item within 2 min', false, 10),
  ('FEFO compliance',                   'Pull 5 items: earliest expiry at picking position', false, 20),
  ('Short-expiry management',           'List maintained and actioned; items flagged in system', false, 30),
  ('Damaged/expired quarantine',        'Segregated, labeled, logged, not with sellable stock', true, 40),
  ('Stock accuracy spot-check',         'Count 5 random SKUs vs system quantity', false, 50),
  ('Receiving discipline',              'No unprocessed deliveries past SOP window; GRNs done', false, 60),
  ('Storage conditions',                'No stock on floor or blocking AC; weights respected', false, 70),
  ('Cleanliness & pest control',        'Clean; pest control record current', false, 80)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A5 · Cold Chain & Controlled Storage ──────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A5' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Fridge temperature now',            'Read display: must be 2–8°C', true, 10),
  ('Temperature log completeness',      'Last 14 days complete, no gaps', false, 20),
  ('Excursion handling',                'Staff explain the SOP; past excursions documented', false, 30),
  ('Fridge organization',               'No food, no overpacking, airflow space, segregation', false, 40),
  ('Controlled drug storage & register','Locked, access-limited; count 2 items vs register', true, 50),
  ('Room temperature monitoring',       'Sales floor/stockroom within medicine storage range', false, 60)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A6 · Regulatory & Compliance ──────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A6' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Licenses displayed & valid',             'Pharmacy + pharmacist licenses displayed, in date', true, 10),
  ('Pharmacist on duty',                     'Licensed pharmacist present at time of visit', true, 20),
  ('Narcotic/controlled register',           'Current, balanced, stored correctly', true, 30),
  ('Recall management',                      'Last recall actioned & documented; staff know process', false, 40),
  ('e-Rx / insurance workflow',              'Observe a claim: eligibility → approval → dispense', false, 50),
  ('Insurance rejection handling',           'Rejection log reviewed; resubmissions within SLA', false, 60),
  ('Documentation retention',                'Required records retrievable within 5 minutes', false, 70),
  ('Compliance documentation posted',        'Required notices/certificates displayed', false, 80),
  ('Complaint log review',                   'Log current; recent complaints actioned with outcomes recorded', false, 90)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A7 · Safety & Security ────────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A7' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Fire extinguishers & exits',  'In date, accessible, exits unobstructed', true, 10),
  ('First aid kit',               'Present, stocked, in date', false, 20),
  ('CCTV operational',            'Working, correct date/time, retention per policy', false, 30),
  ('Cash handling security',      'Safe per SOP; spot-check till float; cash management process followed', false, 40),
  ('Physical/electrical hazards', 'No exposed wiring, wet floors marked', false, 50)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A8 · Systems, POS & Back Office ───────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A8' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('POS / pharmacy system working',     'All terminals up; no aged IT tickets', false, 10),
  ('Till reconciliation',               'Yesterday complete, variance in tolerance', false, 20),
  ('Pending transactions hygiene',      'No aged suspended sales/returns', false, 30),
  ('Reports awareness',                 'Manager pulls daily sales/KPI report on request', false, 40),
  ('Communication board',               'Latest HQ memos posted/acknowledged', false, 50)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A9 · Delivery & Fulfillment ───────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A9' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Order preparation area',              'Dedicated, organized, separate from retail flow', false, 10),
  ('Picking accuracy spot-check',         'Audit 3 packed orders vs order details', false, 20),
  ('Packaging standard',                  'Correct bags, cold-chain packaging, receipt included', false, 30),
  ('Dispatch time performance',           'Yesterday: % dispatched within SLA', false, 40),
  ('Pending / aged orders',              'No unactioned orders older than SLA right now', false, 50),
  ('Rider handover process',              'Order-ID verification observed and logged', false, 60),
  ('Returns / failed delivery handling',  'Restocked & relogged per SOP within 24h', false, 70),
  ('Cold chain for delivery',             'Validated cool bags & gel packs; staff explain rule', true, 80)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A10 · Readiness & Resetability ────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A10' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Next-day readiness',         'Replenishment done, floats prepared, opening checklist ready', false, 10),
  ('Closing checklist compliance','Last 7 days completed and signed', false, 20),
  ('Reset speed test',           'Time to restore one disturbed bay to standard', false, 30),
  ('Consumables at par',         'Bags, till rolls, labels, cleaning supplies stocked', false, 40)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── A11 · Drivers & Bikes Condition ────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'A11' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Bike roadworthiness',              'Tires, brakes, lights, horn, mirrors all functional', true, 10),
  ('Registration & insurance validity','Mulkiya and insurance in date', true, 20),
  ('Rider license validity',           'Valid motorcycle license held', true, 30),
  ('Helmet condition & usage',         'Helmet undamaged, worn on every trip', false, 40),
  ('Safety gear',                      'Reflective vest, gloves; per RTA delivery requirements', false, 50),
  ('Delivery box condition',           'Securely mounted, clean, undamaged, branded', false, 60),
  ('Cold bag & gel packs',             'Cool bag intact; gel packs frozen and ready', false, 70),
  ('Bike cleanliness & branding',      'Clean, decals intact and current', false, 80),
  ('Fines / violations status',        'Check rider declaration or system for open fines', false, 90),
  ('Phone mount & delivery app',       'Mount safe; app logged in and functional', false, 100)
) AS t(point_text, measure_text, knockout, sort_order);


-- ── Staff sections ──────────────────────────────────────────

INSERT INTO public.checklist_sections (code, name, scope, applies_to_role, delivery_only, weight, sort_order, active) VALUES
  ('B0', 'Shared Baseline',     'staff', NULL,           false, 1.0, 1000, true),
  ('B1', 'Pharmacist',          'staff', 'Pharmacist',   false, 1.0, 1010, true),
  ('B2', 'Salesperson',         'staff', 'Salesperson',  false, 1.0, 1020, true),
  ('B3', 'Preparation Staff',   'staff', 'Preparation',  false, 1.0, 1030, true),
  ('B4', 'Branch Manager',      'staff', 'Branch Manager',false, 1.0, 1040, true);

-- ── B0 · Shared Baseline ─────────────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'B0' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Attitude and professionalism',         'Observe 2 customer/colleague interactions', false, 10),
  ('Presentability / appearance / grooming','Uniform clean, badge worn, per grooming policy', false, 20),
  ('Adherence to SOPs',                    'Pick one SOP relevant to their station; verify they follow it', false, 30),
  ('Punctuality / attendance discipline',  'Roster vs actual, last 2 weeks (system check)', false, 40),
  ('Workspace organization & cleanliness', 'Their area of responsibility clean and ordered', false, 50)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── B1 · Pharmacist ─────────────────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'B1' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Product/shelf knowledge',                'Asks to locate 3 items; found quickly', false, 10),
  ('Insurance handling competency',          'Processes a claim end-to-end; handles a rejection correctly', false, 20),
  ('Drug equivalency knowledge',             'Names alternative brands with same active ingredient for 2 products', false, 30),
  ('Customer/patient consultation quality',  'Observed: dose, frequency, key warnings communicated', false, 40),
  ('Cross-selling and upselling ability',    'Relevant, clinically appropriate suggestion made naturally', false, 50),
  ('Prescription handling & dispensing accuracy','Observed dispensing vs e-Rx; screening questions asked', false, 60),
  ('Clinical scenario test',                 '2 questions: interaction / contraindication / referral red-flag', false, 70),
  ('Regulatory awareness',                   'Controlled-drug rules; what requires prescription', false, 80),
  ('Delivery operations management',         'Oversight of order queue and cold-chain rules (delivery/mixed only)', false, 90)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── B2 · Salesperson ────────────────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'B2' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Non-medicine category product knowledge','3 products from their section: use, differentiation, price', false, 10),
  ('Upselling technique',                    'Observed or scenario-tested', false, 20),
  ('Cross-selling technique',                'Relevant complementary suggestion made naturally', false, 30),
  ('Customer engagement quality',            'Greeting, listening, closing observed', false, 40),
  ('Speed & accuracy retrieving items',      'Timed test: retrieve 2–3 named items, log the time in comment', false, 50),
  ('Boundary awareness',                     'Hands medical questions to pharmacist (test it)', false, 60),
  ('Merchandising contribution',             'Own sections faced, priced, clean', false, 70)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── B3 · Preparation Staff ──────────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'B3' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('Order acceptance speed',                       'Time from order arrival to acceptance (sample from system)', false, 10),
  ('Order preparation speed/accuracy',             'Observe one order prepared live', false, 20),
  ('Shortage management',                          'Logic and speed of arranging inter-branch transfers', false, 30),
  ('Driver assignment turnaround',                 'Time from packed to assigned (sample from system)', false, 40),
  ('Follow-up discipline with driver',             'Tracks until delivery confirmed', false, 50),
  ('Customer post-delivery follow-up',             'Confirmation loop completed', false, 60),
  ('Payment collection & reconciliation from driver','Spot-check yesterday\'s reconciliation', false, 70),
  ('Order closure accuracy',                       'Closed correctly in Dynamics/billing system', false, 80),
  ('Cashier task competency',                      'Drawer management, shift closing', false, 90),
  ('Marketplace/platform orders',                  'Handling and escalation process knowledge', false, 100),
  ('Complaint handling',                           'Knows reporting hierarchy and escalation steps', false, 110)
) AS t(point_text, measure_text, knockout, sort_order);

-- ── B4 · Branch Manager ────────────────────────────────
WITH sec AS (SELECT id FROM public.checklist_sections WHERE code = 'B4' LIMIT 1)
INSERT INTO public.checklist_points (section_id, point_text, measure_text, knockout, sort_order, active)
SELECT sec.id, * FROM sec, (VALUES
  ('KPI command',                'States MTD sales vs target, basket size, conversion without looking up', false, 10),
  ('Action plan follow-through', '% of previous visit action items closed on time (auto-suggest from action_items data)', false, 20),
  ('Roster & coverage planning', 'Matches footfall; pharmacist coverage legal at all hours', false, 30),
  ('Team development',           'Training/briefings evidenced; staff confirm topics', false, 40),
  ('Issue ownership',            'One recent problem: handling + documentation quality', false, 50),
  ('Communication cascade',      'Staff aware of latest HQ directives (verify with a staff member)', false, 60),
  ('Inventory leadership',       'Expiry, shrinkage, stock-take within tolerance', false, 70)
) AS t(point_text, measure_text, knockout, sort_order);
