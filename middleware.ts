import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedPage = createRouteMatcher(['/admin(.*)', '/team(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin/login')) {
    return
  }

  if (isProtectedPage(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
