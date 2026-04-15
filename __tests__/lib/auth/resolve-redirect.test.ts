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

  it('redirects non-director from director routes to own dashboard', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'aluno')).toBe('/aluno/dashboard')
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

  it('redirects non-aluno from aluno routes to own dashboard', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('blocks unauthenticated user from aluno routes', () => {
    expect(resolveRedirect('/aluno/dashboard', null, null)).toBe('/login')
  })

  // --- professor ---
  it('redirects professor from login to /professor/dashboard', () => {
    expect(resolveRedirect('/login', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('redirects logged-in professor from root to /professor/dashboard', () => {
    expect(resolveRedirect('/', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('allows professor to access their own routes', () => {
    expect(resolveRedirect('/professor/dashboard', 'user-id', 'professor')).toBeNull()
  })

  it('redirects professor from aluno routes to /professor/dashboard', () => {
    expect(resolveRedirect('/aluno/dashboard', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('redirects professor from diretor routes to /professor/dashboard', () => {
    expect(resolveRedirect('/diretor/dashboard', 'user-id', 'professor')).toBe('/professor/dashboard')
  })

  it('redirects aluno from professor routes to /aluno/dashboard', () => {
    expect(resolveRedirect('/professor/turmas', 'user-id', 'aluno')).toBe('/aluno/dashboard')
  })

  it('redirects diretor from professor routes to /diretor/dashboard', () => {
    expect(resolveRedirect('/professor/turmas', 'user-id', 'diretor')).toBe('/diretor/dashboard')
  })

  it('blocks unauthenticated user from professor routes', () => {
    expect(resolveRedirect('/professor/dashboard', null, null)).toBe('/login')
  })
})
