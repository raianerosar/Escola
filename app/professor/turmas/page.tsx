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
  const ativas = (turmas as unknown as TurmaRow[]).filter((turma) => turma.ativo).length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-fuchsia-200">Minhas turmas</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-50">Salas sob sua orientacao</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Consulte cursos, periodos e alunos vinculados a cada turma.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-64">
          <Summary label="Total" value={turmas.length} />
          <Summary label="Ativas" value={ativas} />
        </div>
      </header>

      {turmas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-6 py-12 text-center">
          <span className="material-symbols-outlined text-[32px] text-fuchsia-200/70">groups</span>
          <p className="mt-3 text-sm text-zinc-400">Nenhuma turma atribuida a voce ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/35">
                  <Th>Turma</Th>
                  <Th>Curso</Th>
                  <Th>Inicio</Th>
                  <Th>Fim</Th>
                  <Th>Status</Th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(turmas as unknown as TurmaRow[]).map((turma) => (
                  <tr key={turma.id} className="transition-colors hover:bg-fuchsia-400/5">
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-100">{turma.nome}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{turma.cursos?.nome ?? 'Sem curso'}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(turma.data_inicio)}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(turma.data_fim)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge active={Boolean(turma.ativo)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/professor/turmas/${turma.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-200 transition-colors hover:text-fuchsia-100"
                      >
                        Ver alunos
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

function StatusBadge({ active }: { active: boolean }) {
  const className = active ? 'bg-emerald-400/10 text-emerald-200' : 'bg-zinc-800 text-zinc-400'
  return <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>{active ? 'Ativa' : 'Inativa'}</span>
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}

type TurmaRow = {
  id: string
  nome: string
  ativo: boolean | null
  data_inicio: string | null
  data_fim: string | null
  cursos: { nome: string } | null
}
