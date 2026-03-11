import { Package, ShieldCheck, TriangleAlert } from 'lucide-react'

import type { RegistryStats } from '../types/registry'

interface StatsCardsProps {
  stats: RegistryStats
}

const cards = [
  {
    key: 'total',
    label: 'Total holds',
    accent:
      'from-sky-500/20 to-cyan-500/10 text-sky-700 dark:text-sky-300',
    icon: Package,
    value: (stats: RegistryStats) => stats.totalHolds,
  },
  {
    key: 'attention',
    label: 'Needs attention',
    accent:
      'from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300',
    icon: TriangleAlert,
    value: (stats: RegistryStats) => stats.needsAttention,
  },
  {
    key: 'clean',
    label: 'Clean holds',
    accent:
      'from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300',
    icon: ShieldCheck,
    value: (stats: RegistryStats) => stats.cleanHolds,
  },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                  {card.value(stats)}
                </p>
              </div>
              <span
                className={`inline-flex rounded-2xl bg-gradient-to-br p-3 ${card.accent}`}
              >
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
