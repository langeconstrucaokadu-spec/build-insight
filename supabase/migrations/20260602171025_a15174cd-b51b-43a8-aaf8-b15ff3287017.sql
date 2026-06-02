REVOKE ALL ON FUNCTION public.verify_client_portal_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_client_portal_token(text) TO service_role;
