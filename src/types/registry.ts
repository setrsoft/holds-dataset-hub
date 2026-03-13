export type HoldStatus = 'ready' | 'needs_attention'

export type HoldAttentionBucket =
  | 'invalid_hold_type_reference'
  | 'invalid_manufacturer_reference'
  | 'invalid_metadata'
  | 'missing_mesh'
  | 'unknown_hold_type'
  | 'unknown_manufacturer'
  | 'unknown_model'
  | (string & {})

export interface GlobalIndexMetadata {
  last_index?: number
}

export interface RegistryStatsSnapshot {
  total_holds: number
  to_identify: number
}

export interface AllowedReferences {
  manufacturers: string[]
  hold_types: string[]
  status?: string[]
}

export interface HoldRecord {
  id: number
  hold_id: string
  created_at?: number
  last_update?: number
  timezone_offset?: string
  type?: string | null
  labels?: string[]
  color_of_scan?: string | null
  available_colors?: string[]
  manufacturer?: string | null
  model?: string | null
  size?: string | null
  note?: string | null
  status?: string | null
  text?: string | null
}

export interface GlobalIndex {
  project: string
  allowed_references: AllowedReferences
  stats: RegistryStatsSnapshot
  needs_attention: Record<string, string[]>
  holds: HoldRecord[]
  last_updated?: string
  metadata?: GlobalIndexMetadata
}

export interface HoldLinks {
  hubFolderUrl: string
  metadataUrl: string
  primaryAssetUrl: string
  datasetTreeUrl: string
}

export interface DerivedHold extends HoldRecord {
  status: HoldStatus
  attentionReasons: HoldAttentionBucket[]
  searchText: string
  links: HoldLinks
}

export interface RegistryStats {
  totalHolds: number
  needsAttention: number
  cleanHolds: number
}

export interface CreationOptions {
  manufacturers: string[]
  holdTypes: string[]
  models: string[]
  sizes: string[]
}

export interface FilterOptions {
  manufacturers: string[]
  holdTypes: string[]
  statuses: HoldStatus[]
}

export interface RegistryView {
  raw: GlobalIndex
  repoId: string
  revision: string
  holds: DerivedHold[]
  stats: RegistryStats
  filterOptions: FilterOptions
  creationOptions: CreationOptions
  nextNumericId: number
  nextHoldId: string
}

export interface HoldFilters {
  search: string
  manufacturers: string[]
  holdTypes: string[]
  status: 'all' | HoldStatus
  needsAttentionOnly: boolean
}

export interface NewHoldMetadata extends HoldRecord {
  id: number
  hold_id: string
  created_at: number
  last_update: number
  timezone_offset: string
  type: string
  labels: string[]
  color_of_scan: string
  available_colors: string[]
  manufacturer: string
  model: string
  size: string
  note?: string | null
  uploadFiles: File[]
}

export interface UploadHoldParams {
  repoId: string
  accessToken: string
  hold: NewHoldMetadata
}

export interface UploadHoldResult {
  commitUrl?: string
  holdId: string
}
