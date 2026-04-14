import { resolveRedirect } from '@/lib/auth/resolve-redirect'

describe('resolveRedirect', () => {
  // --- unauthenticated ---
  it('redirects unauthenticated user from protected route to login', () => {
    expect(resolveRedirect('/diretor/dashboard', null, null)).toBe('/login')
  })

  it('allows unauthenticated user on login page', () => {
    expect(resolveRedirect('/login', null, null)).toBeNull()
  })

  // --- diretor ---
  it('redirects diretor from login to /diretor/dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('redirects logged-in diretor from root to /diretor/dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('allows diretor to access their own routes', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'diretor')).toBeNull()
  })

  it('blocks non-director from director routes', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'aluno')).toBe('/login')
  })

  // --- aluno ---
  it('redirects aluno from login to /aluno/dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  it('redirects logged-in aluno from root to /aluno/dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  it('allows aluno to access their own routes', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'aluno')).toBeNull()
  })

  it('redirects non-aluno from aluno routes to /diretor/dashboard', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('blocks unauthenticated user from aluno routes', () => {
    expect(resolveRedirect('/aluno/dashboard', null, null)).toBe('/login')
  })
})
