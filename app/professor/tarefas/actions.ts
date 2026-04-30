'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const PROFESSOR_TAREFAS_PATH = '/professor/tarefas'
const ALUNO_TAREFAS_PATH = '/aluno/tarefas'

export async function publicarTarefa(formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const turmaId = String(formData.get('turmaId') ?? '').trim()
  const dataEntrega = String(formData.get('dataEntrega') ?? '').trim()

  if (!titulo || !turmaId) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Preencha turma e titulo para enviar a tarefa.')}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Sessao expirada. Entre novamente para enviar tarefas.')}`)
  }

  const { data: turma } = await supabase
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Turma nao encontrada para este professor.')}`)
  }

  const { error } = await supabase.from('professor_tarefas').insert({
    professor_id: user.id,
    turma_id: turmaId,
    titulo,
    descricao: descricao || null,
    data_entrega: dataEntrega || null,
  })

  if (error) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent(`Nao foi possivel enviar: ${error.message}`)}`)
  }

  revalidatePath(PROFESSOR_TAREFAS_PATH)
  revalidatePath(ALUNO_TAREFAS_PATH)
  revalidatePath('/professor/dashboard')
  revalidatePath('/aluno/dashboard')
  redirect(`${PROFESSOR_TAREFAS_PATH}?ok=${encodeURIComponent('Tarefa enviada para os alunos.')}`)
}

export async function alterarStatusTarefa(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  const ativo = String(formData.get('ativo') ?? '') === 'true'

  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase
    .from('professor_tarefas')
    .update({ ativo })
    .eq('id', id)
    .eq('professor_id', user.id)

  if (error) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent(`Nao foi possivel atualizar: ${error.message}`)}`)
  }

  revalidatePath(PROFESSOR_TAREFAS_PATH)
  revalidatePath(ALUNO_TAREFAS_PATH)
  redirect(PROFESSOR_TAREFAS_PATH)
}
