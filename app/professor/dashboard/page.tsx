import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { turmas: 0, alunos: 0, concluidos: 0 }

  const { data: turmasData } = await supabase
    .from('turmas')
    .select('id')
    .eq('professor_id', user.id)

  const turmaIds = (turmasData ?? []).map((t) => t.id)

  if (turmaIds.length === 0) return { turmas: 0, alunos: 0, concluidos: 0 }

  const [alunosResult, concluidosResult] = await Promise.all([
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .in('turma_id', turmaIds),
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .in('turma_id', turmaIds)
      .eq('status', 'concluido'),
  ])

  return {
    turmas: turmaIds.length,
    alunos: alunosResult.count ?? 0,
    concluidos: concluidosResult.count ?? 0,
  }
}

export default async function ProfessorDashboardPage() {
  const stats = await getStats()

  return (
    <div className="p-8">
      <h1 className="text-zinc-50 text-2xl font-semibold mb-6">Meu Painel</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Minhas Turmas" value={stats.turmas} color="text-blue-400" />
        <StatCard label="Total de Alunos" value={stats.alunos} color="text-green-400" />
        <StatCard label="Concluídos" value={stats.concluidos} color="text-purple-400" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5">
      <p className={`${color} text-2xl font-bold mb-1`}>{value}</p>
      <p className="text-zinc-500 text-sm">{label}</p>
    </div>
  )
}
