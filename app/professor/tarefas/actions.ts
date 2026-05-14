'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const PROFESSOR_TAREFAS_PATH = '/professor/tarefas'
const ALUNO_TAREFAS_PATH = '/aluno/tarefas'
const ATTACHMENTS_BUCKET = 'tarefas-anexos'
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export async function publicarTarefa(formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const turmaId = String(formData.get('turmaId') ?? '').trim()
  const dataEntrega = String(formData.get('dataEntrega') ?? '').trim()
  const anexos = getAttachmentFiles(formData)

  if (!titulo || !turmaId) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Preencha turma e titulo para enviar a tarefa.')}`)
  }

  const anexoError = validateAttachments(anexos)
  if (anexoError) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent(anexoError)}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Sessao expirada. Entre novamente para enviar tarefas.')}`)
  }

  const admin = createAdminClient()

  const { data: turma } = await admin
    .from('turmas')
    .select('id')
    .eq('id', turmaId)
    .eq('professor_id', user.id)
    .single()

  if (!turma) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Turma nao encontrada para este professor.')}`)
  }

  const { data: tarefa, error } = await admin
    .from('professor_tarefas')
    .insert({
      professor_id: user.id,
      turma_id: turmaId,
      titulo,
      descricao: descricao || null,
      data_entrega: dataEntrega || null,
    })
    .select('id')
    .single()

  if (error) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent(`Nao foi possivel enviar: ${error.message}`)}`)
  }

  if (!tarefa) {
    redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent('Nao foi possivel identificar a tarefa criada.')}`)
  }

  if (anexos.length > 0) {
    const uploadedPaths: string[] = []
    const rows = []

    for (const anexo of anexos) {
      const caminho = `${user.id}/${tarefa.id}/${crypto.randomUUID()}-${sanitizeFileName(anexo.name)}`
      const { error: uploadError } = await admin.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(caminho, anexo, {
          contentType: anexo.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        await cleanupFailedTask(admin, tarefa.id, uploadedPaths)
        redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent(`Nao foi possivel anexar arquivo: ${uploadError.message}`)}`)
      }

      uploadedPaths.push(caminho)
      rows.push({
        tarefa_id: tarefa.id,
        professor_id: user.id,
        bucket_id: ATTACHMENTS_BUCKET,
        caminho,
        nome: anexo.name,
        mime_type: anexo.type || null,
        tamanho: anexo.size,
      })
    }

    const { error: anexosError } = await admin.from('professor_tarefa_anexos').insert(rows)

    if (anexosError) {
      await cleanupFailedTask(admin, tarefa.id, uploadedPaths)
      redirect(`${PROFESSOR_TAREFAS_PATH}?erro=${encodeURIComponent(`Nao foi possivel salvar anexos: ${anexosError.message}`)}`)
    }
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

  const admin = createAdminClient()

  const { error } = await admin
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

function getAttachmentFiles(formData: FormData) {
  return formData
    .getAll('anexos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
}

function validateAttachments(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    return `Envie no maximo ${MAX_ATTACHMENTS} anexos por tarefa.`
  }

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return `O arquivo ${file.name} passa de 10 MB.`
    }
  }

  return null
}

function sanitizeFileName(fileName: string) {
  const fallback = 'anexo'
  const sanitized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)

  return sanitized || fallback
}

async function cleanupFailedTask(
  admin: ReturnType<typeof createAdminClient>,
  tarefaId: string,
  paths: string[]
) {
  if (paths.length > 0) {
    await admin.storage.from(ATTACHMENTS_BUCKET).remove(paths)
  }

  await admin.from('professor_tarefas').delete().eq('id', tarefaId)
}
