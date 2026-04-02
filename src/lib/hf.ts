import { whoAmI } from '@huggingface/hub'

import { HF_ANONYMOUS_REPO_ID, HF_DATASET_REPO_ID, HF_REVISION } from './env'
import type { GlobalIndex } from '../types/registry'

export { uploadHold, uploadHoldAnonymous } from './uploadHold'

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

/** Hex filename key for `360/{key}.png` (no leading `#`, lowercase). */
export function buildHold360SpriteUrl(
  repoId: string,
  revision: string,
  holdId: string,
  colorHexKey: string,
) {
  return `${HUGGING_FACE_BASE_URL}/datasets/${repoId}/resolve/${revision}/${holdId}/360/${colorHexKey}.png`
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
