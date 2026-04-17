# Aula: Anotações e Alunos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir o PlannerCard do professor com abas para anotações por data e lista de alunos da turma.

**Architecture:** Nova tabela `aulas` armazena notas por (horario_id, data). O dialog do PlannerCard ganha 3 abas via shadcn Tabs. As server actions `getAulaNota`, `upsertAulaNota`, e `getAlunosDaTurma` fazem a ponte com o Supabase.

**Tech Stack:** Next.js (App Router), Supabase, shadcn/ui (Tabs, Textarea), TypeScript

> **Nota:** Antes de escrever qualquer componente React/Next.js, invoque o skill `vercel-react-best-practices`.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260417000001_aulas.sql` | Criar | Tabela `aulas` + RLS |
| `app/professor/dashboard/actions.ts` | Modificar | +3 server actions |
| `app/professor/dashboard/planner-card.tsx` | Modificar | Dialog com Tabs (Horário, Anotações, Alunos) |

---

## Task 1: Migration — tabela `aulas`

**Files:**
- Create: `supabase/migrations/20260417000001_aulas.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
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
```

- [ ] **Step 2: Aplicar a migration no Supabase**

```bash
npx supabase db push
```

Expected: migration aplicada sem erros. Se o ambiente for local: `npx supabase db reset`.

- [ ] **Step 3: Verificar a tabela no Supabase Studio**

Abra o Supabase Studio → Table Editor → confirme que `aulas` aparece com colunas `id`, `horario_id`, `data`, `notas`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260417000001_aulas.sql
git commit -m "feat: add aulas table with RLS for professor notes"
```

---

## Task 2: Server Actions — getAulaNota, upsertAulaNota, getAlunosDaTurma

**Files:**
- Modify: `app/professor/dashboard/actions.ts`

- [ ] **Step 1: Adicionar as 3 server actions ao final do arquivo `actions.ts`**

Abra `app/professor/dashboard/actions.ts` e acrescente ao final:

```typescript
export async function getAulaNota(
  horarioId: string,
  data: string, // formato "YYYY-MM-DD"
): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const { data: aula } = await supabase
    .from('aulas')
    .select('notas')
    .eq('horario_id', horarioId)
    .eq('data', data)
    .single()

  return aula?.notas ?? ''
}

export async function upsertAulaNota(
  horarioId: string,
  data: string, // formato "YYYY-MM-DD"
  notas: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('aulas').upsert(
    { horario_id: horarioId, data, notas },
    { onConflict: 'horario_id,data' },
  )
}

export type AlunoInfo = {
  id: string
  nome: string
  status: string
}

export async function getAlunosDaTurma(turmaId: string): Promise<AlunoInfo[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('matriculas')
    .select('status, profiles!aluno_id(id, nome)')
    .eq('turma_id', turmaId)
    .neq('status', 'cancelado')
    .order('status')

  type Row = { status: string; profiles: { id: string; nome: string } | null }
  return ((data ?? []) as unknown as Row[])
    .filter((m) => m.profiles)
    .map((m) => ({ id: m.profiles!.id, nome: m.profiles!.nome, status: m.status }))
}
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/professor/dashboard/actions.ts
git commit -m "feat: add getAulaNota, upsertAulaNota, getAlunosDaTurma server actions"
```

---

## Task 3: PlannerCard — dialog com 3 abas

**Files:**
- Modify: `app/professor/dashboard/planner-card.tsx`

> **Antes de escrever código React:** invoque o skill `vercel-react-best-practices`.

- [ ] **Step 1: Adicionar imports necessários**

No topo do arquivo `app/professor/dashboard/planner-card.tsx`, adicione/atualize os imports:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getAulaNota, upsertAulaNota, getAlunosDaTurma, type AlunoInfo } from './actions'
```

Verifique se shadcn Textarea está instalado. Se não estiver:
```bash
npx shadcn@latest add textarea
```

- [ ] **Step 2: Adicionar state para as abas e dados**

Dentro do componente `PlannerCard`, após os states existentes (`open`, `dia`, `horaInicio`, `horaFim`), adicione:

```typescript
const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
const [notaData, setNotaData] = useState(today)
const [notas, setNotas] = useState('')
const [notaLoading, setNotaLoading] = useState(false)
const [alunos, setAlunos] = useState<AlunoInfo[]>([])
const [alunosLoaded, setAlunosLoaded] = useState(false)
```

- [ ] **Step 3: Adicionar funções de carregamento**

Após os states, adicione:

```typescript
async function loadNota(data: string) {
  setNotaLoading(true)
  const texto = await getAulaNota(slot.id, data)
  setNotas(texto)
  setNotaLoading(false)
}

async function handleNotaDataChange(nova: string) {
  setNotaData(nova)
  await loadNota(nova)
}

