
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','cluster_manager','viewer');
CREATE TYPE public.branch_profile AS ENUM ('Retail','Delivery','Mixed','24-Hour');
CREATE TYPE public.staff_role AS ENUM ('Pharmacist','Salesperson','Preparation','Branch Manager');
CREATE TYPE public.visit_status AS ENUM ('in_progress','completed');
CREATE TYPE public.action_item_status AS ENUM ('open','done','overdue');
CREATE TYPE public.checklist_scope AS ENUM ('branch','staff');
CREATE TYPE public.revisit_band AS ENUM ('routine','action_plan','focused_30d','urgent_7d');

-- ============ CLUSTERS ============
CREATE TABLE public.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clusters TO authenticated;
GRANT ALL ON public.clusters TO service_role;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_cluster()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cluster_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'cluster_manager' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_read_all()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin','viewer'));
$$;

-- user_roles policies (read own; super_admin manage)
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- clusters policies (read all authed; super admin write)
CREATE POLICY "clusters readable" ON public.clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "clusters admin write" ON public.clusters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ BRANCHES ============
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emirate text NOT NULL,
  cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  branch_profile public.branch_profile NOT NULL DEFAULT 'Retail',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches readable" ON public.branches FOR SELECT TO authenticated
  USING (public.can_read_all() OR cluster_id = public.current_user_cluster());
CREATE POLICY "branches admin write" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ STAFF ============
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role public.staff_role NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  dha_license_status text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff readable" ON public.staff FOR SELECT TO authenticated
  USING (public.can_read_all()
    OR branch_id IN (SELECT id FROM public.branches WHERE cluster_id = public.current_user_cluster()));
CREATE POLICY "staff admin write" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ CHECKLIST TEMPLATES ============
CREATE TABLE public.checklist_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  scope public.checklist_scope NOT NULL,
  applies_to_role public.staff_role,
  delivery_only boolean NOT NULL DEFAULT false,
  weight numeric NOT NULL DEFAULT 1.0,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checklist_sections TO authenticated;
GRANT ALL ON public.checklist_sections TO service_role;
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections readable" ON public.checklist_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "sections admin write" ON public.checklist_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.checklist_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.checklist_sections(id) ON DELETE CASCADE,
  point_text text NOT NULL,
  measure_text text,
  knockout boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checklist_points TO authenticated;
GRANT ALL ON public.checklist_points TO service_role;
ALTER TABLE public.checklist_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points readable" ON public.checklist_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "points admin write" ON public.checklist_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ VISITS ============
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  auditor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_time time NOT NULL DEFAULT CURRENT_TIME,
  status public.visit_status NOT NULL DEFAULT 'in_progress',
  overall_notes text,
  branch_score_pct numeric,
  weighted_score_pct numeric,
  people_index_pct numeric,
  red_flagged boolean NOT NULL DEFAULT false,
  revisit_band public.revisit_band,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visits_branch_idx ON public.visits(branch_id);
CREATE INDEX visits_auditor_idx ON public.visits(auditor_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_visit(_branch_id uuid, _auditor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'viewer')
    OR (public.has_role(auth.uid(),'cluster_manager')
        AND EXISTS (SELECT 1 FROM public.branches b
                    WHERE b.id = _branch_id AND b.cluster_id = public.current_user_cluster()));
$$;

CREATE POLICY "visits readable" ON public.visits FOR SELECT TO authenticated
  USING (public.can_access_visit(branch_id, auditor_user_id));
CREATE POLICY "visits insert" ON public.visits FOR INSERT TO authenticated
  WITH CHECK (auditor_user_id = auth.uid()
    AND (public.has_role(auth.uid(),'super_admin')
      OR (public.has_role(auth.uid(),'cluster_manager')
        AND EXISTS (SELECT 1 FROM public.branches b
                    WHERE b.id = branch_id AND b.cluster_id = public.current_user_cluster()))));
CREATE POLICY "visits update" ON public.visits FOR UPDATE TO authenticated
  USING (public.can_access_visit(branch_id, auditor_user_id)
    AND (public.has_role(auth.uid(),'super_admin') OR auditor_user_id = auth.uid()));
CREATE POLICY "visits delete admin" ON public.visits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- ============ BRANCH AUDIT RESPONSES ============
CREATE TABLE public.branch_audit_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  checklist_point_id uuid NOT NULL REFERENCES public.checklist_points(id) ON DELETE CASCADE,
  score int CHECK (score BETWEEN 1 AND 5),
  is_na boolean NOT NULL DEFAULT false,
  comment text,
  photo_url text,
  auditor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id, checklist_point_id)
);
CREATE INDEX bar_visit_idx ON public.branch_audit_responses(visit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_audit_responses TO authenticated;
GRANT ALL ON public.branch_audit_responses TO service_role;
ALTER TABLE public.branch_audit_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bar select" ON public.branch_audit_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_id
                 AND public.can_access_visit(v.branch_id, v.auditor_user_id)));
CREATE POLICY "bar write" ON public.branch_audit_responses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_id
                 AND (public.has_role(auth.uid(),'super_admin') OR v.auditor_user_id = auth.uid())))
  WITH CHECK (auditor_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_id
                 AND (public.has_role(auth.uid(),'super_admin') OR v.auditor_user_id = auth.uid())));

