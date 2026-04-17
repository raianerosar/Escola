import { createClient } from '@/lib/supabase/server'
import { PlannerDayColumn } from './planner-day-column'
import type { Slot } from './planner-card'

type HorarioRow = {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  turmas: {
    nome: string
    cursos: { nome: string } | null
  } | null
}

async function getHorarios(): Promise<Map<number, Slot[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Map()

  // Step 1: get the professor's turma IDs
  const { data: turmasData } = await supabase
    .from('turmas')
    .select('id')
    .eq('professor_id', user.id)

  const turmaIds = (turmasData ?? []).map((t) => t.id)
  if (turmaIds.length === 0) return new Map()

  // Step 2: fetch horarios for those turmas, with curso name
  const { data } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, turmas!turma_id(nome, cursos!curso_id(nome))')
    .in('turma_id', turmaIds)
    .order('hora_inicio', { ascending: true })

  const rows = (data ?? []) as unknown as HorarioRow[]

  const grouped = new Map<number, Slot[]>()
  for (let i = 0; i <= 6; i++) grouped.set(i, [])

  for (const row of rows) {
    if (!row.turmas) continue
    const slot: Slot = {
      id: row.id,
      turma: row.turmas.nome,
      curso: row.turmas.cursos?.nome ?? '—',
      horaInicio: row.hora_inicio,
      horaFim: row.hora_fim,
    }
    grouped.get(row.dia_semana)!.push(slot)
  }

  return grouped
}

export async function PlannerBlock() {
  const grouped = await getHorarios()

  const totalSlots = Array.from(grouped.values()).reduce((sum, s) => sum + s.length, 0)

  const todayDia = new Date().getDay() // 0=Dom, 6=Sáb

  if (totalSlots === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-zinc-50 text-lg font-semibold mb-4">Grade Semanal</h2>
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-zinc-700 text-4xl block mb-2">
            calendar_today
          </span>
          <p className="text-zinc-500 text-sm">Nenhuma aula agendada ainda.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h2 className="text-zinc-50 text-lg font-semibold mb-4">Grade Semanal</h2>
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
    </div>
  )
}
