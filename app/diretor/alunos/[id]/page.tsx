import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formarAluno } from './actions'

type AlunoDetail = {
  id: string
  nome: string
  email: string
  criado_em: string | null
}

type MatriculaRow = {
  id: string
  status: string
  criado_em: string | null
  turmas: {
    id: string
    nome: string
    data_inicio: string | null
    data_fim: string | null
    cursos: { id: string; nome: string; carga_horaria: number | null } | null
    profiles: { nome: string } | null
  } | null
}

type CertificadoRow = {
  id: string
  codigo_verificacao: string
  data_emissao: string | null
  url_pdf: string | null
  cursos: { nome: string } | null
}

async function getAlunoData(alunoId: string) {
  const supabase = await createClient()
  const [alunoResult, matriculasResult, certificadosResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, criado_em')
      .eq('id', alunoId)
      .eq('perfil', 'aluno')
      .single(),
    supabase
      .from('matriculas')
      .select(
        `
        id,
        status,
        criado_em,
        turmas!turma_id (
          id,
          nome,
          data_inicio,
          data_fim,
          cursos!curso_id (id, nome, carga_horaria),
          profiles!professor_id (nome)
        )
      `
      )
      .eq('aluno_id', alunoId)
      .order('criado_em', { ascending: false }),
    supabase
      .from('certificados')
      .select('id, codigo_verificacao, data_emissao, url_pdf, cursos!curso_id(nome)')
      .eq('aluno_id', alunoId)
      .order('data_emissao', { ascending: false, nullsFirst: false }),
  ])

  if (!alunoResult.data) return null

  return {
    aluno: alunoResult.data as AlunoDetail,
    matriculas: (matriculasResult.data ?? []) as unknown as MatriculaRow[],
    certificados: (certificadosResult.data ?? []) as unknown as CertificadoRow[],
  }
}

export default async function AlunoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAlunoData(id)

  if (!data) redirect('/diretor/alunos')

  const { aluno, matriculas, certificados } = data
  const concluidas = matriculas.filter((matricula) => matricula.status === 'concluido').length
  const horas = matriculas.reduce(
    (total, matricula) => total + (matricula.turmas?.cursos?.carga_horaria ?? 0),
    0
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5">
        <Link href="/diretor/alunos" className="inline-flex items-center gap-2 text-sm font-medium text-fuchsia-200 hover:text-fuchsia-100">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar para alunos
        </Link>
      </div>

      <section className="page-hero mb-6 p-6 sm:p-7">
        <p className="text-sm font-semibold text-fuchsia-200">Ficha do aluno</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-50">{aluno.nome}</h1>
            <p className="mt-2 text-sm text-zinc-300">{aluno.email}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Mini label="Matriculas" value={matriculas.length} />
            <Mini label="Concluidas" value={concluidas} />
            <Mini label="Certificados" value={certificados.length} />
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Horas vinculadas" value={`${horas}h`} icon="schedule" tone="text-fuchsia-300" />
        <Metric label="Cadastro" value={formatDate(aluno.criado_em)} icon="person_add" tone="text-fuchsia-300" />
        <Metric label="Situacao" value={matriculas.length > 0 ? 'Matriculado' : 'Sem turma'} icon="how_to_reg" tone="text-emerald-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <PanelHeader title="Turmas e formacao" subtitle="Clique em formar para concluir e gerar certificado" icon="school" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  <Th>Turma</Th>
                  <Th>Curso</Th>
                  <Th>Professor</Th>
                  <Th>Status</Th>
                  <Th>Acao</Th>
                </tr>
              </thead>
              <tbody>
                {matriculas.map((matricula) => (
                  <tr key={matricula.id} className="border-b border-zinc-800/60">
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-100">{matricula.turmas?.nome ?? 'Turma sem nome'}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(matricula.turmas?.data_inicio ?? null)} - {formatDate(matricula.turmas?.data_fim ?? null)}
                      </p>
                    </td>
                    <Td>{matricula.turmas?.cursos?.nome ?? 'Curso nao informado'}</Td>
                    <Td>{matricula.turmas?.profiles?.nome ?? 'Nao atribuido'}</Td>
                    <td className="px-5 py-4">
                      <StatusBadge status={matricula.status} />
                    </td>
                    <td className="px-5 py-4">
                      {matricula.status === 'concluido' ? (
                        <span className="text-xs font-medium text-zinc-500">Ja formado</span>
                      ) : (
                        <form action={formarAluno}>
                          <input type="hidden" name="alunoId" value={aluno.id} />
                          <input type="hidden" name="matriculaId" value={matricula.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-400/20 hover:text-fuchsia-100"
                          >
                            <span className="material-symbols-outlined text-[17px]">workspace_premium</span>
                            Formar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {matriculas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Este aluno ainda nao possui matriculas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900">
          <PanelHeader title="Certificados" subtitle="Documentos emitidos para este aluno" icon="workspace_premium" />
          <div className="divide-y divide-zinc-800">
            {certificados.map((certificado) => (
              <div key={certificado.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{certificado.cursos?.nome ?? 'Curso nao informado'}</p>
                    <p className="mt-1 text-xs text-zinc-500">{formatDate(certificado.data_emissao)}</p>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${certificado.url_pdf ? 'bg-emerald-400/10 text-emerald-300' : 'bg-fuchsia-400/10 text-fuchsia-300'}`}>
                    {certificado.url_pdf ? 'PDF' : 'Sem PDF'}
                  </span>
                </div>
                <code className="mt-3 inline-block rounded-md bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
                  {shortCode(certificado.codigo_verificacao)}
                </code>
              </div>
            ))}
            {certificados.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                Nenhum certificado emitido ainda.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-32 rounded-lg border border-white/10 bg-black/25 px-4 py-3">
      <p className="text-2xl font-bold text-zinc-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function Metric({ label, value, icon, tone }: { label: string; value: number | string; icon: string; tone: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <span className={`material-symbols-outlined text-[24px] ${tone}`}>{icon}</span>
      <p className={`mt-4 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  )
}

function PanelHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <span className="material-symbols-outlined text-[22px] text-fuchsia-300">{icon}</span>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-4 text-sm text-zinc-300">{children}</td>
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'concluido'
      ? 'bg-emerald-400/10 text-emerald-300'
      : status === 'cancelado'
        ? 'bg-red-400/10 text-red-300'
        : 'bg-fuchsia-400/10 text-fuchsia-300'
  const label = status === 'concluido' ? 'Concluido' : status === 'cancelado' ? 'Cancelado' : 'Ativo'

  return <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>
}

function shortCode(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
