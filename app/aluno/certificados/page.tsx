import { createClient } from '@/lib/supabase/server'

type CertificadoRow = {
  id: string
  codigo_verificacao: string
  data_emissao: string | null
  url_pdf: string | null
  cursos: {
    nome: string
    carga_horaria: number | null
  } | null
}

async function getMeusCertificados() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('certificados')
    .select(
      `
      id,
      codigo_verificacao,
      data_emissao,
      url_pdf,
      cursos!curso_id (
        nome,
        carga_horaria
      )
    `
    )
    .eq('aluno_id', user.id)
    .order('data_emissao', { ascending: false, nullsFirst: false })

  return (data ?? []) as unknown as CertificadoRow[]
}

export default async function MeusCertificadosPage() {
  const certificados = await getMeusCertificados()
  const comPdf = certificados.filter((certificado) => Boolean(certificado.url_pdf)).length
  const cargaHoraria = certificados.reduce(
    (total, certificado) => total + (certificado.cursos?.carga_horaria ?? 0),
    0
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6 p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-fuchsia-200">Area do aluno</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50">Meus Certificados</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Consulte seus certificados emitidos, codigos de verificacao e arquivos disponiveis.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Emitidos" value={certificados.length} />
            <Summary label="Com PDF" value={comPdf} />
            <Summary label="Horas" value={cargaHoraria} />
          </div>
        </div>
      </section>

      {certificados.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-50">Certificados emitidos</h2>
            <p className="mt-1 text-xs text-zinc-500">Ordenados pela emissao mais recente</p>
          </div>
          <div className="grid gap-0 divide-y divide-zinc-800">
            {certificados.map((certificado) => (
              <CertificadoCard key={certificado.id} certificado={certificado} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function CertificadoCard({ certificado }: { certificado: CertificadoRow }) {
  return (
    <article className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-50">
            {certificado.cursos?.nome ?? 'Curso nao informado'}
          </h2>
          <span className={certificado.url_pdf ? 'status-success' : 'status-accent'}>
            {certificado.url_pdf ? 'Disponivel' : 'Emitido'}
          </span>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
          <Info icon="event_available" label="Emissao" value={formatDate(certificado.data_emissao)} />
          <Info icon="timer" label="Carga" value={`${certificado.cursos?.carga_horaria ?? 0}h`} />
          <div className="min-w-0">
            <p className="text-xs text-zinc-600">Codigo</p>
            <code className="mt-1 block truncate rounded-md bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
              {certificado.codigo_verificacao}
            </code>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:justify-end">
        {certificado.url_pdf ? (
          <a
            href={certificado.url_pdf}
            target="_blank"
            rel="noreferrer"
            className="action-link"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            Abrir PDF
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500">
            <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
            PDF pendente
          </span>
        )}
      </div>
    </article>
  )
}

function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-fuchsia-200/70">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-600">{label}</p>
        <p className="truncate text-sm text-zinc-300">{value}</p>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-3">
      <p className="text-2xl font-black text-fuchsia-100">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-6 py-12 text-center">
      <span className="material-symbols-outlined text-[34px] text-fuchsia-200/70">workspace_premium</span>
      <p className="mt-3 text-sm font-medium text-zinc-200">Nenhum certificado emitido.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Certificados liberados para sua conta aparecerao nesta area.
      </p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
