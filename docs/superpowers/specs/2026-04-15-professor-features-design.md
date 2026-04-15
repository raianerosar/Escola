# Professor Panel — New Features Design

**Date:** 2026-04-15
**Status:** Approved

## Overview

Add four interconnected features to the professor panel:

1. **Cadastrar turma** — professor creates their own class with students
2. **Planner no dashboard** — weekly schedule view of upcoming classes
3. **Formar turma** — conclude all students at once and close the class
4. **Avisos da diretoria** — director sends targeted notices to specific users

---

## Database Schema

### New table: `horarios`

Stores recurring weekly schedule slots for a turma.

```sql
create table public.horarios (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid references public.turmas on delete cascade,
  dia_semana  integer not null check (dia_semana between 0 and 6), -- 0=Dom, 6=Sab
  hora_inicio time not null,
  hora_fim    time not null
);
```

### New table: `avisos`

Director-authored notice.

```sql
create table public.avisos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  corpo      text not null,
  criado_por uuid references public.profiles on delete set null,
  criado_em  timestamptz default now()
);
```

### New table: `avisos_destinatarios`

Maps each aviso to its recipients, tracking read state.

```sql
create table public.avisos_destinatarios (
  id              uuid primary key default gen_random_uuid(),
  aviso_id        uuid references public.avisos on delete cascade,
  destinatario_id uuid references public.profiles on delete cascade,
  lido            boolean default false,
  unique(aviso_id, destinatario_id)
);
```

### RLS policies

| Table | Who | Permission |
|---|---|---|
| `turmas` | Professor (own) | INSERT where `professor_id = auth.uid()` |
| `matriculas` | Professor (own turmas) | INSERT, UPDATE, DELETE |
| `horarios` | Professor (own turmas) | INSERT, UPDATE, DELETE |
| `horarios` | All authenticated | SELECT |
| `avisos` | Director | ALL |
| `avisos_destinatarios` | Director | INSERT, DELETE |
| `avisos_destinatarios` | Recipient | SELECT, UPDATE (lido only) |

---

## Pages & Components

### `/professor/dashboard` (modify)

Add two new blocks below existing content:

**Planner block**
- Shows classes for the current week, grouped by day
- Data: `horarios` joined with `turmas` filtered by `professor_id = auth.uid()`
- Each entry shows: turma name, time range, course name

**Avisos block**
- Lists unread notices from `avisos_destinatarios` where `destinatario_id = auth.uid()` and `lido = false`
- Each aviso shows: title, body preview, date
- "Marcar como lido" button → Server Action updates `lido = true`

### `/professor/turmas` (modify)

- Add "Nova Turma" button in the page header
- Links to `/professor/turmas/nova`

### `/professor/turmas/nova` (new page)

Three-section form submitted as a single Server Action:

**Section 1 — Info**
- Nome (text)
- Curso (select, loads from `cursos`)
- Data início (date)
- Data fim (date)

**Section 2 — Horários**
- Add multiple slots: dia da semana (select 0–6) + hora início + hora fim
- Client component to dynamically add/remove slots before submit

**Section 3 — Alunos**
- Client-side search via a new `GET /api/alunos?q=` route (returns profiles with `perfil = 'aluno'`)
- Results displayed inline; user clicks to add to a local list rendered in the page
- Local list is submitted as hidden inputs (`aluno_ids[]`) alongside the main form

On submit: insert `turmas` row → insert `horarios` rows → insert `matriculas` rows. Redirect to `/professor/turmas/[newId]`.

### `/professor/turmas/[id]` (modify)

- Add "Formar Turma" button in the page header (only visible when `turma.ativo = true`)
- Server Action `formarTurma(turmaId)`:
  1. Update all `matriculas` where `turma_id` and `status = 'ativo'` → `status = 'concluido'`
  2. Update `turmas` set `ativo = false` where `id = turmaId`
- Redirect back to same page after action

### `/diretor/avisos` (new page)

**List view** — table of sent avisos with: title, date, recipient count

**Create form** (same page, below or in modal):
- Título (text)
- Corpo (textarea)
- Destinatários: search profiles by name or `perfil` (aluno/professor); add multiple

Server Action `criarAviso(formData)`:
1. Insert into `avisos`
2. Insert one row per recipient into `avisos_destinatarios`

---

## Data Flow

```
Professor creates turma
  → POST /professor/turmas/nova (Server Action)
  → INSERT turmas + horarios + matriculas
  → redirect /professor/turmas/[id]

Professor views dashboard
  → SELECT horarios JOIN turmas (this week, professor_id filter)
  → SELECT avisos_destinatarios WHERE destinatario = me AND lido = false

Director creates aviso
  → POST /diretor/avisos (Server Action)
  → INSERT avisos + avisos_destinatarios per recipient

Professor reads aviso
  → PATCH avisos_destinatarios SET lido = true (Server Action)

Professor forms turma
  → POST /professor/turmas/[id] (Server Action: formarTurma)
  → UPDATE matriculas SET status = 'concluido'
  → UPDATE turmas SET ativo = false
```

---

## Error Handling

- Form validation on server (nome required, at least one horario, curso required)
- If turma insert fails, no horarios/matriculas are inserted (handle in try/catch with early return)
- "Formar Turma" is disabled if turma is already inactive
- Aviso with zero recipients is rejected server-side

---

## Out of Scope

- Push notifications or email for avisos (display only in UI)
- Professor editing or deleting a turma after creation
- Aluno-facing planner
