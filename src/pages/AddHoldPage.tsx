import { ExternalLink, LoaderCircle, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ANONYMOUS_CONTRIBUTIONS_REPO_ID,
  clearAccessToken,
  getStoredAccessToken,
  saveAccessToken,
  uploadHold,
  uploadHoldAnonymous,
  validateAccessToken,
} from '../lib/hf'
import { ANONYMOUS_UPLOAD_URL } from '../lib/env'
import { parseCommaSeparatedValues } from '../lib/registry'
import { useRegistry } from '../hooks/useRegistry'
import { SelectWithOther } from '../components/AddHoldDialog'

import type { CreationOptions, NewHoldMetadata } from '../types/registry'

function getTimezoneOffsetLabel(date: Date) {
  const minutes = -date.getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(minutes)
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0')
  const mins = String(absoluteMinutes % 60).padStart(2, '0')
  return `${sign}${hours}:${mins}`
}

export function AddHoldPage() {
  const { data, error, isLoading, refresh, repoId, revision } = useRegistry()

  const [storedToken, setStoredToken] = useState(() => getStoredAccessToken())
  const [tokenInput, setTokenInput] = useState('')
  const [rememberToken, setRememberToken] = useState(true)
  const [replaceStoredToken, setReplaceStoredToken] = useState(false)
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [holdType, setHoldType] = useState('')
  const [size, setSize] = useState('')
  const [labels, setLabels] = useState('')
  const [contributionNote, setContributionNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [publishAnonymously, setPublishAnonymously] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<{
    message: string
    commitUrl?: string
  } | null>(null)

  useEffect(() => {
    setFormError(null)
    setFiles([])
    setManufacturer('')
    setModel('')
    setHoldType('')
    setSize('')
    setLabels('')
    setContributionNote('')
    setStoredToken(getStoredAccessToken())
    setReplaceStoredToken(false)
    setPublishAnonymously(false)
    setUploadSuccess(null)
  }, [data?.nextHoldId])

  const hasStoredToken = storedToken.length > 0 && !replaceStoredToken
  const activeToken = hasStoredToken ? storedToken : tokenInput.trim()
  const anonymousUploadAvailable = ANONYMOUS_UPLOAD_URL.length > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!data) return

    if (!publishAnonymously && !activeToken) {
      setFormError('A Hugging Face token is required to upload a new hold.')
      return
    }
    if (!manufacturer.trim() || !model.trim() || !holdType.trim() || !size.trim()) {
      setFormError('Manufacturer, model, type, and size are required.')
      return
    }
    if (files.length === 0) {
      setFormError('Add at least one file before continuing.')
      return
    }
    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0)
    const maxAnonymousBytes = 5 * 1024 * 1024 * 1024
    if (publishAnonymously && totalSizeBytes > maxAnonymousBytes) {
      setFormError('When publishing anonymously, total file size must be at most 5 GiB.')
      return
    }

    setIsUploading(true)
    try {
      const now = new Date()
      const metadata: NewHoldMetadata = {
        id: data.nextNumericId,
        hold_id: data.nextHoldId,
        created_at: Math.floor(now.getTime() / 1000),
        last_update: Math.floor(now.getTime() / 1000),
        timezone_offset: getTimezoneOffsetLabel(now),
        type: holdType.trim().toLowerCase(),
        labels: parseCommaSeparatedValues(labels),
        color_of_scan: '',
        available_colors: [],
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        size: size.trim(),
        note: contributionNote.trim() || null,
        uploadFiles: files,
      }

      let result
      if (publishAnonymously) {
        result = await uploadHoldAnonymous(metadata)
      } else {
        await validateAccessToken(activeToken)
        if (!hasStoredToken && rememberToken && activeToken) {
          saveAccessToken(activeToken)
          setStoredToken(activeToken)
        }
        result = await uploadHold({
          repoId,
          revision,
          accessToken: activeToken,
          hold: metadata,
        })
      }

      setUploadSuccess({
        message:
          `Your contribution was uploaded to Hugging Face in the pending area. ` +
          `It will be assigned an official ID (e.g. around ${data.nextHoldId}) and appear in the gallery ` +
          `after the next index regeneration.`,
        commitUrl: result.commitUrl,
      })
    } catch (unknownError) {
      setFormError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Upload failed for an unknown reason.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Loading registry...
            </p>
          </div>
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

  const creationOptions: CreationOptions = data.creationOptions

  if (uploadSuccess) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-[2rem] border border-emerald-400/30 bg-emerald-500/10 p-8 text-emerald-800 dark:text-emerald-300">
            <h2 className="text-xl font-semibold">Upload successful</h2>
            <p className="mt-3 text-sm">{uploadSuccess.message}</p>
            {uploadSuccess.commitUrl && (
              <a
                href={uploadSuccess.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 font-medium underline"
              >
                <ExternalLink className="h-4 w-4" />
                Open Hugging Face commit
              </a>
            )}
          </div>
          <Link
            to="/add-hold"
            onClick={() => setUploadSuccess(null)}
            className="mt-6 inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white dark:bg-sky-500 dark:text-slate-950"
          >
            Add more holds
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Back to home
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
              Add new hold
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Take 360° picture of any climbing hold to contribute to the dataset.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="max-h-[85vh] overflow-y-auto px-6 py-5"
          >
            <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Hugging Face
                  </h3>
                  <div className="mt-4 space-y-4">
                    <label className={`flex items-center gap-3 text-sm ${anonymousUploadAvailable ? 'text-slate-600 dark:text-slate-300' : 'cursor-not-allowed text-slate-400 dark:text-slate-600'}`}>
                      <input
                        type="checkbox"
                        checked={publishAnonymously}
                        onChange={(e) => setPublishAnonymously(e.target.checked)}
                        disabled={!anonymousUploadAvailable}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      Publish anonymously
                      {!anonymousUploadAvailable && (
                        <span className="text-xs">(not available in this deployment)</span>
                      )}
                    </label>
                    {publishAnonymously && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
                      >
                        Anonymous contributions might take longer to be integrated.
                        <p className="mt-2">
                          Please consider creating{' '}
                          <a
                            href="https://huggingface.co/join"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
                          >
                            a Hugging Face account
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          </a>
                          .
                        </p>
                      </div>
                    )}
                    {!publishAnonymously && (
                      <>
                        {hasStoredToken ? (
                          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                            Hugging Face token is already saved locally.
                            <div className="mt-3 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => setReplaceStoredToken(true)}
                                className="rounded-full border border-emerald-500/40 px-3 py-1.5 text-xs font-medium"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  clearAccessToken()
                                  setStoredToken('')
                                  setReplaceStoredToken(true)
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300"
                              >
                                Delete local token
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Hugging Face token
                            </span>
                            <input
                              type="text"
                              value={tokenInput}
                              onChange={(e) => setTokenInput(e.target.value)}
                              placeholder="hf_..."
                              className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <label className="mt-3 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={rememberToken}
                                onChange={(e) => setRememberToken(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              />
                              Save this token in browser
                            </label>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Metadata
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <SelectWithOther
                      label="Manufacturer"
                      placeholder="Select a manufacturer"
                      options={creationOptions.manufacturers}
                      value={manufacturer}
                      onChange={setManufacturer}
                    />
                    <SelectWithOther
                      label="Model"
                      placeholder="Select a model"
                      options={creationOptions.models}
                      value={model}
                      onChange={setModel}
                    />
                    <SelectWithOther
                      label="Type"
                      placeholder="Select a type"
                      options={creationOptions.holdTypes}
                      value={holdType}
                      onChange={setHoldType}
                    />
                    <SelectWithOther
                      label="Size"
                      placeholder="Select a size"
                      options={creationOptions.sizes}
                      value={size}
                      onChange={setSize}
                    />
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Labels
                    </span>
                    <input
                      value={labels}
                      onChange={(e) => setLabels(e.target.value)}
                      placeholder="training, scanned, verified"
                      className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Contribution note
                    </span>
                    <textarea
                      value={contributionNote}
                      onChange={(e) => setContributionNote(e.target.value)}
                      placeholder="Anything helpful about this contribution..."
                      className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      rows={3}
                    />
                  </label>
                </section>

                <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Files
                  </h3>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Assets
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        setFiles(Array.from(e.target.files ?? []))
                      }
                      className="w-full rounded-2xl border border-dashed border-slate-300/80 bg-white px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    The Hugging Face commit will automatically handle large file
                    uploads and switching to LFS if needed.
                  </p>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-5 text-sm text-sky-900 dark:text-sky-200">
                  <h3 className="font-semibold">Indexing note</h3>
                  <p className="mt-2">
                    Uploading creates the files in the dataset immediately, but
                    the card will only appear in the gallery after the next
                    regeneration of `global_index.json`.
                  </p>
                </section>
                {files.length > 0 && (
                  <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Selected files
                    </h3>
                    <ul className="mt-3 space-y-1 text-sm text-slate-900 dark:text-slate-100">
                      {files.map((file) => (
                        <li key={file.name}>
                          {file.name}{' '}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Total size:{' '}
                      {(
                        files.reduce((sum, f) => sum + f.size, 0) /
                        (1024 * 1024)
                      ).toFixed(2)}{' '}
                      MB
                    </p>
                  </section>
                )}
                {formError && (
                  <section className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-800 dark:text-rose-300">
                    {formError}
                  </section>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-5 dark:border-slate-800">
              <Link
                to="/"
                className="rounded-full border border-slate-300/80 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                {isUploading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload hold
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
