import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createConversation } from '@/lib/stream'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const memberIds = Array.isArray(body.memberIds) ? body.memberIds : []

    const channel = await createConversation({
      session,
      memberIds,
      name: body.name,
    })

    return NextResponse.json({
      id: channel.id,
      cid: channel.cid,
      name: (channel.data as Record<string, unknown> | undefined)?.name || null,
      kind:
        (channel.data as Record<string, unknown> | undefined)?.kind ||
        (memberIds.length <= 1 ? 'dm' : 'group'),
    })
  } catch (error: any) {
    console.error('Error creating chat channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation.' },
      { status: 500 }
    )
  }
}
