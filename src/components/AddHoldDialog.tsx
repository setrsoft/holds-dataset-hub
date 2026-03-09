import { LoaderCircle, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  clearAccessToken,
  getStoredAccessToken,
  saveAccessToken,
  uploadHold,
  validateAccessToken,
} from '../lib/hf'
import { parseCommaSeparatedValues } from '../lib/registry'

import type { NewHoldMetadata } from '../types/registry'

interface AddHoldDialogProps {
  open: boolean
  nextNumericId: number
  nextHoldId: string
  repoId: string
  revision: string
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
  revision,
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
  const [colorOfScan, setColorOfScan] = useState('#FF3200')
  const [availableColors, setAvailableColors] = useState('#FF3200, #2962A7')
  const [labels, setLabels] = useState('')
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const [idConfirmed, setIdConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    setIdConfirmed(false)
    setAssetFile(null)
    setManufacturer('')
    setModel('')
    setHoldType('')
    setSize('')
    setColorOfScan('#FF3200')
    setAvailableColors('#FF3200, #2962A7')
    setLabels('')
    setStoredToken(getStoredAccessToken())
    setReplaceStoredToken(false)
  }, [open, nextHoldId])

  const hasStoredToken = storedToken.length > 0 && !replaceStoredToken
  const activeToken = hasStoredToken ? storedToken : tokenInput.trim()

  const holdPreview = useMemo(
    () => ({
      numericId: nextNumericId,
      holdId: nextHoldId,
      path: `${nextHoldId}/`,
    }),
    [nextHoldId, nextNumericId],
  )

  if (!open) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!activeToken) {
      setError('Un token Hugging Face est requis pour uploader une nouvelle prise.')
      return
    }

    if (!idConfirmed) {
      setError("Confirme d'abord l'ID calculé avant l'upload.")
      return
    }

    if (!manufacturer.trim() || !model.trim() || !holdType.trim() || !size.trim()) {
      setError('Manufacturer, model, type et size sont obligatoires.')
      return
    }

    if (!assetFile) {
      setError('Ajoute un fichier `.blend` ou `.glb` avant de continuer.')
      return
    }

    const lowerName = assetFile.name.toLowerCase()
    if (!lowerName.endsWith('.blend') && !lowerName.endsWith('.glb')) {
      setError("Le fichier principal doit être au format `.blend` ou `.glb`.")
      return
    }

    setIsUploading(true)

    try {
      await validateAccessToken(activeToken)

      if (!hasStoredToken && rememberToken) {
        saveAccessToken(activeToken)
        setStoredToken(activeToken)
      }

      const now = new Date()
      const parsedColors = parseCommaSeparatedValues(availableColors)
      const finalColors = Array.from(new Set([colorOfScan.toUpperCase(), ...parsedColors]))

      const metadata: NewHoldMetadata = {
        id: nextNumericId,
        hold_id: nextHoldId,
        created_at: Math.floor(now.getTime() / 1000),
        last_update: Math.floor(now.getTime() / 1000),
        timezone_offset: getTimezoneOffsetLabel(now),
        type: holdType.trim().toLowerCase(),
        labels: parseCommaSeparatedValues(labels),
        color_of_scan: colorOfScan.toUpperCase(),
        available_colors: finalColors,
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        size: size.trim(),
      }

      const result = await uploadHold({
        repoId,
        revision,
        accessToken: activeToken,
        hold: metadata,
        assetFile,
      })

      onUploaded({
        message:
          `La prise ${nextHoldId} a été envoyée sur Hugging Face. ` +
          "Elle apparaîtra dans la galerie après la prochaine régénération de l'index.",
        commitUrl: result.commitUrl,
      })
      onClose()
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "L'upload a échoué pour une raison inconnue.",
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
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Ajouter une prise
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              Nouveau dossier {holdPreview.path}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              L’ID est calculé automatiquement pour éviter les collisions.
            </p>
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
                  Hugging Face
                </h3>

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Repo cible: <strong>{repoId}</strong>
                    <br />
                    Branche: <strong>{revision}</strong>
                  </div>

                  {hasStoredToken ? (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                      Token Hugging Face déjà enregistré localement.
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setReplaceStoredToken(true)}
                          className="rounded-full border border-emerald-500/40 px-3 py-1.5 text-xs font-medium"
                        >
                          Remplacer
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
                          Effacer le token local
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Token Hugging Face
                      </span>
                      <input
                        type="password"
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
                        Enregistrer ce token dans le localStorage
                      </label>
                    </label>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Métadonnées
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Manufacturer"
                    value={manufacturer}
                    onChange={setManufacturer}
                    placeholder="Flathold"
                  />
                  <Field
                    label="Model"
                    value={model}
                    onChange={setModel}
                    placeholder="Macro 01"
                  />
                  <Field
                    label="Type"
                    value={holdType}
                    onChange={setHoldType}
                    placeholder="jug, crimp, sloper..."
                  />
                  <Field label="Size" value={size} onChange={setSize} placeholder="XL" />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Couleur du scan
                    </span>
                    <input
                      type="color"
                      value={colorOfScan}
                      onChange={(event) => setColorOfScan(event.target.value.toUpperCase())}
                      className="h-12 w-full rounded-2xl border border-slate-300/80 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <Field
                    label="Couleurs disponibles"
                    value={availableColors}
                    onChange={setAvailableColors}
                    placeholder="#FF3200, #2962A7"
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
              </section>

              <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Fichier 3D
                </h3>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Asset principal
                  </span>
                  <input
                    type="file"
                    accept=".blend,.glb,model/gltf-binary"
                    onChange={(event) =>
                      setAssetFile(event.target.files?.[0] ?? null)
                    }
                    className="w-full rounded-2xl border border-dashed border-slate-300/80 bg-white px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Le commit Hugging Face gérera automatiquement l’upload des gros fichiers
                  et le passage en LFS si nécessaire.
                </p>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  ID réservé
                </h3>
                <div className="mt-4 space-y-3">
                  <ReadOnlyField label="Numeric ID" value={String(holdPreview.numericId)} />
                  <ReadOnlyField label="hold_id" value={holdPreview.holdId} />
                  <ReadOnlyField label="Dossier" value={holdPreview.path} />
                </div>
                <button
                  type="button"
                  onClick={() => setIdConfirmed((currentValue) => !currentValue)}
                  className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    idConfirmed
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-300/80 text-slate-700 hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300'
                  }`}
                >
                  {idConfirmed
                    ? `ID ${holdPreview.holdId} confirmé`
                    : `Confirmer l'ID ${holdPreview.holdId}`}
                </button>
              </section>

              <section className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-5 text-sm text-sky-900 dark:text-sky-200">
                <h3 className="font-semibold">Note d’indexation</h3>
                <p className="mt-2">
                  L’upload crée les fichiers dans le dataset immédiatement, mais la carte
                  n’apparaîtra dans la galerie qu’après la prochaine régénération de
                  `global_index.json`.
                </p>
              </section>

              {assetFile && (
                <section className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Fichier sélectionné
                  </h3>
                  <p className="mt-3 text-sm text-slate-900 dark:text-slate-100">
                    {assetFile.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {(assetFile.size / (1024 * 1024)).toFixed(2)} MB
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
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              {isUploading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Uploader la prise
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  )
}

interface ReadOnlyFieldProps {
  label: string
  value: string
}

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        {value}
      </div>
    </div>
  )
}
