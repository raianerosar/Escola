# Área do Aluno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a área do aluno com login `aluno@aluno.com`, rota `/aluno/dashboard`, e redirecionar login inteligente por perfil.

**Architecture:** A função pura `resolveRedirect` centraliza a lógica de roteamento por perfil; o `proxy.ts` usa ela para redirecionar no middleware; a página de login lê `user.user_metadata.perfil` após autenticar (sem query extra) e chama `router.push`. As rotas do diretor são renomeadas de `/dashboard` para `/diretor/dashboard` para consistência com os testes existentes.

**Tech Stack:** Next.js 16, Supabase SSR, Jest + Testing Library, TypeScript

---

### Task 1: Recriar `lib/auth/resolve-redirect.ts` e atualizar testes

**Files:**
- Create: `lib/auth/resolve-redirect.ts`
- Modify: `__tests__/lib/auth/resolve-redirect.test.ts`

- [ ] **Step 1: Criar a função `resolveRedirect`**

```typescript
// lib/auth/resolve-redirect.ts
export function resolveRedirect(
  pathname: string,
  userId: string | null,
  perfil: string | null,
): string | null {
  const publicRoutes = ['/login']

  if (!userId) {
    return publicRoutes.includes(pathname) ? null : '/login'
  }

  if (pathname === '/login' || pathname === '/') {
    return perfil === 'aluno' ? '/aluno/dashboard' : '/diretor/dashboard'
  }

  if (pathname.startsWith('/diretor/') && perfil !== 'diretor') {
    return '/login'
  }

  if (pathname.startsWith('/aluno/') && perfil !== 'aluno') {
    return '/diretor/dashboard'
  }

  return null
}
```

- [ ] **Step 2: Adicionar casos de aluno nos testes**

Substituir o conteúdo de `__tests__/lib/auth/resolve-redirect.test.ts`:

```typescript
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

  it('blocks non-director from director routes', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'aluno')).toBe('/login')
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

  it('redirects non-aluno from aluno routes to /diretor/dashboard', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('blocks unauthenticated user from aluno routes', () => {
    expect(resolveRedirect('/aluno/dashboard', null, null)).toBe('/login')
  })
})
```

- [ ] **Step 3: Rodar os testes e verificar que todos passam**

```bash
npx jest __tests__/lib/auth/resolve-redirect.test.ts --no-coverage
```

Esperado: 11 testes passando, 0 falhando.

- [ ] **Step 4: Commit**

```bash
git add lib/auth/resolve-redirect.ts __tests__/lib/auth/resolve-redirect.test.ts
git commit -m "feat: add resolve-redirect with aluno support"
```

---

### Task 2: Criar `supabase/seed.sql` com `aluno@aluno.com`

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Criar o arquivo de seed**

```sql
-- supabase/seed.sql
-- Cria o usuário aluno@aluno.com no Supabase Auth local.
-- O trigger handle_new_user criará o registro em public.profiles automaticamente.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'aluno@aluno.com',
  crypt('aluno123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"perfil":"aluno","nome":"Aluno Teste"}',
  now(),
  now(),
  '', '', '', ''
);
```

- [ ] **Step 2: Aplicar o seed (requer Supabase CLI rodando localmente)**

```bash
npx supabase db reset
```

Esperado: migrações aplicadas + seed inserido. Verificar no Supabase Studio (`http://localhost:54323`) que o usuário `aluno@aluno.com` aparece em Authentication → Users com `user_metadata.perfil = "aluno"`.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: seed aluno@aluno.com test user"
```

---

### Task 3: Renomear rotas do diretor de `/dashboard` para `/diretor/dashboard`

**Files:**
- Create: `app/diretor/layout.tsx`
- Create: `app/diretor/dashboard/page.tsx`
- Create: `app/diretor/alunos/page.tsx`
- Create: `app/diretor/professores/page.tsx`
- Create: `app/diretor/cursos/page.tsx`
- Create: `app/diretor/turmas/page.tsx`
- Create: `app/diretor/certificados/page.tsx`
- Delete: `app/(diretor)/layout.tsx`
- Delete: `app/(diretor)/dashboard/page.tsx`
- Delete: `app/(diretor)/alunos/page.tsx`
- Delete: `app/(diretor)/professores/page.tsx`
- Delete: `app/(diretor)/cursos/page.tsx`
- Delete: `app/(diretor)/turmas/page.tsx`
- Delete: `app/(diretor)/certificados/page.tsx`

- [ ] **Step 1: Criar `app/diretor/layout.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
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

  if (!user) redirect('/login')
  if (user.user_metadata?.perfil !== 'diretor') redirect('/aluno/dashboard')

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

- [ ] **Step 2: Criar `app/diretor/dashboard/page.tsx`**

Copiar o conteúdo exato de `app/(diretor)/dashboard/page.tsx` sem alterações:

