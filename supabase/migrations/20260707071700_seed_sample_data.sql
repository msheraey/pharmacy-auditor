-- ============ SEED: CLUSTERS, BRANCHES & STAFF ============
-- Idempotent — skips if clusters exist.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.clusters LIMIT 1) THEN RETURN; END IF;
END $$;

INSERT INTO public.clusters (name) VALUES ('Dubai'), ('Abu Dhabi'), ('Sharjah'), ('Al Ain'), ('RAK');

WITH
  dubai AS (SELECT id FROM public.clusters WHERE name = 'Dubai' LIMIT 1),
  abu   AS (SELECT id FROM public.clusters WHERE name = 'Abu Dhabi' LIMIT 1),
  sharj AS (SELECT id FROM public.clusters WHERE name = 'Sharjah' LIMIT 1),
  ain   AS (SELECT id FROM public.clusters WHERE name = 'Al Ain' LIMIT 1),
  rak   AS (SELECT id FROM public.clusters WHERE name = 'RAK' LIMIT 1)
INSERT INTO public.branches (name, emirate, cluster_id, branch_profile, active)
SELECT * FROM (VALUES
  ('Greens',            'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Star',              'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Promenade',         'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Studio City',       'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Business Bay',      'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Circle',            'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Jumeirah',          'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Palm',              'Dubai',      (SELECT id FROM dubai), '24-Hour',  true),
  ('GM 1',              'Dubai',      (SELECT id FROM dubai), 'Delivery', true),
  ('GM 2',              'Dubai',      (SELECT id FROM dubai), 'Delivery', true),
  ('South',             'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Atlantis 1',        'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Atlantis 2',        'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Gate Avenue',       'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Center',            'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Old Town',          'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('One Central',       'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('DCC',               'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('City Walk',         'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Nad Al Shiba',      'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Mirdif',            'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Park',              'Dubai',      (SELECT id FROM dubai), 'Retail',   true),
  ('Arjan',             'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('DHCC',              'Dubai',      (SELECT id FROM dubai), 'Mixed',    true),
  ('Al Quoz',           'Dubai',      (SELECT id FROM dubai), 'Delivery', true),
  ('Zahia',             'Dubai',      (SELECT id FROM dubai), '24-Hour',  true),
  ('Corniche',          'Abu Dhabi',   (SELECT id FROM abu),  'Mixed',    true),
  ('Capital',           'Abu Dhabi',   (SELECT id FROM abu),  'Retail',   true),
  ('Madinat Al Riyad',  'Abu Dhabi',   (SELECT id FROM abu),  'Retail',   true),
  ('Shamkha',           'Abu Dhabi',   (SELECT id FROM abu),  'Retail',   true),
  ('Al Ain',            'Al Ain',      (SELECT id FROM ain),  'Retail',   true),
  ('Sharjah',           'Sharjah',     (SELECT id FROM sharj), 'Mixed',   true),
  ('RAK',               'Ras Al Khaimah', (SELECT id FROM rak), 'Retail', true)
) AS t(name, emirate, cluster_id, branch_profile, active);

-- Staff (sample staff across a few branches)
WITH
  greens    AS (SELECT id FROM public.branches WHERE name = 'Greens' LIMIT 1),
  jumeirah  AS (SELECT id FROM public.branches WHERE name = 'Jumeirah' LIMIT 1),
  corniche  AS (SELECT id FROM public.branches WHERE name = 'Corniche' LIMIT 1),
  sharjah   AS (SELECT id FROM public.branches WHERE name = 'Sharjah' LIMIT 1),
  ain       AS (SELECT id FROM public.branches WHERE name = 'Al Ain' LIMIT 1)
INSERT INTO public.staff (staff_code, full_name, role, branch_id, dha_license_status, active)
SELECT * FROM (VALUES
  ('PH001', 'Dr. Ahmed Hassan',     'Pharmacist',    (SELECT id FROM greens),   'Active', true),
  ('SP002', 'Sara Khalid',         'Salesperson',   (SELECT id FROM greens),   NULL,     true),
  ('BM003', 'Omar Rashid',         'Branch Manager', (SELECT id FROM greens),  NULL,     true),
  ('PP004', 'Mohammed Ali',        'Preparation',    (SELECT id FROM greens),  NULL,     true),
  ('PH005', 'Dr. Layla Said',      'Pharmacist',     (SELECT id FROM jumeirah),'Active', true),
  ('SP006', 'Fatima Noor',         'Salesperson',    (SELECT id FROM jumeirah),NULL,     true),
  ('BM007', 'Khalid Salem',        'Branch Manager', (SELECT id FROM jumeirah),NULL,     true),
  ('PH008', 'Dr. Nadia Mansour',   'Pharmacist',     (SELECT id FROM corniche),'Active', true),
  ('SP009', 'Hassan Ibrahim',      'Salesperson',    (SELECT id FROM corniche),NULL,     true),
  ('BM010', 'Mona Ayesh',          'Branch Manager', (SELECT id FROM corniche),NULL,     true),
  ('PH011', 'Dr. Yousuf Al Ali',   'Pharmacist',     (SELECT id FROM sharjah), 'Active', true),
  ('SP012', 'Lama Nasser',         'Salesperson',    (SELECT id FROM sharjah), NULL,     true),
  ('BM013', 'Tariq Mahmoud',       'Branch Manager', (SELECT id FROM sharjah),NULL,     true),
  ('PH014', 'Dr. Amira Sultan',    'Pharmacist',     (SELECT id FROM ain),     'Active', true),
  ('SP015', 'Zaid Omar',           'Salesperson',    (SELECT id FROM ain),     NULL,     true),
  ('BM016', 'Abdulla Faisal',      'Branch Manager', (SELECT id FROM ain),     NULL,     true)
) AS t(staff_code, full_name, role, branch_id, dha_license_status, active);
