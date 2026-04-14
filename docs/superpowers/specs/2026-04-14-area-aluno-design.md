# Design: Área do Aluno

**Data:** 2026-04-14

## Objetivo

Criar uma área exclusiva para alunos, acessível via login com `aluno@aluno.com`, com layout e navegação próprios — espelhando o que já existe para o diretor (`admin@admin.com` → `/dashboard`).

## Partes

### 1. Usuário de teste (`aluno@aluno.com`)

- Criar migration seed que insere o usuário `aluno@aluno.com` com `perfil = 'aluno'` no Supabase Auth e na tabela `profiles`.
- Padrão idêntico ao `admin@admin.com` já existente para o diretor.

### 2. Grupo de rotas `(aluno)`

- `app/(aluno)/layout.tsx` — layout com sidebar colapsável (mesmo estilo do diretor), com itens de nav relevantes ao aluno:
  - Dashboard
  - Minhas Turmas
  - Meus Certificados
- Protegido: se não autenticado → redirect `/login`; se `perfil ≠ 'aluno'` → redirect `/dashboard`
- `app/(aluno)/dashboard/page.tsx` — página inicial do aluno (placeholder "Em breve", mesmo estilo das outras páginas)

### 3. Login inteligente

**Login page (`app/(auth)/login/page.tsx`):**
- Após autenticar com sucesso, buscar `perfil` do usuário via Supabase client
- Redirecionar: `diretor` → `/dashboard`, `aluno` → `/aluno/dashboard`, outros → `/dashboard` (fallback)

**Proxy (`proxy.ts`):**
- Para usuário autenticado em `/login` ou `/`: buscar `perfil` e redirecionar para a área correta
- `/dashboard` e sub-rotas: permitir apenas `perfil = 'diretor'`
- `/aluno/*`: permitir apenas `perfil = 'aluno'`

## Fora de escopo

- Conteúdo real das páginas do aluno (serão "Em breve" inicialmente)
- Área do professor (futuro)
