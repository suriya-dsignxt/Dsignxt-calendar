import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { AIAssistant } from "@/components/ai-assistant"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect("/admin/login")
  }

  if (session.role === 'team') {
    redirect("/team")
  }

  if (session.role !== 'admin' && session.role !== 'super_admin') {
    redirect("/admin/login")
  }

  return (
    <div className="flex h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-200/50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 relative overflow-hidden transition-colors duration-500">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative z-10 backdrop-blur-[2px]">
        <AdminHeader 
          title="Dashboard" 
          description="Overview of your calendar and appointments"
        />
        <main className="flex-1 overflow-auto p-6 md:p-8 animate-in fade-in duration-700">
          {children}
        </main>
      </div>
      <AIAssistant />
    </div>
  )
}
