import { useEffect, useRef, useState } from 'react'
import { ExternalLink, FileJson, LoaderCircle, Pencil, Upload, X } from 'lucide-react'

import { formatUnixTimestamp } from '../lib/registry'
import { updateHold } from '../lib/uploadHold'
import { useAuth } from '../contexts/useAuth'
import { AttentionBadge } from './AttentionBadge'
import { HoldGlbViewer } from './HoldGlbViewer'
import { SelectWithOther, HuggingFaceLogo } from './AddHoldDialog'

import type { CreationOptions, DerivedHold } from '../types/registry'

interface HoldDetailDrawerProps {
  hold: DerivedHold | null
  onClose: () => void
  creationOptions: CreationOptions | null
  repoId: string
}

const fallbackValue = 'N/A'

export function HoldDetailDrawer({ hold, onClose, creationOptions, repoId }: HoldDetailDrawerProps) {
  const { oauthResult, hasOrgAccess, login } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [commitUrl, setCommitUrl] = useState<string | undefined>(undefined)
  const [draftManufacturer, setDraftManufacturer] = useState('')
  const [draftModel, setDraftModel] = useState('')
  const [draftType, setDraftType] = useState('')
  const [draftSize, setDraftSize] = useState('')
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!hold) return
    setDraftManufacturer(hold.manufacturer ?? '')
    setDraftModel(hold.model ?? '')
    setDraftType(hold.type ?? '')
    setDraftSize(hold.size ?? '')
    setDraftFile(null)
    setIsEditing(false)
    setSaveError(null)
    setCommitUrl(undefined)
  }, [hold])

  if (!hold) {
    return null
  }

  async function handleSave() {
    if (!hold) return
    if (!oauthResult) {
      setSaveError('login_required')
      return
    }
    setSaveError(null)
    setCommitUrl(undefined)
    setIsSaving(true)
    try {
      const result = await updateHold({
        repoId,
        accessToken: oauthResult.accessToken,
        hold,
        updates: { manufacturer: draftManufacturer, model: draftModel, type: draftType, size: draftSize, replacementFile: draftFile },
      })
      setCommitUrl(result.commitUrl)
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    if (!hold) return
    setDraftManufacturer(hold.manufacturer ?? '')
    setDraftModel(hold.model ?? '')
    setDraftType(hold.type ?? '')
    setDraftSize(hold.size ?? '')
    setDraftFile(null)
    setSaveError(null)
    setIsEditing(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Close detail panel"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Hold detail
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {hold.hold_id}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {hold.manufacturer ?? 'unknown'} / {hold.model ?? 'unknown'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="rounded-full border border-slate-300/80 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-950 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-sky-500"
                >
                  {isSaving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setCommitUrl(undefined); setIsEditing(true) }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/80 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300/80 p-2 text-slate-500 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {saveError && (
          <section className="mt-4 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-800 dark:text-rose-300">
            {saveError === 'login_required' ? (
              <div className="space-y-4">
                <p>Please log in with Hugging Face to submit improvements.</p>
                <button
                  type="button"
                  onClick={() => void login()}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <HuggingFaceLogo />
                  Login with Hugging Face
                </button>
              </div>
            ) : (
              <p>{saveError}</p>
            )}
          </section>
        )}

        {oauthResult && !hasOrgAccess && isEditing && (
          <section className="mt-4 rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-300">
            <div className="space-y-3">
              <p>
                Your current session doesn't have write access to the dataset organisation. Please re-login and
                grant access to <strong>setrsoft</strong> when prompted.
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
          </section>
        )}

        {commitUrl && !isEditing && (
          <section className="mt-4 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
            <p className="font-medium">Success! Thanks for your contribution; we will review your request as soon as possible...</p>
            <a href={commitUrl} target="_blank" rel="noreferrer" className="inline-flex underline underline-offset-2 hover:text-emerald-600 dark:hover:text-emerald-200">
              View your Pull Request
            </a>
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {hold.attentionReasons.length > 0 ? (
            hold.attentionReasons.map((bucket) => (
              <AttentionBadge key={bucket} bucket={bucket} />
            ))
          ) : (
            <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              No blocking issues
            </span>
          )}
        </div>

        <section
          className="mt-6 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-700"
          aria-label="3D hold preview"
        >
          <HoldGlbViewer key={hold.hold_id} glbUrl={hold.links.primaryAssetUrl} />
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {isEditing ? (
            <>
              <SelectWithOther
                label="Manufacturer"
                value={draftManufacturer}
                onChange={setDraftManufacturer}
                options={creationOptions?.manufacturers ?? []}
                placeholder="Select manufacturer"
              />
              <SelectWithOther
                label="Model"
                value={draftModel}
                onChange={setDraftModel}
                options={creationOptions?.models ?? []}
                placeholder="Select model"
              />
              <SelectWithOther
                label="Type"
                value={draftType}
                onChange={setDraftType}
                options={creationOptions?.holdTypes ?? []}
                placeholder="Select type"
              />
              <SelectWithOther
                label="Size"
                value={draftSize}
                onChange={setDraftSize}
                options={creationOptions?.sizes ?? []}
                placeholder="Select size"
              />
              <DetailItem label="Last update" value={formatUnixTimestamp(hold.last_update)} />
            </>
          ) : (
            <>
              <DetailItem label="Model" value={hold.model ?? fallbackValue} />
              <DetailItem label="Type" value={hold.type ?? fallbackValue} />
              <DetailItem label="Size" value={hold.size ?? fallbackValue} />
              <DetailItem label="Last update" value={formatUnixTimestamp(hold.last_update)} />
            </>
          )}
        </div>

        {isEditing && (
          <section className="mt-6 rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Replace 3D file
            </h3>
            <div
              role="button"
              tabIndex={0}
              className={`mt-4 flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                isDragging
                  ? 'border-sky-400 bg-sky-500/10 dark:border-sky-500 dark:bg-sky-500/20'
                  : 'border-slate-300/80 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) setDraftFile(file)
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
            >
              <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              {draftFile ? (
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {draftFile.name}
                </span>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Drop a file here, or click to browse
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setDraftFile(file)
                e.target.value = ''
              }}
            />
            {draftFile && (
              <button
                type="button"
                onClick={() => setDraftFile(null)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Remove file
              </button>
            )}
          </section>
        )}

        <section className="mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={hold.links.hubFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300/80 px-4 py-3 text-sm font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              <FileJson className="h-4 w-4" />
              Open on HuggingFace
            </a>
            <a
              href={hold.links.primaryAssetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300/80 px-4 py-3 text-sm font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              <ExternalLink className="h-4 w-4" />
              Download GLB file
            </a>
          </div>
        </section>
      </aside>
    </div>
  )
}

interface DetailItemProps {
  label: string
  value: string
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
      <dt className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
