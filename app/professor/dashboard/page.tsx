import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Aviso = {
  href: string
  icon: string
  title: string
  text: string
}

async function getStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { turmas: 0, alunos: 0, concluidos: 0, planner: 0, tarefas: 0, avisos: [] as Aviso[] }

  const { data: turmasData } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('professor_id', user.id)

  const turmaIds = (turmasData ?? []).map((t) => t.id)

  if (turmaIds.length === 0) {
    const [plannerResult, tarefasResult] = await Promise.all([
      supabase
        .from('professor_planner')
        .select('id', { count: 'exact', head: true })
        .eq('professor_id', user.id)
        .eq('concluido', false),
      supabase
        .from('professor_tarefas')
        .select('id', { count: 'exact', head: true })
        .eq('professor_id', user.id)
        .eq('ativo', true),
    ])

    return {
      turmas: 0,
      alunos: 0,
      concluidos: 0,
      planner: plannerResult.count ?? 0,
      tarefas: tarefasResult.count ?? 0,
      avisos: plannerResult.count
        ? [{ href: '/professor/planner', icon: 'event_note', title: 'Planner aberto', text: `${plannerResult.count} lembrete(s) para organizar` }]
        : [],
    }
  }

  const [alunosResult, concluidosResult, plannerResult, tarefasResult, matriculasAtivasResult] = await Promise.all([
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .in('turma_id', turmaIds),
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .in('turma_id', turmaIds)
      .eq('status', 'concluido'),
    supabase
      .from('professor_planner')
      .select('id', { count: 'exact', head: true })
      .eq('professor_id', user.id)
      .eq('concluido', false),
    supabase
      .from('professor_tarefas')
      .select('id', { count: 'exact', head: true })
      .eq('professor_id', user.id)
      .eq('ativo', true),
    supabase
      .from('matriculas')
      .select('id, turma_id, profiles!aluno_id(nome)')
      .in('turma_id', turmaIds)
      .eq('status', 'ativo')
      .limit(5),
  ])

  const turmasPorId = new Map((turmasData ?? []).map((turma) => [turma.id, turma.nome]))
  const avisos: Aviso[] = [
    ...(plannerResult.count
      ? [{ href: '/professor/planner', icon: 'event_note', title: 'Planner aberto', text: `${plannerResult.count} lembrete(s) aguardando` }]
      : []),
    ...(tarefasResult.count
      ? [{ href: '/professor/tarefas', icon: 'assignment', title: 'Tarefas publicadas', text: `${tarefasResult.count} atividade(s) visiveis para alunos` }]
      : []),
    ...((matriculasAtivasResult.data ?? []).map((matricula) => {
      const profiles = matricula.profiles as unknown as { nome: string } | null
      return {
        href: `/professor/turmas/${matricula.turma_id}`,
        icon: 'assignment_ind',
        title: profiles?.nome ?? 'Aluno ativo',
        text: `${turmasPorId.get(matricula.turma_id ?? '') ?? 'Turma'} precisa de acompanhamento`,
      }
    })),
  ].slice(0, 5)

  return {
    turmas: turmaIds.length,
    alunos: alunosResult.count ?? 0,
    concluidos: concluidosResult.count ?? 0,
    planner: plannerResult.count ?? 0,
    tarefas: tarefasResult.count ?? 0,
    avisos,
  }
}

export default async function ProfessorDashboardPage() {
  const stats = await getStats()
  const progresso =
    stats.alunos > 0 ? Math.round((stats.concluidos / stats.alunos) * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6">
        <div className="flex flex-col gap-6 p-6 sm:p-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-fuchsia-100">Painel do professor</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50 sm:text-4xl">
              Visao rapida das suas turmas
            </h1>
            <p className="mt-3 text-sm leading-6 text-fuchsia-50/75">
              Acompanhe alunos, conclusoes e turmas atribuidas em um espaco focado para
              rotina de sala.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniPanel href="/professor/turmas" label="Turmas ativas" value={stats.turmas} icon="groups" />
            <MiniPanel href="/professor/tarefas" label="Tarefas enviadas" value={stats.tarefas} icon="assignment" />
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard href="/professor/turmas" icon="groups" label="Minhas Turmas" value={stats.turmas} helper="Turmas vinculadas ao seu usuario" />
        <StatCard href="/professor/turmas" icon="school" label="Total de Alunos" value={stats.alunos} helper="Matriculas nas suas turmas" />
        <StatCard href="/professor/turmas" icon="workspace_premium" label="Concluidos" value={stats.concluidos} helper={`${progresso}% dos alunos finalizaram`} />
        <StatCard href="/professor/tarefas" icon="assignment" label="Tarefas" value={stats.tarefas} helper="Atividades publicadas para alunos" />
        <StatCard href="/professor/planner" icon="event_note" label="Planner" value={stats.planner} helper="Lembretes privados da sua rotina" />
      </div>

      <section className="surface-card">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-50">Informes de acao</h2>
            <p className="mt-1 text-xs text-zinc-500">Alunos, atividades e turmas que precisam de movimento</p>
          </div>
          <span className="material-symbols-outlined text-[22px] text-fuchsia-200">notifications</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {stats.avisos.map((aviso, index) => (
            <Link key={`${aviso.href}-${index}`} href={aviso.href} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-fuchsia-400/5">
              <span className="material-symbols-outlined accent-icon">{aviso.icon}</span>
              <div>
                <p className="text-sm font-medium text-zinc-100">{aviso.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{aviso.text}</p>
              </div>
            </Link>
          ))}
          {stats.avisos.length === 0 && <div className="px-5 py-10 text-center text-sm text-zinc-500">Nenhum informe pendente agora.</div>}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  href,
  icon,
  label,
  value,
  helper,
}: {
  href: string
  icon: string
  label: string
  value: number
  helper: string
}) {
  return (
    <Link href={href} className="surface-card-hover p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="material-symbols-outlined accent-icon">{icon}</span>
        <span className="rounded-md bg-purple-400/10 px-2 py-1 text-xs text-fuchsia-100/70">Docente</span>
      </div>
      <p className="text-3xl font-bold text-fuchsia-100">{value}</p>
      <p className="mt-1 text-sm text-zinc-300">{label}</p>
      <p className="mt-3 text-xs leading-5 text-zinc-500">{helper}</p>
    </Link>
  )
}

function MiniPanel({ href, label, value, icon }: { href: string; label: string; value: number | string; icon: string }) {
  return (
    <Link href={href} className="min-w-48 rounded-lg border border-white/10 bg-black/25 px-5 py-4 transition-colors hover:border-fuchsia-200/50 hover:bg-fuchsia-300/10">
      <span className="material-symbols-outlined text-[22px] text-fuchsia-100">{icon}</span>
      <p className="mt-3 text-3xl font-black text-zinc-50">{value}</p>
      <p className="mt-1 text-xs font-medium text-fuchsia-50/70">{label}</p>
    </Link>
  )
}
