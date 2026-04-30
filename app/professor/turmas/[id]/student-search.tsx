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
    <aside className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-50">Adicionar aluno</h2>
          <p className="mt-1 text-xs text-zinc-500">Busque por nome ou email</p>
        </div>
        <span className="material-symbols-outlined text-[22px] text-fuchsia-200/70">person_add</span>
      </div>

      <form onSubmit={handleSearch} className="mb-4 space-y-2">
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-500">
            search
          </span>
          <input
            name="q"
            defaultValue={searchParams.get('q') ?? ''}
            placeholder="Nome ou email"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-fuchsia-300/60 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-fuchsia-300 px-4 py-2.5 text-sm font-semibold text-[#21002f] transition-colors hover:bg-fuchsia-200 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          Buscar
        </button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((aluno) => (
            <li
              key={aluno.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/45 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-200">{aluno.nome}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{aluno.email}</p>
              </div>
              <form action={addAction} className="mt-3">
                <input type="hidden" name="alunoId" value={aluno.id} />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-fuchsia-300/25 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition-colors hover:bg-fuchsia-300/10"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Matricular
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {searchParams.get('q') && results.length === 0 && (
        <div className="rounded-lg border border-dashed border-fuchsia-300/15 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">Nenhum aluno encontrado.</p>
        </div>
      )}
    </aside>
  )
}
