import { createContext, useContext } from 'react'
import type { OAuthResult } from '@huggingface/hub'

export interface AuthContextValue {
  oauthResult: OAuthResult | null
  isLoading: boolean
  oauthError: string | null
  login: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
