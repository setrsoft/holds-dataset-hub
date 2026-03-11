import { commit, whoAmI } from '@huggingface/hub'

import type { GlobalIndex, UploadHoldParams, UploadHoldResult } from '../types/registry'

export const DEFAULT_DATASET_REPO_ID =
  import.meta.env.VITE_HF_DATASET_REPO_ID ?? 'setrsoft/climbing-holds'
export const DEFAULT_REVISION = import.meta.env.VITE_HF_REVISION ?? 'main'
export const HF_TOKEN_STORAGE_KEY = 'settersoft-registry.hf-token'

const HUGGING_FACE_BASE_URL = 'https://huggingface.co'

export function buildRawIndexUrl(
  repoId: string = DEFAULT_DATASET_REPO_ID,
  revision: string = DEFAULT_REVISION,
) {
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/resolve/${revision}/global_index.json`
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
  const response = await fetch(buildRawIndexUrl(repoId, revision), {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(
      `Unable to load index (${response.status} ${response.statusText}).`,
    )
  }

  return (await response.json()) as GlobalIndex
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
  revision,
  accessToken,
  hold,
  assetFile,
}: UploadHoldParams): Promise<UploadHoldResult> {
  const normalizedAssetName = assetFile.name.toLowerCase().endsWith('.blend')
    ? 'hold.blend'
    : 'hold.glb'

  const metadataBlob = new Blob([`${JSON.stringify(hold, null, 2)}\n`], {
    type: 'application/json',
  })

  const result = await commit({
    accessToken,
    branch: revision,
    repo: {
      type: 'dataset',
      name: repoId,
    },
    title: `Add hold ${hold.hold_id}`,
    description: `Add climbing hold ${hold.hold_id} (${hold.manufacturer} ${hold.model})`,
    useWebWorkers: true,
    operations: [
      {
        operation: 'addOrUpdate',
        path: `${hold.hold_id}/metadata.json`,
        content: metadataBlob,
      },
      {
        operation: 'addOrUpdate',
        path: `${hold.hold_id}/${normalizedAssetName}`,
        content: assetFile,
      },
    ],
  })

  return {
    holdId: hold.hold_id,
    commitUrl: result?.commit.url,
  }
}
