import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogoutButton } from '@/components/logout-button'

const mockSignOut = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

describe('LogoutButton', () => {
  beforeEach(() => {
    mockSignOut.mockReset().mockResolvedValue({})
    mockPush.mockReset()
  })

  it('calls signOut and redirects to /login on click', async () => {
    render(<LogoutButton />)
    await userEvent.click(screen.getByRole('button'))
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})
