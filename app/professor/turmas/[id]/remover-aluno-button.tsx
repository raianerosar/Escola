'use client'

import { useTransition } from 'react'
import { removerAluno } from './actions'

export function RemoverAlunoButton({ matriculaId, turmaId }: { matriculaId: string; turmaId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await removerAluno(matriculaId, turmaId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 ml-3"
      aria-label="Remover aluno da turma"
    >
      {isPending ? '...' : 'Remover'}
    </button>
  )
}
