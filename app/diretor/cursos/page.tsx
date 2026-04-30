import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type CursoRow = {
  id: string
  nome: string
  descricao: string | null
  carga_horaria: number | null
  ativo: boolean | null
  criado_em: string | null
}

async function getCursos() {
  const supabase = await createClient()
  const [cursosResult, turmasResult, certificadosResult] = await Promise.all([
    supabase.from('cursos').select('*').order('ativo', { ascending: false }).order('nome'),
    supabase.from('turmas').select('curso_id, ativo'),
    supabase.from('certificados').select('curso_id'),
  ])

  const metricas = new Map<string, { turmas: number; turmasAtivas: number; certificados: number }>()

  for (const turma of turmasResult.data ?? []) {
    if (!turma.curso_id) continue
    const atual = metricas.get(turma.curso_id) ?? { turmas: 0, turmasAtivas: 0, certificados: 0 }
    atual.turmas += 1
    if (turma.ativo) atual.turmasAtivas += 1
    metricas.set(turma.curso_id, atual)
  }

  for (const certificado of certificadosResult.data ?? []) {
    if (!certificado.curso_id) continue
    const atual = metricas.get(certificado.curso_id) ?? { turmas: 0, turmasAtivas: 0, certificados: 0 }
    atual.certificados += 1
    metricas.set(certificado.curso_id, atual)
  }

  return ((cursosResult.data ?? []) as CursoRow[]).map((curso) => ({
    ...curso,
    ...(metricas.get(curso.id) ?? { turmas: 0, turmasAtivas: 0, certificados: 0 }),
  }))
}

export default async function CursosPage() {
  const cursos = await getCursos()
  const ativos = cursos.filter((curso) => curso.ativo).length
  const horas = cursos.reduce((total, curso) => total + (curso.carga_horaria ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Header title="Cursos" description="Portfolio academico, carga horaria, oferta de turmas e emissao de certificados por curso." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric href="/diretor/cursos" label="Cursos ativos" value={ativos} icon="local_library" tone="text-fuchsia-300" />
        <Metric href="/diretor/cursos" label="Carga total" value={`${horas}h`} icon="schedule" tone="text-fuchsia-300" />
        <Metric href="/diretor/turmas" label="Inativos" value={cursos.length - ativos} icon="visibility_off" tone="text-zinc-300" />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {cursos.map((curso) => (
          <Link key={curso.id} href="/diretor/turmas" className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-400/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-zinc-50">{curso.nome}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                  {curso.descricao ?? 'Sem descricao cadastrada.'}
                </p>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${curso.ativo ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                {curso.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini label="Horas" value={`${curso.carga_horaria ?? 0}h`} />
              <Mini label="Turmas" value={curso.turmas} />
              <Mini label="Ativas" value={curso.turmasAtivas} />
              <Mini label="Certificados" value={curso.certificados} />
            </div>
          </Link>
        ))}
        {cursos.length === 0 && <Empty text="Nenhum curso cadastrado." />}
      </section>
    </div>
  )
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-fuchsia-200">Grade e oferta</p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-50">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  )
}

function Metric({ href, label, value, icon, tone }: { href: string; label: string; value: number | string; icon: string; tone: string }) {
  return (
    <Link href={href} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-400/5">
      <span className={`material-symbols-outlined text-[24px] ${tone}`}>{icon}</span>
      <p className={`mt-4 text-3xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </Link>
  )
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-zinc-950 p-3">
      <p className="text-lg font-bold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-sm text-zinc-500 xl:col-span-2">{text}</div>
}
