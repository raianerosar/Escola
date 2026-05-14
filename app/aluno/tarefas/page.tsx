import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { entregarTarefa } from './actions'

const ATTACHMENTS_BUCKET = 'tarefas-anexos'
const SUBMISSIONS_BUCKET = 'tarefas-entregas'

type TarefaRow = {
  id: string
  titulo: string
  descricao: string | null
  data_entrega: string | null
  criado_em: string
  turmas: { nome: string; cursos: { nome: string } | null } | null
  profiles: { nome: string } | null
  professor_tarefa_anexos: AttachmentRow[]
  aluno_tarefa_respostas: {
    id: string
    resposta: string
    entregue_em: string
    atualizado_em: string
    aluno_tarefa_resposta_anexos: AttachmentRow[]
  }[]
}

type AttachmentRow = {
  id: string
  caminho: string
  nome: string
  mime_type: string | null
  tamanho: number
  signedUrl?: string | null
}

async function getTarefasAluno() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const admin = createAdminClient()

  const { data: matriculas } = await admin
    .from('matriculas')
    .select('turma_id')
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')

  const turmaIds = (matriculas ?? [])
    .map((matricula) => matricula.turma_id)
    .filter((id): id is string => Boolean(id))

  if (turmaIds.length === 0) return []

  const { data } = await admin
    .from('professor_tarefas')
    .select(
      `
      id,
      titulo,
      descricao,
      data_entrega,
      criado_em,
      turmas!turma_id (nome, cursos!curso_id(nome)),
      profiles!professor_id (nome),
      professor_tarefa_anexos(id, caminho, nome, mime_type, tamanho),
      aluno_tarefa_respostas(
        id,
        resposta,
        entregue_em,
        atualizado_em,
        aluno_tarefa_resposta_anexos(id, caminho, nome, mime_type, tamanho)
      )
    `
    )
    .eq('ativo', true)
    .in('turma_id', turmaIds)
    .eq('aluno_tarefa_respostas.aluno_id', user.id)
    .order('data_entrega', { ascending: true, nullsFirst: false })
    .order('criado_em', { ascending: false })

  return signAttachmentUrls(admin, (data ?? []) as unknown as TarefaRow[])
}

