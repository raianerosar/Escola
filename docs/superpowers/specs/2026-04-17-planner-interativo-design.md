# Planner Interativo + Gestão de Turma — Design

**Date:** 2026-04-17
**Status:** Approved

## Overview

Adicionar interatividade ao planner semanal do professor e melhorar a página de detalhe da turma. O professor pode editar/remover/adicionar horários diretamente pelo planner, editar o nome da turma e remover alunos na página da turma.

---

## Funcionalidades

### 1. Editar horário (planner)

Clicar num `PlannerCard` abre um `Dialog` (shadcn) com:
- `Select` — dia da semana (Dom–Sáb)
- `Input` — hora início
- `Input` — hora fim
- Botão **Salvar** → `updateHorario(horarioId, dia, horaInicio, horaFim)`
- Botão **Remover aula** (variante destrutiva) → `deleteHorario(horarioId)`

### 2. Adicionar horário (planner)

Botão **"+ Aula"** no cabeçalho do planner abre um `Dialog` com:
- `Select` — turma (lista das turmas ativas do professor)
- `Select` — dia da semana
- `Input` — hora início
- `Input` — hora fim
- Botão **Adicionar** → `createHorario(turmaId, dia, horaInicio, horaFim)`

Múltiplas aulas no mesmo dia são permitidas — sem restrição de unicidade por dia.

### 3. Editar nome da turma (página da turma)

Ícone de lápis (`Pencil` do lucide-react, já incluso no shadcn) ao lado do nome da turma no header da página `/professor/turmas/[id]`. Ao clicar:
- Título vira um `Input` shadcn inline
- Botões **Salvar** e **Cancelar** aparecem
- Salvar → `updateTurmaNome(turmaId, nome)`

### 4. Remover aluno (página da turma)

Botão **"Remover"** ao lado de "Concluir" em cada linha de aluno ativo. Chama `removerAluno(matriculaId, turmaId)` que define `status = 'cancelado'`. Alunos cancelados não aparecem na lista. A query da página da turma deve adicionar `.neq('status', 'cancelado')` para excluí-los.

---

## Componentes

### Novos arquivos

```
app/professor/dashboard/
├── actions.ts                  ← createHorario, updateHorario, deleteHorario
├── add-horario-dialog.tsx      ← client: Dialog para adicionar nova aula
├── planner-card.tsx            ← modificar: adicionar click handler + Dialog de edição
```

```
app/professor/turmas/[id]/
├── actions.ts                  ← adicionar: updateTurmaNome, removerAluno
├── edit-nome-button.tsx        ← client: inline edit do nome da turma
├── remover-aluno-button.tsx    ← client: botão remover com confirmação
```

### Modificações

- `app/professor/dashboard/planner-block.tsx` — passar lista de turmas ativas como prop para `AddHorarioDialog`
- `app/professor/dashboard/planner-card.tsx` — tornar client component, adicionar Dialog de edição
- `app/professor/turmas/[id]/page.tsx` — incluir `EditNomeButton` e `RemoverAlunoButton`

---

## Server Actions

### `app/professor/dashboard/actions.ts` (novo)

```ts
'use server'

createHorario(turmaId: string, dia: number, horaInicio: string, horaFim: string)
  → INSERT horarios; revalidatePath('/professor/dashboard')

updateHorario(horarioId: string, dia: number, horaInicio: string, horaFim: string)
  → verifica ownership via JOIN turmas; UPDATE horarios; revalidatePath('/professor/dashboard')

deleteHorario(horarioId: string)
  → verifica ownership; DELETE horarios; revalidatePath('/professor/dashboard')
```

### `app/professor/turmas/[id]/actions.ts` (modificar)

```ts
updateTurmaNome(turmaId: string, nome: string)
  → verifica professor_id = auth.uid(); UPDATE turmas SET nome; revalidatePath(...)

removerAluno(matriculaId: string, turmaId: string)
  → verifica ownership; UPDATE matriculas SET status = 'cancelado'; revalidatePath(...)
```

Todas as actions verificam que o professor autenticado é dono da turma antes de qualquer mutação.

---

## Data Flow

```
Professor clica no card
  → PlannerCard (client) abre Dialog
  → Preenche form e salva
  → updateHorario Server Action
  → revalidatePath('/professor/dashboard')
  → PlannerBlock re-fetches e re-renderiza

Professor clica em "+ Aula"
  → AddHorarioDialog abre
  → Seleciona turma + dia + horário
  → createHorario Server Action
  → revalidatePath('/professor/dashboard')

Professor edita nome da turma
  → EditNomeButton (client) mostra Input inline
  → updateTurmaNome Server Action
  → revalidatePath('/professor/turmas/[id]')

Professor remove aluno
  → RemoverAlunoButton (client) chama removerAluno Server Action
  → matricula.status = 'cancelado'
  → revalidatePath('/professor/turmas/[id]')
```

---

## shadcn Components necessários

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` — modais
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` — dropdowns
- `Input` — já instalado via init
- `Button` — já instalado via init
- `Label` — formulários acessíveis

---

## Out of Scope

- Confirmação de deleção com segundo dialog (remover aula é imediato)
- Histórico de alterações
- Notificar alunos sobre mudança de horário
