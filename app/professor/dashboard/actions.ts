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

export async function getAulaNota(
  horarioId: string,
  data: string,
): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const { data: aula } = await supabase
    .from('aulas')
    .select('notas')
    .eq('horario_id', horarioId)
    .eq('data', data)
    .single()

  return aula?.notas ?? ''
}

export async function upsertAulaNota(
  horarioId: string,
  data: string,
  notas: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('aulas').upsert(
    { horario_id: horarioId, data, notas },
    { onConflict: 'horario_id,data' },
  )
}

export type AlunoInfo = {
  id: string
  nome: string
  status: string
}

export async function getAlunosDaTurma(turmaId: string): Promise<AlunoInfo[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('matriculas')
    .select('status, profiles!aluno_id(id, nome)')
    .eq('turma_id', turmaId)
    .neq('status', 'cancelado')
    .order('status')

  type Row = { status: string; profiles: { id: string; nome: string } | null }
  return ((data ?? []) as unknown as Row[])
    .filter((m) => m.profiles)
    .map((m) => ({ id: m.profiles!.id, nome: m.profiles!.nome, status: m.status }))
}
