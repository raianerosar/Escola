'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Aluno = { id: string; nome: string; email: string }

export function StudentSearch({
  results,
  addAction,
}: {
  results: Aluno[]
  addAction: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
    const params = new URLSearchParams(searchParams.toString())
    if (q) params.set('q', q)
    else params.delete('q')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h2 className="text-zinc-50 text-sm font-semibold mb-4">Adicionar Aluno</h2>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          name="q"
          defaultValue={searchParams.get('q') ?? ''}
          placeholder="Buscar por nome ou email"
          className="flex-1 bg-zinc-950 text-zinc-50 rounded-md px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-zinc-800 text-zinc-300 hover:text-zinc-50 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((aluno) => (
            <li
              key={aluno.id}
              className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-2.5"
            >
              <div>
                <p className="text-zinc-200 text-sm">{aluno.nome}</p>
                <p className="text-zinc-500 text-xs">{aluno.email}</p>
              </div>
              <form action={addAction}>
                <input type="hidden" name="alunoId" value={aluno.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Matricular
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {searchParams.get('q') && results.length === 0 && (
        <p className="text-zinc-500 text-sm text-center">Nenhum aluno encontrado.</p>
      )}
    </div>
  )
}
