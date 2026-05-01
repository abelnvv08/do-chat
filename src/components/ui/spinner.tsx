import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600 h-5 w-5',
        className
      )}
    />
  )
}
