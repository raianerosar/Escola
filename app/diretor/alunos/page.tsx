import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type AlunoRow = {
  id: string
  nome: string
  email: string
  criado_em: string | null
}

async function getAlunos() {
  const supabase = await createClient()
  const [alunosResult, matriculasResult, certificadosResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, criado_em')
      .eq('perfil', 'aluno')
      .order('nome', { ascending: true }),
    supabase.from('matriculas').select('aluno_id, status'),
    supabase.from('certificados').select('aluno_id'),
  ])

  const metricas = new Map<string, { matriculas: number; concluidas: number; certificados: number }>()

  for (const matricula of matriculasResult.data ?? []) {
    if (!matricula.aluno_id) continue
    const atual = metricas.get(matricula.aluno_id) ?? { matriculas: 0, concluidas: 0, certificados: 0 }
    atual.matriculas += 1
    if (matricula.status === 'concluido') atual.concluidas += 1
    metricas.set(matricula.aluno_id, atual)
  }

  for (const certificado of certificadosResult.data ?? []) {
    if (!certificado.aluno_id) continue
    const atual = metricas.get(certificado.aluno_id) ?? { matriculas: 0, concluidas: 0, certificados: 0 }
    atual.certificados += 1
    metricas.set(certificado.aluno_id, atual)
  }

  return ((alunosResult.data ?? []) as AlunoRow[]).map((aluno) => ({
    ...aluno,
    ...(metricas.get(aluno.id) ?? { matriculas: 0, concluidas: 0, certificados: 0 }),
  }))
}

export default async function AlunosPage() {
  const alunos = await getAlunos()
  const ativos = alunos.filter((aluno) => aluno.matriculas > 0).length
  const semVinculo = alunos.length - ativos

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Secretaria academica"
        title="Alunos"
        description="Controle rapido de estudantes, vinculos com turmas, conclusoes e certificados emitidos."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric href="/diretor/alunos" label="Cadastrados" value={alunos.length} icon="school" tone="text-fuchsia-300" />
        <Metric href="/diretor/turmas" label="Com matricula" value={ativos} icon="how_to_reg" tone="text-emerald-300" />
        <Metric href="/diretor/alunos" label="Sem turma" value={semVinculo} icon="person_alert" tone="text-fuchsia-300" />
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40">
                <Th>Aluno</Th>
                <Th>Matriculas</Th>
                <Th>Concluidas</Th>
                <Th>Certificados</Th>
                <Th>Cadastro</Th>
                <Th>Status</Th>
                <Th>Acao</Th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-b border-zinc-800/60 transition-colors hover:bg-fuchsia-400/5">
                  <td className="px-5 py-4">
                    <Link href={`/diretor/alunos/${aluno.id}`} className="group inline-flex flex-col">
                      <span className="font-medium text-zinc-100 group-hover:text-fuchsia-100">{aluno.nome}</span>
                      <span className="mt-1 text-xs text-zinc-500 group-hover:text-fuchsia-300">{aluno.email}</span>
                    </Link>
                  </td>
                  <Td>{aluno.matriculas}</Td>
                  <Td>{aluno.concluidas}</Td>
                  <Td>{aluno.certificados}</Td>
                  <Td>{formatDate(aluno.criado_em)}</Td>
                  <td className="px-5 py-4">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${aluno.matriculas > 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-fuchsia-400/10 text-fuchsia-300'}`}>
                      {aluno.matriculas > 0 ? 'Vinculado' : 'Sem turma'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/diretor/alunos/${aluno.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-200 hover:text-fuchsia-100">
                      Abrir
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {alunos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Nenhum aluno cadastrado.
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

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-fuchsia-200">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-50">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  )
}

function Metric({
  href,
  label,
  value,
  icon,
  tone,
}: {
  href: string
  label: string
  value: number
  icon: string
  tone: string
}) {
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
