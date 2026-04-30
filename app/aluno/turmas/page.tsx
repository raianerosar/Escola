import { createClient } from '@/lib/supabase/server'

type MatriculaRow = {
  id: string
  status: string
  criado_em: string | null
  turmas: {
    nome: string
    ativo: boolean | null
    data_inicio: string | null
    data_fim: string | null
    cursos: {
      nome: string
      carga_horaria: number | null
    } | null
    profiles: {
      nome: string
    } | null
  } | null
}

async function getMinhasTurmas() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('matriculas')
    .select(
      `
      id,
      status,
      criado_em,
      turmas!turma_id (
        nome,
        ativo,
        data_inicio,
        data_fim,
        cursos!curso_id (
          nome,
          carga_horaria
        ),
        profiles!professor_id (
          nome
        )
      )
    `
    )
    .eq('aluno_id', user.id)
    .order('criado_em', { ascending: false, nullsFirst: false })

  return (data ?? []) as unknown as MatriculaRow[]
}

export default async function MinhasTurmasPage() {
  const matriculas = await getMinhasTurmas()
  const emAndamento = matriculas.filter((matricula) => matricula.status === 'ativo').length
  const concluidas = matriculas.filter((matricula) => matricula.status === 'concluido').length
  const cargaHoraria = matriculas.reduce(
    (total, matricula) => total + (matricula.turmas?.cursos?.carga_horaria ?? 0),
    0
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6 p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-fuchsia-200">Area do aluno</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50">Minhas Turmas</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Acompanhe suas turmas, professores, periodos e situacao de matricula.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Turmas" value={matriculas.length} />
            <Summary label="Ativas" value={emAndamento} />
            <Summary label="Concluidas" value={concluidas} />
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Carga horaria" value={`${cargaHoraria}h`} icon="schedule" tone="text-fuchsia-300" />
        <Metric label="Em andamento" value={emAndamento} icon="play_lesson" tone="text-emerald-300" />
        <Metric label="Finalizadas" value={concluidas} icon="task_alt" tone="text-fuchsia-300" />
      </div>

      {matriculas.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-50">Turmas matriculadas</h2>
            <p className="mt-1 text-xs text-zinc-500">Ordenadas pela matricula mais recente</p>
          </div>
          <div className="divide-y divide-zinc-800">
            {matriculas.map((matricula) => (
              <TurmaCard key={matricula.id} matricula={matricula} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TurmaCard({ matricula }: { matricula: MatriculaRow }) {
  const turma = matricula.turmas
  const curso = turma?.cursos

  return (
    <article className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-50">{turma?.nome ?? 'Turma sem nome'}</h2>
          <StatusBadge status={matricula.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-400">{curso?.nome ?? 'Curso nao informado'}</p>
        <div className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
          <Info icon="person" label="Professor" value={turma?.profiles?.nome ?? 'Nao atribuido'} />
          <Info icon="calendar_month" label="Periodo" value={`${formatDate(turma?.data_inicio ?? null)} - ${formatDate(turma?.data_fim ?? null)}`} />
          <Info icon="timer" label="Carga" value={`${curso?.carga_horaria ?? 0}h`} />
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 lg:min-w-40">
        <p className="text-xs font-medium uppercase text-zinc-500">Matricula</p>
        <p className="mt-2 text-sm text-zinc-200">{formatDate(matricula.criado_em)}</p>
        <p className="mt-1 text-xs text-zinc-600">{turma?.ativo ? 'Turma ativa' : 'Turma inativa'}</p>
      </div>
    </article>
  )
}

function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-fuchsia-200/70">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-600">{label}</p>
        <p className="truncate text-sm text-zinc-300">{value}</p>
      </div>
    </div>
  )
}

function Metric({ label, value, icon, tone }: { label: string; value: number | string; icon: string; tone: string }) {
  return (
    <div className="surface-card-hover p-5">
      <span className={`material-symbols-outlined text-[24px] ${tone}`}>{icon}</span>
      <p className={`mt-4 text-3xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-3">
      <p className="text-2xl font-black text-fuchsia-100">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'concluido') {
    return <span className="status-success">Concluida</span>
  }
  if (status === 'cancelado') {
    return <span className="status-muted">Cancelada</span>
  }
  return <span className="status-accent">Em andamento</span>
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-6 py-12 text-center">
      <span className="material-symbols-outlined text-[34px] text-fuchsia-200/70">groups</span>
      <p className="mt-3 text-sm font-medium text-zinc-200">Nenhuma turma encontrada.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Quando uma matricula for criada, ela aparecera nesta area.
      </p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
