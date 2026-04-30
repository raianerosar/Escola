import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type TurmaRow = {
  id: string
  nome: string
  ativo: boolean | null
  data_inicio: string | null
  data_fim: string | null
  cursos: { nome: string } | null
  profiles: { nome: string } | null
}

async function getTurmas() {
  const supabase = await createClient()
  const [turmasResult, matriculasResult] = await Promise.all([
    supabase
      .from('turmas')
      .select('id, nome, ativo, data_inicio, data_fim, cursos!curso_id(nome), profiles!professor_id(nome)')
      .order('ativo', { ascending: false })
      .order('data_inicio', { ascending: false, nullsFirst: false }),
    supabase.from('matriculas').select('turma_id, status'),
  ])

  const metricas = new Map<string, { matriculas: number; concluidas: number; canceladas: number }>()

  for (const matricula of matriculasResult.data ?? []) {
    if (!matricula.turma_id) continue
    const atual = metricas.get(matricula.turma_id) ?? { matriculas: 0, concluidas: 0, canceladas: 0 }
    atual.matriculas += 1
    if (matricula.status === 'concluido') atual.concluidas += 1
    if (matricula.status === 'cancelado') atual.canceladas += 1
    metricas.set(matricula.turma_id, atual)
  }

  return ((turmasResult.data ?? []) as unknown as TurmaRow[]).map((turma) => ({
    ...turma,
    ...(metricas.get(turma.id) ?? { matriculas: 0, concluidas: 0, canceladas: 0 }),
  }))
}

export default async function TurmasPage() {
  const turmas = await getTurmas()
  const ativas = turmas.filter((turma) => turma.ativo).length
  const semProfessor = turmas.filter((turma) => !turma.profiles?.nome).length
  const alunos = turmas.reduce((total, turma) => total + turma.matriculas, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-fuchsia-200">Operacao academica</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-50">Turmas</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Acompanhe turmas ativas, professores responsaveis, alunos vinculados e conclusoes.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric href="/diretor/turmas" label="Ativas" value={ativas} icon="groups" tone="text-emerald-300" />
        <Metric href="/diretor/alunos" label="Alunos em turmas" value={alunos} icon="school" tone="text-fuchsia-300" />
        <Metric href="/diretor/professores" label="Sem professor" value={semProfessor} icon="person_off" tone="text-fuchsia-300" />
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40">
                <Th>Turma</Th>
                <Th>Curso</Th>
                <Th>Professor</Th>
                <Th>Periodo</Th>
                <Th>Alunos</Th>
                <Th>Concluidas</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {turmas.map((turma) => (
                <tr key={turma.id} className="border-b border-zinc-800/60 transition-colors hover:bg-fuchsia-400/5">
                  <td className="px-5 py-4 font-medium text-zinc-100">{turma.nome}</td>
                  <Td>{turma.cursos?.nome ?? 'Curso nao informado'}</Td>
                  <Td>{turma.profiles?.nome ?? 'Nao atribuido'}</Td>
                  <Td>{formatDate(turma.data_inicio)} - {formatDate(turma.data_fim)}</Td>
                  <Td>{turma.matriculas}</Td>
                  <Td>{turma.concluidas}</Td>
                  <td className="px-5 py-4">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${turma.ativo ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                      {turma.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                </tr>
              ))}
              {turmas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Nenhuma turma cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ href, label, value, icon, tone }: { href: string; label: string; value: number; icon: string; tone: string }) {
  return (
    <Link href={href} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-400/5">
      <span className={`material-symbols-outlined text-[24px] ${tone}`}>{icon}</span>
      <p className={`mt-4 text-3xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </Link>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-4 text-sm text-zinc-300">{children}</td>
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
