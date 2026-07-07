
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_cluster() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_all() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_visit(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.recompute_staff_scores_for_visit(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_visit_completed() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_action_items() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_cluster() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_visit(uuid, uuid) TO authenticated;
