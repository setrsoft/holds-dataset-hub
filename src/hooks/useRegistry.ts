import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_DATASET_REPO_ID, DEFAULT_REVISION, fetchGlobalIndex } from '../lib/hf'
import { buildRegistryView } from '../lib/registry'

import type { RegistryView } from '../types/registry'

interface UseRegistryOptions {
  repoId?: string
  revision?: string
}

export function useRegistry(options: UseRegistryOptions = {}) {
  const repoId = options.repoId ?? DEFAULT_DATASET_REPO_ID
  const revision = options.revision ?? DEFAULT_REVISION

  const [data, setData] = useState<RegistryView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      try {
        const index = await fetchGlobalIndex(repoId, revision, signal)
        setData(buildRegistryView(index, repoId, revision))
      } catch (unknownError) {
        if (signal?.aborted) {
          return
        }

        const message =
          unknownError instanceof Error
            ? unknownError.message
            : 'An unknown error occurred while loading the index.'

        setError(message)
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [repoId, revision],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  return {
    data,
    error,
    isLoading,
    refresh: () => load(),
    repoId,
    revision,
  }
}
