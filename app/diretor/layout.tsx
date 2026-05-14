import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserOrNull } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

const NAV_ITEMS = [
  { href: '/diretor/dashboard', icon: 'space_dashboard', label: 'Painel' },
  { href: '/diretor/alunos', icon: 'school', label: 'Alunos' },
  { href: '/diretor/professores', icon: 'badge', label: 'Professores' },
  { href: '/diretor/cursos', icon: 'local_library', label: 'Cursos' },
  { href: '/diretor/turmas', icon: 'groups', label: 'Turmas' },
  { href: '/diretor/certificados', icon: 'workspace_premium', label: 'Certificados' },
]

export default async function DiretorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const user = await getUserOrNull(supabase)

  if (!user) redirect('/login')
  const perfil = user.user_metadata?.perfil
  if (perfil !== 'diretor') {
    redirect(perfil === 'professor' ? '/professor/dashboard' : '/aluno/dashboard')
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
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-50">Diretoria</p>
              <p className="text-xs text-zinc-500">Gestao escolar</p>
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
            <p className="truncate text-sm font-medium text-zinc-200">{profile?.nome ?? 'Diretoria'}</p>
            <p className="text-xs text-zinc-500">Conta administrativa</p>
          </div>
          <div>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
