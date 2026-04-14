import { commit, whoAmI } from '@huggingface/hub'

import { ANONYMOUS_UPLOAD_URL } from './env'
import type { DerivedHold, NewHoldMetadata, UploadHoldParams, UploadHoldResult } from '../types/registry'

export interface UpdateHoldParams {
  repoId: string
  accessToken: string
  hold: DerivedHold
  updates: {
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
  // Strip DerivedHold-only fields, keep only HoldRecord fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { links, attentionReasons, searchText, status, ...holdRecord } = hold

  const updatedMetadata = {
    ...holdRecord,
    model: updates.model,
    type: updates.type,
    size: updates.size,
    last_update: Math.floor(Date.now() / 1000),
  }

  const metadataBlob = new Blob([`${JSON.stringify(updatedMetadata, null, 2)}\n`], {
    type: 'application/json',
  })

  const operations: Array<{ operation: 'addOrUpdate'; path: string; content: Blob | File }> = [
    {
      operation: 'addOrUpdate',
      path: `${hold.hold_id}/metadata.json`,
      content: metadataBlob,
    },
  ]

  if (updates.replacementFile) {
    operations.push({
      operation: 'addOrUpdate',
      path: `${hold.hold_id}/${getFileRelativePath(updates.replacementFile)}`,
      content: updates.replacementFile,
    })
  }

  const result = await commit({
    accessToken,
    branch: 'staging',
    isPullRequest: true,
    repo: {
      type: 'dataset',
      name: repoId,
    },
    title: `Update hold ${hold.hold_id}`,
    useWebWorkers: true,
    operations,
  })

  return {
    holdId: hold.hold_id,
    commitUrl: result?.pullRequestUrl,
  }
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
