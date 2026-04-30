import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

const NAV_ITEMS = [
  { href: '/aluno/dashboard', icon: 'home', label: 'Dashboard' },
  { href: '/aluno/turmas', icon: 'groups', label: 'Minhas Turmas' },
  { href: '/aluno/tarefas', icon: 'assignment', label: 'Tarefas' },
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
  const perfil = user.user_metadata?.perfil
  if (perfil !== 'aluno') {
    redirect(perfil === 'professor' ? '/professor/dashboard' : '/diretor/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user.id)
    .single()

  const initial = profile?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="app-shell lg:flex">
      <nav className="app-sidebar">
        <div className="hidden border-b border-white/10 pb-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <span className="material-symbols-outlined text-[25px]">school</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-50">Aluno</p>
              <p className="text-xs text-fuchsia-200/70">Area de estudos</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto lg:mt-5 lg:block lg:space-y-1 lg:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
            >
              <span className="material-symbols-outlined nav-icon">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden border-t border-white/10 pt-4 lg:flex lg:items-center lg:gap-3">
          <div className="user-avatar">{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-200">{profile?.nome ?? 'Aluno'}</p>
            <p className="text-xs text-zinc-500">Conta discente</p>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
