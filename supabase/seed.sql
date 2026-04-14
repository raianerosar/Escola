-- supabase/seed.sql
-- Cria o usuário aluno@aluno.com no Supabase Auth local.
-- O trigger handle_new_user criará o registro em public.profiles automaticamente.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'aluno@aluno.com',
  crypt('aluno123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"perfil":"aluno","nome":"Aluno Teste"}',
  now(),
  now(),
  '', '', '', ''
);
