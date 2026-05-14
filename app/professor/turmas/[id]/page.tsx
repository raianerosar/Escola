import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { matricularAluno, concluirMatricula } from './actions'
import { StudentSearch } from './student-search'
import { EditNomeButton } from './edit-nome-button'
import { RemoverAlunoButton } from './remover-aluno-button'

async function getTurmaData(turmaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: turma } = await supabase
    .from('turmas')
    .select('id, nome, ativo, data_inicio, data_fim, cursos!curso_id(nome)')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return null

  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id, status, profiles!aluno_id(id, nome, email)')
    .eq('turma_id', turmaId)
    .neq('status', 'cancelado')
    .order('status')

  return { turma: turma as unknown as TurmaDetail, matriculas: matriculas ?? [] }
}

async function searchAlunos(turmaId: string, q: string) {
  const supabase = await createClient()

  const { data: enrolled } = await supabase
    .from('matriculas')
    .select('aluno_id')
    .eq('turma_id', turmaId)
    .neq('status', 'cancelado')

  const enrolledIds = (enrolled ?? []).map((m) => m.aluno_id)

  let query = supabase
    .from('profiles')
    .select('id, nome, email')
    .eq('perfil', 'aluno')
    .or(`nome.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10)

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }

  const { data } = await query
  return data ?? []
}

export default async function TurmaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { id } = await params
  const { q } = await searchParams

  const result = await getTurmaData(id)
  if (!result) redirect('/professor/turmas')

  const { turma, matriculas } = result
  const searchResults = q ? await searchAlunos(id, q) : []
  const rows = matriculas as unknown as MatriculaRow[]
  const concluidos = rows.filter((m) => m.status === 'concluido').length

  const addAction = matricularAluno.bind(null, id)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="page-hero mb-6 p-5">
        <Link href="/professor/turmas" className="inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-200 transition-colors hover:text-fuchsia-100">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Voltar para turmas
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-fuchsia-100/75">{turma.cursos?.nome ?? 'Curso'}</p>
            <EditNomeButton turmaId={id} nomeAtual={turma.nome} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-64">
            <Summary label="Alunos" value={rows.length} />
            <Summary label="Concluidos" value={concluidos} />
          </div>
        </div>
      </header>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl px-5 py-4">
          <p className="text-zinc-500 text-xs mb-1">Curso</p>
          <p className="text-zinc-100 text-sm font-medium">{turma.cursos?.nome ?? '—'}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl px-5 py-4">
          <p className="text-zinc-500 text-xs mb-1">Início</p>
          <p className="text-zinc-100 text-sm font-medium">
            {turma.data_inicio
              ? new Date(turma.data_inicio).toLocaleDateString('pt-BR')
              : '—'}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl px-5 py-4">
          <p className="text-zinc-500 text-xs mb-1">Fim</p>
          <p className="text-zinc-100 text-sm font-medium">
            {turma.data_fim
              ? new Date(turma.data_fim).toLocaleDateString('pt-BR')
              : '—'}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl px-5 py-4">
          <p className="text-zinc-500 text-xs mb-1">Status</p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              turma.ativo
                ? 'bg-green-900/40 text-green-400'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {turma.ativo ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-50">Alunos matriculados</h2>
              <p className="mt-1 text-xs text-zinc-500">Controle de status desta turma</p>
            </div>
            <span className="material-symbols-outlined text-[22px] text-fuchsia-200/70">fact_check</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/35">
                  <Th>Nome</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-fuchsia-400/5">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-200">
                      {m.profiles?.nome ?? 'Sem nome'}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {m.profiles?.email ?? 'Sem email'}
                    </td>
                    <td className="px-6 py-4">
                      <MatriculaBadge status={m.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {m.status === 'ativo' && (
                        <div className="flex items-center justify-end">
                          <form action={concluirMatricula}>
                            <input type="hidden" name="matriculaId" value={m.id} />
                            <input type="hidden" name="turmaId" value={id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-md bg-fuchsia-300 px-3 py-1.5 text-xs font-semibold text-[#21002f] transition-colors hover:bg-fuchsia-200"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              Concluir
                            </button>
                          </form>
                          <RemoverAlunoButton matriculaId={m.id} turmaId={id} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500">
                      Nenhum aluno matriculado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <StudentSearch results={searchResults} addAction={addAction} />
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-fuchsia-100/60">{children}</th>
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <p className="text-2xl font-black text-fuchsia-100">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function MatriculaBadge({ status }: { status: string }) {
  const className =
    status === 'concluido'
      ? 'bg-fuchsia-400/10 text-fuchsia-200'
      : 'bg-emerald-400/10 text-emerald-200'

  return <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>{status === 'concluido' ? 'Concluido' : 'Ativo'}</span>
}

type TurmaDetail = {
  id: string
  nome: string
  ativo: boolean | null
  data_inicio: string | null
  data_fim: string | null
  cursos: { nome: string } | null
}

type MatriculaRow = {
  id: string
  status: string
  profiles: { id: string; nome: string; email: string } | null
}
