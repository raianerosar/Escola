export function resolveRedirect(
  pathname: string,
  userId: string | null,
  perfil: string | null,
): string | null {
  const publicRoutes = ['/login']

  if (!userId) {
    return publicRoutes.includes(pathname) ? null : '/login'
  }

  function homeDashboard(): string {
    if (perfil === 'aluno') return '/aluno/dashboard'
    if (perfil === 'professor') return '/professor/dashboard'
    return '/diretor/dashboard'
  }

  if (pathname === '/login' || pathname === '/') {
    return homeDashboard()
  }

  if (pathname.startsWith('/diretor/') && perfil !== 'diretor') {
    return homeDashboard()
  }

  if (pathname.startsWith('/aluno/') && perfil !== 'aluno') {
    return homeDashboard()
  }

  if (pathname.startsWith('/professor/') && perfil !== 'professor') {
    return homeDashboard()
  }

  return null
}
