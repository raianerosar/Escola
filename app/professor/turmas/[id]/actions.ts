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

  const { data: turma } = await supabase
    .from('turmas')
    .select('id, curso_id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) return

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id, aluno_id')
    .eq('id', matriculaId)
    .eq('turma_id', turmaId)
    .single()

  if (!matricula?.aluno_id) return

  await supabase
    .from('matriculas')
    .update({ status: 'concluido' })
    .eq('id', matriculaId)
    .eq('turma_id', turmaId)

  if (turma.curso_id) {
    const { data: certificadoExistente } = await supabase
      .from('certificados')
      .select('id')
      .eq('aluno_id', matricula.aluno_id)
      .eq('curso_id', turma.curso_id)
      .maybeSingle()

    if (!certificadoExistente) {
      await supabase.from('certificados').insert({
        aluno_id: matricula.aluno_id,
        curso_id: turma.curso_id,
      })
    }
  }

  revalidatePath(`/professor/turmas/${turmaId}`)
  revalidatePath('/professor/dashboard')
  revalidatePath('/professor/planner')
  revalidatePath('/diretor/dashboard')
  revalidatePath('/diretor/certificados')
  revalidatePath(`/diretor/alunos/${matricula.aluno_id}`)
  revalidatePath('/aluno/dashboard')
  revalidatePath('/aluno/certificados')
}
