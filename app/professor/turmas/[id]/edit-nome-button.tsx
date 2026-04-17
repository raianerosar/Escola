'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateTurmaNome } from './actions'

export function EditNomeButton({ turmaId, nomeAtual }: { turmaId: string; nomeAtual: string }) {
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(nomeAtual)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!nome.trim() || nome.trim() === nomeAtual) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      await updateTurmaNome(turmaId, nome.trim())
      setEditing(false)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setNome(nomeAtual)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={nome}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-zinc-800 border-zinc-700 text-zinc-50 text-2xl font-semibold h-auto py-1 px-2 w-72"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? '...' : 'Salvar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setNome(nomeAtual); setEditing(false) }}
          className="text-zinc-500 hover:text-zinc-300"
        >
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-zinc-50 text-2xl font-semibold">{nomeAtual}</h1>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
        aria-label="Editar nome da turma"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    </div>
  )
}
