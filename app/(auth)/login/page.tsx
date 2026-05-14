'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SUPABASE_CONNECTION_ERROR = 'Supabase request failed'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    let perfil: string | undefined

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message === SUPABASE_CONNECTION_ERROR) {
          setError('Nao foi possivel conectar ao Supabase. Verifique a URL do projeto e sua conexao.')
          setLoading(false)
          return
        }

        setError('Credenciais inválidas')
        setLoading(false)
        return
      }

      perfil = data.user?.user_metadata?.perfil
    } catch {
      setError('Nao foi possivel conectar ao Supabase. Verifique a URL do projeto e sua conexao.')
      setLoading(false)
      return
    }

    const dest =
      perfil === 'aluno'
        ? '/aluno/dashboard'
        : perfil === 'professor'
          ? '/professor/dashboard'
          : '/diretor/dashboard'
    router.push(dest)
  }

  return (
    <div className="app-bg flex min-h-screen items-center justify-center p-4">
      <div className="surface-card w-full max-w-sm p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <div className="brand-mark mb-6">
          <span className="material-symbols-outlined text-[25px]">school</span>
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-fuchsia-200">
          Escola Habilidade
        </p>
        <h1 className="mb-6 text-xl font-semibold text-zinc-50">
          Bem-vindo de volta
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="input mb-3"
          />
          <div className="relative mb-4">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              required
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-fuchsia-100"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.95 9.95 0 015.185 1.447M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v.01M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-md bg-fuchsia-300 py-2.5 text-sm font-semibold text-[#21002f] transition-colors hover:bg-fuchsia-200 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
