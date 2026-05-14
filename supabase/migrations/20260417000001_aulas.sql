-- supabase/migrations/20260417000001_aulas.sql

create table public.aulas (
  id          uuid primary key default gen_random_uuid(),
  horario_id  uuid references public.horarios on delete cascade not null,
  data        date not null,
  notas       text not null default '',
  unique (horario_id, data)
);

alter table public.aulas enable row level security;

-- Professor gerencia apenas aulas dos próprios horários
create policy "aulas_professor_all" on public.aulas
  for all using (
    exists (
      select 1 from public.horarios h
      join public.turmas t on t.id = h.turma_id
      where h.id = horario_id
        and t.professor_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.horarios h
      join public.turmas t on t.id = h.turma_id
      where h.id = horario_id
        and t.professor_id = auth.uid()
    )
  );