export default async function AlunoTarefasPage() {
  const tarefas = await getTarefasAluno()
  const entregues = tarefas.filter((tarefa) => tarefa.aluno_tarefa_respostas.length > 0).length
  const pendentes = tarefas.length - entregues

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6 p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-fuchsia-200">Area do aluno</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50">Tarefas</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Veja as atividades enviadas pelo professor e registre sua resposta diretamente aqui.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Total" value={tarefas.length} />
            <Summary label="Pendentes" value={pendentes} />
            <Summary label="Entregues" value={entregues} />
          </div>
        </div>
      </section>

      {tarefas.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-50">Atividades recebidas</h2>
            <p className="mt-1 text-xs text-zinc-500">As mais urgentes aparecem primeiro</p>
          </div>
          <div className="divide-y divide-zinc-800">
            {tarefas.map((tarefa) => (
              <TarefaAluno key={tarefa.id} tarefa={tarefa} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TarefaAluno({ tarefa }: { tarefa: TarefaRow }) {
  const resposta = tarefa.aluno_tarefa_respostas[0]

  return (
    <article className="grid gap-5 px-5 py-5 xl:grid-cols-[1fr_420px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={resposta ? 'status-success' : 'status-accent'}>
            {resposta ? 'Entregue' : 'Pendente'}
          </span>
          {tarefa.data_entrega && (
            <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
              Prazo {formatDate(tarefa.data_entrega)}
            </span>
          )}
        </div>
        <h2 className="mt-3 text-lg font-semibold text-zinc-50">{tarefa.titulo}</h2>
        {tarefa.descricao && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{tarefa.descricao}</p>}
        <div className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
          <Info label="Turma" value={tarefa.turmas?.nome ?? 'Turma'} />
          <Info label="Curso" value={tarefa.turmas?.cursos?.nome ?? 'Curso nao informado'} />
          <Info label="Professor" value={tarefa.profiles?.nome ?? 'Professor'} />
        </div>
        <AttachmentList anexos={tarefa.professor_tarefa_anexos} />
      </div>

      <form action={entregarTarefa} className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-4">
        <input type="hidden" name="tarefaId" value={tarefa.id} />
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-zinc-500">
            {resposta ? 'Editar resposta' : 'Sua resposta'}
          </span>
          <textarea
            name="resposta"
            rows={5}
            defaultValue={resposta?.resposta ?? ''}
            placeholder="Escreva sua entrega ou observacao para o professor"
            className="input resize-none"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-2 block text-xs font-medium text-zinc-500">Arquivos da entrega</span>
          <input
            name="anexos"
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx,.ppt,.pptx"
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-100"
          />
          <span className="mt-1 block text-xs text-zinc-600">Ate 5 arquivos, 10 MB cada.</span>
        </label>
        {resposta && <SubmissionAttachmentList anexos={resposta.aluno_tarefa_resposta_anexos} />}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-600">
            {resposta ? `Ultima entrega: ${formatDateTime(resposta.atualizado_em)}` : 'Ainda nao entregue'}
          </p>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-fuchsia-300 px-4 py-2.5 text-sm font-semibold text-[#21002f] transition-colors hover:bg-fuchsia-200">
            {resposta ? 'Atualizar' : 'Entregar'}
          </button>
        </div>
      </form>
    </article>
  )
}

async function signAttachmentUrls(
  admin: ReturnType<typeof createAdminClient>,
  tarefas: TarefaRow[]
) {
  await Promise.all(
    tarefas.flatMap((tarefa) =>
      [
        ...tarefa.professor_tarefa_anexos.map(async (anexo) => {
          const { data } = await admin.storage
            .from(ATTACHMENTS_BUCKET)
            .createSignedUrl(anexo.caminho, 60 * 60)

          anexo.signedUrl = data?.signedUrl ?? null
        }),
        ...tarefa.aluno_tarefa_respostas.flatMap((resposta) =>
          resposta.aluno_tarefa_resposta_anexos.map(async (anexo) => {
            const { data } = await admin.storage
              .from(SUBMISSIONS_BUCKET)
              .createSignedUrl(anexo.caminho, 60 * 60)

            anexo.signedUrl = data?.signedUrl ?? null
          })
        ),
      ]
    )
  )

  return tarefas
}

function SubmissionAttachmentList({ anexos }: { anexos: AttachmentRow[] }) {
  if (anexos.length === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <p className="mb-2 text-xs font-semibold text-zinc-500">Arquivos enviados</p>
      <div className="flex flex-wrap gap-2">
        {anexos.map((anexo) => (
          <a
            key={anexo.id}
            href={anexo.signedUrl ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-fuchsia-300/40 hover:text-fuchsia-100"
          >
            <span className="material-symbols-outlined text-[17px] text-fuchsia-200">
              {anexo.mime_type?.startsWith('image/') ? 'image' : 'attach_file'}
            </span>
            <span className="max-w-36 truncate">{anexo.nome}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

function AttachmentList({ anexos }: { anexos: AttachmentRow[] }) {
  if (anexos.length === 0) return null

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {anexos.map((anexo) => (
        <a
          key={anexo.id}
          href={anexo.signedUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60 transition-colors hover:border-fuchsia-300/40"
        >
          {anexo.mime_type?.startsWith('image/') && anexo.signedUrl ? (
            <img
              src={anexo.signedUrl}
              alt={anexo.nome}
              className="h-36 w-full object-cover"
            />
          ) : (
            <div className="flex h-24 items-center justify-center bg-zinc-900">
              <span className="material-symbols-outlined text-[30px] text-fuchsia-200">attach_file</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-fuchsia-200">
              {anexo.mime_type?.startsWith('image/') ? 'image' : 'open_in_new'}
            </span>
            <span className="truncate text-xs font-medium text-zinc-300 group-hover:text-fuchsia-100">
              {anexo.nome}
            </span>
          </div>
        </a>
      ))}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950/45 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-zinc-600">{label}</p>
        <p className="truncate text-sm text-zinc-300">{value}</p>
      </div>
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

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-6 py-12 text-center">
      <span className="inline-flex rounded-md bg-fuchsia-300/10 px-3 py-1 text-xs font-semibold text-fuchsia-100">
        Tarefas
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-200">Nenhuma tarefa recebida.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Quando o professor enviar uma atividade para sua turma, ela aparecera aqui.
      </p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-BR')
}
