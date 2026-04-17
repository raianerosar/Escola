import { createClient } from '@/lib/supabase/server'
import { PlannerDayColumn } from './planner-day-column'
import { AddHorarioDialog, type TurmaOption } from './add-horario-dialog'
import type { Slot } from './planner-card'

type HorarioRow = {
  id: string
  turma_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  turmas: {
    nome: string
    cursos: { nome: string } | null
  } | null
}

async function getData(): Promise<{ grouped: Map<number, Slot[]>; turmas: TurmaOption[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { grouped: new Map(), turmas: [] }

  const { data: turmasData } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('professor_id', user.id)
    .eq('ativo', true)

  const turmas: TurmaOption[] = (turmasData ?? []).map((t) => ({ id: t.id, nome: t.nome }))
  const turmaIds = turmas.map((t) => t.id)

  if (turmaIds.length === 0) return { grouped: new Map(), turmas }

  const { data } = await supabase
    .from('horarios')
    .select('id, turma_id, dia_semana, hora_inicio, hora_fim, turmas!turma_id(nome, cursos!curso_id(nome))')
    .in('turma_id', turmaIds)
    .order('hora_inicio', { ascending: true })

  const rows = (data ?? []) as unknown as HorarioRow[]

  const grouped = new Map<number, Slot[]>()
  for (let i = 0; i <= 6; i++) grouped.set(i, [])

  for (const row of rows) {
    if (!row.turmas) continue
    const slot: Slot = {
      id: row.id,
      turmaId: row.turma_id,
      dia: row.dia_semana,
      turma: row.turmas.nome,
      curso: row.turmas.cursos?.nome ?? '—',
      horaInicio: row.hora_inicio,
      horaFim: row.hora_fim,
    }
    grouped.get(row.dia_semana)!.push(slot)
  }

  return { grouped, turmas }
}

export async function PlannerBlock() {
  const { grouped, turmas } = await getData()

  const totalSlots = Array.from(grouped.values()).reduce((sum, s) => sum + s.length, 0)
  const todayDia = new Date().getDay()

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-zinc-50 text-lg font-semibold">Grade Semanal</h2>
        {turmas.length > 0 && <AddHorarioDialog turmas={turmas} />}
      </div>

      {totalSlots === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-zinc-700 text-4xl block mb-2">
            calendar_today
          </span>
          <p className="text-zinc-500 text-sm">Nenhuma aula agendada ainda.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {Array.from({ length: 7 }, (_, i) => (
              <PlannerDayColumn
                key={i}
                dia={i}
                slots={grouped.get(i)!}
                isToday={i === todayDia}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
