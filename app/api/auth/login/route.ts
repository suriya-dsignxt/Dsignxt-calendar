import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Authentication is now handled by Clerk at /admin/login.' },
    { status: 410 }
  )
}
