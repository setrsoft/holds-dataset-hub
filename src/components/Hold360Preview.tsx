import { useEffect, useRef, useState } from 'react'

/** Sprite layout for dataset 360° sheets (3072×3072 → 6×6 tiles at 512px). */
const COLS = 6
const ROWS = 6
const TOTAL_FRAMES = COLS * ROWS
const FRAME_INTERVAL_MS = 90

interface Hold360PreviewProps {
  spriteSheetUrl: string | null
  className?: string
}

export function Hold360Preview({ spriteSheetUrl, className }: Hold360PreviewProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [frame, setFrame] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !spriteSheetUrl) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { root: null, rootMargin: '48px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [spriteSheetUrl])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  function handleMouseEnter() {
    if (!isLoaded) {
      return
    }
    intervalRef.current = setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES)
    }, FRAME_INTERVAL_MS)
  }

  function handleMouseLeave() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setFrame(0)
  }

  const col = frame % COLS
  const row = Math.floor(frame / COLS)
  const bgX = col * (100 / (COLS - 1))
  const bgY = row * (100 / (ROWS - 1))

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 ${className ?? ''}`}
    >
      {spriteSheetUrl && isVisible ? (
        <>
          {!isLoaded && (
            <img
              src={spriteSheetUrl}
              alt=""
              className="hidden"
              onLoad={() => setIsLoaded(true)}
            />
          )}
          <div
            role="img"
            aria-label="360° hold preview, hover to rotate"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative h-full w-full min-h-0"
            style={{
              backgroundImage: isLoaded ? `url(${spriteSheetUrl})` : undefined,
              backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
              backgroundPosition: `${bgX}% ${bgY}%`,
              backgroundRepeat: 'no-repeat',
            }}
          >
            {!isLoaded && (
              <div className="flex h-full w-full min-h-[4.5rem] items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500 dark:border-slate-600 dark:border-t-blue-400" />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex h-full w-full min-h-[4.5rem] items-center justify-center">
          {spriteSheetUrl ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500 dark:border-slate-600 dark:border-t-blue-400" />
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
          )}
        </div>
      )}
    </div>
  )
}
