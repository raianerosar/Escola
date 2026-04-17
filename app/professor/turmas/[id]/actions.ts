'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function matricularAluno(turmaId: string, formData: FormData) {
  const alunoId = formData.get('alunoId') as string
  if (!alunoId || !turmaId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase.from('matriculas').upsert(
    { aluno_id: alunoId, turma_id: turmaId, status: 'ativo' },
    { onConflict: 'aluno_id,turma_id' },
  )

  revalidatePath(`/professor/turmas/${turmaId}`)
}

export async function concluirMatricula(formData: FormData) {
  const matriculaId = formData.get('matriculaId') as string
  const turmaId = formData.get('turmaId') as string
  if (!matriculaId || !turmaId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase
    .from('matriculas')
    .update({ status: 'concluido' })
    .eq('id', matriculaId)
    .eq('turma_id', turmaId)

  revalidatePath(`/professor/turmas/${turmaId}`)
}

export async function updateTurmaNome(turmaId: string, nome: string) {
  if (!nome.trim()) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('turmas')
    .update({ nome: nome.trim() })
    .eq('id', turmaId)
    .eq('professor_id', user.id)

  revalidatePath(`/professor/turmas/${turmaId}`)
  revalidatePath('/professor/turmas')
}

export async function removerAluno(matriculaId: string, turmaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase
    .from('matriculas')
    .update({ status: 'cancelado' })
    .eq('id', matriculaId)
    .eq('turma_id', turmaId)

  revalidatePath(`/professor/turmas/${turmaId}`)
}
