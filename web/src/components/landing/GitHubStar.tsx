import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics'

export const REPO = 'doitrous/hx'
export const REPO_URL = `https://github.com/${REPO}`

let cachedStars: number | null = null

/** Live star count from GitHub's public API. Any failure simply leaves the count off. */
function useStars() {
  const [stars, setStars] = useState(cachedStars)
  useEffect(() => {
    if (cachedStars !== null) return
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stargazers_count?: number } | null) => {
        if (typeof d?.stargazers_count === 'number') setStars((cachedStars = d.stargazers_count))
      })
      .catch(() => {})
  }, [])
  return stars
}

export function GitHubStar({ size = 'sm', className }: { size?: 'sm' | 'lg'; className?: string }) {
  const stars = useStars()
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      onClick={() => track('github_click')}
      className={cn(
        'group inline-flex items-center overflow-hidden rounded-md border border-line-2 bg-surface font-medium text-ink transition-colors hover:border-ink-3',
        size === 'lg' ? 'h-10 text-[14px]' : 'h-8 text-[12.5px]',
        className,
      )}
    >
      <span className={cn('inline-flex items-center gap-1.5', size === 'lg' ? 'px-3.5' : 'px-2.5')}>
        <Icon icon={Star} size={size === 'lg' ? 16 : 14} className="text-warning transition-transform group-hover:scale-110" />
        Star on GitHub
      </span>
      {/* A tiny count reads as a verdict. It appears once it says something good. */}
      {stars !== null && stars >= 5 && (
        <span className={cn('tnum inline-flex h-full items-center border-s border-line-2 bg-surface-2 font-mono text-ink-2', size === 'lg' ? 'px-3' : 'px-2')}>
          {stars.toLocaleString('en')}
        </span>
      )}
    </a>
  )
}
