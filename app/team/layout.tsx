import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { TeamSidebar } from "@/components/team/team-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { AIAssistant } from "@/components/ai-assistant"

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session || (session.role !== 'team' && session.role !== 'admin')) {
    redirect("/admin/login")
  }

  return (
    <div className="flex h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-200/50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 relative overflow-hidden transition-colors duration-500">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <TeamSidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative z-10 backdrop-blur-[2px]">
        <AdminHeader 
          title="Team Portal" 
          description="Manage your assigned meetings and schedule"
        />
        <main className="flex-1 overflow-auto p-6 md:p-8 animate-in fade-in duration-700">
          {children}
        </main>
      </div>
      <AIAssistant />
    </div>
  )
}
