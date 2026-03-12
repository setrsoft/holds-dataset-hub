import { LoaderCircle, ScanSearch } from 'lucide-react'
import { useMemo, useState, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'

import { useRegistry } from '../hooks/useRegistry'
import { SelectWithOther } from '../components/AddHoldDialog'

import type { DerivedHold } from '../types/registry'

const IDENTIFY_STORAGE_KEY = 'settersoft-identify-pending'

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
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

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
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentHold || !manufacturer.trim() || !model.trim()) return
    const payload = {
      hold_id: currentHold.hold_id,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      submitted_at: new Date().toISOString(),
    }
    try {
      const stored = window.localStorage.getItem(IDENTIFY_STORAGE_KEY)
      const list = stored ? (JSON.parse(stored) as unknown[]) : []
      list.push(payload)
      window.localStorage.setItem(IDENTIFY_STORAGE_KEY, JSON.stringify(list))
    } catch {
      // ignore
    }
    setSubmitMessage(
      'Identification saved locally. Hugging Face integration will be available later.',
    )
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
              <HoldViewer glbUrl={currentHold!.links.primaryAssetUrl} />
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
              {submitMessage && (
                <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                  {submitMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={!manufacturer.trim() || !model.trim()}
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

interface HoldViewerProps {
  glbUrl: string
}

function HoldViewer({ glbUrl }: HoldViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [2, 2, 2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          }
        >
          <HoldModel glbUrl={glbUrl} />
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  )
}

function HoldModel({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl)
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} />
}
