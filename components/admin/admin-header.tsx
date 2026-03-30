"use client"

import { NotificationBell } from "./notification-bell"

interface AdminHeaderProps {
  title: string
  description?: string
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 dark:border-white/5 backdrop-blur-xl bg-white/70 dark:bg-zinc-950/70 px-6 py-5 flex items-center justify-between shadow-sm transition-all duration-500">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{title}</h1>
        {description && (
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  )
}
