export function resolveRedirect(
  pathname: string,
  userId: string | null,
  perfil: string | null
): string | null {
  if (!userId && pathname !== '/login') return '/login'

  if (userId) {
    if (pathname === '/' || pathname === '/login') {
      if (perfil === 'diretor') return '/diretor/dashboard'
    }

    if (pathname.startsWith('/diretor') && perfil !== 'diretor') {
      return '/login'
    }
  }

  return null
}
