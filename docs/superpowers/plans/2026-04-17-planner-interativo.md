# Planner Interativo + Gestão de Turma — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o planner interativo (editar/remover/adicionar horários via Dialog) e melhorar a página da turma (editar nome, remover aluno).

**Architecture:** Client components com `useTransition` chamam Server Actions diretamente. O `PlannerCard` passa a ser `'use client'` e abre um Dialog de edição. Um botão separado `AddHorarioDialog` fica no header do planner. Na página da turma, dois novos client components: `EditNomeButton` (inline edit) e `RemoverAlunoButton`. Todos usam componentes shadcn.

**Tech Stack:** Next.js 16 App Router, Server Actions, shadcn/ui (Dialog, Select, Label, Button, Input), TypeScript.

---

## File Map

**New files:**
- `app/professor/dashboard/actions.ts` — Server Actions: createHorario, updateHorario, deleteHorario
- `app/professor/dashboard/add-horario-dialog.tsx` — client: Dialog para adicionar nova aula
- `app/professor/turmas/[id]/edit-nome-button.tsx` — client: inline edit do nome da turma
- `app/professor/turmas/[id]/remover-aluno-button.tsx` — client: botão remover aluno

**Modified files:**
- `app/professor/dashboard/planner-card.tsx` — adicionar `'use client'`, Dialog de edição, campos `turmaId` e `dia` no tipo `Slot`
- `app/professor/dashboard/planner-block.tsx` — passar `turmaId`/`dia` nos slots, buscar turmas para AddHorarioDialog, renderizar AddHorarioDialog
- `app/professor/turmas/[id]/actions.ts` — adicionar updateTurmaNome e removerAluno
- `app/professor/turmas/[id]/page.tsx` — filtrar cancelados, adicionar EditNomeButton e RemoverAlunoButton

---

## Task 1: Instalar componentes shadcn necessários

- [ ] **Step 1: Instalar Dialog, Select e Label**

```bash
npx shadcn@latest add dialog select label
```

Expected: cria `components/ui/dialog.tsx`, `components/ui/select.tsx`, `components/ui/label.tsx`.

- [ ] **Step 2: Verificar sem erros de tipo**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: sem output (sem erros nos arquivos da app).

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog.tsx components/ui/select.tsx components/ui/label.tsx
git commit -m "feat: add Dialog, Select and Label shadcn components"
```

---

## Task 2: Criar Server Actions do planner

**Files:**
- Create: `app/professor/dashboard/actions.ts`

- [ ] **Step 1: Criar o arquivo**

Crie `app/professor/dashboard/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getOwnedTurma(supabase: Awaited<ReturnType<typeof createClient>>, turmaId: string, userId: string) {
  const { data } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', userId)
    .single()
  return data
}

export async function createHorario(
  turmaId: string,
  dia: number,
  horaInicio: string,
  horaFim: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const turma = await getOwnedTurma(supabase, turmaId, user.id)
  if (!turma) return

  await supabase.from('horarios').insert({
    turma_id: turmaId,
    dia_semana: dia,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
  })

  revalidatePath('/professor/dashboard')
}

export async function updateHorario(
  horarioId: string,
  turmaId: string,
  dia: number,
  horaInicio: string,
  horaFim: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const turma = await getOwnedTurma(supabase, turmaId, user.id)
  if (!turma) return

  await supabase
    .from('horarios')
    .update({ dia_semana: dia, hora_inicio: horaInicio, hora_fim: horaFim })
    .eq('id', horarioId)

  revalidatePath('/professor/dashboard')
}

