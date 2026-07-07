-- Simplified branch seed — just the names.
-- emirate and branch_profile are placeholders; update from the app after creation.
INSERT INTO public.branches (name, emirate, branch_profile, active)
SELECT * FROM (VALUES
  ('Al Ain',            'Dubai',  'Retail', true),
  ('Al Quoz',           'Dubai',  'Retail', true),
  ('Arjan',             'Dubai',  'Retail', true),
  ('Atlantis 1',        'Dubai',  'Retail', true),
  ('Atlantis 2',        'Dubai',  'Retail', true),
  ('Business Bay',      'Dubai',  'Retail', true),
  ('Capital',           'Dubai',  'Retail', true),
  ('Center',            'Dubai',  'Retail', true),
  ('Circle',            'Dubai',  'Retail', true),
  ('City Walk',         'Dubai',  'Retail', true),
  ('Corniche',          'Dubai',  'Retail', true),
  ('DCC',               'Dubai',  'Retail', true),
  ('DHCC',              'Dubai',  'Retail', true),
  ('GM 1',              'Dubai',  'Retail', true),
  ('GM 2',              'Dubai',  'Retail', true),
  ('Gate Avenue',       'Dubai',  'Retail', true),
  ('Greens',            'Dubai',  'Retail', true),
  ('Jumeirah',          'Dubai',  'Retail', true),
  ('Madinat Al Riyad',  'Dubai',  'Retail', true),
  ('Mirdif',            'Dubai',  'Retail', true),
  ('Nad Al Shiba',      'Dubai',  'Retail', true),
  ('Old Town',          'Dubai',  'Retail', true),
  ('One Central',       'Dubai',  'Retail', true),
  ('Palm',              'Dubai',  'Retail', true),
  ('Park',              'Dubai',  'Retail', true),
  ('Promenade',         'Dubai',  'Retail', true),
  ('RAK',               'Dubai',  'Retail', true),
  ('Shamkha',           'Dubai',  'Retail', true),
  ('Sharjah',           'Dubai',  'Retail', true),
  ('South',             'Dubai',  'Retail', true),
  ('Star',              'Dubai',  'Retail', true),
  ('Studio City',       'Dubai',  'Retail', true),
  ('Zahia',             'Dubai',  'Retail', true)
) AS t(name, emirate, branch_profile, active)
ON CONFLICT (name) DO NOTHING;
