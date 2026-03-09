import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repoName = env.GITHUB_REPOSITORY?.split('/')[1] ?? 'holds-dataset-hub'
  const basePath = env.VITE_BASE_PATH || (mode === 'production' ? `/${repoName}/` : '/')

  return {
    plugins: [react(), tailwindcss()],
    base: basePath,
  }
})
