# SetterSoft Registry

SetterSoft Registry is a Single Page Application used to explore and contribute to the climbing holds dataset hosted on Hugging Face: [`setrsoft/climbing-holds`](https://huggingface.co/datasets/setrsoft/climbing-holds).

The project combines:

- a React + Vite frontend for browsing the registry and uploading new holds
- a Tailwind CSS UI with a technical dashboard layout
- a Python indexing script that rebuilds `global_index.json` from dataset metadata
- GitHub Actions workflows for GitHub Pages deployment and scheduled index updates

## Features

- Load `global_index.json` directly from Hugging Face
- Display registry statistics such as total holds, holds needing attention, and clean models
- Browse the dataset in a filterable grid
- Filter by manufacturer, hold type, and status
- Highlight incomplete or problematic entries with visible badges
- Inspect a hold in a detail panel with direct links to Hugging Face
- Upload a new hold with metadata and a `.blend` or `.glb` file
- Store the user's Hugging Face token locally in `localStorage` for future uploads

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Lucide React
- `@huggingface/hub`
- Python 3.10 for scheduled index generation

## Project Structure

```text
.
├── .github/workflows/
│   ├── deploy_registry.yml
│   └── hf_indexation.yml
├── scripts/
│   └── update_global_index.py
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── index.html
├── package.json
└── vite.config.ts
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run linting:

```bash
npm run lint
```

Build the production bundle:

```bash
npm run build
```

Run the full local check:

```bash
npm run check
```

## Frontend Configuration

The frontend works without a backend and reads the Hugging Face dataset directly from the browser.

Optional Vite environment variables:

```bash
VITE_HF_DATASET_REPO_ID=setrsoft/climbing-holds
VITE_HF_REVISION=main
VITE_BASE_PATH=/holds-dataset-hub/
```

Defaults are already configured for the current dataset and main branch.

## Upload Workflow

The "Add Hold" flow is browser-only and uses the Hugging Face Hub API directly.

- The user provides a Hugging Face access token once
- The token is stored in `localStorage`
- The app computes the next hold ID from `metadata.last_index` when available, otherwise falls back to `max(holds.id) + 1`
- The user fills in hold metadata in the form
- The user uploads a `.blend` or `.glb` file
- The app creates a commit in the dataset repository using the Hugging Face commit API

Important notes:

- uploads happen immediately on the dataset
- the new hold may not appear in the gallery right away
- `global_index.json` is refreshed later by the scheduled indexation workflow

## Index Generation

The file `scripts/update_global_index.py` rebuilds `global_index.json` by reading `metadata.json` files from the Hugging Face dataset.

It is executed by the GitHub Actions workflow:

- `.github/workflows/hf_indexation.yml`

Current behavior:

- manual trigger supported
- daily scheduled execution
- requires the `HF_TOKEN` repository secret

## GitHub Pages Deployment

The frontend is deployed as a static site on GitHub Pages using:

- `.github/workflows/deploy_registry.yml`

The deployment workflow:

- installs Node.js dependencies
- builds the Vite application
- uploads `dist/`
- deploys the artifact to GitHub Pages

## Security Note

The Hugging Face token is intentionally kept on the client side for this first version. This improves usability but is less secure than a backend or proxy-based approach.

If you use the upload flow:

- prefer a token with only the permissions you need
- clear the saved token when using a shared machine

## Dataset

- Hugging Face dataset: [`setrsoft/climbing-holds`](https://huggingface.co/datasets/setrsoft/climbing-holds)

## License

MIT license
