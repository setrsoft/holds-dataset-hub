import {
  buildDatasetTreeUrl,
  buildMetadataUrl,
  buildPrimaryAssetUrl,
} from './hf'

import type {
  DerivedHold,
  GlobalIndex,
  HoldAttentionBucket,
  HoldFilters,
  HoldRecord,
  RegistryView,
} from '../types/registry'

export const ATTENTION_BUCKET_LABELS: Record<string, string> = {
  invalid_hold_type_reference: 'Invalid type reference',
  invalid_manufacturer_reference: 'Invalid manufacturer reference',
  invalid_metadata: 'Invalid metadata',
  missing_mesh: 'Missing mesh',
  unknown_hold_type: 'Unknown type',
  unknown_manufacturer: 'Unknown manufacturer',
  unknown_model: 'Unknown model',
}

export function normalizeReferenceValue(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

export function formatHoldId(id: number) {
  return String(id).padStart(10, '0')
}

export function getNextHoldNumericId(index: GlobalIndex) {
  const lastIndex = index.metadata?.last_index
  if (typeof lastIndex === 'number' && Number.isFinite(lastIndex)) {
    return lastIndex + 1
  }

  return (
    index.holds.reduce((currentMax, hold) => {
      if (typeof hold.id === 'number' && Number.isFinite(hold.id)) {
        return Math.max(currentMax, hold.id)
      }

      const parsedFromHoldId = Number.parseInt(hold.hold_id, 10)
      return Number.isFinite(parsedFromHoldId)
        ? Math.max(currentMax, parsedFromHoldId)
        : currentMax
    }, 0) + 1
  )
}

function collectAttentionReasons(
  holdId: string,
  needsAttention: Record<string, string[]>,
): HoldAttentionBucket[] {
  return Object.entries(needsAttention)
    .filter(([, holdIds]) => holdIds.includes(holdId))
    .map(([bucket]) => bucket as HoldAttentionBucket)
}

function buildSearchText(hold: HoldRecord) {
  return [
    hold.id,
    hold.hold_id,
    hold.manufacturer,
    hold.model,
    hold.type,
    hold.size,
    ...(hold.labels ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function buildRegistryView(
  index: GlobalIndex,
  repoId: string,
  revision: string,
): RegistryView {
  const derivedHolds: DerivedHold[] = index.holds.map((hold) => {
    const attentionReasons = collectAttentionReasons(hold.hold_id, index.needs_attention)

    return {
      ...hold,
      status: attentionReasons.length > 0 ? 'needs_attention' : 'ready',
      attentionReasons,
      searchText: buildSearchText(hold),
      links: {
        datasetTreeUrl: buildDatasetTreeUrl(repoId, revision),
        hubFolderUrl: buildDatasetTreeUrl(repoId, revision, hold.hold_id),
        metadataUrl: buildMetadataUrl(repoId, revision, hold.hold_id),
        primaryAssetUrl: buildPrimaryAssetUrl(repoId, revision, hold.hold_id),
      },
    }
  })

  const manufacturerSet = new Set(
    [
      ...index.allowed_references.manufacturers,
      ...derivedHolds.map((hold) => hold.manufacturer ?? '').filter(Boolean),
    ]
      .map((entry) => entry.trim())
      .filter(Boolean),
  )

  const typeSet = new Set(
    [...index.allowed_references.hold_types, ...derivedHolds.map((hold) => hold.type ?? '').filter(Boolean)]
      .map((entry) => entry.trim())
      .filter(Boolean),
  )

  const nextNumericId = getNextHoldNumericId(index)

  return {
    raw: index,
    repoId,
    revision,
    holds: derivedHolds.sort((left, right) => right.id - left.id),
    filterOptions: {
      manufacturers: Array.from(manufacturerSet).sort((left, right) =>
        left.localeCompare(right),
      ),
      holdTypes: Array.from(typeSet).sort((left, right) => left.localeCompare(right)),
      statuses: ['ready', 'needs_attention'],
    },
    stats: {
      totalHolds: index.stats.total_holds ?? derivedHolds.length,
      needsAttention:
        index.stats.to_identify ??
        derivedHolds.filter((hold) => hold.status === 'needs_attention').length,
      cleanHolds: derivedHolds.filter((hold) => hold.status === 'ready').length,
    },
    nextNumericId,
    nextHoldId: formatHoldId(nextNumericId),
  }
}

export function filterHolds(holds: DerivedHold[], filters: HoldFilters) {
  return holds.filter((hold) => {
    const matchesSearch =
      filters.search.trim().length === 0 ||
      hold.searchText.includes(filters.search.trim().toLowerCase())
    const matchesManufacturer =
      filters.manufacturers.length === 0 ||
      filters.manufacturers.includes(hold.manufacturer ?? '')
    const matchesType =
      filters.holdTypes.length === 0 || filters.holdTypes.includes(hold.type ?? '')
    const matchesStatus =
      filters.status === 'all' ? true : hold.status === filters.status
    const matchesAttention =
      filters.needsAttentionOnly ? hold.status === 'needs_attention' : true

    return (
      matchesSearch &&
      matchesManufacturer &&
      matchesType &&
      matchesStatus &&
      matchesAttention
    )
  })
}

export function parseCommaSeparatedValues(input: string) {
  return Array.from(
    new Set(
      input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

export function formatAttentionLabel(bucket: HoldAttentionBucket) {
  return ATTENTION_BUCKET_LABELS[bucket] ?? bucket.replaceAll('_', ' ')
}

export function formatUnixTimestamp(value?: number) {
  if (!value) {
    return 'N/A'
  }

  return new Date(value * 1000).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
