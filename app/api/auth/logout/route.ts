import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Sign out is now handled by Clerk on the client.' },
    { status: 410 }
  )
}
