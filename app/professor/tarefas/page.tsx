import { createClient } from '@/lib/supabase/server'
import { alterarStatusTarefa, publicarTarefa } from './actions'

type TurmaRow = {
  id: string
  nome: string
  ativo: boolean | null
  cursos: { nome: string } | null
  matriculas: { id: string; status: string }[]
}

type TarefaRow = {
  id: string
  titulo: string
  descricao: string | null
  data_entrega: string | null
  ativo: boolean
  criado_em: string
  turmas: { nome: string; cursos: { nome: string } | null } | null
  aluno_tarefa_respostas: {
    id: string
    aluno_id: string
    resposta: string
    entregue_em: string
    atualizado_em: string
    profiles: { nome: string; email: string } | null
  }[]
}

async function getTarefasData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { turmas: [] as TurmaRow[], tarefas: [] as TarefaRow[], erro: null as string | null }

  const [turmasResult, tarefasResult] = await Promise.all([
    supabase
      .from('turmas')
      .select('id, nome, ativo, cursos!curso_id(nome), matriculas(id, status)')
      .eq('professor_id', user.id)
      .order('ativo', { ascending: false })
      .order('nome', { ascending: true }),
    supabase
      .from('professor_tarefas')
      .select(
        `
        id,
        titulo,
        descricao,
        data_entrega,
        ativo,
        criado_em,
        turmas!turma_id (nome, cursos!curso_id(nome)),
        aluno_tarefa_respostas(
          id,
          aluno_id,
          resposta,
          entregue_em,
          atualizado_em,
          profiles!aluno_id(nome, email)
        )
      `
      )
      .eq('professor_id', user.id)
      .order('ativo', { ascending: false })
      .order('criado_em', { ascending: false }),
  ])

  const erro = turmasResult.error?.message ?? tarefasResult.error?.message ?? null

  return {
    turmas: (turmasResult.data ?? []) as unknown as TurmaRow[],
    tarefas: (tarefasResult.data ?? []) as unknown as TarefaRow[],
    erro,
  }
}

