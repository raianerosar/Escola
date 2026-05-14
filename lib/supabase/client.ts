import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_CONNECTION_ERROR = 'Supabase request failed'

const safeSupabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch {
    return Response.json(
      {
        code: 'supabase_unreachable',
        error: SUPABASE_CONNECTION_ERROR,
        message: SUPABASE_CONNECTION_ERROR,
      },
      { status: 400 }
    )
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: safeSupabaseFetch,
      },
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        skipAutoInitialize: true,
      } as never,
    }
  )
}
