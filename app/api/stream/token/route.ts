import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ensureAllTeamChannel, getStreamServerClient, isStreamConfigured, upsertStreamUser } from '@/lib/stream'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isStreamConfigured()) {
      return NextResponse.json(
        { error: 'Stream Chat is not configured.' },
        { status: 503 }
      )
    }

    await upsertStreamUser(session)
    await ensureAllTeamChannel(session)

    const client = getStreamServerClient()

    return NextResponse.json({
      apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY,
      token: client.createToken(session.id),
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
    })
  } catch (error) {
    console.error('Error creating Stream token:', error)
    return NextResponse.json(
      { error: 'Failed to prepare chat session.' },
      { status: 500 }
    )
  }
}