-- ============ STAFF AUDIT RESPONSES ============
CREATE TABLE public.staff_audit_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  checklist_point_id uuid NOT NULL REFERENCES public.checklist_points(id) ON DELETE CASCADE,
  score int CHECK (score BETWEEN 1 AND 5),
  is_na boolean NOT NULL DEFAULT false,
  comment text,
  photo_url text,
  auditor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id, staff_id, checklist_point_id)
);
CREATE INDEX sar_visit_idx ON public.staff_audit_responses(visit_id);
CREATE INDEX sar_staff_idx ON public.staff_audit_responses(staff_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_audit_responses TO authenticated;
GRANT ALL ON public.staff_audit_responses TO service_role;
ALTER TABLE public.staff_audit_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sar select" ON public.staff_audit_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_id
                 AND public.can_access_visit(v.branch_id, v.auditor_user_id)));
CREATE POLICY "sar write" ON public.staff_audit_responses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_id
                 AND (public.has_role(auth.uid(),'super_admin') OR v.auditor_user_id = auth.uid())))
  WITH CHECK (auditor_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_id
                 AND (public.has_role(auth.uid(),'super_admin') OR v.auditor_user_id = auth.uid())));

-- ============ STAFF SCORES ============
CREATE TABLE public.staff_scores (
  staff_id uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  overall_score numeric,
  operations_score numeric,
  sales_customer_score numeric,
  clinical_knowledge_score numeric,
  total_audits_count int NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_scores TO authenticated;
GRANT ALL ON public.staff_scores TO service_role;
ALTER TABLE public.staff_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff scores readable" ON public.staff_scores FOR SELECT TO authenticated
  USING (public.can_read_all()
    OR staff_id IN (SELECT s.id FROM public.staff s JOIN public.branches b ON b.id=s.branch_id
                    WHERE b.cluster_id = public.current_user_cluster()));

-- ============ ACTION ITEMS ============
CREATE TABLE public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  checklist_point_id uuid REFERENCES public.checklist_points(id) ON DELETE SET NULL,
  description text NOT NULL,
  assignee_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  due_date date,
  status public.action_item_status NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_in_visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_branch_idx ON public.action_items(branch_id);
CREATE INDEX ai_status_idx ON public.action_items(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated;
GRANT ALL ON public.action_items TO service_role;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "action items readable" ON public.action_items FOR SELECT TO authenticated
  USING (public.can_read_all()
    OR (public.has_role(auth.uid(),'cluster_manager')
        AND branch_id IN (SELECT id FROM public.branches WHERE cluster_id = public.current_user_cluster())));
CREATE POLICY "action items write" ON public.action_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')
    OR (public.has_role(auth.uid(),'cluster_manager')
        AND branch_id IN (SELECT id FROM public.branches WHERE cluster_id = public.current_user_cluster())))
  WITH CHECK (public.has_role(auth.uid(),'super_admin')
    OR (public.has_role(auth.uid(),'cluster_manager')
        AND branch_id IN (SELECT id FROM public.branches WHERE cluster_id = public.current_user_cluster())));

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bar_touch BEFORE UPDATE ON public.branch_audit_responses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER sar_touch BEFORE UPDATE ON public.staff_audit_responses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ STAFF SCORES AGGREGATION ============
CREATE OR REPLACE FUNCTION public.recompute_staff_scores_for_visit(_visit_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT staff_id FROM public.staff_audit_responses WHERE visit_id = _visit_id GROUP BY staff_id
  LOOP
    WITH audits AS (
      SELECT sar.visit_id,
             SUM(CASE WHEN sar.is_na=false AND sar.score IS NOT NULL THEN sar.score ELSE 0 END)::numeric AS pts,
             SUM(CASE WHEN sar.is_na=false AND sar.score IS NOT NULL THEN 5 ELSE 0 END)::numeric AS max_pts
      FROM public.staff_audit_responses sar
      JOIN public.visits v ON v.id = sar.visit_id AND v.status='completed'
      WHERE sar.staff_id = r.staff_id
      GROUP BY sar.visit_id
    ), pct AS (
      SELECT CASE WHEN max_pts>0 THEN pts/max_pts*100 ELSE NULL END AS p FROM audits
    )
    INSERT INTO public.staff_scores(staff_id, overall_score, total_audits_count, last_updated)
    SELECT r.staff_id, AVG(p), COUNT(*), now() FROM pct
    ON CONFLICT (staff_id) DO UPDATE
      SET overall_score = EXCLUDED.overall_score,
          total_audits_count = EXCLUDED.total_audits_count,
          last_updated = now();
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.on_visit_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
    PERFORM public.recompute_staff_scores_for_visit(NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER visits_on_complete BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.on_visit_completed();

-- Mark action items overdue nightly (handled by app read for now; simple function)
CREATE OR REPLACE FUNCTION public.mark_overdue_action_items()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.action_items
    SET status = 'overdue'
    WHERE status = 'open' AND due_date IS NOT NULL AND due_date < CURRENT_DATE;
$$;
