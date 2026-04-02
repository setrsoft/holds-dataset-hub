import { ExternalLink, LoaderCircle, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  clearAccessToken,
  getStoredAccessToken,
  saveAccessToken,
  uploadHold,
  uploadHoldAnonymous,
  validateAccessToken,
} from '../lib/hf'
import { ANONYMOUS_UPLOAD_URL } from '../lib/env'
import { getFilesFromDataTransfer } from '../lib/getFilesFromDataTransfer'
import { parseCommaSeparatedValues } from '../lib/registry'

import type { CreationOptions, NewHoldMetadata } from '../types/registry'

interface AddHoldDialogProps {
  open: boolean
  nextNumericId: number
  nextHoldId: string
  repoId: string
  creationOptions: CreationOptions
  onClose: () => void
  onUploaded: (payload: { message: string; commitUrl?: string }) => void
}

function getTimezoneOffsetLabel(date: Date) {
  const minutes = -date.getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(minutes)
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0')
  const mins = String(absoluteMinutes % 60).padStart(2, '0')
  return `${sign}${hours}:${mins}`
}

export function AddHoldDialog({
  open,
  nextNumericId,
  nextHoldId,
  repoId,
  creationOptions,
  onClose,
  onUploaded,
}: AddHoldDialogProps) {
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
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
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
  }, [open, nextHoldId])

  const hasStoredToken = storedToken.length > 0 && !replaceStoredToken
  const activeToken = hasStoredToken ? storedToken : tokenInput.trim()
  const anonymousUploadAvailable = ANONYMOUS_UPLOAD_URL.length > 0

  function handleClearFiles() {
    setFiles([])
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!open) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!publishAnonymously && !activeToken) {
      setError('A Hugging Face token is required to upload a new hold.')
      return
    }

    if (!manufacturer.trim() || !model.trim() || !holdType.trim() || !size.trim()) {
      setError('Manufacturer, model, type, and size are required.')
      return
    }

    if (files.length === 0) {
      setError('Add at least one file before continuing.')
      return
    }

    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0)
    const maxAnonymousBytes = 5 * 1024 * 1024 * 1024
    if (publishAnonymously && totalSizeBytes > maxAnonymousBytes) {
      setError('When publishing anonymously, total file size must be at most 5 GiB.')
      return
    }

    setIsUploading(true)

    try {
      const now = new Date()

      const metadata: NewHoldMetadata = {
        id: nextNumericId,
        hold_id: nextHoldId,
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
          accessToken: activeToken,
          hold: metadata,
        })
      }

      onUploaded({
        message: (
          `Your contribution was uploaded to Hugging Face in the pending area. ` +
          `It will be assigned an official ID (e.g. around ${nextHoldId}) and appear in the gallery ` +
          `after the next index regeneration.`
        ),
        commitUrl: result.commitUrl,
      })
      onClose()
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Upload failed for an unknown reason.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              New hold
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300/80 p-2 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Files
                </h3>
                <div className="mt-4 space-y-3">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Assets
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                      isDragging
                        ? 'border-sky-400 bg-sky-500/10 dark:border-sky-500 dark:bg-sky-500/20'
                        : 'border-slate-300/80 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                    onDrop={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                      setError(null)
                      try {
                        const transferred = await getFilesFromDataTransfer(e.dataTransfer)
                        if (transferred.length) setFiles((prev) => [...prev, ...transferred])
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to read dropped files or folder.')
                      }
                    }}
                    onClick={() => {
                      fileInputRef.current?.click()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                  >
                    <Upload className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Drop files or a folder here, or click to browse
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Any type, including compressed archives
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const selected = Array.from(event.target.files ?? [])
                      setFiles((prev) => [...prev, ...selected])
                      event.target.value = ''
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  The Hugging Face commit will automatically handle large file uploads
                  and switching to LFS if needed. Folder structure is preserved.
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Hugging Face
                </h3>

                <div className="mt-4 space-y-4">
                  <label className={`flex items-center gap-3 text-sm ${anonymousUploadAvailable ? 'text-slate-600 dark:text-slate-300' : 'cursor-not-allowed text-slate-400 dark:text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={publishAnonymously}
                      onChange={(event) => setPublishAnonymously(event.target.checked)}
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
                              <Trash2 className="h-3.5 w-3.5" />
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
                            onChange={(event) => setTokenInput(event.target.value)}
                            placeholder="hf_..."
                            className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          />
                          <label className="mt-3 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={rememberToken}
                              onChange={(event) => setRememberToken(event.target.checked)}
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
                    onChange={(event) => setLabels(event.target.value)}
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
                    onChange={(event) => setContributionNote(event.target.value)}
                    placeholder="Anything helpful about this contribution..."
                    className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    rows={3}
                  />
                </label>
              </section>
            </div>

            <div className="space-y-6">

              {files.length > 0 && (
                <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Selected files
                    </h3>
                    <button
                      type="button"
                      onClick={handleClearFiles}
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear all
                    </button>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-slate-900 dark:text-slate-100">
                    {files.map((file, i) => {
                      const path =
                        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
                        file.name
                      return (
                        <li key={`${path}-${i}`}>
                          {path}{' '}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Total size:{' '}
                    {(files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(
                      2,
                    )}{' '}
                    MB
                  </p>
                </section>
              )}

              {error && (
                <section className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-800 dark:text-rose-300">
                  {error}
                </section>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300/80 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
            >
              Cancel
            </button>
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
  )
}

export interface SelectWithOtherProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}

export function SelectWithOther({
  label,
  value,
  onChange,
  options,
  placeholder,
}: SelectWithOtherProps) {
  const [isUsingOther, setIsUsingOther] = useState(false)

  const isInOptions = options.includes(value)
  const selectValue = isUsingOther ? 'other' : isInOptions ? value : ''

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <select
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value
          if (next === 'other') {
            setIsUsingOther(true)
          } else {
            setIsUsingOther(false)
            onChange(next)
          }
        }}
        className="w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="other">Other…</option>
      </select>
      {isUsingOther && (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Custom ${label.toLowerCase()}`}
          className="mt-2 w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      )}
    </label>
  )
}

