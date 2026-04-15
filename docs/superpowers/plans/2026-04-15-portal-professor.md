# Portal do Professor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `/professor/*` portal with Dashboard, Minhas Turmas, and a turma detail page where the professor can add students and mark them as concluído.

**Architecture:** The professor portal follows the same layout pattern as `/diretor` and `/aluno` (collapsible sidebar, Supabase server-side auth guard). Route logic lives in `lib/auth/resolve-redirect.ts` (used by the proxy middleware). Mutations use Next.js Server Actions in a dedicated `actions.ts` file. The turma detail page uses URL search params for student search (server component re-render on `?q=`).

**Tech Stack:** Next.js 16 App Router, Supabase SSR client, Tailwind CSS, Material Symbols icons, Jest + Testing Library.

---

## File Map

**New files:**
- `app/professor/layout.tsx` — auth guard + sidebar nav
- `app/professor/dashboard/page.tsx` — stat cards
- `app/professor/turmas/page.tsx` — list of professor's turmas
- `app/professor/turmas/[id]/page.tsx` — student list + add student UI
- `app/professor/turmas/[id]/actions.ts` — Server Actions: matricularAluno, concluirMatricula
- `app/professor/turmas/[id]/student-search.tsx` — Client Component for search input + add form
- `supabase/migrations/20260415000000_professor_rls.sql` — RLS policies for professor writes

**Modified files:**
- `lib/auth/resolve-redirect.ts` — add professor routes
- `__tests__/lib/auth/resolve-redirect.test.ts` — add professor tests + fix one stale test
- `app/(auth)/login/page.tsx` — add professor redirect
- `__tests__/app/login.test.tsx` — add professor test + fix mocks to use app_metadata
- `app/aluno/layout.tsx` — fix wrong-role redirect for professor
- `app/diretor/layout.tsx` — fix wrong-role redirect for professor
- `supabase/seed.sql` — add professor test user

---

## Task 1: Extend resolveRedirect for professor (TDD)

**Files:**
- Modify: `lib/auth/resolve-redirect.ts`
- Modify: `__tests__/lib/auth/resolve-redirect.test.ts`

- [ ] **Step 1: Add failing professor tests and fix one stale test**

Replace the file contents of `__tests__/lib/auth/resolve-redirect.test.ts` with:

```ts
import { resolveRedirect } from '@/lib/auth/resolve-redirect'

describe('resolveRedirect', () => {
  // --- unauthenticated ---
  it('redirects unauthenticated user from protected route to login', () => {
    expect(resolveRedirect('/diretor/dashboard', null, null)).toBe('/login')
  })

  it('allows unauthenticated user on login page', () => {
    expect(resolveRedirect('/login', null, null)).toBeNull()
  })

  // --- diretor ---
  it('redirects diretor from login to /diretor/dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('redirects logged-in diretor from root to /diretor/dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('allows diretor to access their own routes', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'diretor')).toBeNull()
  })

  it('redirects non-director from director routes to own dashboard', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  // --- aluno ---
  it('redirects aluno from login to /aluno/dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  it('redirects logged-in aluno from root to /aluno/dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  it('allows aluno to access their own routes', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'aluno')).toBeNull()
  })

  it('redirects non-aluno from aluno routes to own dashboard', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('blocks unauthenticated user from aluno routes', () => {
    expect(resolveRedirect('/aluno/dashboard', null, null)).toBe('/login')
  })

  // --- professor ---
  it('redirects professor from login to /professor/dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('redirects logged-in professor from root to /professor/dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('allows professor to access their own routes', () => {
    expect(resolveRedirect('/professor/dashboard', 'user-id', 'professor')).toBeNull()
  })

  it('redirects professor from aluno routes to /professor/dashboard', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('redirects professor from diretor routes to /professor/dashboard', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('redirects aluno from professor routes to /aluno/dashboard', () => {
    expect(resolveRedirect('/professor/turmas', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  it('redirects diretor from professor routes to /diretor/dashboard', () => {
    expect(resolveRedirect('/professor/turmas', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('blocks unauthenticated user from professor routes', () => {
    expect(resolveRedirect('/professor/dashboard', null, null)).toBe('/login')
  })
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npx jest __tests__/lib/auth/resolve-redirect.test.ts --no-coverage
```

