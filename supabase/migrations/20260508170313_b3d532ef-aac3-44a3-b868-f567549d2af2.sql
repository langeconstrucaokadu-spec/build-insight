
REVOKE EXECUTE ON FUNCTION public.recalc_item_status(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recalc_project_progress(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_report_sync_item() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_item_recalc_project() FROM anon, authenticated, public;
