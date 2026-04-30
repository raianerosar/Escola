import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type MatriculaRow = {
  criado_em: string | null
  status: string
  profiles: { id: string; nome: string } | null
  turmas: { nome: string; cursos: { nome: string } | null } | null
}

type TurmaRow = {
  id: string
  nome: string
  data_fim: string | null
  cursos: { nome: string } | null
  profiles: { nome: string } | null
}

type CertificadoRow = {
  id: string
  data_emissao: string | null
  profiles: { id: string; nome: string } | null
  cursos: { nome: string } | null
}

async function getDashboardData() {
  const supabase = await createClient()
  const [
    alunos,
    professores,
    turmas,
    cursos,
    certificados,
    concluidas,
    recentes,
    turmasAtivas,
    formacoesRecentes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('perfil', 'aluno'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('perfil', 'professor'),
    supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('certificados').select('id', { count: 'exact', head: true }),
    supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'concluido'),
    supabase
      .from('matriculas')
      .select(
        `
        criado_em,
        status,
        profiles!aluno_id (id, nome),
        turmas!turma_id (nome, cursos!curso_id (nome))
      `
      )
      .order('criado_em', { ascending: false })
      .limit(8),
    supabase
      .from('turmas')
      .select('id, nome, data_fim, cursos!curso_id(nome), profiles!professor_id(nome)')
      .eq('ativo', true)
      .order('data_fim', { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from('certificados')
      .select('id, data_emissao, profiles!aluno_id(id, nome), cursos!curso_id(nome)')
      .order('data_emissao', { ascending: false })
      .limit(5),
  ])

  return {
    stats: {
      alunos: alunos.count ?? 0,
      professores: professores.count ?? 0,
      turmas: turmas.count ?? 0,
      cursos: cursos.count ?? 0,
      certificados: certificados.count ?? 0,
      concluidas: concluidas.count ?? 0,
    },
    recentes: (recentes.data ?? []) as unknown as MatriculaRow[],
    turmasAtivas: (turmasAtivas.data ?? []) as unknown as TurmaRow[],
    formacoesRecentes: (formacoesRecentes.data ?? []) as unknown as CertificadoRow[],
  }
}

export default async function DashboardPage() {
  const { stats, recentes, turmasAtivas, formacoesRecentes } = await getDashboardData()
  const emissaoPorAluno =
    stats.alunos > 0 ? Math.round((stats.certificados / stats.alunos) * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="page-hero mb-6">
        <div className="flex flex-col gap-6 p-6 sm:p-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-fuchsia-200">Painel da diretoria</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-50 sm:text-4xl">
              Visao executiva da escola
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Acompanhe matriculas, turmas, professores, certificados e pontos que pedem
              atencao antes de virarem problema operacional.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniPanel href="/diretor/cursos" label="Cursos ativos" value={stats.cursos} icon="local_library" />
            <MiniPanel href="/diretor/certificados" label="Certificados por aluno" value={`${emissaoPorAluno}%`} icon="verified" />
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/diretor/alunos" icon="school" label="Alunos" value={stats.alunos} helper="Perfis de estudante cadastrados" />
        <StatCard href="/diretor/professores" icon="badge" label="Professores" value={stats.professores} helper="Equipe docente com acesso" />
        <StatCard href="/diretor/turmas" icon="groups" label="Turmas ativas" value={stats.turmas} helper="Salas em andamento" />
        <StatCard href="/diretor/certificados" icon="workspace_premium" label="Certificados" value={stats.certificados} helper={`${stats.concluidas} matriculas concluidas`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card">
          <PanelHeader title="Movimento recente" subtitle="Ultimas matriculas registradas" icon="timeline" />
          <div className="divide-y divide-zinc-800">
            {recentes.map((matricula, index) => (
              <div key={`${matricula.criado_em}-${index}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {matricula.profiles?.id ? (
                    <Link href={`/diretor/alunos/${matricula.profiles.id}`} className="font-medium text-zinc-100 hover:text-fuchsia-100">
                      {matricula.profiles.nome}
                    </Link>
                  ) : (
                    <p className="font-medium text-zinc-100">Aluno sem nome</p>
                  )}
                  <p className="mt-1 text-sm text-zinc-500">
                    {matricula.turmas?.cursos?.nome ?? 'Curso nao informado'} / {matricula.turmas?.nome ?? 'Turma sem nome'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={matricula.status} />
                  <span className="text-xs text-zinc-500">{formatDate(matricula.criado_em)}</span>
                </div>
              </div>
            ))}
            {recentes.length === 0 && <EmptyState text="Nenhuma matricula registrada ainda." />}
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface-card">
            <PanelHeader title="Formacoes recentes" subtitle="Alunos concluidos e certificados" icon="workspace_premium" />
            <div className="divide-y divide-zinc-800">
              {formacoesRecentes.map((certificado) => (
                <div key={certificado.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    {certificado.profiles?.id ? (
                      <Link href={`/diretor/alunos/${certificado.profiles.id}`} className="font-medium text-zinc-100 hover:text-fuchsia-100">
                        {certificado.profiles.nome}
                      </Link>
                    ) : (
                      <p className="font-medium text-zinc-100">Aluno sem nome</p>
                    )}
                    <p className="mt-1 text-sm text-zinc-500">{certificado.cursos?.nome ?? 'Curso nao informado'}</p>
                  </div>
                  <span className="status-success">{formatDate(certificado.data_emissao)}</span>
                </div>
              ))}
              {formacoesRecentes.length === 0 && <EmptyState text="Nenhuma formacao registrada ainda." />}
            </div>
          </section>

          <section className="surface-card">
          <PanelHeader title="Turmas em acompanhamento" subtitle="Prazos e responsaveis" icon="event_note" />
          <div className="divide-y divide-zinc-800">
            {turmasAtivas.map((turma) => (
              <div key={turma.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{turma.nome}</p>
                    <p className="mt-1 text-sm text-zinc-500">{turma.cursos?.nome ?? 'Curso nao informado'}</p>
                  </div>
                  <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                    {formatDate(turma.data_fim)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">
                  Professor: <span className="text-zinc-200">{turma.profiles?.nome ?? 'Nao atribuido'}</span>
                </p>
              </div>
            ))}
            {turmasAtivas.length === 0 && <EmptyState text="Nenhuma turma ativa encontrada." />}
          </div>
          <div className="border-t border-zinc-800 px-5 py-4">
            <Link href="/diretor/turmas" className="inline-flex items-center gap-2 text-sm font-medium text-fuchsia-200 hover:text-fuchsia-100">
              Ver todas as turmas
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  href,
  icon,
  label,
  value,
  helper,
}: {
  href: string
  icon: string
  label: string
  value: number
  helper: string
}) {
  return (
    <Link href={href} className="surface-card-hover p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="material-symbols-outlined accent-icon">{icon}</span>
        <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-500">Diretoria</span>
      </div>
      <p className="text-3xl font-bold text-fuchsia-100">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-xs leading-5 text-zinc-600">{helper}</p>
    </Link>
  )
}

function MiniPanel({ href, label, value, icon }: { href: string; label: string; value: number | string; icon: string }) {
  return (
    <Link href={href} className="min-w-48 rounded-lg border border-white/10 bg-black/25 px-5 py-4 transition-colors hover:border-fuchsia-300/50 hover:bg-fuchsia-400/10">
      <span className="material-symbols-outlined text-[22px] text-fuchsia-200">{icon}</span>
      <p className="mt-3 text-3xl font-black text-zinc-50">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-400">{label}</p>
    </Link>
  )
}

function PanelHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <span className="material-symbols-outlined text-[22px] text-zinc-500">{icon}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'concluido'
      ? 'status-success'
      : status === 'cancelado'
        ? 'bg-red-400/10 text-red-300'
        : 'status-accent'

  return <span className={className}>{status}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-10 text-center text-sm text-zinc-500">{text}</div>
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleDateString('pt-BR')
}
