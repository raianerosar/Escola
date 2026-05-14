import { lookup } from 'node:dns/promises'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type SupabaseAuthClient = Pick<SupabaseClient, 'auth'>

let lastReachabilityCheck = 0
let isReachable = false

async function canReachSupabaseHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) return false

  const now = Date.now()
  if (now - lastReachabilityCheck < 30_000) {
    return isReachable
  }

  lastReachabilityCheck = now

  try {
    await lookup(new URL(url).hostname)
    isReachable = true
  } catch {
    isReachable = false
  }

  return isReachable
}

export async function getUserOrNull(
  supabase: SupabaseAuthClient
): Promise<User | null> {
  if (!(await canReachSupabaseHost())) {
    return null
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) return null

    return user
  } catch {
    return null
  }
}
