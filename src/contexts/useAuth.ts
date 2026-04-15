import { createContext, useContext } from 'react'
import type { OAuthResult } from '@huggingface/hub'

export interface AuthContextValue {
  oauthResult: OAuthResult | null
  isLoading: boolean
  oauthError: string | null
  /** Has to be True so the current token has write access to the setrsoft org (orgIds was granted). */
  hasOrgAccess: boolean
  login: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
