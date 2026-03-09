import { RotateCcw, Search } from 'lucide-react'

import type { FilterOptions, HoldFilters } from '../types/registry'

interface FiltersProps {
  filters: HoldFilters
  options: FilterOptions
  onChange: (nextFilters: HoldFilters) => void
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]
}

export function Filters({ filters, options, onChange }: FiltersProps) {
  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Filtres</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Trie rapidement la registry.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              search: '',
              manufacturers: [],
              holdTypes: [],
              status: 'all',
              needsAttentionOnly: false,
            })
          }
          className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="mt-5 space-y-6">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Recherche
          </span>
          <span className="flex items-center gap-2 rounded-2xl border border-slate-300/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="ID, marque, modèle, labels..."
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Statut
          </span>
          <select
            value={filters.status}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as HoldFilters['status'],
              })
            }
            className="w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">Tous</option>
            <option value="ready">Propres</option>
            <option value="needs_attention">Needs attention</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-300/80 px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={filters.needsAttentionOnly}
            onChange={(event) =>
              onChange({ ...filters, needsAttentionOnly: event.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Afficher seulement les prises à corriger
        </label>

        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Manufacturers
          </h3>
          <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
            {options.manufacturers.map((manufacturer) => (
              <label
                key={manufacturer}
                className="flex items-center gap-3 rounded-xl px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={filters.manufacturers.includes(manufacturer)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      manufacturers: toggleValue(filters.manufacturers, manufacturer),
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                {manufacturer}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Types</h3>
          <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
            {options.holdTypes.map((holdType) => (
              <label
                key={holdType}
                className="flex items-center gap-3 rounded-xl px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={filters.holdTypes.includes(holdType)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      holdTypes: toggleValue(filters.holdTypes, holdType),
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                {holdType}
              </label>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
