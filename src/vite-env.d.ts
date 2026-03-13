/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HF_ANONYMOUS_REPO_ID?: string
  readonly VITE_HF_DATASET_REPO_ID?: string
  readonly VITE_HF_REVISION?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_VOTE_WEBHOOK_URL?: string
  readonly VITE_VOTE_WEBHOOK_SECRET?: string
  readonly VITE_ANONYMOUS_UPLOAD_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