async function handleSaveNota() {
  startTransition(async () => {
    await upsertAulaNota(slot.id, notaData, notas)
  })
}

async function loadAlunos() {
  if (alunosLoaded) return
  const lista = await getAlunosDaTurma(slot.turmaId)
  setAlunos(lista)
  setAlunosLoaded(true)
}
```

- [ ] **Step 4: Carregar nota ao abrir o dialog**

Atualize o `onOpenChange` do `Dialog`:

```typescript
<Dialog
  open={open}
  onOpenChange={(v) => {
    setOpen(v)
    if (v) {
      loadNota(today)
      setNotaData(today)
      setAlunosLoaded(false)
    }
  }}
>
```

- [ ] **Step 5: Substituir o conteúdo do DialogContent por Tabs**

Substitua todo o conteúdo dentro de `<DialogContent>` (entre `<DialogHeader>` e o fechamento `</DialogContent>`) pelo seguinte:

```tsx
<DialogHeader>
  <DialogTitle className="text-zinc-50">{slot.turma}</DialogTitle>
</DialogHeader>

<Tabs defaultValue="horario" className="mt-2">
  <TabsList className="bg-zinc-800 border border-zinc-700 w-full">
    <TabsTrigger value="horario" className="flex-1 text-zinc-400 data-[state=active]:text-zinc-50 data-[state=active]:bg-zinc-700">
      Horário
    </TabsTrigger>
    <TabsTrigger value="anotacoes" className="flex-1 text-zinc-400 data-[state=active]:text-zinc-50 data-[state=active]:bg-zinc-700">
      Anotações
    </TabsTrigger>
    <TabsTrigger
      value="alunos"
      className="flex-1 text-zinc-400 data-[state=active]:text-zinc-50 data-[state=active]:bg-zinc-700"
      onClick={loadAlunos}
    >
      Alunos
    </TabsTrigger>
  </TabsList>

  {/* --- Aba Horário (conteúdo existente) --- */}
  <TabsContent value="horario">
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Dia da semana</Label>
        <Select value={dia} onValueChange={(v) => { if (v !== null) setDia(v) }}>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraInicio(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Fim</Label>
          <Input
            type="time"
            value={horaFim}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraFim(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-50"
          />
        </div>
      </div>
    </div>
    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
        className="sm:mr-auto"
      >
        Remover aula
      </Button>
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={isPending}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      >
        Cancelar
      </Button>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </DialogFooter>
  </TabsContent>

  {/* --- Aba Anotações --- */}
  <TabsContent value="anotacoes">
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Data da aula</Label>
        <Input
          type="date"
          value={notaData}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotaDataChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-50"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">O que foi abordado</Label>
        <Textarea
          value={notaLoading ? '' : notas}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotas(e.target.value)}
          placeholder={notaLoading ? 'Carregando...' : 'Escreva aqui o conteúdo da aula...'}
          disabled={notaLoading}
          rows={5}
          className="bg-zinc-800 border-zinc-700 text-zinc-50 placeholder:text-zinc-600 resize-none"
        />
      </div>
    </div>
    <DialogFooter className="mt-4">
      <Button onClick={handleSaveNota} disabled={isPending || notaLoading}>
        {isPending ? 'Salvando...' : 'Salvar anotação'}
      </Button>
    </DialogFooter>
  </TabsContent>

  {/* --- Aba Alunos --- */}
  <TabsContent value="alunos">
    <div className="py-2">
      {!alunosLoaded ? (
        <p className="text-zinc-500 text-sm text-center py-4">Carregando...</p>
      ) : alunos.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-4">Nenhum aluno matriculado.</p>
      ) : (
        <ul className="space-y-2">
          {alunos.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-200 text-sm">{a.nome}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                a.status === 'concluido'
                  ? 'bg-purple-900/40 text-purple-400'
                  : 'bg-green-900/40 text-green-400'
              }`}>
                {a.status === 'concluido' ? 'Concluído' : 'Ativo'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </TabsContent>
</Tabs>
```

- [ ] **Step 6: Verificar que o TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 7: Testar manualmente no browser**

```bash
npm run dev
```

1. Acesse `/professor/dashboard`
2. Clique em qualquer card da grade semanal
3. Verifique que o dialog abre com 3 abas: **Horário**, **Anotações**, **Alunos**
4. Na aba **Horário**: editar dia/hora funciona igual a antes
5. Na aba **Anotações**: campo de data inicia com hoje, textarea vazia, escreva algo e salve; reabra o dialog e veja a nota persistida
6. Troque a data no campo — a nota deve mudar para a do novo dia
7. Na aba **Alunos**: lista dos alunos da turma aparece com nome e status

- [ ] **Step 8: Commit**

```bash
git add app/professor/dashboard/planner-card.tsx
git commit -m "feat: expand PlannerCard dialog with Horário, Anotações and Alunos tabs"
```
