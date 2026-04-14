export function resolveRedirect(
  pathname: string,
  userId: string | null,
  perfil: string | null,
): string | null {
  const publicRoutes = ['/login']

  if (!userId) {
    return publicRoutes.includes(pathname) ? null : '/login'
  }

  if (pathname === '/login' || pathname === '/') {
    return perfil === 'aluno' ? '/aluno/dashboard' : '/diretor/dashboard'
  }

  if (pathname.startsWith('/diretor/') && perfil !== 'diretor') {
    return '/login'
  }

  if (pathname.startsWith('/aluno/') && perfil !== 'aluno') {
    return '/diretor/dashboard'
  }

  return null
}
