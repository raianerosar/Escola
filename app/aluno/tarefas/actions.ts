'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALUNO_TAREFAS_PATH = '/aluno/tarefas'
const PROFESSOR_TAREFAS_PATH = '/professor/tarefas'
const SUBMISSIONS_BUCKET = 'tarefas-entregas'
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export async function entregarTarefa(formData: FormData) {
  const tarefaId = String(formData.get('tarefaId') ?? '').trim()
  const resposta = String(formData.get('resposta') ?? '').trim()
  const anexos = getAttachmentFiles(formData)

  if (!tarefaId || (!resposta && anexos.length === 0)) return

  const anexoError = validateAttachments(anexos)
  if (anexoError) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const admin = createAdminClient()

  const { data: tarefa } = await admin
    .from('professor_tarefas')
    .select('id, turma_id')
    .eq('id', tarefaId)
    .eq('ativo', true)
    .single()

  if (!tarefa) return

  const { data: matricula } = await admin
    .from('matriculas')
    .select('id')
    .eq('turma_id', tarefa.turma_id)
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')
    .single()

  if (!matricula) return

  const { data: entrega } = await admin
    .from('aluno_tarefa_respostas')
    .upsert(
      {
        tarefa_id: tarefaId,
        aluno_id: user.id,
        resposta: resposta || 'Arquivo enviado sem observacao.',
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'tarefa_id,aluno_id' }
    )
    .select('id')
    .single()

  if (!entrega) return

  if (anexos.length > 0) {
    const uploadedPaths: string[] = []
    const rows = []

    for (const anexo of anexos) {
      const caminho = `${user.id}/${tarefaId}/${entrega.id}/${crypto.randomUUID()}-${sanitizeFileName(anexo.name)}`
      const { error: uploadError } = await admin.storage
        .from(SUBMISSIONS_BUCKET)
        .upload(caminho, anexo, {
          contentType: anexo.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        await cleanupUploadedFiles(admin, uploadedPaths)
        return
      }

      uploadedPaths.push(caminho)
      rows.push({
        resposta_id: entrega.id,
        tarefa_id: tarefaId,
        aluno_id: user.id,
        bucket_id: SUBMISSIONS_BUCKET,
        caminho,
        nome: anexo.name,
        mime_type: anexo.type || null,
        tamanho: anexo.size,
      })
    }

    const { error: anexosError } = await admin.from('aluno_tarefa_resposta_anexos').insert(rows)

    if (anexosError) {
      await cleanupUploadedFiles(admin, uploadedPaths)
      return
    }
  }

  revalidatePath(ALUNO_TAREFAS_PATH)
  revalidatePath(PROFESSOR_TAREFAS_PATH)
}

function getAttachmentFiles(formData: FormData) {
  return formData
    .getAll('anexos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
}

function validateAttachments(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) return `Envie no maximo ${MAX_ATTACHMENTS} anexos por entrega.`

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) return `O arquivo ${file.name} passa de 10 MB.`
  }

  return null
}

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)

  return sanitized || 'anexo'
}

async function cleanupUploadedFiles(
  admin: ReturnType<typeof createAdminClient>,
  paths: string[]
) {
  if (paths.length > 0) {
    await admin.storage.from(SUBMISSIONS_BUCKET).remove(paths)
  }
}
