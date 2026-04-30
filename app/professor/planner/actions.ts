'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PLANNER_PATH = '/professor/planner'

export async function createPlannerItem(formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const tipo = String(formData.get('tipo') ?? 'outro')
  const prioridade = String(formData.get('prioridade') ?? 'media')
  const turmaId = String(formData.get('turmaId') ?? '')
  const dataPlanejada = String(formData.get('dataPlanejada') ?? '')

  if (!titulo) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('professor_planner').insert({
    professor_id: user.id,
    turma_id: turmaId || null,
    titulo,
    descricao: descricao || null,
    tipo,
    prioridade,
    data_planejada: dataPlanejada || null,
  })

  revalidatePath(PLANNER_PATH)
  revalidatePath('/professor/dashboard')
}

export async function togglePlannerItem(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const concluido = String(formData.get('concluido') ?? '') === 'true'

  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('professor_planner')
    .update({ concluido })
    .eq('id', id)
    .eq('professor_id', user.id)

  revalidatePath(PLANNER_PATH)
}

export async function deletePlannerItem(formData: FormData) {
  const id = String(formData.get('id') ?? '')

  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('professor_planner')
    .delete()
    .eq('id', id)
    .eq('professor_id', user.id)

  revalidatePath(PLANNER_PATH)
}
