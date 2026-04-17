-- Cloud seed: usa UUIDs reais do projeto cloud
-- professor@professor.com = dc4cbef8-96ab-4acb-8ae7-995c45a17306
-- aluno@aluno.com         = 8fe0b154-f171-4a5a-860b-272349b9153b

-- 4 alunos extras
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb','authenticated','authenticated','joao@escola.com',crypt('123456',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"perfil":"aluno","nome":"João Silva"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-cccccccccccc','authenticated','authenticated','maria@escola.com',crypt('123456',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"perfil":"aluno","nome":"Maria Oliveira"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-dddddddddddd','authenticated','authenticated','pedro@escola.com',crypt('123456',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"perfil":"aluno","nome":"Pedro Costa"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-eeeeeeeeeeee','authenticated','authenticated','ana@escola.com',crypt('123456',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"perfil":"aluno","nome":"Ana Santos"}',now(),now(),'','','','')
ON CONFLICT DO NOTHING;

-- Curso
INSERT INTO public.cursos (id, nome, descricao, carga_horaria)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa','Desenvolvimento Web','HTML, CSS, JavaScript e React do zero ao avançado',120)
ON CONFLICT DO NOTHING;

-- Turma atribuída ao professor (UUID real: dc4cbef8-96ab-4acb-8ae7-995c45a17306)
INSERT INTO public.turmas (id, nome, curso_id, professor_id, data_inicio, data_fim, ativo)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Web 2026/1',
  'bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa',
  'dc4cbef8-96ab-4acb-8ae7-995c45a17306',
  '2026-02-03',
  '2026-07-11',
  true
)
ON CONFLICT DO NOTHING;

-- Matrículas: aluno@aluno.com (UUID real) + 4 extras
INSERT INTO public.matriculas (aluno_id, turma_id, status) VALUES
  ('8fe0b154-f171-4a5a-860b-272349b9153b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'concluido'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ativo')
ON CONFLICT DO NOTHING;

-- Horários da turma (Seg, Qua, Sex)
INSERT INTO public.horarios (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, '08:00', '10:00'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, '14:00', '16:00'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, '09:00', '11:00')
ON CONFLICT DO NOTHING;
