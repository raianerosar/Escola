import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type CertificadoRow = {
  id: string
  codigo_verificacao: string
  data_emissao: string | null
  url_pdf: string | null
  profiles: { id: string; nome: string; email: string } | null
  cursos: { nome: string } | null
}

async function getCertificados() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('certificados')
    .select(
      `
      id,
      codigo_verificacao,
      data_emissao,
      url_pdf,
      profiles!aluno_id (id, nome, email),
      cursos!curso_id (nome)
    `
    )
    .order('data_emissao', { ascending: false, nullsFirst: false })

  return (data ?? []) as unknown as CertificadoRow[]
}

export default async function CertificadosPage() {
  const certificados = await getCertificados()
  const comPdf = certificados.filter((certificado) => Boolean(certificado.url_pdf)).length
  const cursos = new Set(certificados.map((certificado) => certificado.cursos?.nome).filter(Boolean)).size

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-fuchsia-200">Documentacao academica</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-50">Certificados</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Controle de certificados emitidos, codigos de verificacao e documentos disponiveis.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric href="/diretor/certificados" label="Emitidos" value={certificados.length} icon="workspace_premium" tone="text-fuchsia-300" />
        <Metric href="/diretor/certificados" label="Com PDF" value={comPdf} icon="picture_as_pdf" tone="text-emerald-300" />
        <Metric href="/diretor/cursos" label="Cursos certificados" value={cursos} icon="verified" tone="text-fuchsia-300" />
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40">
                <Th>Aluno</Th>
                <Th>Curso</Th>
                <Th>Emissao</Th>
                <Th>Codigo</Th>
                <Th>Arquivo</Th>
              </tr>
            </thead>
            <tbody>
              {certificados.map((certificado) => (
                <tr key={certificado.id} className="border-b border-zinc-800/60 transition-colors hover:bg-fuchsia-400/5">
                  <td className="px-5 py-4">
                    {certificado.profiles?.id ? (
                      <Link href={`/diretor/alunos/${certificado.profiles.id}`} className="group inline-flex flex-col">
                        <span className="font-medium text-zinc-100 group-hover:text-fuchsia-100">{certificado.profiles.nome}</span>
                        <span className="mt-1 text-xs text-zinc-500 group-hover:text-fuchsia-300">{certificado.profiles.email}</span>
                      </Link>
                    ) : (
                      <>
                        <p className="font-medium text-zinc-100">Aluno sem nome</p>
                        <p className="mt-1 text-xs text-zinc-500">Email nao informado</p>
                      </>
                    )}
                  </td>
                  <Td>{certificado.cursos?.nome ?? 'Curso nao informado'}</Td>
                  <Td>{formatDate(certificado.data_emissao)}</Td>
                  <td className="px-5 py-4">
                    <code className="rounded-md bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
                      {shortCode(certificado.codigo_verificacao)}
                    </code>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${certificado.url_pdf ? 'bg-emerald-400/10 text-emerald-300' : 'bg-fuchsia-400/10 text-fuchsia-300'}`}>
                      {certificado.url_pdf ? 'Disponivel' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
              {certificados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Nenhum certificado emitido.
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

function shortCode(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
