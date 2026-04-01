"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useClerk, useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  CalendarDays,
  Clock,
  LogOut,
  LayoutDashboard,
  Users,
  CheckCircle,
  MessagesSquare,
  NotebookPen,
} from "lucide-react"

const navigation = [
  { name: "My Dashboard", href: "/team", icon: LayoutDashboard },
  { name: "My Calendar", href: "/team/calendar", icon: CalendarDays },
  { name: "My Appointments", href: "/team/appointments", icon: Calendar },
  { name: "My Tasks", href: "/team/tasks", icon: CheckCircle },
  { name: "My Chat", href: "/team/chat", icon: MessagesSquare },
  { name: "My Notes", href: "/team/notes", icon: NotebookPen },
]

export function TeamSidebar() {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/admin/login" })
  }

  return (
    <div className="hidden lg:flex h-screen w-64 flex-col border-r border-white/20 dark:border-white/5 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl relative overflow-hidden transition-all duration-500">
      {/* Background Decorative Element */}
      <div className="absolute top-[-20%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

      <div className="flex h-20 items-center gap-3 px-6 relative z-10 border-b border-white/10 dark:border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 -rotate-3 transform hover:rotate-0 transition-transform">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-tighter uppercase leading-none">Dsignxt</span>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Team Space</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-4 py-6 relative z-10">
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/team" && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 scale-[1.02]"
                    : "text-muted-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground hover:translate-x-1"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-50")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t border-white/10 dark:border-white/5 relative z-10">
        <div className="mb-4 rounded-2xl border border-white/10 bg-black/5 p-3 dark:bg-white/5">
          <p className="truncate text-sm font-semibold">{user?.fullName || user?.username || "Workspace User"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress || "Signed in with Clerk"}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
