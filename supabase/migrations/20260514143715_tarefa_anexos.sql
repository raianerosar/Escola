insert into storage.buckets (id, name, public, file_size_limit)
values ('tarefas-anexos', 'tarefas-anexos', false, 10485760)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create table public.professor_tarefa_anexos (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.professor_tarefas on delete cascade,
  professor_id uuid not null references public.profiles on delete cascade,
  bucket_id text not null default 'tarefas-anexos',
  caminho text not null unique,
  nome text not null,
  mime_type text,
  tamanho bigint not null default 0,
  criado_em timestamptz not null default now()
);

create index professor_tarefa_anexos_tarefa_id_idx
  on public.professor_tarefa_anexos (tarefa_id);

alter table public.professor_tarefa_anexos enable row level security;

create policy "professor_tarefa_anexos_professor_select_own"
  on public.professor_tarefa_anexos
  for select using (professor_id = auth.uid());

create policy "professor_tarefa_anexos_aluno_select_enrolled"
  on public.professor_tarefa_anexos
  for select using (
    exists (
      select 1
      from public.professor_tarefas pt
      join public.matriculas m on m.turma_id = pt.turma_id
      where pt.id = professor_tarefa_anexos.tarefa_id
        and pt.ativo
        and m.aluno_id = auth.uid()
        and m.status <> 'cancelado'
    )
  );

create policy "professor_tarefa_anexos_professor_insert_own_tarefa"
  on public.professor_tarefa_anexos
  for insert with check (
    professor_id = auth.uid()
    and bucket_id = 'tarefas-anexos'
    and exists (
      select 1
      from public.professor_tarefas pt
      where pt.id = tarefa_id
        and pt.professor_id = auth.uid()
    )
  );

create policy "professor_tarefa_anexos_professor_delete_own"
  on public.professor_tarefa_anexos
  for delete using (professor_id = auth.uid());
