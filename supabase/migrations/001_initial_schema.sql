-- supabase/migrations/001_initial_schema.sql

-- Profiles (auto-created on signup via trigger)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  email text not null,
  perfil text not null check (perfil in ('aluno', 'professor', 'diretor')),
  avatar_url text,
  criado_em timestamptz default now()
);

-- Courses
create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  carga_horaria integer,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Classes
create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  curso_id uuid references public.cursos on delete cascade,
  professor_id uuid references public.profiles on delete set null,
  data_inicio date,
  data_fim date,
  ativo boolean default true
);

-- Enrollments
create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.profiles on delete cascade,
  turma_id uuid references public.turmas on delete cascade,
  status text not null default 'ativo' check (status in ('ativo', 'concluido', 'cancelado')),
  criado_em timestamptz default now(),
  unique(aluno_id, turma_id)
);

-- Certificates
create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.profiles on delete cascade,
  curso_id uuid references public.cursos on delete cascade,
  codigo_verificacao uuid default gen_random_uuid() unique not null,
  data_emissao date default current_date,
  url_pdf text
);

-- Trigger: create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, email, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'perfil', 'aluno')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.cursos enable row level security;
alter table public.turmas enable row level security;
alter table public.matriculas enable row level security;
alter table public.certificados enable row level security;

-- Profiles: users see own, directors see all
create policy "profiles_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_director" on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.perfil = 'diretor')
);

-- Cursos: authenticated read, director write
create policy "cursos_read" on public.cursos for select using (auth.role() = 'authenticated');
create policy "cursos_director" on public.cursos for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.perfil = 'diretor')
);

-- Turmas: authenticated read, director write, professor sees own
create policy "turmas_read" on public.turmas for select using (auth.role() = 'authenticated');
create policy "turmas_director" on public.turmas for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.perfil = 'diretor')
);

-- Matriculas: aluno sees own, professor sees their turmas, director sees all
create policy "matriculas_aluno" on public.matriculas for select using (aluno_id = auth.uid());
create policy "matriculas_professor" on public.matriculas for select using (
  exists (select 1 from public.turmas t where t.id = turma_id and t.professor_id = auth.uid())
);
create policy "matriculas_director" on public.matriculas for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.perfil = 'diretor')
);

-- Certificados: aluno sees own, public verify by codigo, director manages
create policy "certificados_aluno" on public.certificados for select using (aluno_id = auth.uid());
create policy "certificados_public_verify" on public.certificados for select using (true);
create policy "certificados_director" on public.certificados for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.perfil = 'diretor')
);
