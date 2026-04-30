create policy "certificados_professor_insert_own_turma" on public.certificados
  for insert with check (
    exists (
      select 1
      from public.matriculas m
      join public.turmas t on t.id = m.turma_id
      where m.aluno_id = certificados.aluno_id
        and t.curso_id = certificados.curso_id
        and t.professor_id = auth.uid()
    )
  );
