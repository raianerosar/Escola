# Portal do Professor — Design Spec

**Data:** 2026-04-15

## Visão Geral

Portal exclusivo para usuários com `perfil === 'professor'`. O professor gerencia apenas as turmas atribuídas a ele (`turmas.professor_id = uid`) e os alunos dessas turmas. Não tem acesso a funcionalidades administrativas (criar cursos, emitir certificados, gerenciar outros professores).

## Estrutura de Arquivos

```
app/professor/
  layout.tsx              — auth guard, sidebar nav
  dashboard/page.tsx      — stats: turmas, alunos, concluídos
  turmas/
    page.tsx              — lista de turmas do professor
    [id]/page.tsx         — alunos da turma + ações
```

Arquivos existentes a ajustar:
- `app/(auth)/login/page.tsx` — adicionar redirect para `/professor/dashboard` quando `perfil === 'professor'`
- `app/aluno/layout.tsx` — corrigir redirect de não-alunos (professor → `/professor/dashboard`)
- `app/diretor/layout.tsx` — corrigir redirect de não-diretores (professor → `/professor/dashboard`)

## Layout (`layout.tsx`)

Mesmo padrão dos outros portais: sidebar colapsável (`w-14 hover:w-56`), ícone da escola no topo, avatar com inicial do nome, `LogoutButton` visível no hover.

Auth guard:
- Sem sessão → `/login`
- `perfil !== 'professor'` → redireciona para o portal correto do perfil do usuário

Nav items:
| Label | Ícone | Rota |
|---|---|---|
| Dashboard | `dashboard` | `/professor/dashboard` |
| Minhas Turmas | `groups` | `/professor/turmas` |

## Páginas

### Dashboard (`/professor/dashboard`)

Três stat cards:
- **Minhas Turmas** — `count(turmas where professor_id = uid)`
- **Total de Alunos** — `count(matriculas where turma.professor_id = uid)`
- **Concluídos** — `count(matriculas where turma.professor_id = uid and status = 'concluido')`

Sem tabela adicional (mínimo acordado).

### Minhas Turmas (`/professor/turmas`)

Lista de cards ou tabela de `turmas where professor_id = uid`, incluindo join com `cursos(nome)` para exibir o nome do curso. Cada linha tem link para `/professor/turmas/[id]`.

Colunas: Nome da turma, Curso, Data início, Data fim, Status (ativo/inativo).

### Turma — detalhe (`/professor/turmas/[id]`)

Valida que `turma.professor_id === uid` antes de renderizar (redireciona para `/professor/turmas` se não for a turma dele).

Duas áreas:

**1. Lista de alunos matriculados**
Tabela com: Nome, Email, Status (`ativo` / `concluído`).
- Alunos `ativo`: botão "Concluir" → Server Action que faz `update matriculas set status = 'concluido'`.
- Alunos `concluido`: badge visual, sem ação.

**2. Adicionar aluno**
Campo de busca (nome ou email) que filtra `profiles where perfil = 'aluno'`. Exclui da busca alunos já matriculados na turma. Ao selecionar um aluno, botão "Matricular" → Server Action que insere em `matriculas`.

Ambas as ações usam **Server Actions** do Next.js (sem API routes).

## Banco de Dados — RLS

Políticas novas necessárias em `public.matriculas`:

```sql
-- Professor matricula alunos nas suas turmas
create policy "matriculas_professor_insert" on public.matriculas
  for insert with check (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.professor_id = auth.uid()
    )
  );

-- Professor atualiza status (ativo → concluido) nas suas turmas
create policy "matriculas_professor_update" on public.matriculas
  for update using (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.professor_id = auth.uid()
    )
  );
```

A política de leitura `matriculas_professor` já existe no schema inicial.

## Redirect do Login

A página de login (`app/(auth)/login/page.tsx`) atualmente só conhece `aluno` e `diretor`. Adicionar:

```
perfil === 'aluno'    → /aluno/dashboard
perfil === 'professor' → /professor/dashboard
perfil === 'diretor'  → /diretor/dashboard
```

## O que o Professor NÃO pode fazer

- Criar ou editar cursos
- Criar ou editar turmas (só o diretor pode)
- Emitir certificados (marcar como concluído é o limite — o diretor emite)
- Ver dados de outros professores
- Ver turmas que não são suas
