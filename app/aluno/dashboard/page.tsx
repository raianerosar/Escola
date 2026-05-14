import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type DashboardData = {
  cursos: number
  turmas: number
  horasAula: number
  concluidos: number
  certificados: number
  atividades: number
  conclusao: number
  matriculas: MatriculaRow[]
  tarefasRecentes: TarefaRow[]
  certificadosRecentes: CertificadoRow[]
}

type MatriculaRow = {
  id: string
  turma_id: string | null
  status: string
  criado_em: string | null
  turmas: {
    nome: string
    data_inicio: string | null
    data_fim: string | null
    cursos: {
      id: string
      nome: string
      carga_horaria: number | null
    } | null
  } | null
}

type CertificadoRow = {
  id: string
  data_emissao: string | null
  cursos: { nome: string } | null
}

type TarefaRow = {
  id: string
  titulo: string
  data_entrega: string | null
  criado_em: string
  turmas: {
    nome: string
    cursos: { nome: string } | null
  } | null
  aluno_tarefa_respostas: { id: string }[]
}

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return emptyDashboardData()
  }

  const admin = createAdminClient()

  const [matriculasResult, certificadosResult] = await Promise.all([
    admin
      .from('matriculas')
      .select(
        `
        id,
        turma_id,
        status,
        criado_em,
        turmas!turma_id (
          nome,
          data_inicio,
          data_fim,
          cursos!curso_id (
            id,
            nome,
            carga_horaria
          )
        )
      `
      )
      .eq('aluno_id', user.id)
      .order('criado_em', { ascending: false }),
    admin
      .from('certificados')
      .select('id, data_emissao, cursos!curso_id(nome)', { count: 'exact' })
      .eq('aluno_id', user.id),
  ])

  const matriculas = (matriculasResult.data ?? []) as unknown as MatriculaRow[]
  const cursosIds = new Set(
    matriculas
      .map((matricula) => matricula.turmas?.cursos?.id)
      .filter((id): id is string => Boolean(id))
  )
  const turmaIds = matriculas
    .filter((matricula) => matricula.status !== 'cancelado')
    .map((matricula) => matricula.turma_id)
    .filter((id): id is string => Boolean(id))
  const tarefas = await getTarefasRecebidas(admin, turmaIds, user.id)
  const atividades = tarefas.filter((tarefa) => tarefa.aluno_tarefa_respostas.length === 0).length
  const horasAula = matriculas.reduce(
    (total, matricula) => total + (matricula.turmas?.cursos?.carga_horaria ?? 0),
    0
  )
  const concluidos = matriculas.filter((matricula) => matricula.status === 'concluido').length
  const conclusao = matriculas.length > 0 ? Math.round((concluidos / matriculas.length) * 100) : 0

  return {
    cursos: cursosIds.size,
    turmas: matriculas.length,
    horasAula,
    concluidos,
    certificados: certificadosResult.count ?? 0,
    atividades,
    conclusao,
    matriculas: matriculas.slice(0, 4),
    tarefasRecentes: tarefas.slice(0, 3),
    certificadosRecentes: (certificadosResult.data ?? []) as unknown as CertificadoRow[],
  }
}

async function getTarefasRecebidas(
  supabase: ReturnType<typeof createAdminClient>,
  turmaIds: string[],
  alunoId: string
) {
  if (turmaIds.length === 0) return []

  const { data } = await supabase
    .from('professor_tarefas')
    .select(
      `
      id,
      titulo,
      data_entrega,
      criado_em,
      turmas!turma_id (nome, cursos!curso_id(nome)),
      aluno_tarefa_respostas(id)
    `
    )
    .eq('ativo', true)
    .in('turma_id', turmaIds)
    .eq('aluno_tarefa_respostas.aluno_id', alunoId)
    .order('data_entrega', { ascending: true, nullsFirst: false })
    .order('criado_em', { ascending: false })

  return (data ?? []) as unknown as TarefaRow[]
}

