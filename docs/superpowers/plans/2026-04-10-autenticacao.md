# Autenticação — Escola Habilidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build login, route protection by profile, director sidebar, and initial dashboard with stats.

**Architecture:** Supabase SSR manages session via cookies. A Next.js middleware guards all routes and redirects by `perfil`. Route groups `(auth)` and `(diretor)` isolate areas. A pure `resolveRedirect` helper centralizes redirect logic and is the only unit under direct test.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, `@supabase/supabase-js`, Tailwind CSS 4, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `.env.local` | Create | Supabase env vars |
| `lib/supabase/client.ts` | Create | `createBrowserClient` wrapper |
| `lib/supabase/server.ts` | Create | `createServerClient` + cookies wrapper |
| `lib/auth/resolve-redirect.ts` | Create | Pure redirect logic (testable) |
| `middleware.ts` | Create | Auth guard using resolve-redirect |
| `app/page.tsx` | Modify | Redirect to `/login` |
| `app/(auth)/login/page.tsx` | Create | Client component: email+password form |
| `app/(diretor)/layout.tsx` | Create | Server component: sidebar + children |
| `app/(diretor)/dashboard/page.tsx` | Create | Server component: stats + recent table |
| `components/logout-button.tsx` | Create | Client component: signOut + redirect |
| `__tests__/lib/auth/resolve-redirect.test.ts` | Create | Unit tests for redirect logic |
| `__tests__/app/login.test.tsx` | Create | RTL tests for login form |
| `__tests__/components/logout-button.test.tsx` | Create | RTL test for logout |

---

## Pre-flight

- [ ] **Read the Next.js 16 guide before writing any code**

  Run: `ls node_modules/next/dist/docs/`  
  Read the App Router and Middleware guides. Pay attention to breaking changes from Next.js 13/14.

---

## Task 1: Environment + Supabase clients

**Files:**
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create `.env.local` with Supabase credentials**

  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

  Get these from your Supabase project → Settings → API.

- [ ] **Step 2: Create `lib/supabase/client.ts`**

  ```typescript
  import { createBrowserClient } from '@supabase/ssr'

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  ```

- [ ] **Step 3: Create `lib/supabase/server.ts`**

  ```typescript
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'

  export async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Called from Server Component — cookie mutations are ignored
            }
          },
        },
      }
    )
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add lib/supabase/client.ts lib/supabase/server.ts
  git commit -m "feat: add supabase client factories"
  ```

  (Do not commit `.env.local` — it has secrets.)

---

## Task 2: Redirect logic + tests

**Files:**
- Create: `lib/auth/resolve-redirect.ts`
- Create: `__tests__/lib/auth/resolve-redirect.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `__tests__/lib/auth/resolve-redirect.test.ts`:

  ```typescript
  import { resolveRedirect } from '@/lib/auth/resolve-redirect'

  describe('resolveRedirect', () => {
    it('redirects unauthenticated user from protected route to login', () => {
      expect(resolveRedirect('/diretor/dashboard', null, null)).toBe('/login')
    })

    it('allows unauthenticated user on login page', () => {
      expect(resolveRedirect('/login', null, null)).toBeNull()
    })

    it('redirects diretor from login to dashboard', () => {
      expect(resolveRedirect('/login', 'user-id', 'diretor')).toBe('/diretor/dashboard')
    })

    it('redirects logged-in diretor from root to dashboard', () => {
      expect(resolveRedirect('/', 'user-id', 'diretor')).toBe('/diretor/dashboard')
    })

    it('allows diretor to access their own routes', () => {
      expect(resolveRedirect('/diretor/dashboard', 'user-id', 'diretor')).toBeNull()
    })

    it('blocks non-director from director routes', () => {
      expect(resolveRedirect('/diretor/dashboard', 'user-id', 'aluno')).toBe('/login')
    })
  })
  ```

- [ ] **Step 2: Run tests — verify they fail**

  Run: `npx jest __tests__/lib/auth/resolve-redirect.test.ts --no-coverage`  
  Expected: FAIL — `Cannot find module '@/lib/auth/resolve-redirect'`

- [ ] **Step 3: Implement `lib/auth/resolve-redirect.ts`**

  ```typescript
  export function resolveRedirect(
    pathname: string,
    userId: string | null,
    perfil: string | null
  ): string | null {
    if (!userId && pathname !== '/login') return '/login'

    if (userId) {
      if (pathname === '/' || pathname === '/login') {
        if (perfil === 'diretor') return '/diretor/dashboard'
      }

      if (pathname.startsWith('/diretor') && perfil !== 'diretor') {
        return '/login'
      }
    }

    return null
  }
  ```

- [ ] **Step 4: Run tests — verify they pass**

  Run: `npx jest __tests__/lib/auth/resolve-redirect.test.ts --no-coverage`  
  Expected: 5 passed

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/resolve-redirect.ts __tests__/lib/auth/resolve-redirect.test.ts
  git commit -m "feat: add resolve-redirect logic with tests"
  ```

