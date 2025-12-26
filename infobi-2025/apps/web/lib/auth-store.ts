import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  username: string
  email: string
  role: string
  full_name?: string
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      
      setAuth: (token, user) => set({ token, user }),
      
      logout: () => {
        set({ token: null, user: null })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      },
      
      isAdmin: () => {
        const user = get().user
        return user?.role === 'admin'
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
