import { useState } from 'react'
import { Star } from 'lucide-react'

const STARS = [1, 2, 3, 4, 5] as const

type StarRatingProps = {
  value: number
  onChange?: (next: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

export function StarRating({ value, onChange, readOnly, size = 'md', className, ariaLabel }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const interactive = Boolean(onChange) && !readOnly
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className ?? ''}`} aria-label={ariaLabel}>
      {STARS.map((star) => {
        const active = hovered !== null ? star <= hovered : star <= value
        return (
          <button
            key={star}
            type="button"
            className={`transition ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(null)}
            onClick={() => interactive && onChange?.(star)}
            disabled={!interactive}
            aria-pressed={interactive ? active : undefined}
            aria-label={interactive ? `Оценка ${star}` : undefined}
          >
            <Star
              className={`${iconSize} ${active ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)]' : 'text-gray-300'} ${
                interactive ? 'transition-transform hover:scale-105' : ''
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
