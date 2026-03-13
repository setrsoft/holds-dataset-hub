import {
  Database,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useRegistry } from '../hooks/useRegistry'
import { buildDatasetTreeUrl } from '../lib/hf'
import { filterHolds } from '../lib/registry'
import { AddHoldDialog } from './AddHoldDialog'
import { Filters } from './Filters'
import { HoldCard } from './HoldCard'
import { HoldDetailDrawer } from './HoldDetailDrawer'
import { StatsCards } from './StatsCards'
import { ThemeToggle } from './ThemeToggle'

import type { CreationOptions, DerivedHold, HoldFilters } from '../types/registry'

const THEME_STORAGE_KEY = 'settersoft-registry.theme'

const defaultFilters: HoldFilters = {
  search: '',
  manufacturers: [],
  holdTypes: [],
  status: 'all',
  needsAttentionOnly: false,
}

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function Dashboard() {
  const { data, error, isLoading, refresh, repoId, revision } = useRegistry()

  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme())
  const [filters, setFilters] = useState<HoldFilters>(defaultFilters)
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{
    message: string
    commitUrl?: string
  } | null>(null)
  const creationOptions: CreationOptions | null = data ? data.creationOptions : null

  useEffect(() => {
    const rootElement = document.documentElement
    rootElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const filteredHolds = useMemo(
    () => (data ? filterHolds(data.holds, filters) : []),
    [data, filters],
  )
  const selectedHold: DerivedHold | null = useMemo(() => {
    if (!data || !selectedHoldId) {
      return null
    }

    return data.holds.find((hold) => hold.hold_id === selectedHoldId) ?? null
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
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-sky-600 dark:text-sky-400">
                SetterSoft Registry
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Climbing holds dataset manager
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                Explore `global_index.json`, filter holds, inspect metadata, and
                contribute directly to the Hugging Face dataset `setrsoft/climbing-holds`.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              />
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                <Plus className="h-4 w-4" />
                Add a hold
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
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
        </header>

        {uploadFeedback && (
          <section className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-800 dark:text-emerald-300">
            <p>{uploadFeedback.message}</p>
            {uploadFeedback.commitUrl && (
              <a
                href={uploadFeedback.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 font-medium underline"
              >
                <ExternalLink className="h-4 w-4" />
                Open Pull Request
              </a>
            )}
          </section>
        )}

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

      <HoldDetailDrawer hold={selectedHold} onClose={() => setSelectedHoldId(null)} />

      {data && creationOptions && (
        <AddHoldDialog
          open={isAddDialogOpen}
          nextNumericId={data.nextNumericId}
          nextHoldId={data.nextHoldId}
          repoId={repoId}
          creationOptions={creationOptions}
          onClose={() => setIsAddDialogOpen(false)}
          onUploaded={(payload) => {
            setUploadFeedback(payload)
            setIsAddDialogOpen(false)
          }}
        />
      )}
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

interface ErrorStateProps {
  error: string
  onRetry: () => void
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
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
