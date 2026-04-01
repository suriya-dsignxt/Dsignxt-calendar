import { SignIn } from '@clerk/nextjs'
import { CalendarDays, Mail, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ClerkSetupCard() {
  return (
    <Card className="w-full max-w-xl border-zinc-800/80 bg-zinc-950/90 text-slate-100 shadow-2xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <CalendarDays className="h-7 w-7 text-white" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">Configure Clerk To Continue</CardTitle>
          <CardDescription className="text-slate-400">
            Add your Clerk publishable and secret keys, then reopen this page to use email sign-in.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-300">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Required env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
          `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/login`
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Optional redirect env vars:
          `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin` and
          `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin`
        </div>
      </CardContent>
    </Card>
  )
}

export default function AgencyLoginPage() {
  const clerkReady =
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.CLERK_SECRET_KEY

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_35%),linear-gradient(180deg,_#111827_0%,_#020617_100%)] px-4 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_40%,transparent_100%)]" />
      <div className="absolute left-10 top-10 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 backdrop-blur">
        <ShieldCheck className="h-4 w-4" />
        Staff Access
      </div>

      {clerkReady ? (
        <div className="relative z-10 flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 backdrop-blur">
              <Mail className="h-3.5 w-3.5" />
              Clerk Email Authentication
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Sign in with your work email and continue where your team left off.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
                This workspace now uses Clerk for secure authentication. Enable email code,
                password, or magic link in your Clerk dashboard and the sign-in box will follow
                that setup automatically.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <SignIn
              path="/admin/login"
              routing="path"
              forceRedirectUrl="/admin"
              signUpUrl=""
              appearance={{
                elements: {
                  card: 'shadow-2xl border border-white/10 bg-white/90 backdrop-blur-xl',
                  headerTitle: 'text-slate-950 font-black tracking-tight',
                  headerSubtitle: 'text-slate-500',
                  socialButtonsBlockButton: 'border border-slate-200 hover:bg-slate-50',
                  formButtonPrimary: 'bg-slate-950 hover:bg-slate-800 text-white shadow-none',
                  footerActionLink: 'text-slate-950 hover:text-slate-700',
                },
              }}
            />
          </div>
        </div>
      ) : (
        <ClerkSetupCard />
      )}
    </div>
  )
}
