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
  const addAction = matricularAluno.bind(null, id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-zinc-500 text-sm mb-1">{turma.cursos?.nome ?? 'Curso'}</p>
        <EditNomeButton turmaId={id} nomeAtual={turma.nome} />
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-zinc-50 text-sm font-semibold">Alunos Matriculados</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {(matriculas as unknown as MatriculaRow[]).map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800/50">
                    <td className="px-6 py-3 text-zinc-300 text-sm">
                      {m.profiles?.nome ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 text-xs">
                      {m.profiles?.email ?? '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.status === 'concluido'
                            ? 'bg-purple-900/40 text-purple-400'
                            : 'bg-green-900/40 text-green-400'
                        }`}
                      >
                        {m.status === 'concluido' ? 'Concluído' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {m.status === 'ativo' && (
                        <div className="flex items-center justify-end">
                          <form action={concluirMatricula}>
                            <input type="hidden" name="matriculaId" value={m.id} />
                            <input type="hidden" name="turmaId" value={id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
                            >
                              Concluir
                            </button>
                          </form>
                          <RemoverAlunoButton matriculaId={m.id} turmaId={id} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {matriculas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-zinc-500 text-sm text-center">
                      Nenhum aluno matriculado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <StudentSearch results={searchResults} addAction={addAction} />
        </div>
      </div>
    </div>
  )
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
