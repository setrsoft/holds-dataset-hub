import { useEffect, useRef, useState } from 'react'
import { oauthHandleRedirectIfPresent, oauthLoginUrl } from '@huggingface/hub'
import type { OAuthResult } from '@huggingface/hub'

import { HF_OAUTH_CLIENT_ID } from '../lib/env'
import { AuthContext } from './useAuth'

const STORAGE_KEY = 'settersoft-registry.hf-oauth'
const ORG_SUB_KEY = 'settersoft-registry.hf-org-sub'
const CONTRIBUTION_ORG = 'setrsoft'

interface StoredSession {
  accessToken: string
  accessTokenExpiresAt: string
  userInfo: OAuthResult['userInfo']
  scope: string
}

function loadStoredSession(): OAuthResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored: StoredSession = JSON.parse(raw)
    const expiresAt = new Date(stored.accessTokenExpiresAt)
    if (expiresAt.getTime() <= Date.now() + 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return {
      accessToken: stored.accessToken,
      accessTokenExpiresAt: expiresAt,
      userInfo: stored.userInfo,
      scope: stored.scope,
    }
  } catch {
    return null
  }
}

function saveSession(result: OAuthResult) {
  const stored: StoredSession = {
    accessToken: result.accessToken,
    accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
    userInfo: result.userInfo,
    scope: result.scope,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

/** Returns true when the token has write access to the setrsoft org (user approved it in the OAuth flow). */
function checkOrgAccess(result: OAuthResult): boolean {
  return !!(result.userInfo.orgs?.find(
    (o) => o.preferred_username === CONTRIBUTION_ORG && o.roleInOrg,
  ))
}

/** Saves the setrsoft org sub so we can request orgIds on the next login. */
function storeOrgSub(result: OAuthResult) {
  const orgEntry = result.userInfo.orgs?.find((o) => o.preferred_username === CONTRIBUTION_ORG)
  if (orgEntry?.sub) {
    localStorage.setItem(ORG_SUB_KEY, orgEntry.sub)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [oauthResult, setOauthResult] = useState<OAuthResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [hasOrgAccess, setHasOrgAccess] = useState(false)
  // Prevent double-invocation in React StrictMode from exchanging the OAuth code twice
  const initRan = useRef(false)

  useEffect(() => {
    if (initRan.current) return
    initRan.current = true

    async function init() {
      try {
        const result = await oauthHandleRedirectIfPresent()
        if (result) {
          saveSession(result)
          storeOrgSub(result)
          setOauthResult(result)
          setHasOrgAccess(checkOrgAccess(result))
          window.history.replaceState({}, '', window.location.pathname)
          return
        }
      } catch (err) {
        setOauthError(
          err instanceof Error ? err.message : 'OAuth login failed. Please try again.',
        )
        localStorage.removeItem(STORAGE_KEY)
      }

      const stored = loadStoredSession()
      if (stored) {
        storeOrgSub(stored)
        setOauthResult(stored)
        setHasOrgAccess(checkOrgAccess(stored))
      }
    }

    void init().finally(() => setIsLoading(false))
  }, [])

  async function login() {
    // Use a fixed redirect URI (app root) so only one URL needs to be registered
    // in the HF OAuth app settings, regardless of which page the user clicks login from.
    // When BASE_URL is '/' (local dev), use bare origin to avoid a trailing-slash mismatch.
    const base = import.meta.env.BASE_URL
    const redirectUrl = base === '/' ? window.location.origin : window.location.origin + base
    let url = await oauthLoginUrl({
      clientId: HF_OAUTH_CLIENT_ID,
      // write-repos: write access to repos (personal + org when orgIds granted)
      // write-discussions: open Pull Requests on behalf of the user
      scopes: 'openid profile write-repos write-discussions',
      redirectUrl,
    })

    // If we already know the setrsoft org sub, include it so HF pre-selects the org
    // in the consent screen and the issued token includes org write access.
    const orgSub = localStorage.getItem(ORG_SUB_KEY)
    if (orgSub) {
      url += `&orgIds=${encodeURIComponent(orgSub)}`
    }

    window.location.href = url
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setOauthResult(null)
    setHasOrgAccess(false)
  }

  return (
    <AuthContext.Provider value={{ oauthResult, isLoading, oauthError, hasOrgAccess, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
