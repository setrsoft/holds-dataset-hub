import { commit } from '@huggingface/hub'

import { ANONYMOUS_UPLOAD_URL } from './env'
import type { DerivedHold, NewHoldMetadata, UploadHoldParams, UploadHoldResult } from '../types/registry'

/**
 * Injects Authorization header into HuggingFace requests, bypassing SDK token
 * validation for OAuth JWTs. Non-HF URLs (e.g. S3 presigned upload URLs) are
 * passed through unchanged — adding an Authorization header there would cause
 * CORS preflight failures.
 */
function makeAuthedFetch(accessToken: string): typeof fetch {
  return (input, init = {}) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url
    if (!url.includes('huggingface.co') && !url.includes('.hf.co')) {
      return fetch(input, init as RequestInit)
    }
    const baseHeaders =
      input instanceof Request
        ? input.headers
        : (init as RequestInit).headers
    const headers = new Headers(baseHeaders)
    headers.set('Authorization', `Bearer ${accessToken}`)
    return fetch(input, { ...(init as RequestInit), headers })
  }
}

/** Resolves the HF username for an OAuth JWT token via direct API call. */
async function resolveUsername(accessToken: string): Promise<string> {
  const res = await fetch('https://huggingface.co/api/whoami-v2', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Authorization error (${res.status}). Please log in again.`)
  }
  const data = (await res.json()) as { name: string }
  return data.name
}

export interface UpdateHoldParams {
  repoId: string
  accessToken: string
  hold: DerivedHold
  updates: {
    manufacturer: string
    model: string
    type: string
    size: string
    replacementFile?: File | null
  }
}

function sanitizeSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function sanitizeFileName(name: string): string {
  const withoutPath = name.split(/[/\\]/).pop() ?? name
  return sanitizeSegment(withoutPath)
}

/**
 * Returns a repo-safe relative path for the file.
 * When the file comes from a directory picker (webkitRelativePath), preserves
 * the folder structure; otherwise uses the file name only (flat).
 */
export function getFileRelativePath(file: File): string {
  const raw =
    typeof (file as File & { webkitRelativePath?: string }).webkitRelativePath ===
    'string'
      ? (file as File & { webkitRelativePath: string }).webkitRelativePath
      : ''
  if (!raw.trim()) {
    return sanitizeFileName(file.name)
  }
  const segments = raw
    .split(/[/\\]/)
    .filter((s) => s.length > 0 && s !== '.' && s !== '..')
    .map(sanitizeSegment)
    .filter(Boolean)
  if (segments.length === 0) {
    return sanitizeFileName(file.name)
  }
  return segments.join('/')
}

export async function updateHold({
  repoId,
  accessToken,
  hold,
  updates,
}: UpdateHoldParams): Promise<UploadHoldResult> {
  const username = await resolveUsername(accessToken)

  // ── File-replacement path ──────────────────────────────────────────────────
  // Use the SDK for binary files so they go through the LFS pipeline correctly.
  if (updates.replacementFile) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { links, attentionReasons, searchText, status, ...holdRecord } = hold
    const updatedMetadata = {
      ...holdRecord,
      manufacturer: updates.manufacturer,
      model: updates.model,
      type: updates.type,
      size: updates.size,
      last_update: Math.floor(Date.now() / 1000),
    }

    const pendingFolderId =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)) || 'pending'
    const pendingPathPrefix = `pending/${pendingFolderId}`

    const metadataBlob = new Blob([`${JSON.stringify(updatedMetadata, null, 2)}\n`], {
      type: 'application/json',
    })

    const result = await commit({
      fetch: makeAuthedFetch(accessToken),
      branch: 'staging',
      isPullRequest: true,
      repo: { type: 'dataset', name: repoId },
      title: `Propose file replacement for hold ${hold.hold_id}`,
      description: `Contribution via Registry Frontend by ${username ?? 'community user'}. Target: staging branch.`,
      useWebWorkers: false,
      useXet: false,
      operations: [
        { operation: 'addOrUpdate', path: `${pendingPathPrefix}/metadata.json`, content: metadataBlob },
        {
          operation: 'addOrUpdate',
          path: `${pendingPathPrefix}/${getFileRelativePath(updates.replacementFile)}`,
          content: updates.replacementFile,
        },
      ],
    })

    return {
      holdId: hold.hold_id,
      commitUrl: result?.pullRequestUrl,
    }
  }

  // ── Votes path ─────────────────────────────────────────────────────────────
  // Bypass the @huggingface/hub SDK and call the HF commit API directly.
  // The SDK's preupload pipeline produces empty PRs (+0 -0) for small JSON
  // files that already exist on the target branch.

  // Each save is a standalone vote — the indexer squashes them on its own.
  // Writing only the current user's vote with a millisecond timestamp guarantees
  // a unique git-blob SHA every time, avoiding empty PRs.
  const votePayload = {
    [username ?? 'anonymous']: {
      manufacturer: updates.manufacturer,
      model: updates.model,
      type: updates.type,
      size: updates.size,
      timestamp: Date.now(),
    },
  }

  const votesContent = `${JSON.stringify(votePayload, null, 2)}\n`

  // Encode content to base64 (btoa is available in all modern browsers).
  const bytes = new TextEncoder().encode(votesContent)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Content = btoa(binary)

  const commitTitle = `Vote on metadata for hold ${hold.hold_id}`
  const ndjsonBody = [
    JSON.stringify({
      key: 'header',
      value: {
        summary: commitTitle,
        description: `Contribution via Registry Frontend by ${username ?? 'community user'}. Target: staging branch.`,
      },
    }),
    JSON.stringify({
      key: 'file',
      value: {
        content: base64Content,
        path: `${hold.hold_id}/votes.json`,
        encoding: 'base64',
      },
    }),
  ].join('\n')

  const commitResponse = await fetch(
    `https://huggingface.co/api/datasets/${repoId}/commit/staging?create_pr=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjsonBody,
    }
  )

  if (!commitResponse.ok) {
    const errorText = await commitResponse.text().catch(() => String(commitResponse.status))
    throw new Error(`Failed to save vote (${commitResponse.status}): ${errorText}`)
  }

  const commitResult = (await commitResponse.json()) as { pullRequestUrl?: string }

  return {
    holdId: hold.hold_id,
    commitUrl: commitResult.pullRequestUrl,
  }
}

export async function uploadHold({
  repoId,
  accessToken,
  hold,
}: UploadHoldParams): Promise<UploadHoldResult> {
  const username = await resolveUsername(accessToken)

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
    fetch: makeAuthedFetch(accessToken),
    branch: 'staging',
    isPullRequest: true,
    repo: {
      type: 'dataset',
      name: repoId,
    },
    title: `Add hold ${hold.hold_id}`,
    description: `Contribution via Registry Frontend by ${username ?? 'community user'}. Target: staging branch for daily squash.`,
    useWebWorkers: false,
    useXet: false,
    operations: [
      {
        operation: 'addOrUpdate',
        path: `${pendingPathPrefix}/metadata.json`,
        content: metadataBlob,
      },
      ...hold.uploadFiles.map((file: File) => {
        const relativePath = getFileRelativePath(file)
        const uniquePath = getUniquePath(`${pendingPathPrefix}/${relativePath}`)
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

export async function uploadHoldAnonymous(
  hold: NewHoldMetadata,
): Promise<UploadHoldResult> {
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
    const path = getFileRelativePath(file)
    formData.append('files', file, path)
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
