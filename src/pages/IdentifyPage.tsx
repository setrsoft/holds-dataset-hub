import { LoaderCircle, LogOut, ScanSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRegistry } from '../hooks/useRegistry'
import { HuggingFaceLogo, SelectWithOther } from '../components/AddHoldDialog'
import { HoldGlbViewer } from '../components/HoldGlbViewer'
import { StarRating } from '../components/StarRating'
import { useAuth } from '../contexts/useAuth'
import { HF_OAUTH_CLIENT_ID, VOTE_WEBHOOK_URL, VOTE_WEBHOOK_SECRET } from '../lib/env'

import type { DerivedHold } from '../types/registry'

function getHoldsToIdentify(holds: DerivedHold[]): DerivedHold[] {
  return holds.filter(
    (h) =>
      h.status === 'needs_attention' &&
      (h.attentionReasons.includes('unknown_manufacturer') ||
        h.attentionReasons.includes('unknown_model')),
  )
}

function shuffle<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function IdentifyPage() {
  const { data, error, isLoading, refresh } = useRegistry()
  const holdsToIdentify = useMemo(
    () => (data ? getHoldsToIdentify(data.holds) : []),
    [data],
  )
  const shuffledHolds = useMemo(
    () => (holdsToIdentify.length > 0 ? shuffle(holdsToIdentify) : []),
    [holdsToIdentify],
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [hold3dFileRating, setHold3dFileRating] = useState(0)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { oauthResult, oauthError, login, logout, isLoading: authLoading } = useAuth()
  const [voteAnonymously, setVoteAnonymously] = useState(!HF_OAUTH_CLIENT_ID)

  const activeToken = oauthResult?.accessToken ?? ''
  const isAnonymous = voteAnonymously || !oauthResult

  const currentHold: DerivedHold | null =
    shuffledHolds.length > 0
      ? shuffledHolds[currentIndex % shuffledHolds.length]
      : null

  const creationOptions = data?.creationOptions ?? {
    manufacturers: [] as string[],
    holdTypes: [],
    models: [] as string[],
    sizes: [],
  }

  function handleNext() {
    if (shuffledHolds.length <= 1) return
    setCurrentIndex((i) => (i + 1) % shuffledHolds.length)
    setSubmitMessage(null)
    setSubmitError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitMessage(null)
    if (!currentHold || !manufacturer.trim() || !model.trim()) return
    if (!voteAnonymously && !oauthResult) {
      setSubmitError('Please log in with Hugging Face or vote anonymously.')
      return
    }

    const payload = {
      hold_id: currentHold.hold_id,
      hold_manufacturer: manufacturer.trim(),
      hold_model: model.trim(),
      hold_3d_file_rating: Math.min(5, Math.max(0, hold3dFileRating)),
      vote_datetime: new Date().toISOString(),
      anonymous: isAnonymous,
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (VOTE_WEBHOOK_SECRET.length > 0) {
        headers['X-Webhook-Secret'] = VOTE_WEBHOOK_SECRET
      }
      if (!isAnonymous && activeToken.length > 0) {
        headers['Authorization'] = `Bearer ${activeToken}`
      }
      const response = await fetch(VOTE_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      setSubmitMessage('Vote submitted.')
      setManufacturer('')
      setModel('')
      setHold3dFileRating(0)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to submit vote.',
      )
    }
  }

  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-sky-500" />
          <p className="ml-4 text-sm text-slate-500 dark:text-slate-400">
            Loading registry...
          </p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-slate-600 dark:text-slate-400">
            {error ?? 'Registry not loaded.'}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            Retry
          </button>
          <Link
            to="/"
            className="ml-3 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            Back to home
          </Link>
        </div>
      </main>
    )
  }

  if (shuffledHolds.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <ScanSearch className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">
            No holds need identification
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            All holds in the registry are already identified, or the list is empty.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white dark:bg-sky-500 dark:text-slate-950"
          >
            Back to home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Back to home
          </Link>
          <span className="rounded-full border border-slate-300/80 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {currentIndex + 1} / {shuffledHolds.length} to identify
          </span>
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
            <h1 className="text-xl font-semibold text-slate-950 dark:text-white">
              Identify this hold
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hold ID: {currentHold?.hold_id}
            </p>
          </div>

          <div className="p-6">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900">
              <HoldGlbViewer glbUrl={currentHold!.links.primaryAssetUrl} />
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleNext}
                disabled={shuffledHolds.length <= 1}
                className="rounded-full border border-slate-300/80 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                Next hold
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800 space-y-4">
                {HF_OAUTH_CLIENT_ID && (
                  <>
                    {oauthError && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-300"
                      >
                        {oauthError}
                      </div>
                    )}
                    {oauthResult ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                        {oauthResult.userInfo.picture && (
                          <img
                            src={oauthResult.userInfo.picture}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full"
                          />
                        )}
                        <span className="flex-1 font-medium">
                          {oauthResult.userInfo.preferred_username}
                        </span>
                        <button
                          type="button"
                          onClick={logout}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/10"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Log out
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void login()}
                        disabled={authLoading}
                        className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <HuggingFaceLogo />
                        Login with Hugging Face
                      </button>
                    )}
                  </>
                )}
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={voteAnonymously}
                    onChange={(e) => setVoteAnonymously(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Vote anonymously
                  </span>
                </label>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <SelectWithOther
                  label="Manufacturer"
                  placeholder="Select or enter manufacturer"
                  options={creationOptions.manufacturers}
                  value={manufacturer}
                  onChange={setManufacturer}
                />
                <SelectWithOther
                  label="Model"
                  placeholder="Select or enter model"
                  options={creationOptions.models}
                  value={model}
                  onChange={setModel}
                />
              </div>
              <StarRating
                label="Hold file quality"
                value={hold3dFileRating}
                onChange={setHold3dFileRating}
              />
              {submitError && (
                <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
                  {submitError}
                </p>
              )}
              {submitMessage && (
                <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                  {submitMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={
                  !manufacturer.trim() ||
                  !model.trim() ||
                  (!voteAnonymously && !oauthResult)
                }
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Submit identification
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
