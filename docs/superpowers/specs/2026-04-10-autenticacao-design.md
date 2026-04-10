# Autenticação — Escola Habilidade

**Data:** 2026-04-10  
**Escopo:** Login, proteção de rotas por perfil, sidebar do diretor, dashboard inicial

---

## Visão Geral

Sistema de autenticação baseado em Supabase SSR com route groups do Next.js. Apenas o diretor cria contas para alunos e professores — não há cadastro público. O middleware central protege todas as rotas e redireciona o usuário com base no seu `perfil` (`aluno`, `professor`, `diretor`).

---

## Arquitetura

### Estrutura de arquivos

```
app/
  (auth)/
    login/
      page.tsx          ← Formulário email + senha
  (diretor)/
    layout.tsx          ← Layout protegido com sidebar colapsável
    dashboard/
      page.tsx          ← Cards de estatísticas + tabela de matrículas recentes
  layout.tsx            ← Root layout (existente)
  page.tsx              ← Redireciona para /login ou área do perfil

middleware.ts           ← Guarda todas as rotas, redireciona por perfil

lib/
  supabase/
    client.ts           ← createBrowserClient (uso no cliente)
    server.ts           ← createServerClient com cookies (uso no servidor)
```

### Fluxo de autenticação

1. Usuário acessa qualquer rota → middleware verifica sessão via `getUser()`
2. Sem sessão → redireciona para `/login`
3. Com sessão → lê `perfil` de `public.profiles` e redireciona: `diretor` → `/diretor/dashboard` (outros perfis fora do escopo desta iteração)
4. Login via `supabase.auth.signInWithPassword()` → cookie de sessão gerenciado pelo Supabase SSR
5. Logout via `supabase.auth.signOut()` no cliente → redireciona para `/login`

---

## Tela de Login (`/login`)

- **Visual:** Fundo escuro (`bg-zinc-950`), cartão centralizado (`bg-zinc-900`), fonte Manrope
- **Campos:** Email + Senha
- **Validação:** Nativa do formulário HTML (required, type="email")
- **Erro:** Mensagem inline abaixo do botão ("Credenciais inválidas")
- **Sem cadastro público** — apenas login

---

## Middleware (`middleware.ts`)

Executado em toda requisição (exceto assets estáticos e `_next`).

```
1. Criar cliente Supabase SSR com cookies da requisição
2. Chamar getUser() — se erro ou sem usuário → redirecionar para /login
3. Se rota é /login e usuário está logado → redirecionar para área do perfil
4. Buscar perfil na tabela profiles
5. Verificar se perfil bate com a rota acessada
6. Se não bate → redirecionar para a área correta do perfil
7. Atualizar cookies de sessão na resposta (refresh de token)
```

**Matcher:** todas as rotas exceto `/_next/`, `/favicon.ico`, arquivos estáticos.

---

## Sidebar do Diretor

- **Comportamento:** Colapsada por padrão (`w-14`), expande ao hover (`w-56`) com transição CSS (`:hover` puro — sem estado JavaScript)
- **Ícones:** Material Symbols Outlined (já carregado no `layout.tsx`)
- **Items de navegação:**
  - Dashboard
  - Alunos
  - Professores
  - Cursos
  - Turmas
  - Certificados
- **Footer:** Avatar do usuário (inicial do nome) + botão Sair
- **Escopo:** `(diretor)/layout.tsx` — presente em todas as rotas do diretor

---

## Dashboard do Diretor (`/diretor/dashboard`)

### Cards de estatísticas (topo)

| Card | Query | Cor |
|------|-------|-----|
| Total de alunos ativos | `count(*) from profiles where perfil = 'aluno'` | Azul |
| Turmas em andamento | `count(*) from turmas where ativo = true` | Verde |
| Cursos ativos | `count(*) from cursos where ativo = true` | Amarelo |
| Certificados emitidos | `count(*) from certificados` | Roxo |

### Tabela de matrículas recentes

Colunas: Nome do aluno, Curso, Data de matrícula  
Fonte: join entre `matriculas`, `profiles`, `turmas`, `cursos`  
Limite: 10 registros mais recentes

### Renderização

Todos os dados via Server Components — sem loading states no cliente. Queries diretas ao Supabase server client.

---

## Segurança

- Proteção de rotas centralizada no middleware (não depende de cada página)
- Usuário autenticado não acessa `/login` (redireciona para dashboard)
- Perfil errado para a rota → redireciona para a área correta (não retorna 403)
- RLS do Supabase como segunda camada de proteção nos dados

---

## Fora do Escopo (esta iteração)

- Recuperação de senha
- Criação de usuários pelo diretor (próxima feature)
- Painéis de aluno e professor
- Autenticação social (OAuth)
