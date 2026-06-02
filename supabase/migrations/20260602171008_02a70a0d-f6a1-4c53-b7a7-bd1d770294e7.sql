-- =========================================================
-- Portal do Cliente: tabelas isoladas dos usuários internos
-- =========================================================

-- 1) Usuários externos do portal
CREATE TABLE public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_users TO authenticated;
GRANT ALL ON public.client_portal_users TO service_role;

ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client portal users"
  ON public.client_portal_users
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_client_portal_users_updated_at
  BEFORE UPDATE ON public.client_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Sessões / tokens do portal
CREATE TABLE public.client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_portal_sessions_user ON public.client_portal_sessions(client_user_id);
CREATE INDEX idx_client_portal_sessions_expires ON public.client_portal_sessions(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_sessions TO authenticated;
GRANT ALL ON public.client_portal_sessions TO service_role;

ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client portal sessions"
  ON public.client_portal_sessions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Vínculo cliente <-> obra liberada
CREATE TABLE public.client_portal_project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_user_id, project_id)
);

CREATE INDEX idx_client_portal_access_user ON public.client_portal_project_access(client_user_id);
CREATE INDEX idx_client_portal_access_project ON public.client_portal_project_access(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_project_access TO authenticated;
GRANT ALL ON public.client_portal_project_access TO service_role;

ALTER TABLE public.client_portal_project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client portal access"
  ON public.client_portal_project_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Função de verificação de token (usada pelas edge functions com service role)
CREATE OR REPLACE FUNCTION public.verify_client_portal_token(_token_hash text)
RETURNS TABLE (client_user_id uuid, email text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email, u.full_name
  FROM public.client_portal_sessions s
  JOIN public.client_portal_users u ON u.id = s.client_user_id
  WHERE s.token_hash = _token_hash
    AND s.expires_at > now()
    AND u.is_active = true
  LIMIT 1;
$$;
