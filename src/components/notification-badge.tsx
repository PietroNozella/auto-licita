interface NotificationBadgeProps {
  count: number
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null

  return (
    <span
      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-700 text-white text-xs font-bold leading-none"
      aria-hidden="true"
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
