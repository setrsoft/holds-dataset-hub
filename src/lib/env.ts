/**
 * Centralized environment configuration.
 * Values come from Vite env (e.g. .env or GitHub Actions secrets at build time).
 * Upload token for normal uploads is from the UI or localStorage.
 * Anonymous contributions are routed through a backend endpoint (VITE_ANONYMOUS_UPLOAD_URL).
 * Empty strings (e.g. unset GitHub secrets) fall back to defaults.
 */

function orDefault(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

export const HF_DATASET_REPO_ID = orDefault(
  import.meta.env.VITE_HF_DATASET_REPO_ID,
  'setrsoft/climbing-holds',
)
export const HF_REVISION = orDefault(import.meta.env.VITE_HF_REVISION, 'main')
export const HF_ANONYMOUS_REPO_ID = orDefault(
  import.meta.env.VITE_HF_ANONYMOUS_REPO_ID,
  'eberling1/climbingholds-anonymous-contributions',
)
export const BASE_PATH = orDefault(import.meta.env.VITE_BASE_PATH, '')
/** Base URL for the vote webhook (POST). Defaults to same-origin /vote. */
export const VOTE_WEBHOOK_URL = orDefault(
  import.meta.env.VITE_VOTE_WEBHOOK_URL,
  '/vote',
)
/** Optional secret sent as X-Webhook-Secret when calling the vote webhook (e.g. HF Space). */
export const VOTE_WEBHOOK_SECRET = orDefault(
  import.meta.env.VITE_VOTE_WEBHOOK_SECRET,
  '',
)
/** Backend endpoint for anonymous hold contributions. Empty = feature disabled. */
export const ANONYMOUS_UPLOAD_URL = orDefault(
  import.meta.env.VITE_ANONYMOUS_UPLOAD_URL,
  '',
)
