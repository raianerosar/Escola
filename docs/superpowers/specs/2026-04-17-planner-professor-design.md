# Planner Semanal — Professor Dashboard

**Date:** 2026-04-17
**Status:** Approved

## Overview

Add a weekly schedule planner block to the professor dashboard (`/professor/dashboard`). The planner displays the professor's recurring class schedule as a 7-column grid (Sun–Sat), with one shadcn `Card` per class slot inside each day column.

---

## Database

### New table: `horarios`

Already designed in `2026-04-15-professor-features-design.md`. Migration not yet created.

```sql
create table public.horarios (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid references public.turmas on delete cascade,
  dia_semana  integer not null check (dia_semana between 0 and 6), -- 0=Dom, 6=Sáb
  hora_inicio time not null,
  hora_fim    time not null
);
```

### RLS policies for `horarios`

```sql
-- Professor manages schedules for their own turmas
create policy "horarios_professor_all" on public.horarios
  for all using (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );

-- All authenticated users can read schedules
create policy "horarios_select_authenticated" on public.horarios
  for select using (auth.role() = 'authenticated');
```

---

## Components

### File structure

```
app/professor/dashboard/
├── page.tsx              ← add PlannerBlock below stat cards
├── planner-block.tsx     ← server component: fetches data, renders grid
├── planner-day-column.tsx ← pure component: one day column
└── planner-card.tsx      ← pure component: one class slot card
```

### `PlannerBlock` (server component)

Fetches `horarios` joined with `turmas` and `cursos`, filtered by `professor_id = auth.uid()`. Groups results by `dia_semana` (0–6). Passes grouped data to `PlannerDayColumn`.

If no horarios exist at all, renders an empty state instead of the grid.

### `PlannerDayColumn`

Props: `dia` (0–6), `slots` (array), `isToday` (boolean).

- Header: abbreviated day name (Dom, Seg, Ter, Qua, Qui, Sex, Sáb)
- `isToday`: header has blue text + subtle ring (`ring-1 ring-blue-500/40`)
- Empty column: shows a centered `—` in `text-zinc-700`
- Slots ordered by `hora_inicio` ascending
- `max-h-[320px] overflow-y-auto` to handle overflow gracefully

### `PlannerCard` (uses shadcn Card + Badge)

Each card shows:
- **Turma name** — `text-zinc-100 font-medium text-sm`
- **Curso name** — `text-zinc-500 text-xs`
- **Time range Badge** — `08:00 – 10:00`, shadcn `Badge` variant `outline`, small

---

## UX Details

| Concern | Solution |
|---|---|
| Today visibility | Column header turns blue + ring on current `dia_semana` |
| Empty days | Column present, shows `—` placeholder — grid stays complete |
| Card order | Sorted by `hora_inicio` ASC within each day |
| Day overflow | Column scrolls internally (`overflow-y-auto`, `max-h`) |
| No schedule at all | Full empty state: icon + "Nenhuma aula agendada ainda." |
| Mobile | `grid-cols-7` collapses to `grid-cols-1` with day as section header |

---

## shadcn Setup

Project does not yet have `components.json`. Steps:

1. `npx shadcn@latest init` — choose: style `default`, base color `zinc`, CSS variables `yes`, dark mode `class`
2. `npx shadcn@latest add card badge`

Components land in `components/ui/card.tsx` and `components/ui/badge.tsx`.

---

## Data Flow

```
ProfessorDashboardPage (server)
  └── PlannerBlock (server)
        └── supabase: SELECT horarios JOIN turmas JOIN cursos
              WHERE turmas.professor_id = auth.uid()
        └── group by dia_semana → Map<0..6, Slot[]>
        └── PlannerDayColumn × 7
              └── PlannerCard × n (sorted by hora_inicio)
```

---

## Out of Scope

- Editing or adding horarios from the dashboard (separate feature)
- Week navigation (next/previous week) — schedule is recurring, not date-based
- Color coding per turma
- Aluno-facing planner
