import {
  BadgeHelp,
  Circle,
  Package,
  ScanSearch,
  Square,
  Triangle,
} from 'lucide-react'

import { formatUnixTimestamp, normalizeReferenceValue } from '../lib/registry'
import { AttentionBadge } from './AttentionBadge'
import { Hold360Preview } from './Hold360Preview'

import type { DerivedHold } from '../types/registry'

function renderTypeIcon(type?: string | null) {
  switch (normalizeReferenceValue(type)) {
    case 'jug':
      return <Circle className="h-5 w-5" />
    case 'crimp':
      return <Square className="h-5 w-5" />
    case 'sloper':
      return <Triangle className="h-5 w-5" />
    case 'pinch':
      return <ScanSearch className="h-5 w-5" />
    case 'volume':
      return <Package className="h-5 w-5" />
    default:
      return <BadgeHelp className="h-5 w-5" />
  }
}

interface HoldCardProps {
  hold: DerivedHold
  onSelect: (hold: DerivedHold) => void
}

export function HoldCard({ hold, onSelect }: HoldCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hold)}
      className={`w-full rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        hold.status === 'needs_attention'
          ? 'border-amber-300/80 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/5'
          : 'border-slate-200/80 bg-white/85 dark:border-slate-800 dark:bg-slate-900/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Hold {hold.hold_id}
        </p>
        <span className="inline-flex shrink-0 rounded-2xl border border-slate-300/70 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {renderTypeIcon(hold.type)}
        </span>
      </div>

      <div className="mt-3 flex w-full justify-center">
        <Hold360Preview
          spriteSheetUrl={hold.links.hold360SpriteUrl}
          className="h-44 w-44 max-h-[min(100%,11rem)] max-w-[min(100%,11rem)] shadow-md sm:h-52 sm:w-52 sm:max-h-[13rem] sm:max-w-[13rem]"
        />
      </div>

      <h3 className="mt-3 text-center text-lg font-semibold text-slate-950 dark:text-white">
        {hold.manufacturer ?? 'unknown'} / {hold.model ?? 'unknown'}
      </h3>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="rounded-full bg-slate-900/5 px-3 py-1 dark:bg-white/5">
          Type: {hold.type ?? 'unknown'}
        </span>
        <span className="rounded-full bg-slate-900/5 px-3 py-1 dark:bg-white/5">
          Size: {hold.size ?? 'unknown'}
        </span>
        <span className="rounded-full bg-slate-900/5 px-3 py-1 dark:bg-white/5">
          ID: {hold.id}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {hold.attentionReasons.length > 0 ? (
          hold.attentionReasons.slice(0, 2).map((bucket) => (
            <AttentionBadge key={bucket} bucket={bucket} />
          ))
        ) : (
          <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Clean
          </span>
        )}
        {hold.attentionReasons.length > 2 && (
          <span className="inline-flex rounded-full border border-slate-300/80 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            +{hold.attentionReasons.length - 2}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(hold.available_colors ?? []).slice(0, 4).map((color) => (
            <span
              key={color}
              className="h-5 w-5 rounded-full border border-white/60 shadow-sm dark:border-slate-950/60"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Updated: {formatUnixTimestamp(hold.last_update)}
        </p>
      </div>
    </button>
  )
}