---

## Task 3: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

  ```typescript
  import { createServerClient } from '@supabase/ssr'
  import { NextResponse, type NextRequest } from 'next/server'
  import { resolveRedirect } from '@/lib/auth/resolve-redirect'

  export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let perfil: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('perfil')
        .eq('id', user.id)
        .single()
      perfil = profile?.perfil ?? null
    }

    const { pathname } = request.nextUrl
    const redirectPath = resolveRedirect(pathname, user?.id ?? null, perfil)

    if (redirectPath) {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    return supabaseResponse
  }

  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add middleware.ts
  git commit -m "feat: add auth middleware with role-based redirect"
  ```

---

## Task 4: Login page + tests

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `__tests__/app/login.test.tsx`

- [ ] **Step 1: Write the failing tests**

  Create `__tests__/app/login.test.tsx`:

  ```typescript
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

    it('redirects to /diretor/dashboard on success', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null })
      render(<LoginPage />)
      await userEvent.type(screen.getByPlaceholderText('Email'), 'diretor@escola.com')
      await userEvent.type(screen.getByPlaceholderText('Senha'), 'senha123')
      await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/diretor/dashboard')
      })
    })
  })
  ```

- [ ] **Step 2: Run tests — verify they fail**

  Run: `npx jest __tests__/app/login.test.tsx --no-coverage`  
  Expected: FAIL — module not found

- [ ] **Step 3: Create `app/(auth)/login/page.tsx`**

  ```typescript
  'use client'

  import { useState } from 'react'
  import { useRouter } from 'next/navigation'
  import { createClient } from '@/lib/supabase/client'

  export default function LoginPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setError(null)
      setLoading(true)

      const form = e.currentTarget
      const email = (form.elements.namedItem('email') as HTMLInputElement).value
      const password = (form.elements.namedItem('password') as HTMLInputElement).value

      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Credenciais inválidas')
        setLoading(false)
        return
      }

      router.push('/diretor/dashboard')
      router.refresh()
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 rounded-xl p-8 w-full max-w-sm">
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">
            Escola Habilidade
          </p>
          <h1 className="text-zinc-50 text-xl font-semibold mb-6">
            Bem-vindo de volta
          </h1>
          <form onSubmit={handleSubmit}>
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full bg-zinc-950 text-zinc-50 rounded-md px-3 py-2.5 mb-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              name="password"
              type="password"
              placeholder="Senha"
              required
              className="w-full bg-zinc-950 text-zinc-50 rounded-md px-3 py-2.5 mb-4 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {error && (
              <p role="alert" className="text-red-400 text-sm mb-3">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run tests — verify they pass**

  Run: `npx jest __tests__/app/login.test.tsx --no-coverage`  
  Expected: 3 passed

- [ ] **Step 5: Commit**

  ```bash
  git add app/"(auth)"/login/page.tsx __tests__/app/login.test.tsx
  git commit -m "feat: add login page with form and tests"
  ```

---

## Task 5: Logout button + test

**Files:**
- Create: `components/logout-button.tsx`
- Create: `__tests__/components/logout-button.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `__tests__/components/logout-button.test.tsx`:

  ```typescript
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { LogoutButton } from '@/components/logout-button'

  const mockSignOut = jest.fn()
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
      auth: { signOut: mockSignOut },
    }),
  }))

  jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  }))

  describe('LogoutButton', () => {
    beforeEach(() => {
      mockSignOut.mockReset().mockResolvedValue({})
      mockPush.mockReset()
    })

    it('calls signOut and redirects to /login on click', async () => {
      render(<LogoutButton />)
      await userEvent.click(screen.getByRole('button'))
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
  ```

- [ ] **Step 2: Run test — verify it fails**

  Run: `npx jest __tests__/components/logout-button.test.tsx --no-coverage`  
  Expected: FAIL — module not found

- [ ] **Step 3: Create `components/logout-button.tsx`**

  ```typescript
  'use client'

  import { useRouter } from 'next/navigation'
  import { createClient } from '@/lib/supabase/client'

  export function LogoutButton() {
    const router = useRouter()

    async function handleLogout() {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }

    return (
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-50 text-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        <span className="whitespace-nowrap">Sair</span>
      </button>
    )
  }
  ```

- [ ] **Step 4: Run test — verify it passes**

  Run: `npx jest __tests__/components/logout-button.test.tsx --no-coverage`  
  Expected: 1 passed

- [ ] **Step 5: Commit**

  ```bash
  git add components/logout-button.tsx __tests__/components/logout-button.test.tsx
  git commit -m "feat: add logout button with test"
  ```

---

## Task 6: Director layout (sidebar)

