'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ALUNO_TAREFAS_PATH = '/aluno/tarefas'

export async function entregarTarefa(formData: FormData) {
  const tarefaId = String(formData.get('tarefaId') ?? '').trim()
  const resposta = String(formData.get('resposta') ?? '').trim()

  if (!tarefaId || !resposta) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: tarefa } = await supabase
    .from('professor_tarefas')
    .select('id, turma_id')
    .eq('id', tarefaId)
    .eq('ativo', true)
    .single()

  if (!tarefa) return

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id')
    .eq('turma_id', tarefa.turma_id)
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')
    .single()

  if (!matricula) return

  await supabase.from('aluno_tarefa_respostas').upsert(
    {
      tarefa_id: tarefaId,
      aluno_id: user.id,
      resposta,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'tarefa_id,aluno_id' }
  )

  revalidatePath(ALUNO_TAREFAS_PATH)
  revalidatePath('/professor/tarefas')
}
