import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type ProfessorRow = {
  id: string
  nome: string
  email: string
  criado_em: string | null
}

async function getProfessores() {
  const supabase = await createClient()
  const [professoresResult, turmasResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, criado_em')
      .eq('perfil', 'professor')
      .order('nome', { ascending: true }),
    supabase.from('turmas').select('professor_id, ativo'),
  ])

  const turmasPorProfessor = new Map<string, { total: number; ativas: number }>()

  for (const turma of turmasResult.data ?? []) {
    if (!turma.professor_id) continue
    const atual = turmasPorProfessor.get(turma.professor_id) ?? { total: 0, ativas: 0 }
    atual.total += 1
    if (turma.ativo) atual.ativas += 1
    turmasPorProfessor.set(turma.professor_id, atual)
  }

  return ((professoresResult.data ?? []) as ProfessorRow[]).map((professor) => ({
    ...professor,
    ...(turmasPorProfessor.get(professor.id) ?? { total: 0, ativas: 0 }),
  }))
}

export default async function ProfessoresPage() {
  const professores = await getProfessores()
  const comTurma = professores.filter((professor) => professor.total > 0).length
  const disponiveis = professores.length - comTurma

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-fuchsia-200">Gestao pedagogica</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-50">Professores</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Veja distribuicao de turmas, docentes sem atribuicao e capacidade ativa da equipe.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric href="/diretor/professores" label="Professores" value={professores.length} icon="badge" tone="text-emerald-300" />
        <Metric href="/diretor/turmas" label="Com turma" value={comTurma} icon="co_present" tone="text-fuchsia-300" />
        <Metric href="/diretor/turmas" label="Disponiveis" value={disponiveis} icon="event_available" tone="text-fuchsia-300" />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {professores.map((professor) => (
          <Link key={professor.id} href="/diretor/turmas" className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-400/5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-50">{professor.nome}</p>
                <p className="mt-1 truncate text-sm text-zinc-500">{professor.email}</p>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${professor.ativas > 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                {professor.ativas > 0 ? 'Em aula' : 'Livre'}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Mini label="Turmas" value={professor.total} />
              <Mini label="Ativas" value={professor.ativas} />
              <Mini label="Cadastro" value={formatDate(professor.criado_em)} />
            </div>
          </Link>
        ))}
        {professores.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-sm text-zinc-500 xl:col-span-2">
            Nenhum professor cadastrado.
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ href, label, value, icon, tone }: { href: string; label: string; value: number; icon: string; tone: string }) {
  return (
    <Link href={href} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-400/5">
      <span className={`material-symbols-outlined text-[24px] ${tone}`}>{icon}</span>
      <p className={`mt-4 text-3xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </Link>
  )
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-zinc-950 p-3">
      <p className="text-lg font-bold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
