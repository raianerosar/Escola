import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function getTurmas() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('turmas')
    .select('id, nome, ativo, data_inicio, data_fim, cursos!curso_id(nome)')
    .eq('professor_id', user.id)
    .order('ativo', { ascending: false })

  return data ?? []
}

export default async function TurmasPage() {
  const turmas = await getTurmas()

  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Minhas Turmas</h1>

      {turmas.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-zinc-500 text-sm text-center">
          Nenhuma turma atribuída a você ainda.
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Turma</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Curso</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Início</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Fim</th>
                <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(turmas as TurmaRow[]).map((turma) => (
                <tr key={turma.id} className="border-b border-zinc-800/50">
                  <td className="px-6 py-3 text-zinc-300 text-sm font-medium">{turma.nome}</td>
                  <td className="px-6 py-3 text-zinc-400 text-sm">{turma.cursos?.nome ?? '—'}</td>
                  <td className="px-6 py-3 text-zinc-500 text-xs">
                    {turma.data_inicio
                      ? new Date(turma.data_inicio).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs">
                    {turma.data_fim
                      ? new Date(turma.data_fim).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        turma.ativo
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {turma.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/professor/turmas/${turma.id}`}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                      Ver alunos →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type TurmaRow = {
  id: string
  nome: string
  ativo: boolean | null
  data_inicio: string | null
  data_fim: string | null
  cursos: { nome: string } | null
}
