# Design: Anotações e Alunos por Aula

**Data:** 2026-04-17

## Contexto

Na área do professor, o `PlannerCard` (grade semanal) já permite editar horários ao clicar. O professor precisa também registrar anotações sobre o que foi abordado em cada aula (por data específica) e visualizar os alunos matriculados na turma daquele horário.

## Dados

### Nova tabela `aulas`

```sql
create table public.aulas (
  id          uuid primary key default gen_random_uuid(),
  horario_id  uuid references public.horarios on delete cascade,
  data        date not null,
  notas       text not null default '',
  unique (horario_id, data)
);
```

RLS: professor pode gerenciar apenas aulas cujo `horario_id` pertence a um horário de uma turma dele.

Migration: `supabase/migrations/20260417000001_aulas.sql`

## UI: Dialog com abas

O dialog atual do `PlannerCard` passa a ter 3 abas via shadcn `Tabs`:

1. **Horário** — conteúdo existente (dia da semana, hora início/fim, salvar, remover)
2. **Anotações** — date picker (padrão: hoje), textarea, botão salvar; ao trocar a data carrega a nota daquele dia
3. **Alunos** — lista com nome e status dos alunos matriculados na turma (sem ações)

O `PlannerCard` já recebe `slot.turmaId`, que é usado para buscar alunos e associar o horário correto.

## Fluxo de dados

- **Alunos:** Server Action `getAlunosDaTurma(turmaId)` — query em `matriculas` com join em `profiles`, filtra `status != 'cancelado'`
- **Carregar nota:** Server Action `getAulaNota(horarioId, data)` — retorna `notas` ou `''` se não existir
- **Salvar nota:** Server Action `upsertAulaNota(horarioId, data, notas)` — upsert com `on conflict (horario_id, data)`

## Arquivos afetados

- `supabase/migrations/20260417000001_aulas.sql` — nova migration
- `app/professor/dashboard/actions.ts` — 3 novas Server Actions
- `app/professor/dashboard/planner-card.tsx` — dialog expandido com Tabs

## Fora de escopo

- Chamada/presença de alunos
- Histórico de notas em lista
- Editar/deletar notas antigas de forma especial (sobrescrita via upsert)
