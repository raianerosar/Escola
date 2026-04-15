import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

const mockSignInWithPassword = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset()
    mockPush.mockReset()
    mockRefresh.mockReset()
  })

  it('renders email and password fields with submit button', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('shows inline error on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'x@x.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciais inválidas')
    })
  })

  it('redirects to /diretor/dashboard on diretor login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { user_metadata: { perfil: 'diretor' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'admin@admin.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/diretor/dashboard')
    })
  })

  it('redirects to /aluno/dashboard on aluno login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { user_metadata: { perfil: 'aluno' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'aluno@aluno.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/aluno/dashboard')
    })
  })

  it('redirects to /professor/dashboard on professor login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { user_metadata: { perfil: 'professor' } } },
      error: null,
    })
    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'prof@prof.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/professor/dashboard')
    })
  })
})
