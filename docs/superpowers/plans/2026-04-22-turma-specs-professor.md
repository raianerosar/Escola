# Turma Specs Professor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir curso, datas de início/fim e status da turma em cards no topo da página `/professor/turmas/[id]`.

**Architecture:** Mudança única em `app/professor/turmas/[id]/page.tsx` — expandir a query Supabase para incluir os campos faltantes, atualizar o tipo TypeScript e inserir a grade de cards no JSX acima da tabela de alunos.

**Tech Stack:** Next.js App Router (Server Component), Supabase, Tailwind CSS

---

### Task 1: Expandir query e tipo TurmaDetail

**Files:**
- Modify: `app/professor/turmas/[id]/page.tsx`

- [ ] **Step 1: Atualizar a query Supabase**

Em `app/professor/turmas/[id]/page.tsx`, na função `getTurmaData`, altere o `.select(...)` da turma de:

```ts
.select('id, nome, cursos!curso_id(nome)')
```

para:

```ts
.select('id, nome, ativo, data_inicio, data_fim, cursos!curso_id(nome)')
```

- [ ] **Step 2: Atualizar o tipo TurmaDetail**

Na parte inferior do arquivo, altere:

```ts
type TurmaDetail = {
  id: string
  nome: string
  cursos: { nome: string } | null
}
```

para:

```ts
type TurmaDetail = {
  id: string
  nome: string
  ativo: boolean | null
  data_inicio: string | null
  data_fim: string | null
  cursos: { nome: string } | null
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/professor/turmas/[id]/page.tsx
git commit -m "feat: add ativo, data_inicio, data_fim to turma detail query"
```

---

### Task 2: Adicionar grade de cards de specs no JSX

**Files:**
- Modify: `app/professor/turmas/[id]/page.tsx`

- [ ] **Step 1: Inserir grade de cards abaixo do cabeçalho**

No JSX da página, localize o bloco do cabeçalho (que termina com `<EditNomeButton ... />`):

```tsx
<div className="mb-6">
  <p className="text-zinc-500 text-sm mb-1">{turma.cursos?.nome ?? 'Curso'}</p>
  <EditNomeButton turmaId={id} nomeAtual={turma.nome} />
</div>
```

Substitua por:

```tsx
<div className="mb-6">
  <p className="text-zinc-500 text-sm mb-1">{turma.cursos?.nome ?? 'Curso'}</p>
  <EditNomeButton turmaId={id} nomeAtual={turma.nome} />
</div>

<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-zinc-900 rounded-xl px-5 py-4">
    <p className="text-zinc-500 text-xs mb-1">Curso</p>
    <p className="text-zinc-100 text-sm font-medium">{turma.cursos?.nome ?? '—'}</p>
  </div>
  <div className="bg-zinc-900 rounded-xl px-5 py-4">
    <p className="text-zinc-500 text-xs mb-1">Início</p>
    <p className="text-zinc-100 text-sm font-medium">
      {turma.data_inicio
        ? new Date(turma.data_inicio).toLocaleDateString('pt-BR')
        : '—'}
    </p>
  </div>
  <div className="bg-zinc-900 rounded-xl px-5 py-4">
    <p className="text-zinc-500 text-xs mb-1">Fim</p>
    <p className="text-zinc-100 text-sm font-medium">
      {turma.data_fim
        ? new Date(turma.data_fim).toLocaleDateString('pt-BR')
        : '—'}
    </p>
  </div>
  <div className="bg-zinc-900 rounded-xl px-5 py-4">
    <p className="text-zinc-500 text-xs mb-1">Status</p>
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        turma.ativo
          ? 'bg-green-900/40 text-green-400'
          : 'bg-zinc-800 text-zinc-500'
      }`}
    >
      {turma.ativo ? 'Ativa' : 'Inativa'}
    </span>
  </div>
</div>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Rodar o servidor e verificar visualmente**

```bash
npm run dev
```

Abrir `http://localhost:3000/professor/turmas/<id-de-uma-turma>` e confirmar:
- 4 cards aparecem abaixo do título da turma
- Curso, Início, Fim e Status estão corretos
- Badge de status é verde para turma ativa, cinza para inativa
- Seção de alunos matriculados está intacta abaixo dos cards

- [ ] **Step 4: Commit**

```bash
git add app/professor/turmas/[id]/page.tsx
git commit -m "feat: show turma specs cards on professor turma detail page"
```
