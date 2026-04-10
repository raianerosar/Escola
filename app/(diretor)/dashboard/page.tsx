import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()
  const [alunos, turmas, cursos, certificados] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('perfil', 'aluno'),
    supabase
      .from('turmas')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true),
    supabase
      .from('cursos')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true),
    supabase.from('certificados').select('id', { count: 'exact', head: true }),
  ])
  return {
    alunos: alunos.count ?? 0,
    turmas: turmas.count ?? 0,
    cursos: cursos.count ?? 0,
    certificados: certificados.count ?? 0,
  }
}

async function getRecentMatriculas() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matriculas')
    .select(
      `
      criado_em,
      profiles!aluno_id (nome),
      turmas!turma_id (nome, cursos!curso_id (nome))
    `
    )
    .order('criado_em', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function DashboardPage() {
  const [stats, matriculas] = await Promise.all([
    getStats(),
    getRecentMatriculas(),
  ])

  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Visão Geral</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Alunos" value={stats.alunos} color="text-blue-400" />
        <StatCard
          label="Turmas ativas"
          value={stats.turmas}
          color="text-green-400"
        />
        <StatCard
          label="Cursos ativos"
          value={stats.cursos}
          color="text-yellow-400"
        />
        <StatCard
          label="Certificados"
          value={stats.certificados}
          color="text-purple-400"
        />
      </div>

      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-zinc-50 text-sm font-semibold">
            Matrículas Recentes
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">
                Aluno
              </th>
              <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">
                Curso
              </th>
              <th className="text-left px-6 py-3 text-zinc-500 text-xs font-medium">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {(matriculas as MatriculaRow[]).map((m, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="px-6 py-3 text-zinc-300 text-sm">
                  {m.profiles?.nome ?? '—'}
                </td>
                <td className="px-6 py-3 text-zinc-400 text-sm">
                  {m.turmas?.cursos?.nome ?? '—'}
                </td>
                <td className="px-6 py-3 text-zinc-500 text-xs">
                  {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
            {matriculas.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-zinc-500 text-sm text-center"
                >
                  Nenhuma matrícula ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5">
      <p className={`${color} text-2xl font-bold mb-1`}>{value}</p>
      <p className="text-zinc-500 text-sm">{label}</p>
    </div>
  )
}

type MatriculaRow = {
  criado_em: string
  profiles: { nome: string } | null
  turmas: { nome: string; cursos: { nome: string } | null } | null
}
