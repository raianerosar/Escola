'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function isDiretor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, allowed: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single()

  return { supabase, allowed: profile?.perfil === 'diretor' }
}

export async function formarAluno(formData: FormData) {
  const alunoId = String(formData.get('alunoId') ?? '')
  const matriculaId = String(formData.get('matriculaId') ?? '')

  if (!alunoId || !matriculaId) return

  const { supabase, allowed } = await isDiretor()
  if (!allowed) return

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id, status, turma_id, turmas!turma_id(curso_id)')
    .eq('id', matriculaId)
    .eq('aluno_id', alunoId)
    .single()

  if (!matricula) return

  await supabase
    .from('matriculas')
    .update({ status: 'concluido' })
    .eq('id', matriculaId)
    .eq('aluno_id', alunoId)

  const turmaRelation = matricula.turmas as unknown as
    | { curso_id: string | null }
    | { curso_id: string | null }[]
    | null
  const turma = Array.isArray(turmaRelation) ? turmaRelation[0] : turmaRelation
  const cursoId = turma?.curso_id

  if (cursoId) {
    const { data: certificadoExistente } = await supabase
      .from('certificados')
      .select('id')
      .eq('aluno_id', alunoId)
      .eq('curso_id', cursoId)
      .maybeSingle()

    if (!certificadoExistente) {
      await supabase.from('certificados').insert({
        aluno_id: alunoId,
        curso_id: cursoId,
      })
    }
  }

  revalidatePath(`/diretor/alunos/${alunoId}`)
  revalidatePath('/diretor/alunos')
  revalidatePath('/diretor/dashboard')
  revalidatePath('/diretor/certificados')
}