export async function deleteHorario(horarioId: string, turmaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const turma = await getOwnedTurma(supabase, turmaId, user.id)
  if (!turma) return

  await supabase.from('horarios').delete().eq('id', horarioId)

  revalidatePath('/professor/dashboard')
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "dashboard/actions"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/dashboard/actions.ts
git commit -m "feat: add createHorario, updateHorario, deleteHorario server actions"
```

---

## Task 3: Atualizar PlannerCard — client component com Dialog de edição

**Files:**
- Modify: `app/professor/dashboard/planner-card.tsx`

O tipo `Slot` ganha `turmaId` e `dia`. O componente vira `'use client'` e abre um Dialog ao clicar.

- [ ] **Step 1: Substituir o arquivo completo**

Substitua `app/professor/dashboard/planner-card.tsx` por:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateHorario, deleteHorario } from './actions'

export type Slot = {
  id: string
  turmaId: string
  dia: number
  turma: string
  curso: string
  horaInicio: string // "08:00:00"
  horaFim: string   // "10:00:00"
}

const DIA_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function PlannerCard({ slot }: { slot: Slot }) {
  const [open, setOpen] = useState(false)
  const [dia, setDia] = useState(String(slot.dia))
  const [horaInicio, setHoraInicio] = useState(formatTime(slot.horaInicio))
  const [horaFim, setHoraFim] = useState(formatTime(slot.horaFim))
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateHorario(slot.id, slot.turmaId, Number(dia), horaInicio, horaFim)
      setOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteHorario(slot.id, slot.turmaId)
      setOpen(false)
    })
  }

  return (
    <>
      <Card
        className="bg-zinc-800 border-zinc-700 shadow-none cursor-pointer hover:border-zinc-500 transition-colors"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-3 space-y-1">
          <p className="text-zinc-100 font-medium text-sm leading-tight">{slot.turma}</p>
          <p className="text-zinc-500 text-xs">{slot.curso}</p>
          <Badge
            variant="outline"
            className="text-zinc-400 border-zinc-600 text-[10px] px-1.5 py-0 h-4 mt-1"
          >
            {formatTime(slot.horaInicio)} – {formatTime(slot.horaFim)}
          </Badge>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">{slot.turma}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Dia da semana</Label>
              <Select value={dia} onValueChange={setDia}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {DIA_NAMES.map((nome, i) => (
                    <SelectItem key={i} value={String(i)} className="text-zinc-50 focus:bg-zinc-700">
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Início</Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Fim</Label>
                <Input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="sm:mr-auto"
            >
              Remover aula
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "planner-card"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/dashboard/planner-card.tsx
git commit -m "feat: make PlannerCard interactive with edit/delete dialog"
```

---

## Task 4: Criar AddHorarioDialog

**Files:**
- Create: `app/professor/dashboard/add-horario-dialog.tsx`

- [ ] **Step 1: Criar o arquivo**

Crie `app/professor/dashboard/add-horario-dialog.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createHorario } from './actions'

export type TurmaOption = { id: string; nome: string }

const DIA_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function AddHorarioDialog({ turmas }: { turmas: TurmaOption[] }) {
  const [open, setOpen] = useState(false)
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? '')
  const [dia, setDia] = useState('1')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!turmaId) return
    startTransition(async () => {
      await createHorario(turmaId, Number(dia), horaInicio, horaFim)
      setOpen(false)
      setDia('1')
      setHoraInicio('08:00')
      setHoraFim('10:00')
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
      >
        + Aula
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Nova Aula</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Turma</Label>
              <Select value={turmaId} onValueChange={setTurmaId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-50 focus:bg-zinc-700">
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Dia da semana</Label>
              <Select value={dia} onValueChange={setDia}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {DIA_NAMES.map((nome, i) => (
                    <SelectItem key={i} value={String(i)} className="text-zinc-50 focus:bg-zinc-700">
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Início</Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Fim</Label>
                <Input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={isPending || !turmaId}>
              {isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "add-horario"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/dashboard/add-horario-dialog.tsx
git commit -m "feat: add AddHorarioDialog for creating new schedule slots"
```

---

## Task 5: Atualizar PlannerBlock — passar turmaId/dia nos slots e renderizar AddHorarioDialog

**Files:**
- Modify: `app/professor/dashboard/planner-block.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

Substitua `app/professor/dashboard/planner-block.tsx` por:

```tsx
import { createClient } from '@/lib/supabase/server'
import { PlannerDayColumn } from './planner-day-column'
import { AddHorarioDialog, type TurmaOption } from './add-horario-dialog'
import type { Slot } from './planner-card'

type HorarioRow = {
  id: string
  turma_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  turmas: {
    nome: string
    cursos: { nome: string } | null
  } | null
}

async function getData(): Promise<{ grouped: Map<number, Slot[]>; turmas: TurmaOption[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { grouped: new Map(), turmas: [] }

  const { data: turmasData } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('professor_id', user.id)
    .eq('ativo', true)

  const turmas: TurmaOption[] = (turmasData ?? []).map((t) => ({ id: t.id, nome: t.nome }))
  const turmaIds = turmas.map((t) => t.id)

  if (turmaIds.length === 0) return { grouped: new Map(), turmas }

  const { data } = await supabase
    .from('horarios')
    .select('id, turma_id, dia_semana, hora_inicio, hora_fim, turmas!turma_id(nome, cursos!curso_id(nome))')
    .in('turma_id', turmaIds)
    .order('hora_inicio', { ascending: true })

  const rows = (data ?? []) as unknown as HorarioRow[]

  const grouped = new Map<number, Slot[]>()
  for (let i = 0; i <= 6; i++) grouped.set(i, [])

  for (const row of rows) {
    if (!row.turmas) continue
    const slot: Slot = {
      id: row.id,
      turmaId: row.turma_id,
      dia: row.dia_semana,
      turma: row.turmas.nome,
      curso: row.turmas.cursos?.nome ?? '—',
      horaInicio: row.hora_inicio,
      horaFim: row.hora_fim,
    }
    grouped.get(row.dia_semana)!.push(slot)
  }

  return { grouped, turmas }
}

export async function PlannerBlock() {
  const { grouped, turmas } = await getData()

  const totalSlots = Array.from(grouped.values()).reduce((sum, s) => sum + s.length, 0)
  const todayDia = new Date().getDay()

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-zinc-50 text-lg font-semibold">Grade Semanal</h2>
        {turmas.length > 0 && <AddHorarioDialog turmas={turmas} />}
      </div>

      {totalSlots === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-zinc-700 text-4xl block mb-2">
            calendar_today
          </span>
          <p className="text-zinc-500 text-sm">Nenhuma aula agendada ainda.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {Array.from({ length: 7 }, (_, i) => (
              <PlannerDayColumn
                key={i}
                dia={i}
                slots={grouped.get(i)!}
                isToday={i === todayDia}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "planner-block"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/dashboard/planner-block.tsx
git commit -m "feat: update PlannerBlock with turmaId/dia in slots and AddHorarioDialog"
```

---

## Task 6: Adicionar updateTurmaNome e removerAluno nas actions da turma

**Files:**
- Modify: `app/professor/turmas/[id]/actions.ts`

- [ ] **Step 1: Corrigir matricularAluno para usar upsert**

Um aluno removido (status=`cancelado`) ainda tem linha na tabela com o constraint `unique(aluno_id, turma_id)`. Re-matriculá-lo com INSERT falharia. Substituir INSERT por upsert.

Em `app/professor/turmas/[id]/actions.ts`, localize:

```ts
  await supabase.from('matriculas').insert({
    aluno_id: alunoId,
    turma_id: turmaId,
    status: 'ativo',
  })
```

Substitua por:

```ts
  await supabase.from('matriculas').upsert(
    { aluno_id: alunoId, turma_id: turmaId, status: 'ativo' },
    { onConflict: 'aluno_id,turma_id' },
  )
```

- [ ] **Step 2: Adicionar as duas novas actions ao final do arquivo existente**

Abra `app/professor/turmas/[id]/actions.ts` e adicione ao final:

```ts
export async function updateTurmaNome(turmaId: string, nome: string) {
  if (!nome.trim()) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('turmas')
    .update({ nome: nome.trim() })
    .eq('id', turmaId)
    .eq('professor_id', user.id)

  revalidatePath(`/professor/turmas/${turmaId}`)
  revalidatePath('/professor/turmas')
}

export async function removerAluno(matriculaId: string, turmaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase
    .from('matriculas')
    .update({ status: 'cancelado' })
    .eq('id', matriculaId)
    .eq('turma_id', turmaId)

  revalidatePath(`/professor/turmas/${turmaId}`)
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "turmas/\[id\]/actions"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/turmas/[id]/actions.ts
git commit -m "feat: add updateTurmaNome and removerAluno server actions"
```

---

## Task 7: Criar EditNomeButton

**Files:**
- Create: `app/professor/turmas/[id]/edit-nome-button.tsx`

- [ ] **Step 1: Criar o arquivo**

Crie `app/professor/turmas/[id]/edit-nome-button.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateTurmaNome } from './actions'

export function EditNomeButton({ turmaId, nomeAtual }: { turmaId: string; nomeAtual: string }) {
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(nomeAtual)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!nome.trim() || nome.trim() === nomeAtual) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      await updateTurmaNome(turmaId, nome.trim())
      setEditing(false)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setNome(nomeAtual)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-zinc-800 border-zinc-700 text-zinc-50 text-2xl font-semibold h-auto py-0 px-2 w-72"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? '...' : 'Salvar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setNome(nomeAtual); setEditing(false) }}
          className="text-zinc-500 hover:text-zinc-300">
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-zinc-50 text-2xl font-semibold">{nomeAtual}</h1>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
        aria-label="Editar nome da turma"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "edit-nome"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/turmas/[id]/edit-nome-button.tsx
git commit -m "feat: add EditNomeButton for inline turma name editing"
```

---

## Task 8: Criar RemoverAlunoButton

**Files:**
- Create: `app/professor/turmas/[id]/remover-aluno-button.tsx`

- [ ] **Step 1: Criar o arquivo**

Crie `app/professor/turmas/[id]/remover-aluno-button.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { removerAluno } from './actions'

export function RemoverAlunoButton({ matriculaId, turmaId }: { matriculaId: string; turmaId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await removerAluno(matriculaId, turmaId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 ml-3"
    >
      {isPending ? '...' : 'Remover'}
    </button>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "remover-aluno"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/turmas/[id]/remover-aluno-button.tsx
git commit -m "feat: add RemoverAlunoButton for cancelling student enrollment"
```

---

## Task 9: Atualizar página da turma

**Files:**
- Modify: `app/professor/turmas/[id]/page.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

Substitua `app/professor/turmas/[id]/page.tsx` por:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { matricularAluno, concluirMatricula } from './actions'
import { StudentSearch } from './student-search'
import { EditNomeButton } from './edit-nome-button'
import { RemoverAlunoButton } from './remover-aluno-button'

async function getTurmaData(turmaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: turma } = await supabase
    .from('turmas')
    .select('id, nome, cursos!curso_id(nome)')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return null

  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id, status, profiles!aluno_id(id, nome, email)')
    .eq('turma_id', turmaId)
    .neq('status', 'cancelado')
    .order('status')

  return { turma: turma as unknown as TurmaDetail, matriculas: matriculas ?? [] }
}

async function searchAlunos(turmaId: string, q: string) {
  const supabase = await createClient()

  const { data: enrolled } = await supabase
    .from('matriculas')
    .select('aluno_id')
    .eq('turma_id', turmaId)
    .neq('status', 'cancelado')

  const enrolledIds = (enrolled ?? []).map((m) => m.aluno_id)

  let query = supabase
    .from('profiles')
    .select('id, nome, email')
    .eq('perfil', 'aluno')
    .or(`nome.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10)

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }

  const { data } = await query
  return data ?? []
}

export default async function TurmaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { id } = await params
  const { q } = await searchParams

  const result = await getTurmaData(id)
  if (!result) redirect('/professor/turmas')

  const { turma, matriculas } = result
  const searchResults = q ? await searchAlunos(id, q) : []
  const addAction = matricularAluno.bind(null, id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-zinc-500 text-sm mb-1">{turma.cursos?.nome ?? 'Curso'}</p>
        <EditNomeButton turmaId={id} nomeAtual={turma.nome} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-zinc-50 text-sm font-semibold">Alunos Matriculados</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {(matriculas as unknown as MatriculaRow[]).map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800/50">
                    <td className="px-6 py-3 text-zinc-300 text-sm">
                      {m.profiles?.nome ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 text-xs">
                      {m.profiles?.email ?? '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.status === 'concluido'
                            ? 'bg-purple-900/40 text-purple-400'
                            : 'bg-green-900/40 text-green-400'
                        }`}
                      >
                        {m.status === 'concluido' ? 'Concluído' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {m.status === 'ativo' && (
                        <div className="flex items-center justify-end">
                          <form action={concluirMatricula}>
                            <input type="hidden" name="matriculaId" value={m.id} />
                            <input type="hidden" name="turmaId" value={id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
                            >
                              Concluir
                            </button>
                          </form>
                          <RemoverAlunoButton matriculaId={m.id} turmaId={id} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {matriculas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-zinc-500 text-sm text-center">
                      Nenhum aluno matriculado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <StudentSearch results={searchResults} addAction={addAction} />
        </div>
      </div>
    </div>
  )
}

type TurmaDetail = {
  id: string
  nome: string
  cursos: { nome: string } | null
}

type MatriculaRow = {
  id: string
  status: string
  profiles: { id: string; nome: string; email: string } | null
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: sem output.

- [ ] **Step 3: Commit**

```bash
git add app/professor/turmas/[id]/page.tsx
git commit -m "feat: update turma page with EditNomeButton, RemoverAlunoButton and filter cancelados"
```

---

## Task 10: Smoke test

- [ ] **Step 1: Iniciar dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login como professor**

Vá para http://localhost:3000/login e entre com `professor@professor.com` / `123456`.

- [ ] **Step 3: Testar planner — editar aula**

No dashboard, clique num card de aula (ex: Segunda 08:00–10:00). O Dialog deve abrir com os campos preenchidos. Altere o horário e clique Salvar. O planner deve atualizar.

- [ ] **Step 4: Testar planner — remover aula**

Clique num card e clique "Remover aula". O card deve desaparecer do planner.

- [ ] **Step 5: Testar planner — adicionar aula**

Clique no botão "+ Aula" no cabeçalho do planner. Selecione turma, dia e horário. Clique Adicionar. O novo card deve aparecer no dia correto.

- [ ] **Step 6: Testar turma — editar nome**

Vá para http://localhost:3000/professor/turmas, clique em "Ver alunos" da turma Web 2026/1. Passe o mouse sobre o nome da turma — o ícone de lápis aparece. Clique, edite o nome, pressione Enter ou clique Salvar. O nome deve atualizar.

- [ ] **Step 7: Testar turma — remover aluno**

Na mesma página, clique "Remover" ao lado de um aluno ativo. O aluno deve sumir da lista.