Expected: multiple FAIL — professor tests fail, plus the "redirects non-director" test now expects `/aluno/dashboard` instead of `/login`.

- [ ] **Step 3: Update resolveRedirect implementation**

Replace `lib/auth/resolve-redirect.ts` with:

```ts
export function resolveRedirect(
  pathname: string,
  userId: string | null,
  perfil: string | null,
): string | null {
  const publicRoutes = ['/login']

  if (!userId) {
    return publicRoutes.includes(pathname) ? null : '/login'
  }

  function homeDashboard(): string {
    if (perfil === 'aluno') return '/aluno/dashboard'
    if (perfil === 'professor') return '/professor/dashboard'
    return '/diretor/dashboard'
  }

  if (pathname === '/login' || pathname === '/') {
    return homeDashboard()
  }

  if (pathname.startsWith('/diretor/') && perfil !== 'diretor') {
    return homeDashboard()
  }

  if (pathname.startsWith('/aluno/') && perfil !== 'aluno') {
    return homeDashboard()
  }

  if (pathname.startsWith('/professor/') && perfil !== 'professor') {
    return homeDashboard()
  }

  return null
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx jest __tests__/lib/auth/resolve-redirect.test.ts --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/resolve-redirect.ts __tests__/lib/auth/resolve-redirect.test.ts
git commit -m "feat: extend resolveRedirect to support professor routes"
```

---

## Task 2: Update login page redirect for professor (TDD)

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `__tests__/app/login.test.tsx`

- [ ] **Step 1: Add failing professor test and fix aluno mock in login tests**

In `__tests__/app/login.test.tsx`, the existing tests mock `user_metadata` but the login page reads `app_metadata`. Fix all mocks and add the professor test. Replace the file with:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

