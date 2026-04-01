"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useClerk, useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { 
  Menu, 
  LayoutDashboard, 
  CalendarDays, 
  Calendar, 
  Clock, 
  CalendarOff, 
  Users, 
  CheckCircle, 
  Settings,
  LogOut,
  MessagesSquare,
  NotebookPen
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "./notification-bell"

interface AdminHeaderProps {
  title: string
  description?: string
}

const adminNavigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { name: "Appointments", href: "/admin/appointments", icon: Calendar },
  { name: "Availability", href: "/admin/availability", icon: Clock },
  { name: "Blocked Dates", href: "/admin/blocked-dates", icon: CalendarOff },
  { name: "Team", href: "/admin/team", icon: Users },
  { name: "Tasks", href: "/admin/tasks", icon: CheckCircle },
  { name: "Chat", href: "/admin/chat", icon: MessagesSquare },
  { name: "Notes", href: "/admin/notes", icon: NotebookPen },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

const teamNavigation = [
  { name: "My Dashboard", href: "/team", icon: LayoutDashboard },
  { name: "My Calendar", href: "/team/calendar", icon: CalendarDays },
  { name: "My Appointments", href: "/team/appointments", icon: Calendar },
  { name: "My Tasks", href: "/team/tasks", icon: CheckCircle },
  { name: "My Chat", href: "/team/chat", icon: MessagesSquare },
  { name: "My Notes", href: "/team/notes", icon: NotebookPen },
]

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()
  const isTeam = pathname.startsWith('/team')
  const navigation = isTeam ? teamNavigation : adminNavigation

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/admin/login" })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 dark:border-white/5 backdrop-blur-xl bg-white/70 dark:bg-zinc-950/70 px-4 md:px-6 py-4 md:py-5 flex items-center justify-between shadow-sm transition-all duration-500">
      <div className="flex items-center gap-4 truncate mr-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-r border-white/10">
            <div className="px-6 py-8 border-b border-white/10 bg-primary/5">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <SheetTitle className="text-sm font-black tracking-tighter uppercase leading-none">Dsignxt</SheetTitle>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-1">Management</span>
                  </div>
                </div>
              </SheetHeader>
            </div>
            <div className="px-4 py-6 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/admin" && item.href !== "/team" && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-50")} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-muted/20">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="space-y-0.5 truncate">
          <h1 className="text-lg md:text-2xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent truncate">{title}</h1>
          {description && (
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate hidden md:block">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden text-right md:block">
          <p className="max-w-[220px] truncate text-sm font-semibold">
            {user?.fullName || user?.username || "Workspace User"}
          </p>
          <p className="max-w-[220px] truncate text-[11px] uppercase tracking-widest text-muted-foreground/60">
            {user?.primaryEmailAddress?.emailAddress || "Clerk Session"}
          </p>
        </div>
        <NotificationBell />
      </div>
    </header>
  )
}
