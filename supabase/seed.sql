-- supabase/seed.sql
-- Cria usuários de teste no Supabase Auth local.
-- O trigger handle_new_user criará os registros em public.profiles automaticamente.

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

-- Usuário professor
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
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'authenticated',
  'authenticated',
  'professor@professor.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"perfil":"professor","nome":"Professor Teste"}',
  now(),
  now(),
  '', '', '', ''
);

-- 4 alunos extras (aluno@aluno.com já existe acima)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb',
    'authenticated', 'authenticated',
    'joao@escola.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"perfil":"aluno","nome":"João Silva"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-cccccccccccc',
    'authenticated', 'authenticated',
    'maria@escola.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"perfil":"aluno","nome":"Maria Oliveira"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-dddddddddddd',
    'authenticated', 'authenticated',
    'pedro@escola.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"perfil":"aluno","nome":"Pedro Costa"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-eeeeeeeeeeee',
    'authenticated', 'authenticated',
    'ana@escola.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"perfil":"aluno","nome":"Ana Santos"}',
    now(), now(), '', '', '', ''
  );

-- Curso
INSERT INTO public.cursos (id, nome, descricao, carga_horaria)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa',
  'Desenvolvimento Web',
  'HTML, CSS, JavaScript e React do zero ao avançado',
  120
);

-- Turma atribuída ao professor
INSERT INTO public.turmas (id, nome, curso_id, professor_id, data_inicio, data_fim, ativo)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Web 2026/1',
  'bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '2026-02-03',
  '2026-07-11',
  true
);

-- Matrículas: aluno@aluno.com + 4 extras
INSERT INTO public.matriculas (aluno_id, turma_id, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'concluido'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo');

-- Horários da turma (Seg, Qua, Sex)
INSERT INTO public.horarios (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, '08:00', '10:00'),  -- Segunda
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, '14:00', '16:00'),  -- Quarta
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, '09:00', '11:00');  -- Sexta
