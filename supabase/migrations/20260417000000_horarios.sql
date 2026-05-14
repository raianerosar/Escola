-- Create horarios table
create table public.horarios (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid references public.turmas on delete cascade,
  dia_semana  integer not null check (dia_semana between 0 and 6), -- 0=Dom, 6=Sáb
  hora_inicio time not null,
  hora_fim    time not null
);

-- Enable RLS
alter table public.horarios enable row level security;

-- Professor manages schedules for their own turmas
create policy "horarios_professor_all" on public.horarios
  for all using (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );

-- All authenticated users can read schedules
create policy "horarios_select_authenticated" on public.horarios
  for select using (auth.role() = 'authenticated');
