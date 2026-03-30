import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ role: null, email: null }, { status: 401 })
    }
    
    return NextResponse.json({
      id: session.id,
      role: session.role,
      email: session.email
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