```tsx
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
        <StatCard label="Turmas ativas" value={stats.turmas} color="text-green-400" />
        <StatCard label="Cursos ativos" value={stats.cursos} color="text-yellow-400" />
        <StatCard label="Certificados" value={stats.certificados} color="text-purple-400" />
      </div>

      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-zinc-50 text-sm font-semibold">Matrículas Recentes</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Aluno</th>
              <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Curso</th>
              <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {(matriculas as MatriculaRow[]).map((m, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="px-6 py-3 text-zinc-300 text-sm">{m.profiles?.nome ?? '—'}</td>
                <td className="px-6 py-3 text-zinc-400 text-sm">{m.turmas?.cursos?.nome ?? '—'}</td>
                <td className="px-6 py-3 text-zinc-500 text-xs">
                  {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
            {matriculas.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-zinc-500 text-sm text-center">
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
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

- [ ] **Step 3: Criar as páginas placeholder do diretor**

`app/diretor/alunos/page.tsx`:
```tsx
export default function AlunosPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Alunos</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

`app/diretor/professores/page.tsx`:
```tsx
export default function ProfessoresPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Professores</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

`app/diretor/cursos/page.tsx`:
```tsx
export default function CursosPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Cursos</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

`app/diretor/turmas/page.tsx`:
```tsx
export default function TurmasPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Turmas</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

`app/diretor/certificados/page.tsx`:
```tsx
export default function CertificadosPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Certificados</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Deletar os arquivos da pasta `(diretor)`**

```bash
rm -rf app/\(diretor\)
```

- [ ] **Step 5: Verificar build sem erros**

```bash
npx next build 2>&1 | tail -20
```

Esperado: build finalizado sem erros de rota ou tipo.

- [ ] **Step 6: Commit**

```bash
git add app/diretor/ app/\(diretor\)/
git commit -m "feat: rename diretor routes to /diretor/* prefix"
```

---

### Task 4: Criar área do aluno (`app/aluno/`)

**Files:**
- Create: `app/aluno/layout.tsx`
- Create: `app/aluno/dashboard/page.tsx`
- Create: `app/aluno/turmas/page.tsx`
- Create: `app/aluno/certificados/page.tsx`

- [ ] **Step 1: Criar `app/aluno/layout.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

const NAV_ITEMS = [
  { href: '/aluno/dashboard', icon: 'home', label: 'Dashboard' },
  { href: '/aluno/turmas', icon: 'groups', label: 'Minhas Turmas' },
  { href: '/aluno/certificados', icon: 'workspace_premium', label: 'Meus Certificados' },
]

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.user_metadata?.perfil !== 'aluno') redirect('/diretor/dashboard')

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

- [ ] **Step 2: Criar `app/aluno/dashboard/page.tsx`**

```tsx
export default function AlunoDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Meu Painel</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar páginas placeholder do aluno**

`app/aluno/turmas/page.tsx`:
```tsx
export default function MinhasTurmasPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Minhas Turmas</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

`app/aluno/certificados/page.tsx`:
```tsx
export default function MeusCertificadosPage() {
  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Meus Certificados</h1>
      <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
        Em breve
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/aluno/
git commit -m "feat: add aluno area with layout and placeholder pages"
```

---

### Task 5: Atualizar `proxy.ts` para usar `resolveRedirect`

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Reescrever `proxy.ts`**

```typescript
import { resolveRedirect } from '@/lib/auth/resolve-redirect'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl
  const userId = user?.id ?? null
  const perfil = (user?.user_metadata?.perfil as string) ?? null

  const destination = resolveRedirect(pathname, userId, perfil)

  if (destination) {
    const redirectResponse = NextResponse.redirect(
      new URL(destination, request.url)
    )
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value)
    })
    return redirectResponse
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
git add proxy.ts
git commit -m "feat: use resolveRedirect in proxy middleware"
```

---

### Task 6: Atualizar login page e testes

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `__tests__/app/login.test.tsx`

- [ ] **Step 1: Atualizar a página de login**

Substituir apenas as linhas após `signInWithPassword` no `handleSubmit`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Credenciais inválidas')
      setLoading(false)
      return
    }

    const perfil = data.user?.user_metadata?.perfil
    const dest = perfil === 'aluno' ? '/aluno/dashboard' : '/diretor/dashboard'
    router.push(dest)
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
          <div className="relative mb-4">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              required
              className="w-full bg-zinc-950 text-zinc-50 rounded-md px-3 py-2.5 pr-10 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.95 9.95 0 015.185 1.447M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v.01M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
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

- [ ] **Step 2: Atualizar `__tests__/app/login.test.tsx`**

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
      data: { user: { user_metadata: { perfil: 'diretor' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'admin@admin.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'admin123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/diretor/dashboard')
    })
  })

  it('redirects to /aluno/dashboard on aluno login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { user_metadata: { perfil: 'aluno' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'aluno@aluno.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'aluno123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/aluno/dashboard')
    })
  })
})
```

- [ ] **Step 3: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Esperado: todos os testes passando (resolve-redirect: 11, login: 4, logout-button: 1).

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/login/page.tsx __tests__/app/login.test.tsx
git commit -m "feat: smart login redirect by perfil from user_metadata"
```
