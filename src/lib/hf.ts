import { commit, whoAmI } from '@huggingface/hub'

import { ANONYMOUS_UPLOAD_URL, HF_ANONYMOUS_REPO_ID, HF_DATASET_REPO_ID, HF_REVISION } from './env'
import type { GlobalIndex, NewHoldMetadata, UploadHoldParams, UploadHoldResult } from '../types/registry'

export const DEFAULT_DATASET_REPO_ID = HF_DATASET_REPO_ID
export const ANONYMOUS_CONTRIBUTIONS_REPO_ID = HF_ANONYMOUS_REPO_ID
export const DEFAULT_REVISION = HF_REVISION
export const HF_TOKEN_STORAGE_KEY = 'settersoft-registry.hf-token'

const HUGGING_FACE_BASE_URL = 'https://huggingface.co'

export function buildTrainJsonlUrl(
  repoId: string = DEFAULT_DATASET_REPO_ID,
  revision: string = DEFAULT_REVISION,
) {
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/resolve/${revision}/train.jsonl`
}

export function buildMetaGlobalIndexUrl(
  repoId: string = DEFAULT_DATASET_REPO_ID,
  revision: string = DEFAULT_REVISION,
) {
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/resolve/${revision}/meta/global_index.json`
}

export function buildDatasetTreeUrl(
  repoId: string,
  revision: string,
  holdId?: string,
) {
  const suffix = holdId ? `/${holdId}` : ''
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/tree/${revision}${suffix}`
}

export function buildMetadataUrl(repoId: string, revision: string, holdId: string) {
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/blob/${revision}/${holdId}/metadata.json`
}

export function buildPrimaryAssetUrl(repoId: string, revision: string, holdId: string) {
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/resolve/${revision}/${holdId}/hold.glb`
}

export async function fetchGlobalIndex(
  repoId: string = DEFAULT_DATASET_REPO_ID,
  revision: string = DEFAULT_REVISION,
  signal?: AbortSignal,
): Promise<GlobalIndex> {
  const [trainResponse, metaResponse] = await Promise.all([
    fetch(buildTrainJsonlUrl(repoId, revision), {
      headers: {
        Accept: 'text/plain',
      },
      signal,
    }),
    fetch(buildMetaGlobalIndexUrl(repoId, revision), {
      headers: {
        Accept: 'application/json',
      },
      signal,
    }),
  ])

  if (!trainResponse.ok) {
    throw new Error(
      `Unable to load train.jsonl (${trainResponse.status} ${trainResponse.statusText}).`,
    )
  }

  if (!metaResponse.ok) {
    throw new Error(
      `Unable to load meta/global_index.json (${metaResponse.status} ${metaResponse.statusText}).`,
    )
  }

  const trainText = await trainResponse.text()
  const holds = trainText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line))

  const metaIndex = (await metaResponse.json()) as Omit<GlobalIndex, 'holds'>

  return {
    ...metaIndex,
    holds,
  }
}

export function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(HF_TOKEN_STORAGE_KEY) ?? ''
}

export function saveAccessToken(token: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(HF_TOKEN_STORAGE_KEY, token)
}

export function clearAccessToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(HF_TOKEN_STORAGE_KEY)
}

export async function validateAccessToken(accessToken: string) {
  const result = await whoAmI({ accessToken })
  return result.name
}

export async function uploadHold({
  repoId,
  accessToken,
  hold,
}: UploadHoldParams): Promise<UploadHoldResult> {
  const { name: username } = await whoAmI({ accessToken })

  const pendingFolderId =
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)) || 'pending'

  const pendingPathPrefix = `pending/${pendingFolderId}`

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { uploadFiles: _uploadFiles, ...holdMetadata } = hold
  const metadataBlob = new Blob([`${JSON.stringify(holdMetadata, null, 2)}\n`], {
    type: 'application/json',
  })

  const usedPaths = new Set<string>()

  function sanitizeFileName(name: string): string {
    const withoutPath = name.split(/[/\\]/).pop() ?? name
    return withoutPath.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  function getUniquePath(basePath: string): string {
    if (!usedPaths.has(basePath)) {
      usedPaths.add(basePath)
      return basePath
    }

    const lastDotIndex = basePath.lastIndexOf('.')
    const base =
      lastDotIndex === -1 ? basePath : basePath.substring(0, lastDotIndex)
    const ext = lastDotIndex === -1 ? '' : basePath.substring(lastDotIndex)

    let counter = 2
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${base}-${counter}${ext}`
      if (!usedPaths.has(candidate)) {
        usedPaths.add(candidate)
        return candidate
      }
      counter += 1
    }
  }

  const result = await commit({
    accessToken,
    branch: 'staging',
    isPullRequest: true,
    repo: {
      type: 'dataset',
      name: repoId,
    },
    title: `Add hold ${hold.hold_id}`,
    description: `Contribution via Registry Frontend by ${username ?? 'community user'}. Target: staging branch for daily squash.`,
    useWebWorkers: true,
    operations: [
      {
        operation: 'addOrUpdate',
        path: `${pendingPathPrefix}/metadata.json`,
        content: metadataBlob,
      },
      ...hold.uploadFiles.map((file: File) => {
        const sanitized = sanitizeFileName(file.name)
        const uniquePath = getUniquePath(`${pendingPathPrefix}/${sanitized}`)
        return {
          operation: 'addOrUpdate' as const,
          path: uniquePath,
          content: file,
        }
      }),
    ],
  })

  return {
    holdId: hold.hold_id,
    commitUrl: result?.pullRequestUrl,
  }
}

export async function uploadHoldAnonymous(hold: NewHoldMetadata): Promise<UploadHoldResult> {
  if (!ANONYMOUS_UPLOAD_URL) {
    throw new Error('Anonymous uploads are not configured for this deployment.')
  }

  const formData = new FormData()
  formData.append('hold_id', hold.hold_id)
  formData.append('id', String(hold.id))
  formData.append('manufacturer', hold.manufacturer)
  formData.append('model', hold.model)
  formData.append('type', hold.type)
  formData.append('size', hold.size)
  formData.append('labels', JSON.stringify(hold.labels))
  formData.append('created_at', String(hold.created_at))
  formData.append('last_update', String(hold.last_update))
  formData.append('timezone_offset', hold.timezone_offset)
  formData.append('color_of_scan', hold.color_of_scan)
  formData.append('available_colors', JSON.stringify(hold.available_colors))
  if (hold.note) {
    formData.append('note', hold.note)
  }
  for (const file of hold.uploadFiles) {
    formData.append('files[]', file)
  }

  const response = await fetch(ANONYMOUS_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let detail = `Upload failed (${response.status})`
    try {
      const json = (await response.json()) as { detail?: string }
      if (json.detail) detail = json.detail
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  const data = (await response.json()) as { commit_url?: string }
  return {
    holdId: hold.hold_id,
    commitUrl: data.commit_url,
  }
}
