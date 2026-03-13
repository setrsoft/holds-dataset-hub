import { ChevronDown, ChevronRight, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'

import type { FilterOptions, HoldFilters } from '../types/registry'

interface FiltersProps {
  filters: HoldFilters
  options: FilterOptions
  onChange: (nextFilters: HoldFilters) => void
  /** When true, the filter controls are hidden by default; click header to expand. */
  defaultCollapsed?: boolean
}

export function Filters({
  filters,
  options,
  onChange,
  defaultCollapsed = false,
}: FiltersProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const manufacturerValue = filters.manufacturers[0] ?? ''
  const holdTypeValue = filters.holdTypes[0] ?? ''
  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Filters</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Quickly filter the registry.
            </p>
          </div>
        </button>
        {!collapsed && (
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
        )}
      </div>

      {!collapsed && (
      <div className="mt-5 space-y-6">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search
          </span>
          <span className="flex items-center gap-2 rounded-2xl border border-slate-300/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="ID, brand, model, labels..."
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
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
            <option value="all">All</option>
            <option value="ready">Clean</option>
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
          Show only holds needing attention
        </label>

        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Manufacturers
          </h3>
          <select
            value={manufacturerValue}
            onChange={(event) => {
              const value = event.target.value
              onChange({
                ...filters,
                manufacturers: value ? [value] : [],
              })
            }}
            className="mt-2 w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">All</option>
            {options.manufacturers.map((manufacturer) => (
              <option key={manufacturer} value={manufacturer}>
                {manufacturer}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Types</h3>
          <select
            value={holdTypeValue}
            onChange={(event) => {
              const value = event.target.value
              onChange({
                ...filters,
                holdTypes: value ? [value] : [],
              })
            }}
            className="mt-2 w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">All</option>
            {options.holdTypes.map((holdType) => (
              <option key={holdType} value={holdType}>
                {holdType}
              </option>
            ))}
          </select>
        </section>
      </div>
      )}
    </aside>
  )
}
