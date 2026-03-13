import { Star } from 'lucide-react'

const MAX_STARS = 5

interface StarRatingProps {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function StarRating({
  label,
  value,
  onChange,
  disabled = false,
}: StarRatingProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        {Array.from({ length: MAX_STARS }, (_, i) => {
          const starValue = i + 1
          const filled = value >= starValue
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (value === starValue) {
                  onChange(0)
                } else {
                  onChange(starValue)
                }
              }}
              className="rounded p-0.5 text-2xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
              aria-pressed={value === starValue}
            >
              <Star
                className={
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-slate-300 dark:text-slate-600'
                }
                size={28}
                strokeWidth={1.5}
              />
            </button>
          )
        })}
      </div>
      {value > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {value} / {MAX_STARS}
        </p>
      )}
    </div>
  )
}
