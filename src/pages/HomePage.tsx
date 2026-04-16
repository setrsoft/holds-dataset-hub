import {
  Camera,
  LoaderCircle,
  LogOut,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRegistry } from '../hooks/useRegistry'
import { filterHolds } from '../lib/registry'
import { HF_OAUTH_CLIENT_ID } from '../lib/env'
import { useAuth } from '../contexts/useAuth'
import { HuggingFaceLogo } from '../components/AddHoldDialog'
import { Filters } from '../components/Filters'
import { HoldCard } from '../components/HoldCard'
import { HoldDetailDrawer } from '../components/HoldDetailDrawer'
import { StatsCards } from '../components/StatsCards'
import { ThemeToggle } from '../components/ThemeToggle'

import type { DerivedHold, HoldFilters } from '../types/registry'

const THEME_STORAGE_KEY = 'settersoft-registry.theme'

const defaultFilters: HoldFilters = {
  search: '',
  manufacturers: [],
  holdTypes: [],
  status: 'all',
  needsAttentionOnly: false,
}

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const heroHoldGlob = import.meta.glob<{ default: string } | string>(
  '../assets/hero-holds/*.png',
  { eager: true, query: '?url', import: 'default' },
)
const heroHoldUrls: string[] = Object.values(heroHoldGlob).map((m) =>
  typeof m === 'string' ? m : (m && typeof m === 'object' && 'default' in m ? m.default : ''),
).filter(Boolean)

/** Minimum number of images in the hero grid; repeat assets if fewer are available */
const MIN_HERO_HOLD_COUNT = 48

function getHeroHoldUrlsForGrid(): string[] {
  if (heroHoldUrls.length === 0) return []
  let list: string[] = heroHoldUrls
  if (heroHoldUrls.length < MIN_HERO_HOLD_COUNT) {
    list = []
    while (list.length < MIN_HERO_HOLD_COUNT) {
      for (const url of heroHoldUrls) {
        list.push(url)
        if (list.length >= MIN_HERO_HOLD_COUNT) break
      }
    }
  }
  return [...list, ...list]
}