const mockSignInWithPassword = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset()
    mockPush.mockReset()
    mockRefresh.mockReset()
  })

  it('renders email and password fields with submit button', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('shows inline error on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'x@x.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciais inválidas')
    })
  })

  it('redirects to /diretor/dashboard on diretor login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { perfil: 'diretor' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'admin@admin.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/diretor/dashboard')
    })
  })

  it('redirects to /aluno/dashboard on aluno login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { perfil: 'aluno' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'aluno@aluno.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/aluno/dashboard')
    })
  })

  it('redirects to /professor/dashboard on professor login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { perfil: 'professor' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'prof@escola.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/professor/dashboard')
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npx jest __tests__/app/login.test.tsx --no-coverage
```

Expected: professor test FAILs; aluno and diretor tests may also fail (mocks fixed to `app_metadata`).

- [ ] **Step 3: Update login page redirect**

In `app/(auth)/login/page.tsx`, find the redirect logic after successful sign-in and replace it:

Old:
```ts
const perfil = data.user?.app_metadata?.perfil
const dest = perfil === 'aluno' ? '/aluno/dashboard' : '/diretor/dashboard'
router.push(dest)
```

New:
```ts
const perfil = data.user?.app_metadata?.perfil
const dest =
  perfil === 'aluno'
    ? '/aluno/dashboard'
    : perfil === 'professor'
      ? '/professor/dashboard'
      : '/diretor/dashboard'
router.push(dest)
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx jest __tests__/app/login.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login/page.tsx __tests__/app/login.test.tsx
git commit -m "feat: redirect professor to /professor/dashboard on login"
```

---

## Task 3: Fix layout auth guards for professor

**Files:**
- Modify: `app/aluno/layout.tsx`
- Modify: `app/diretor/layout.tsx`

Note: The proxy middleware (`proxy.ts` via `resolveRedirect`) is the primary auth guard. These layout guards are secondary safety nets. They don't need tests — they're never hit for valid sessions.

- [ ] **Step 1: Fix aluno layout**

In `app/aluno/layout.tsx`, find:
```ts
if (user.user_metadata?.perfil !== 'aluno') redirect('/diretor/dashboard')
```

Replace with:
```ts
const perfil = user.user_metadata?.perfil
if (perfil !== 'aluno') {
  redirect(perfil === 'professor' ? '/professor/dashboard' : '/diretor/dashboard')
}
```

- [ ] **Step 2: Fix diretor layout**

In `app/diretor/layout.tsx`, find:
```ts
if (user.user_metadata?.perfil !== 'diretor') redirect('/aluno/dashboard')
```

Replace with:
```ts
const perfil = user.user_metadata?.perfil
if (perfil !== 'diretor') {
  redirect(perfil === 'professor' ? '/professor/dashboard' : '/aluno/dashboard')
}
```

- [ ] **Step 3: Commit**

```bash
git add app/aluno/layout.tsx app/diretor/layout.tsx
git commit -m "fix: redirect professor to correct dashboard in layout guards"
```

---

## Task 4: RLS migration for professor write access

**Files:**
- Create: `supabase/migrations/20260415000000_professor_rls.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260415000000_professor_rls.sql

-- Professor can enroll students in their own turmas
create policy "matriculas_professor_insert" on public.matriculas
  for insert with check (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );

-- Professor can update matricula status in their own turmas (ativo → concluido)
create policy "matriculas_professor_update" on public.matriculas
  for update using (
    exists (
      select 1 from public.turmas t
      where t.id = turma_id
        and t.professor_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db reset
```

Expected output: migration applied, seed loaded.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415000000_professor_rls.sql
git commit -m "feat: add RLS policies for professor matricula insert and update"
```

---

## Task 5: Add professor test user to seed

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Add professor user to seed**

In `supabase/seed.sql`, after the aluno INSERT block, add:

```sql
-- Usuário professor
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'authenticated', 'authenticated',
  'prof@prof.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"perfil":"professor"}',
  '{"nome":"Professor Teste"}',
  now(), now(), '', '', '', ''
);
```

Also add an identity row (same pattern as the other users in seed):

```sql
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'prof@prof.com',
  'email',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","email":"prof@prof.com"}',
  now(), now(), now()
);
```

- [ ] **Step 2: Apply seed**

```bash
npx supabase db reset
```

Expected: 3 users created (admin@admin.com, aluno@aluno.com, prof@prof.com).

- [ ] **Step 3: Verify professor user exists**

```bash
npx supabase db --execute "select email, perfil from auth.users join public.profiles on auth.users.id = profiles.id;" 2>/dev/null || echo "use Studio at http://127.0.0.1:54323 to verify"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add professor test user to seed (prof@prof.com / 123456)"
```

---

## Task 6: Create professor layout

**Files:**
- Create: `app/professor/layout.tsx`

- [ ] **Step 1: Create layout**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

const NAV_ITEMS = [
  { href: '/professor/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/professor/turmas', icon: 'groups', label: 'Minhas Turmas' },
]

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const perfil = user.user_metadata?.perfil
  if (perfil !== 'professor') {
    redirect(perfil === 'diretor' ? '/diretor/dashboard' : '/aluno/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user.id)
    .single()

  const initial = profile?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <nav className="group w-14 hover:w-56 transition-all duration-200 bg-zinc-900 flex flex-col overflow-hidden shrink-0">
        <div className="flex-1 py-4">
          <div className="px-3.5 mb-6">
            <span className="material-symbols-outlined text-blue-400 text-[28px]">
              school
            </span>
          </div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3.5 py-2.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg mx-1 mb-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">
                {item.icon}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-sm">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
        <div className="p-3 border-t border-zinc-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden">
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Verify the dev server accepts the new route**

```bash
npx next build --no-lint 2>&1 | tail -5
```

Expected: no errors related to `app/professor`.

- [ ] **Step 3: Commit**

```bash
git add app/professor/layout.tsx
git commit -m "feat: add professor layout with sidebar nav and auth guard"
```

---

## Task 7: Create professor dashboard page

**Files:**
- Create: `app/professor/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

```tsx
import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { turmas: 0, alunos: 0, concluidos: 0 }

  const { data: turmasData } = await supabase
    .from('turmas')
    .select('id')
    .eq('professor_id', user.id)

  const turmaIds = (turmasData ?? []).map((t) => t.id)

  if (turmaIds.length === 0) return { turmas: 0, alunos: 0, concluidos: 0 }

  const [alunosResult, concluidosResult] = await Promise.all([
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .in('turma_id', turmaIds),
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .in('turma_id', turmaIds)
      .eq('status', 'concluido'),
  ])

  return {
    turmas: turmaIds.length,
    alunos: alunosResult.count ?? 0,
    concluidos: concluidosResult.count ?? 0,
  }
}

export default async function ProfessorDashboardPage() {
  const stats = await getStats()

  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Meu Painel</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Minhas Turmas" value={stats.turmas} color="text-blue-400" />
        <StatCard label="Total de Alunos" value={stats.alunos} color="text-green-400" />
        <StatCard label="Concluídos" value={stats.concluidos} color="text-purple-400" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5">
      <p className={`${color} text-2xl font-bold mb-1`}>{value}</p>
      <p className="text-zinc-500 text-sm">{label}</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/professor/dashboard/page.tsx
git commit -m "feat: add professor dashboard with turmas/alunos/concluidos stats"
```

---

## Task 8: Create turmas list page

**Files:**
- Create: `app/professor/turmas/page.tsx`

- [ ] **Step 1: Create turmas list page**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function getTurmas() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('turmas')
    .select('id, nome, ativo, data_inicio, data_fim, cursos!curso_id(nome)')
    .eq('professor_id', user.id)
    .order('ativo', { ascending: false })

  return data ?? []
}

export default async function TurmasPage() {
  const turmas = await getTurmas()

  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Minhas Turmas</h1>

      {turmas.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
          Nenhuma turma atribuída a você ainda.
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Turma</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Curso</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Início</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Fim</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(turmas as TurmaRow[]).map((turma) => (
                <tr key={turma.id} className="border-b border-zinc-800/50">
                  <td className="px-6 py-3 text-zinc-300 text-sm font-medium">{turma.nome}</td>
                  <td className="px-6 py-3 text-zinc-400 text-sm">{turma.cursos?.nome ?? '—'}</td>
                  <td className="px-6 py-3 text-zinc-500 text-xs">
                    {turma.data_inicio
                      ? new Date(turma.data_inicio).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs">
                    {turma.data_fim
                      ? new Date(turma.data_fim).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        turma.ativo
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {turma.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/professor/turmas/${turma.id}`}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                      Ver alunos →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type TurmaRow = {
  id: string
  nome: string
  ativo: boolean | null
  data_inicio: string | null
  data_fim: string | null
  cursos: { nome: string } | null
}
```

- [ ] **Step 2: Commit**

```bash
git add app/professor/turmas/page.tsx
git commit -m "feat: add professor turmas list page"
```

---

## Task 9: Create Server Actions for turma detail

**Files:**
- Create: `app/professor/turmas/[id]/actions.ts`

- [ ] **Step 1: Create actions file**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function matricularAluno(turmaId: string, formData: FormData) {
  const alunoId = formData.get('alunoId') as string
  if (!alunoId || !turmaId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Verify professor owns this turma
  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase.from('matriculas').insert({
    aluno_id: alunoId,
    turma_id: turmaId,
    status: 'ativo',
  })

  revalidatePath(`/professor/turmas/${turmaId}`)
}

export async function concluirMatricula(formData: FormData) {
  const matriculaId = formData.get('matriculaId') as string
  const turmaId = formData.get('turmaId') as string
  if (!matriculaId || !turmaId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Verify professor owns the turma this matricula belongs to
  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase
    .from('matriculas')
    .update({ status: 'concluido' })
    .eq('id', matriculaId)
    .eq('turma_id', turmaId)

  revalidatePath(`/professor/turmas/${turmaId}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/professor/turmas/[id]/actions.ts
git commit -m "feat: add professor Server Actions for matricular and concluir"
```

---

## Task 10: Create turma detail page (student list + search)

**Files:**
- Create: `app/professor/turmas/[id]/student-search.tsx`
- Create: `app/professor/turmas/[id]/page.tsx`

- [ ] **Step 1: Create StudentSearch client component**

```tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Aluno = { id: string; nome: string; email: string }

export function StudentSearch({
  results,
  addAction,
}: {
  results: Aluno[]
  addAction: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
    const params = new URLSearchParams(searchParams.toString())
    if (q) params.set('q', q)
    else params.delete('q')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h2 className="text-zinc-50 text-sm font-semibold mb-4">Adicionar Aluno</h2>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          name="q"
          defaultValue={searchParams.get('q') ?? ''}
          placeholder="Buscar por nome ou email"
          className="flex-1 bg-zinc-950 text-zinc-50 rounded-md px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-zinc-800 text-zinc-300 hover:text-zinc-50 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((aluno) => (
            <li
              key={aluno.id}
              className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-2.5"
            >
              <div>
                <p className="text-zinc-200 text-sm">{aluno.nome}</p>
                <p className="text-zinc-500 text-xs">{aluno.email}</p>
              </div>
              <form action={addAction}>
                <input type="hidden" name="alunoId" value={aluno.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Matricular
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {searchParams.get('q') && results.length === 0 && (
        <p className="text-zinc-500 text-sm text-center">Nenhum aluno encontrado.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create turma detail page**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { matricularAluno, concluirMatricula } from './actions'
import { StudentSearch } from './student-search'

async function getTurmaData(turmaId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    .order('status')

  return { turma: turma as TurmaDetail, matriculas: matriculas ?? [] }
}

async function searchAlunos(turmaId: string, q: string) {
  const supabase = await createClient()

  const { data: enrolled } = await supabase
    .from('matriculas')
    .select('aluno_id')
    .eq('turma_id', turmaId)

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
        <h1 className="text-zinc-50 text-2xl font-semibold">{turma.nome}</h1>
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
                {(matriculas as MatriculaRow[]).map((m) => (
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
                      )}
                    </td>
                  </tr>
                ))}
                {matriculas.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-zinc-500 text-sm text-center"
                    >
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

- [ ] **Step 3: Commit**

```bash
git add app/professor/turmas/[id]/student-search.tsx app/professor/turmas/[id]/page.tsx
git commit -m "feat: add turma detail page with student list, add and concluir actions"
```

---

## Task 11: Run full test suite and manual smoke test

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 2: Start dev server**

```bash
npx next dev
```

- [ ] **Step 3: Manual smoke test checklist**

With `prof@prof.com` / `123456`:
- [ ] Login → redirected to `/professor/dashboard` ✓
- [ ] Dashboard shows 0 turmas / 0 alunos / 0 concluídos (no turmas assigned yet)
- [ ] Turmas page shows "Nenhuma turma atribuída"
- [ ] Attempting to visit `/diretor/dashboard` as professor → redirected to `/professor/dashboard`
- [ ] Attempting to visit `/aluno/dashboard` as professor → redirected to `/professor/dashboard`

With `admin@admin.com` / `123456` (diretor), assign the professor to a turma via Supabase Studio (http://127.0.0.1:54323), then re-test professor portal:
- [ ] Dashboard shows correct counts
- [ ] Turmas page lists the turma
- [ ] Clicking "Ver alunos" opens turma detail page
- [ ] Searching for `aluno@aluno.com` returns the aluno
- [ ] Clicking "Matricular" adds the aluno to the list
- [ ] "Concluir" button changes status to Concluído

- [ ] **Step 4: Final commit if any adjustments were made**

```bash
git add -p
git commit -m "fix: adjust professor portal after smoke test"
```
