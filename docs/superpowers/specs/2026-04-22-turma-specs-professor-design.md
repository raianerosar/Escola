# Design: Specs da Turma na Página de Detalhe (Professor)

**Data:** 2026-04-22
**Perfil:** Professor
**Rota afetada:** `/professor/turmas/[id]`

## Contexto

A página de detalhe da turma (`/professor/turmas/[id]`) já exibe os alunos matriculados e o StudentSearch. No entanto, dados essenciais da turma — curso, datas de início/fim e status (ativa/inativa) — não aparecem nessa página. O professor precisa voltar para a lista para ver essas informações.

## Objetivo

Exibir as especificações da turma em destaque no topo da página de detalhe, sem remover ou alterar a seção de alunos existente.

## Design

### Dados

A query atual busca `id, nome, cursos!curso_id(nome)`. Adicionar `data_inicio, data_fim, ativo` à mesma query — sem nova chamada ao banco.

Atualizar o tipo `TurmaDetail` para incluir os campos novos.

### Layout

Abaixo do cabeçalho (nome + EditNomeButton), inserir uma faixa horizontal com 4 cards:

| Card | Label | Valor |
|------|-------|-------|
| Curso | "Curso" | `turma.cursos?.nome ?? '—'` |
| Início | "Início" | data formatada `pt-BR` ou `'—'` |
| Fim | "Fim" | data formatada `pt-BR` ou `'—'` |
| Status | "Status" | badge verde "Ativa" / cinza "Inativa" |

**Estilo dos cards:**
- Container: `grid grid-cols-4 gap-4 mb-6`
- Card: `bg-zinc-900 rounded-xl px-5 py-4`
- Label: `text-zinc-500 text-xs mb-1`
- Valor: `text-zinc-100 text-sm font-medium`
- Badge status: reutiliza as classes já usadas na lista (`bg-green-900/40 text-green-400` / `bg-zinc-800 text-zinc-500`)

### Sem mudanças

- Seção de alunos matriculados
- StudentSearch
- EditNomeButton
- Lógica de server actions

## Arquivo modificado

- `app/professor/turmas/[id]/page.tsx` — única alteração necessária
