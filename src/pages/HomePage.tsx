import {
  Camera,
  Database,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRegistry } from '../hooks/useRegistry'
import { buildDatasetTreeUrl } from '../lib/hf'
import { filterHolds } from '../lib/registry'
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
  const { data, error, isLoading, refresh, repoId, revision } = useRegistry()
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [filters, setFilters] = useState<HoldFilters>(defaultFilters)
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null)

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

  const datasetUrl = buildDatasetTreeUrl(repoId, revision)
  const lastUpdated = data?.raw.last_updated
    ? new Date(data.raw.last_updated).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A'

  return (
    <main className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative min-h-[70vh] w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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
            <h1 className="text-center text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              First climbing holds 3D dataset
            </h1>
            <p className="mt-4 max-w-xl text-center text-lg text-slate-200 sm:text-xl dark:text-slate-300">
              Help numeric solutions empower the climbing industry
            </p>
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
          <Link
            to="/identify"
            className="group flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400">
              <ScanSearch className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">
              Identify
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              You are an experienced routesetter? Let&apos;s see how many holds you can identify !
            </p>
            <span className="mt-4 text-sm font-medium text-amber-600 group-hover:underline dark:text-amber-400">
              Go to Identify →
            </span>
          </Link>
        </div>

        {/* Header bar: theme, refresh, repo info */}
        <header className="mt-10 rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 px-3 py-1.5 dark:border-slate-700">
                <Database className="h-4 w-4" />
                Repo: {repoId}
              </span>
              <span className="rounded-full border border-slate-300/80 px-3 py-1.5 dark:border-slate-700">
                Revision: {revision}
              </span>
              <span className="rounded-full border border-slate-300/80 px-3 py-1.5 dark:border-slate-700">
                Index updated: {lastUpdated}
              </span>
              <a
                href={datasetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 px-3 py-1.5 hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:hover:border-sky-500 dark:hover:text-sky-300"
              >
                <ExternalLink className="h-4 w-4" />
                Open dataset
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              />
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </header>

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