export default async function AlunoDashboardPage() {
  const data = await getDashboardData()
  const progressLabel =
    data.conclusao >= 100
      ? 'Tudo concluído'
      : data.conclusao >= 50
        ? 'Bom ritmo'
        : 'Em progresso'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6">
        <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-fuchsia-200">Área do aluno</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50 sm:text-4xl">Meu painel de estudos</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Acompanhe seus cursos, aulas, atividades e conclusão em um só lugar.
            </p>
          </div>

          <div className="min-w-48 rounded-lg border border-white/10 bg-black/25 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Conclusão geral
            </p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-4xl font-black text-fuchsia-100">{data.conclusao}%</p>
              <p className="pb-1 text-sm font-medium text-zinc-300">{progressLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="menu_book"
          label="Cursos"
          value={data.cursos}
          helper="Cursos vinculados às suas turmas"
        />
        <StatCard
          icon="play_lesson"
          label="Aulas"
          value={data.horasAula}
          suffix="h"
          helper="Carga horária total"
        />
        <StatCard
          icon="task_alt"
          label="Concluídos"
          value={data.concluidos}
          helper="Turmas finalizadas"
        />
        <StatCard
          icon="assignment"
          label="Atividades"
          value={data.atividades}
          helper="Tarefas pendentes enviadas pelo professor"
          href="/aluno/tarefas"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-card">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-50">Meus cursos e aulas</h2>
              <p className="mt-1 text-xs text-zinc-500">Últimas matrículas encontradas</p>
            </div>
            <span className="material-symbols-outlined text-[22px] text-zinc-500">
              school
            </span>
          </div>
          <div className="divide-y divide-zinc-800">
            {data.matriculas.map((matricula) => (
              <CourseRow key={matricula.id} matricula={matricula} />
            ))}
            {data.matriculas.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                Nenhum curso encontrado ainda.
              </div>
            )}
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-50">Resumo acadêmico</h2>
              <p className="mt-1 text-xs text-zinc-500">Seu desempenho geral</p>
            </div>
            <span className="material-symbols-outlined text-[22px] text-fuchsia-200">
              insights
            </span>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Progresso de conclusão</span>
              <span className="font-semibold text-zinc-200">{data.conclusao}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div
                className="progress-accent h-2 rounded-full"
                style={{ width: `${data.conclusao}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="Turmas" value={data.turmas} />
            <MiniMetric label="Certificados" value={data.certificados} />
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[19px] text-fuchsia-200">
                checklist
              </span>
              <p className="text-sm font-medium text-zinc-100">Próximos passos</p>
            </div>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>Continue as aulas pendentes.</p>
              <p>Finalize as atividades abertas.</p>
              <p>Emita o certificado após concluir o curso.</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[19px] text-fuchsia-200">
                notifications
              </span>
              <p className="text-sm font-medium text-zinc-100">Informes</p>
            </div>
            <div className="space-y-3">
              {data.certificadosRecentes.slice(0, 3).map((certificado) => (
                <Notice
                  key={certificado.id}
                  icon="workspace_premium"
                  title="Certificado liberado"
                  text={`${certificado.cursos?.nome ?? 'Curso'} em ${formatDate(certificado.data_emissao)}`}
                />
              ))}
              {data.tarefasRecentes.map((tarefa) => (
                <Notice
                  key={tarefa.id}
                  icon="assignment"
                  title={tarefa.aluno_tarefa_respostas.length > 0 ? 'Atividade entregue' : 'Atividade recebida'}
                  text={`${tarefa.titulo} - ${tarefa.data_entrega ? `prazo ${formatDate(tarefa.data_entrega)}` : tarefa.turmas?.cursos?.nome ?? tarefa.turmas?.nome ?? 'Turma'}`}
                  href="/aluno/tarefas"
                />
              ))}
              {data.certificadosRecentes.length === 0 && data.tarefasRecentes.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum informe novo agora.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  suffix = '',
  helper,
  href,
}: {
  icon: string
  label: string
  value: number
  suffix?: string
  helper: string
  href?: string
}) {
  const content = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="material-symbols-outlined accent-icon">{icon}</span>
        <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">Aluno</span>
      </div>
      <p className="text-3xl font-bold text-fuchsia-100">
        {value}
        {suffix && <span className="text-xl">{suffix}</span>}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
      <p className="mt-3 text-xs leading-5 text-zinc-600">{helper}</p>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="surface-card-hover block p-5">
        {content}
      </Link>
    )
  }

  return (
    <div className="surface-card-hover p-5">
      {content}
    </div>
  )
}

function CourseRow({ matricula }: { matricula: MatriculaRow }) {
  const curso = matricula.turmas?.cursos
  const statusLabel = matricula.status === 'concluido' ? 'Concluído' : 'Em andamento'
  const statusClass =
    matricula.status === 'concluido'
      ? 'status-success'
      : 'status-accent'

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-zinc-100">{curso?.nome ?? 'Curso sem nome'}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {matricula.turmas?.nome ?? 'Turma sem nome'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">{curso?.carga_horaria ?? 0}h</span>
        <span className={statusClass}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-950 p-4">
      <p className="text-2xl font-bold text-zinc-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function Notice({
  icon,
  title,
  text,
  href,
}: {
  icon: string
  title: string
  text: string
  href?: string
}) {
  const content = (
    <>
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-fuchsia-200">{icon}</span>
      <div>
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{text}</p>
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 transition-colors hover:border-fuchsia-300/40">
        {content}
      </Link>
    )
  }

  return (
    <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      {content}
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}

function emptyDashboardData(): DashboardData {
  return {
    cursos: 0,
    turmas: 0,
    horasAula: 0,
    concluidos: 0,
    certificados: 0,
    atividades: 0,
    conclusao: 0,
    matriculas: [],
    tarefasRecentes: [],
    certificadosRecentes: [],
  }
}