**Files:**
- Create: `app/(diretor)/layout.tsx`

- [ ] **Step 1: Create `app/(diretor)/layout.tsx`**

  ```typescript
  import Link from 'next/link'
  import { createClient } from '@/lib/supabase/server'
  import { LogoutButton } from '@/components/logout-button'

  const NAV_ITEMS = [
    { href: '/diretor/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/diretor/alunos', icon: 'school', label: 'Alunos' },
    { href: '/diretor/professores', icon: 'person', label: 'Professores' },
    { href: '/diretor/cursos', icon: 'menu_book', label: 'Cursos' },
    { href: '/diretor/turmas', icon: 'groups', label: 'Turmas' },
    { href: '/diretor/certificados', icon: 'workspace_premium', label: 'Certificados' },
  ]

  export default async function DiretorLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user!.id)
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
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
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

- [ ] **Step 2: Commit**

  ```bash
  git add app/"(diretor)"/layout.tsx
  git commit -m "feat: add director sidebar layout"
  ```

---

## Task 7: Dashboard page

**Files:**
- Create: `app/(diretor)/dashboard/page.tsx`

- [ ] **Step 1: Create `app/(diretor)/dashboard/page.tsx`**

  ```typescript
  import { createClient } from '@/lib/supabase/server'

  async function getStats() {
    const supabase = await createClient()
    const [alunos, turmas, cursos, certificados] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('perfil', 'aluno'),
      supabase
        .from('turmas')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true),
      supabase
        .from('cursos')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true),
      supabase.from('certificados').select('id', { count: 'exact', head: true }),
    ])
    return {
      alunos: alunos.count ?? 0,
      turmas: turmas.count ?? 0,
      cursos: cursos.count ?? 0,
      certificados: certificados.count ?? 0,
    }
  }

  async function getRecentMatriculas() {
    const supabase = await createClient()
    const { data } = await supabase
      .from('matriculas')
      .select(
        `
        criado_em,
        profiles!aluno_id (nome),
        turmas!turma_id (nome, cursos!curso_id (nome))
      `
      )
      .order('criado_em', { ascending: false })
      .limit(10)
    return data ?? []
  }

  export default async function DashboardPage() {
    const [stats, matriculas] = await Promise.all([
      getStats(),
      getRecentMatriculas(),
    ])

    return (
      <div className="p-8">
        <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Visão Geral</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Alunos" value={stats.alunos} color="text-blue-400" />
          <StatCard
            label="Turmas ativas"
            value={stats.turmas}
            color="text-green-400"
          />
          <StatCard
            label="Cursos ativos"
            value={stats.cursos}
            color="text-yellow-400"
          />
          <StatCard
            label="Certificados"
            value={stats.certificados}
            color="text-purple-400"
          />
        </div>

        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-zinc-50 text-sm font-semibold">
              Matrículas Recentes
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">
                  Aluno
                </th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">
                  Curso
                </th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {(matriculas as MatriculaRow[]).map((m, i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="px-6 py-3 text-zinc-300 text-sm">
                    {m.profiles?.nome ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-zinc-400 text-sm">
                    {m.turmas?.cursos?.nome ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs">
                    {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {matriculas.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-zinc-500 text-sm text-center"
                  >
                    Nenhuma matrícula ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function StatCard({
    label,
    value,
    color,
  }: {
    label: string
    value: number
    color: string
  }) {
    return (
      <div className="bg-zinc-900 rounded-xl p-5">
        <p className={`${color} text-2xl font-bold mb-1`}>{value}</p>
        <p className="text-zinc-500 text-sm">{label}</p>
      </div>
    )
  }

  type MatriculaRow = {
    criado_em: string
    profiles: { nome: string } | null
    turmas: { nome: string; cursos: { nome: string } | null } | null
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/"(diretor)"/dashboard/page.tsx
  git commit -m "feat: add director dashboard with stats and recent enrollments"
  ```

---

## Task 8: Root redirect + full test run

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with a redirect**

  ```typescript
  import { redirect } from 'next/navigation'

  export default function Home() {
    redirect('/login')
  }
  ```

- [ ] **Step 2: Run all tests**

  Run: `npx jest --no-coverage`  
  Expected: all tests pass

- [ ] **Step 3: Run the dev server and verify manually**

  Run: `npm run dev`

  Check:
  - `http://localhost:3000` → redirects to `/login`
  - Login with invalid credentials → shows "Credenciais inválidas"
  - Login with valid director credentials → redirects to `/diretor/dashboard`
  - Dashboard shows stats cards and recent enrollments table
  - Sidebar collapses to icons, expands to labels on hover
  - Logout button signs out and returns to `/login`

- [ ] **Step 4: Commit**

  ```bash
  git add app/page.tsx
  git commit -m "feat: redirect root to login"
  ```
