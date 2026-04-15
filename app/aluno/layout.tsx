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
