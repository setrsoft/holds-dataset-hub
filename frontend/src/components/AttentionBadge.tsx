import { AlertTriangle, BadgeAlert, FileWarning, ScanSearch } from 'lucide-react'

import { formatAttentionLabel } from '../lib/registry'

import type { HoldAttentionBucket } from '../types/registry'

const bucketStyles: Record<string, string> = {
  invalid_hold_type_reference:
    'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  invalid_manufacturer_reference:
    'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  invalid_metadata:
    'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  missing_mesh:
    'border-violet-400/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  unknown_hold_type:
    'border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  unknown_manufacturer:
    'border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  unknown_model:
    'border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

function renderBucketIcon(bucket: HoldAttentionBucket) {
  if (bucket === 'invalid_metadata') {
    return <FileWarning className="h-3.5 w-3.5" />
  }

  if (bucket === 'missing_mesh') {
    return <ScanSearch className="h-3.5 w-3.5" />
  }

  if (bucket.startsWith('invalid_')) {
    return <BadgeAlert className="h-3.5 w-3.5" />
  }

  return <AlertTriangle className="h-3.5 w-3.5" />
}

interface AttentionBadgeProps {
  bucket: HoldAttentionBucket
}

export function AttentionBadge({ bucket }: AttentionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${bucketStyles[bucket] ?? 'border-slate-300/60 bg-slate-200/60 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
    >
      {renderBucketIcon(bucket)}
      {formatAttentionLabel(bucket)}
    </span>
  )
}
