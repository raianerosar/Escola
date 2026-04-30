create table public.professor_planner (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles on delete cascade,
  turma_id uuid references public.turmas on delete set null,
  titulo text not null,
  descricao text,
  tipo text not null default 'outro' check (
    tipo in ('aula', 'adicionar_alunos', 'concluir_alunos', 'avaliacao', 'reuniao', 'outro')
  ),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  data_planejada date,
  concluido boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.professor_planner enable row level security;

create policy "professor_planner_select_own" on public.professor_planner
  for select using (
    professor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.perfil = 'professor'
    )
  );

create policy "professor_planner_insert_own" on public.professor_planner
  for insert with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.perfil = 'professor'
    )
  );

create policy "professor_planner_update_own" on public.professor_planner
  for update using (
    professor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.perfil = 'professor'
    )
  ) with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.perfil = 'professor'
    )
  );

create policy "professor_planner_delete_own" on public.professor_planner
  for delete using (
    professor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.perfil = 'professor'
    )
  );
