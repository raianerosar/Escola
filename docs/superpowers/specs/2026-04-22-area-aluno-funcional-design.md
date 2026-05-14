# Design: Área do Aluno — Páginas Funcionais

**Data:** 2026-04-22

## Objetivo

Substituir as três páginas placeholder da área do aluno (`dashboard`, `turmas`, `certificados`) por páginas funcionais que exibem dados reais do banco de dados.

## Arquitetura

Todas as páginas são Server Components. Cada uma busca dados diretamente via Supabase server client. A RLS já garante que o aluno autenticado veja apenas os próprios dados — não é necessário filtrar por `aluno_id` na query (o banco faz isso automaticamente).

Nenhum Server Action novo é necessário: as queries são simples o suficiente para ficarem inline nas páginas.

## Páginas

### 1. Dashboard (`app/aluno/dashboard/page.tsx`)

**Dados:**
- Count de `matriculas` com `status = 'ativo'` → card "Minhas Turmas"
- Count de `certificados` → card "Certificados"
- Últimas 5 `matriculas` com join em `turmas` e `cursos` → lista de atividade recente

**Layout:**
- 2 stat cards no topo (igual ao padrão do diretor)
- Seção "Atividade Recente" com tabela das últimas matrículas (nome da turma, curso, status, data de matrícula)

### 2. Minhas Turmas (`app/aluno/turmas/page.tsx`)

**Dados:**
- Todas as `matriculas` com join em `turmas` → join em `cursos` e `profiles` (professor)

**Layout:**
- Cards ou tabela listando: nome da turma, nome do curso, nome do professor, badge de status (ativo = verde, concluido = azul, cancelado = vermelho)
- Estado vazio se não houver matrículas

### 3. Meus Certificados (`app/aluno/certificados/page.tsx`)

**Dados:**
- Todos os `certificados` com join em `cursos`

**Layout:**
- Lista com: nome do curso, data de emissão formatada (pt-BR), código de verificação (texto truncado)
- Estado vazio se não houver certificados

## Fora de escopo

- Detalhe por turma (página individual por turma)
- Download de PDF de certificado
- Copiar código de verificação (pode ser adicionado depois)
- Próximos horários de aula no dashboard
