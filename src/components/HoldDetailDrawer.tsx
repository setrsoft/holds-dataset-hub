import { ExternalLink, FileJson, X } from 'lucide-react'

import { formatUnixTimestamp } from '../lib/registry'
import { AttentionBadge } from './AttentionBadge'
import { HoldGlbViewer } from './HoldGlbViewer'

import type { DerivedHold } from '../types/registry'

interface HoldDetailDrawerProps {
  hold: DerivedHold | null
  onClose: () => void
}

const fallbackValue = 'N/A'

export function HoldDetailDrawer({ hold, onClose }: HoldDetailDrawerProps) {
  if (!hold) {
    return null
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300/80 p-2 text-slate-500 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
          <DetailItem label="Model" value={hold.model ?? fallbackValue} />
          <DetailItem label="Type" value={hold.type ?? fallbackValue} />
          <DetailItem label="Size" value={hold.size ?? fallbackValue} />
          <DetailItem label="Last update" value={formatUnixTimestamp(hold.last_update)} />
        </div>


        {/* 
        <section className="mt-6 rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Colors and labels
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {(hold.available_colors ?? []).map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <span
                  className="h-3 w-3 rounded-full border border-white/60 dark:border-slate-950/60"
                  style={{ backgroundColor: color }}
                />
                {color}
              </span>
            ))}
            {(!hold.available_colors || hold.available_colors.length === 0) && (
              <span className="text-sm text-slate-500 dark:text-slate-400">No color</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(hold.labels ?? []).map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {label}
              </span>
            ))}
            {(!hold.labels || hold.labels.length === 0) && (
              <span className="text-sm text-slate-500 dark:text-slate-400">No labels</span>
            )}
          </div>
        </section>
        */}

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