export default async function ProfessorTarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>
}) {
  const [{ turmas, tarefas, erro: dataErro }, params] = await Promise.all([
    getTarefasData(),
    searchParams,
  ])
  const publicadas = tarefas.filter((tarefa) => tarefa.ativo).length
  const entregas = tarefas.reduce((total, tarefa) => total + tarefa.aluno_tarefa_respostas.length, 0)
  const alunosAtivos = turmas.reduce(
    (total, turma) => total + turma.matriculas.filter((matricula) => matricula.status === 'ativo').length,
    0
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6 p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-fuchsia-200">Tarefas para alunos</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50">Enviar atividade para turma</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Publique atividades visiveis para alunos matriculados. O planner continua reservado para sua organizacao pessoal.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Publicadas" value={publicadas} />
            <Summary label="Entregas" value={entregas} />
            <Summary label="Alunos" value={alunosAtivos} />
          </div>
        </div>
      </section>

      {(params.erro || dataErro) && (
        <Alert
          tone="error"
          title="Tarefas nao estao gravando"
          text={params.erro ?? `Erro ao carregar tarefas: ${dataErro}`}
        />
      )}

      {params.ok && (
        <Alert
          tone="success"
          title="Tarefa enviada"
          text={params.ok}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <section className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-50">Nova tarefa</h2>
              <p className="mt-1 text-xs text-zinc-500">Aparece na area do aluno</p>
            </div>
            <span className="rounded-md border border-fuchsia-300/25 px-2 py-1 text-xs font-semibold text-fuchsia-100">
              Envio
            </span>
          </div>

          <form action={publicarTarefa} className="space-y-3">
            <Field label="Turma">
              <select name="turmaId" required className="input">
                <option value="">Selecione uma turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Titulo">
              <input
                name="titulo"
                required
                placeholder="Ex: Exercicios da aula 3"
                className="input"
              />
            </Field>

            <Field label="Prazo">
              <input name="dataEntrega" type="date" className="input" />
            </Field>

            <Field label="Instrucoes">
              <textarea
                name="descricao"
                rows={5}
                placeholder="Explique o que o aluno deve entregar"
                className="input resize-none"
              />
            </Field>

            <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-fuchsia-300 px-4 py-2.5 text-sm font-semibold text-[#21002f] transition-colors hover:bg-fuchsia-200">
              Enviar para alunos
            </button>
          </form>
        </section>

        <section className="surface-card overflow-hidden">
          <PanelHeader title="Tarefas enviadas" subtitle="Acompanhe publicacoes, entregas e respostas" />
          <div className="divide-y divide-zinc-800">
            {tarefas.map((tarefa) => (
              <TarefaItem key={tarefa.id} tarefa={tarefa} />
            ))}
            {tarefas.length === 0 && (
              <EmptyState text="Nenhuma atividade enviada ainda." />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function TarefaItem({ tarefa }: { tarefa: TarefaRow }) {
  return (
    <article className={`px-5 py-5 ${tarefa.ativo ? '' : 'opacity-60'}`}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={tarefa.ativo ? 'status-success' : 'status-muted'}>
              {tarefa.ativo ? 'Publicada' : 'Arquivada'}
            </span>
            {tarefa.data_entrega && (
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                Prazo {formatDate(tarefa.data_entrega)}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-zinc-50">{tarefa.titulo}</h2>
          {tarefa.descricao && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{tarefa.descricao}</p>}
          <p className="mt-3 text-xs text-zinc-600">
            {tarefa.turmas?.nome ?? 'Turma'} / {tarefa.turmas?.cursos?.nome ?? 'Curso nao informado'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
            <p className="text-2xl font-black text-fuchsia-100">{tarefa.aluno_tarefa_respostas.length}</p>
            <p className="text-xs text-zinc-500">entrega(s)</p>
          </div>
          <form action={alterarStatusTarefa}>
            <input type="hidden" name="id" value={tarefa.id} />
            <input type="hidden" name="ativo" value={String(!tarefa.ativo)} />
            <button type="submit" className="icon-button" title={tarefa.ativo ? 'Arquivar' : 'Publicar novamente'}>
              <span className="text-xs font-semibold">{tarefa.ativo ? 'Arquivar' : 'Reabrir'}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/45">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">Respostas dos alunos</p>
          <span className="text-xs font-semibold text-fuchsia-100">{tarefa.aluno_tarefa_respostas.length}</span>
        </div>
        {tarefa.aluno_tarefa_respostas.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {tarefa.aluno_tarefa_respostas.map((resposta) => (
              <div key={resposta.id} className="px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-zinc-200">
                    {resposta.profiles?.nome ?? 'Aluno'}
                  </p>
                  <p className="text-xs text-zinc-600">{formatDateTime(resposta.atualizado_em)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                  {resposta.resposta}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm text-zinc-500">Nenhuma entrega recebida ainda.</p>
        )}
      </div>
    </article>
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
    <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-3">
      <p className="text-2xl font-black text-fuchsia-100">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function Alert({ tone, title, text }: { tone: 'error' | 'success'; title: string; text: string }) {
  const className =
    tone === 'error'
      ? 'mb-6 border-red-300/25 bg-red-500/10 text-red-100'
      : 'mb-6 border-emerald-300/25 bg-emerald-500/10 text-emerald-100'

  return (
    <div className={`rounded-lg border px-5 py-4 ${className}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-80">{text}</p>
      {text.toLowerCase().includes('professor_tarefas') && (
        <p className="mt-2 text-xs opacity-75">
          A migration das tarefas precisa ser aplicada no Supabase antes de usar esta tela.
        </p>
      )}
    </div>
  )
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <span className="rounded-md bg-fuchsia-400/10 px-2 py-1 text-xs font-semibold text-fuchsia-100">
        Professor
      </span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-zinc-500">{text}</div>
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-BR')
}
