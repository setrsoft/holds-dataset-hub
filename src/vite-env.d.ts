/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HF_ANONYMOUS_REPO_ID?: string
  readonly VITE_HF_ANONYMOUS_TOKEN?: string
  readonly VITE_HF_DATASET_REPO_ID?: string
  readonly VITE_HF_REVISION?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
