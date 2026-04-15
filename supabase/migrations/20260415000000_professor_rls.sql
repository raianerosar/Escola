-- supabase/migrations/20260415000000_professor_rls.sql

-- Professor can enroll students in their own turmas
create policy "matriculas_professor_insert" on public.matriculas
  for insert with check (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );

-- Professor can update matricula status in their own turmas (ativo → concluido)
create policy "matriculas_professor_update" on public.matriculas
  for update using (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );
