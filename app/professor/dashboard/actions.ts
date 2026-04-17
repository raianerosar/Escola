'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getOwnedTurma(
  supabase: Awaited<ReturnType<typeof createClient>>,
  turmaId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', userId)
    .single()
  return data
}

export async function createHorario(
  turmaId: string,
  dia: number,
  horaInicio: string,
  horaFim: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const turma = await getOwnedTurma(supabase, turmaId, user.id)
  if (!turma) return

  await supabase.from('horarios').insert({
    turma_id: turmaId,
    dia_semana: dia,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
  })

  revalidatePath('/professor/dashboard')
}

export async function updateHorario(
  horarioId: string,
  turmaId: string,
  dia: number,
  horaInicio: string,
  horaFim: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const turma = await getOwnedTurma(supabase, turmaId, user.id)
  if (!turma) return

  await supabase
    .from('horarios')
    .update({ dia_semana: dia, hora_inicio: horaInicio, hora_fim: horaFim })
    .eq('id', horarioId)

  revalidatePath('/professor/dashboard')
}

export async function deleteHorario(horarioId: string, turmaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const turma = await getOwnedTurma(supabase, turmaId, user.id)
  if (!turma) return

  await supabase.from('horarios').delete().eq('id', horarioId)

  revalidatePath('/professor/dashboard')
}
