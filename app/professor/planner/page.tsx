import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createPlannerItem, deletePlannerItem, togglePlannerItem } from './actions'

type PlannerItem = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  prioridade: string
  data_planejada: string | null
  concluido: boolean
  turma_id: string | null
  turmas: { nome: string; cursos: { nome: string } | null } | null
}

type TurmaRow = {
  id: string
  nome: string
  ativo: boolean | null
  data_fim: string | null
  cursos: { nome: string } | null
  matriculas: { id: string; status: string }[]
}

async function getPlannerData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { tarefas: [] as PlannerItem[], turmas: [] as TurmaRow[] }

  const [tarefasResult, turmasResult] = await Promise.all([
    supabase
      .from('professor_planner')
      .select('id, titulo, descricao, tipo, prioridade, data_planejada, concluido, turma_id, turmas!turma_id(nome, cursos!curso_id(nome))')
      .eq('professor_id', user.id)
      .order('concluido', { ascending: true })
      .order('data_planejada', { ascending: true, nullsFirst: false })
      .order('criado_em', { ascending: false }),
    supabase
      .from('turmas')
      .select('id, nome, ativo, data_fim, cursos!curso_id(nome), matriculas(id, status)')
      .eq('professor_id', user.id)
      .order('ativo', { ascending: false })
      .order('data_fim', { ascending: true, nullsFirst: false }),
  ])

  return {
    tarefas: (tarefasResult.data ?? []) as unknown as PlannerItem[],
    turmas: (turmasResult.data ?? []) as unknown as TurmaRow[],
  }
}

