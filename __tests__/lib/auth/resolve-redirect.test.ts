import { resolveRedirect } from '@/lib/auth/resolve-redirect'

describe('resolveRedirect', () => {
  it('redirects unauthenticated user from protected route to login', () => {
    expect(resolveRedirect('/diretor/dashboard', null, null)).toBe('/login')
  })

  it('allows unauthenticated user on login page', () => {
    expect(resolveRedirect('/login', null, null)).toBeNull()
  })

  it('redirects diretor from login to dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('redirects logged-in diretor from root to dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('allows diretor to access their own routes', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'diretor')).toBeNull()
  })

  it('blocks non-director from director routes', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'aluno')).toBe('/login')
  })
})
