-- Fix infinite recursion in RLS policies on profiles table.
-- The old policies queried `profiles` directly to check if the user is a director,
-- which triggered the same policy again, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil = 'diretor'
  );
$$;

-- Drop old recursive policies
DROP POLICY IF EXISTS "profiles_director" ON public.profiles;
DROP POLICY IF EXISTS "cursos_director" ON public.cursos;
DROP POLICY IF EXISTS "turmas_director" ON public.turmas;
DROP POLICY IF EXISTS "matriculas_director" ON public.matriculas;
DROP POLICY IF EXISTS "certificados_director" ON public.certificados;

-- Recreate using the function (no more recursion)
CREATE POLICY "profiles_director" ON public.profiles FOR ALL
  USING (public.is_director());

CREATE POLICY "cursos_director" ON public.cursos FOR ALL
  USING (public.is_director());

CREATE POLICY "turmas_director" ON public.turmas FOR ALL
  USING (public.is_director());

CREATE POLICY "matriculas_director" ON public.matriculas FOR ALL
  USING (public.is_director());

CREATE POLICY "certificados_director" ON public.certificados FOR ALL
  USING (public.is_director());
