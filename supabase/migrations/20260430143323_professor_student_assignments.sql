create table public.professor_tarefas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles on delete cascade,
  turma_id uuid not null references public.turmas on delete cascade,
  titulo text not null,
  descricao text,
  data_entrega date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.aluno_tarefa_respostas (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.professor_tarefas on delete cascade,
  aluno_id uuid not null references public.profiles on delete cascade,
  resposta text not null,
  entregue_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tarefa_id, aluno_id)
);

alter table public.professor_tarefas enable row level security;
alter table public.aluno_tarefa_respostas enable row level security;

create policy "professor_tarefas_professor_select_own" on public.professor_tarefas
  for select using (professor_id = auth.uid());

create policy "professor_tarefas_aluno_select_enrolled" on public.professor_tarefas
  for select using (
    ativo
    and exists (
      select 1
      from public.matriculas m
      where m.turma_id = professor_tarefas.turma_id
        and m.aluno_id = auth.uid()
        and m.status <> 'cancelado'
    )
  );

create policy "professor_tarefas_professor_insert_own_turma" on public.professor_tarefas
  for insert with check (
    professor_id = auth.uid()
    and exists (
      select 1
      from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );

create policy "professor_tarefas_professor_update_own" on public.professor_tarefas
  for update using (
    professor_id = auth.uid()
  ) with check (
    professor_id = auth.uid()
    and exists (
      select 1
      from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );

create policy "professor_tarefas_professor_delete_own" on public.professor_tarefas
  for delete using (professor_id = auth.uid());

create policy "aluno_tarefa_respostas_aluno_select_own" on public.aluno_tarefa_respostas
  for select using (aluno_id = auth.uid());

create policy "aluno_tarefa_respostas_professor_select_own_tarefa" on public.aluno_tarefa_respostas
  for select using (
    exists (
      select 1
      from public.professor_tarefas pt
      where pt.id = tarefa_id
        and pt.professor_id = auth.uid()
    )
  );

create policy "aluno_tarefa_respostas_aluno_insert_enrolled" on public.aluno_tarefa_respostas
  for insert with check (
    aluno_id = auth.uid()
    and exists (
      select 1
      from public.professor_tarefas pt
      join public.matriculas m on m.turma_id = pt.turma_id
      where pt.id = tarefa_id
        and pt.ativo
        and m.aluno_id = auth.uid()
        and m.status <> 'cancelado'
    )
  );

create policy "aluno_tarefa_respostas_aluno_update_own" on public.aluno_tarefa_respostas
  for update using (
    aluno_id = auth.uid()
  ) with check (
    aluno_id = auth.uid()
    and exists (
      select 1
      from public.professor_tarefas pt
      join public.matriculas m on m.turma_id = pt.turma_id
      where pt.id = tarefa_id
        and pt.ativo
        and m.aluno_id = auth.uid()
        and m.status <> 'cancelado'
    )
  );