export function HomePage() {
  const { data, error, isLoading, refresh, repoId } = useRegistry()
  const { oauthResult, oauthError, hasOrgAccess, login, logout, isLoading: authLoading } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [filters, setFilters] = useState<HoldFilters>(defaultFilters)
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null)
  const [hfDownloads, setHfDownloads] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://huggingface.co/api/datasets/setrsoft/climbing-holds')
      .then((r) => r.json())
      .then((json) => {
        if (typeof json?.downloads === 'number') setHfDownloads(json.downloads)
      })
      .catch(() => { /* silently ignore */ })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const filteredHolds = useMemo(
    () => (data ? filterHolds(data.holds, filters) : []),
    [data, filters],
  )
  const selectedHold: DerivedHold | null = useMemo(() => {
    if (!data || !selectedHoldId) return null
    return data.holds.find((h) => h.hold_id === selectedHoldId) ?? null
  }, [data, selectedHoldId])

  return (
    <main className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar: theme toggle left, HF login right */}
        <div className="mb-4 flex items-center justify-between">
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          />
          {HF_OAUTH_CLIENT_ID && (
            <div>
              {oauthResult ? (
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-800 dark:text-emerald-300">
                  {oauthResult.userInfo.picture && (
                    <img
                      src={oauthResult.userInfo.picture}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded-full"
                    />
                  )}
                  <span className="font-medium">{oauthResult.userInfo.preferred_username}</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-1 text-xs font-medium hover:bg-emerald-500/10"
                  >
                    <LogOut className="h-3 w-3" />
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void login()}
                  disabled={authLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
                >
                  <HuggingFaceLogo />
                  Login with Hugging Face
                </button>
              )}
              {oauthError && (
                <p className="mt-1 text-right text-xs text-rose-500">{oauthError}</p>
              )}
              {oauthResult && !hasOrgAccess && (
                <div
                  role="alert"
                  className="mt-2 space-y-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
                >
                  <p>
                    Your current session doesn't have write access to the dataset organisation.
                    Please re-login and grant access to <strong>setrsoft</strong> when prompted.
                  </p>
                  <button
                    type="button"
                    onClick={() => void login()}
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <HuggingFaceLogo />
                    Re-login and grant org access
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <section className="relative min-h-[50vh] w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div
            className="absolute inset-0 h-full w-full overflow-hidden opacity-60 dark:opacity-50"
            aria-hidden
            style={{ filter: 'blur(1px)' }}
          >
            {heroHoldUrls.length > 0 ? (
              <div
                className="absolute inset-0 grid h-[200%] w-full grid-cols-12 grid-rows-8 gap-x-px gap-y-0"
                style={{ animation: 'hero-holds-scroll 60s linear infinite' }}
              >
                {getHeroHoldUrlsForGrid().map((url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt=""
                    className="h-full w-full shrink-0 object-contain opacity-90"
                  />
                ))}
              </div>
            ) : (
              <div className="h-full w-full bg-slate-200/80 dark:bg-slate-900/80" />
            )}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm dark:bg-slate-950/70">
            <h1 className="text-center text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
              First climbing holds 3D dataset
            </h1>
            <p className="mt-5 max-w-2xl text-center text-xl text-slate-200 sm:text-2xl dark:text-slate-300">
              Help numeric solutions empower the climbing industry
            </p>
            {hfDownloads !== null && (
              <a
                href="https://huggingface.co/datasets/setrsoft/climbing-holds"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <HuggingFaceLogo />
                {hfDownloads.toLocaleString()} downloads on Hugging Face
              </a>
            )}
          </div>
        </section>

        {/* Two main CTA cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Link
            to="/add-hold"
            className="group flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-600 dark:bg-sky-500/30 dark:text-sky-400">
              <Camera className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">
              Add new hold
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Take 360 picture of any climbing hold to contribute
            </p>
            <span className="mt-4 text-sm font-medium text-sky-600 group-hover:underline dark:text-sky-400">
              Go to Add hold →
            </span>
          </Link>
          <a
            href="https://www.setrsoft.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-600 dark:bg-violet-500/30 dark:text-violet-400">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">
              Try holds in SetRsoft
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Play around with the available holds of the dataset in a 3D virtual environment
            </p>
            <span className="mt-4 text-sm font-medium text-violet-600 group-hover:underline dark:text-violet-400">
              Go try SetRsoft →
            </span>
          </a>
        </div>

        
        {/* Stats, filters (collapsed by default), gallery */}
        <section className="mt-6">
          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refresh()} />
          ) : data ? (
            <div className="space-y-6">
              <StatsCards stats={data.stats} />

              <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
                <Filters
                  filters={filters}
                  options={data.filterOptions}
                  onChange={setFilters}
                  defaultCollapsed
                />

                <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                        Holds gallery
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {filteredHolds.length} / {data.holds.length} holds displayed
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-300/80 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      Next reserved ID: {data.nextHoldId}
                    </div>
                  </div>

                  {filteredHolds.length === 0 ? (
                    <div className="mt-8 rounded-3xl border border-dashed border-slate-300/80 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No results with current filters.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {filteredHolds.map((hold) => (
                        <HoldCard
                          key={hold.hold_id}
                          hold={hold}
                          onSelect={(selected) => setSelectedHoldId(selected.hold_id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <HoldDetailDrawer
        hold={selectedHold}
        onClose={() => setSelectedHoldId(null)}
        creationOptions={data?.creationOptions ?? null}
        repoId={repoId}
      />
    </main>
  )
}

function LoadingState() {
  return (
    <section className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-slate-200/80 bg-white/80 p-10 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-sky-500" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Loading Hugging Face index...
        </p>
      </div>
    </section>
  )
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void
}) {
  return (
    <section className="rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-8 text-rose-900 dark:text-rose-300">
      <h2 className="text-lg font-semibold">Unable to load registry</h2>
      <p className="mt-2 text-sm">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-rose-500/40 px-4 py-2 text-sm font-medium"
      >
        Retry
      </button>
    </section>
  )
}