export default async function ProfessorPlannerPage() {
  const { tarefas, turmas } = await getPlannerData()
  const abertas = tarefas.filter((tarefa) => !tarefa.concluido)
  const concluidas = tarefas.length - abertas.length
  const turmasComPendencia = turmas.filter((turma) =>
    turma.matriculas.some((matricula) => matricula.status === 'ativo')
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="page-hero mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-fuchsia-200">Planner interno</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-50">Agenda privada</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Organize lembretes, preparos de aula e combinados internos. Nada criado aqui aparece para o aluno.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:min-w-80">
          <Summary label="Abertas" value={abertas.length} />
          <Summary label="Feitas" value={concluidas} />
          <Summary label="Turmas" value={turmas.length} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/5 p-4">
            <div className="flex gap-3">
              <span className="mt-0.5 rounded-md bg-fuchsia-300/10 px-2 py-1 text-xs font-semibold text-fuchsia-100">
                Privado
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Privado do professor</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Para enviar atividade de verdade, use a area Tarefas.
                </p>
                <Link href="/professor/tarefas" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-fuchsia-300/25 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition-colors hover:bg-fuchsia-300/10">
                  Ir para Tarefas
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-50">Novo lembrete</h2>
              <p className="mt-1 text-xs text-zinc-500">Visivel apenas para voce</p>
            </div>
            <span className="rounded-md border border-fuchsia-300/25 px-2 py-1 text-xs font-semibold text-fuchsia-100">
              Interno
            </span>
          </div>

          <form action={createPlannerItem} className="space-y-3">
            <Field label="Titulo">
              <input
                name="titulo"
                required
                placeholder="Ex: Separar material da proxima aula"
                className="input"
              />
            </Field>

            <Field label="Turma">
              <select name="turmaId" className="input">
                <option value="">Sem turma vinculada</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select name="tipo" className="input">
                  <option value="aula">Aula</option>
                  <option value="avaliacao">Avaliacao</option>
                  <option value="reuniao">Reuniao</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Prioridade">
                <select name="prioridade" className="input">
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="baixa">Baixa</option>
                </select>
              </Field>
            </div>

            <Field label="Data">
              <input name="dataPlanejada" type="date" className="input" />
            </Field>

            <Field label="Observacao">
              <textarea
                name="descricao"
                rows={3}
                placeholder="Detalhes rapidos para lembrar depois"
                className="input resize-none"
              />
            </Field>

            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-fuchsia-300 px-4 py-2.5 text-sm font-semibold text-[#21002f] transition-colors hover:bg-fuchsia-200">
              Guardar lembrete
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900">
            <PanelHeader title="Lembretes abertos" subtitle="Organizacao privada do professor" tag="Planner" />
            <div className="divide-y divide-zinc-800">
              {abertas.map((tarefa) => (
                <PlannerRow key={tarefa.id} tarefa={tarefa} />
              ))}
              {abertas.length === 0 && <EmptyState text="Nenhum lembrete aberto." />}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900">
            <PanelHeader title="Acoes por turma" subtitle="Atalhos operacionais da sua rotina" tag="Turmas" />
            <div className="divide-y divide-zinc-800">
              {turmas.map((turma) => {
                const ativos = turma.matriculas.filter((matricula) => matricula.status === 'ativo').length
                const concluidos = turma.matriculas.filter((matricula) => matricula.status === 'concluido').length
                return (
                  <div key={turma.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-100">{turma.nome}</p>
                        <StatusBadge active={Boolean(turma.ativo)} />
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{turma.cursos?.nome ?? 'Curso nao informado'}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {ativos} ativos / {concluidos} concluidos / fim {formatDate(turma.data_fim)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/professor/turmas/${turma.id}`} className="action-link">
                        Adicionar alunos
                      </Link>
                      <Link href={`/professor/turmas/${turma.id}`} className="action-link">
                        Concluir alunos
                      </Link>
                    </div>
                  </div>
                )
              })}
              {turmas.length === 0 && <EmptyState text="Nenhuma turma atribuida ainda." />}
            </div>
          </section>

          {tarefas.length > abertas.length && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-900">
              <PanelHeader title="Concluidas" subtitle="Historico recente do planner" tag="Feitas" />
              <div className="divide-y divide-zinc-800">
                {tarefas.filter((tarefa) => tarefa.concluido).map((tarefa) => (
                  <PlannerRow key={tarefa.id} tarefa={tarefa} />
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-fuchsia-300/20 bg-zinc-950/45 px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-fuchsia-300/10 px-2 py-1 text-xs font-semibold text-fuchsia-100">
                  Tarefas
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Quer mandar tarefa para aluno?</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Use a tela Tarefas. O aluno recebe na area dele e consegue entregar a resposta.
                  </p>
                </div>
              </div>
              <Link href="/professor/tarefas" className="action-link min-h-11 justify-center">
                Abrir Tarefas
              </Link>
            </div>
          </section>

          {turmasComPendencia.length > 0 && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-fuchsia-300/10 px-2 py-1 text-xs font-semibold text-fuchsia-100">
                  Rotina
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Lembrete operacional</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Voce tem {turmasComPendencia.length} turma(s) com alunos ativos para acompanhar.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function PlannerRow({ tarefa }: { tarefa: PlannerItem }) {
  return (
    <div className={`flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between ${tarefa.concluido ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge tipo={tarefa.tipo} />
          <PriorityBadge prioridade={tarefa.prioridade} />
          {tarefa.data_planejada && (
            <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">{formatDate(tarefa.data_planejada)}</span>
          )}
        </div>
        <p className="mt-3 font-medium text-zinc-100">{tarefa.titulo}</p>
        {tarefa.descricao && <p className="mt-1 text-sm leading-6 text-zinc-500">{tarefa.descricao}</p>}
        {tarefa.turmas && (
          <p className="mt-2 text-xs text-zinc-600">
            {tarefa.turmas.nome} / {tarefa.turmas.cursos?.nome ?? 'Curso nao informado'}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={togglePlannerItem}>
          <input type="hidden" name="id" value={tarefa.id} />
          <input type="hidden" name="concluido" value={String(!tarefa.concluido)} />
          <button type="submit" className="icon-button" title={tarefa.concluido ? 'Reabrir' : 'Concluir'}>
            <span className="text-xs font-semibold">{tarefa.concluido ? 'Reabrir' : 'Feito'}</span>
          </button>
        </form>
        <form action={deletePlannerItem}>
          <input type="hidden" name="id" value={tarefa.id} />
          <button type="submit" className="icon-button" title="Remover">
            <span className="text-xs font-semibold">Excluir</span>
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <p className="text-2xl font-black text-fuchsia-100">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function PanelHeader({ title, subtitle, tag }: { title: string; subtitle: string; tag: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <span className="rounded-md bg-fuchsia-400/10 px-2 py-1 text-xs font-semibold text-fuchsia-100">{tag}</span>
    </div>
  )
}

function TypeBadge({ tipo }: { tipo: string }) {
  const labels: Record<string, string> = {
    aula: 'Aula',
    avaliacao: 'Avaliacao',
    reuniao: 'Reuniao',
    outro: 'Outro',
  }

  return <span className="rounded-md bg-fuchsia-400/10 px-2 py-1 text-xs font-medium text-fuchsia-200">{labels[tipo] ?? 'Outro'}</span>
}

function PriorityBadge({ prioridade }: { prioridade: string }) {
  const className =
    prioridade === 'alta'
      ? 'bg-red-400/10 text-red-200'
      : prioridade === 'baixa'
        ? 'bg-zinc-800 text-zinc-400'
        : 'bg-fuchsia-400/10 text-fuchsia-200'

  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{prioridade}</span>
}

function StatusBadge({ active }: { active: boolean }) {
  const className = active ? 'bg-emerald-400/10 text-emerald-200' : 'bg-zinc-800 text-zinc-400'
  return <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>{active ? 'Ativa' : 'Inativa'}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-10 text-center text-sm text-zinc-500">{text}</div>
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
