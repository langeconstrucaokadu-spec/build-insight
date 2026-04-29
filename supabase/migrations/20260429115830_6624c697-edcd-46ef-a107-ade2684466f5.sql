CREATE OR REPLACE FUNCTION public.list_app_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role public.app_role,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(p.full_name, u.raw_user_meta_data ->> 'full_name', u.email::text) AS full_name,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = u.id
          AND ur.role = 'admin'::public.app_role
      ) THEN 'admin'::public.app_role
      ELSE 'client'::public.app_role
    END AS role,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY u.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.set_app_user_role(_user_id uuid, _role public.app_role)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar permissões.';
  END IF;

  IF _role = 'admin'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::public.app_role;
  END IF;

  RETURN _role;
END;
$$;