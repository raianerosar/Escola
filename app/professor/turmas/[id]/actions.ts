'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function matricularAluno(turmaId: string, formData: FormData) {
  const alunoId = formData.get('alunoId') as string
  if (!alunoId || !turmaId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Verify professor owns this turma
  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  await supabase.from('matriculas').insert({
    aluno_id: alunoId,
    turma_id: turmaId,
    status: 'ativo',
  })

  revalidatePath(`/professor/turmas/${turmaId}`)
}

export async function concluirMatricula(formData: FormData) {
  const matriculaId = formData.get('matriculaId') as string
  const turmaId = formData.get('turmaId') as string
  if (!matriculaId || !turmaId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Verify professor owns the turma this matricula belongs to
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
