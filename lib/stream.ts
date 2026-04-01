import { StreamChat } from 'stream-chat'
import type { AppSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'

const STREAM_CHANNEL_TYPE = 'messaging'
const ALL_TEAM_CHANNEL_ID = 'all-team'

export function isStreamConfigured() {
  return !!process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY && !!process.env.STREAM_CHAT_API_SECRET
}

export function getStreamServerClient() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
  const apiSecret = process.env.STREAM_CHAT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Stream Chat is not configured. Add NEXT_PUBLIC_STREAM_CHAT_API_KEY and STREAM_CHAT_API_SECRET.')
  }

  return StreamChat.getInstance(apiKey, apiSecret)
}

function toStreamUser(session: Pick<AppSession, 'id' | 'name' | 'email' | 'role'>) {
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(session.name)}&background=0f172a&color=ffffff`,
  }
}

export async function upsertStreamUser(session: Pick<AppSession, 'id' | 'name' | 'email' | 'role'>) {
  const client = getStreamServerClient()
  await client.upsertUsers([toStreamUser(session)])
}

export async function ensureAllTeamChannel(currentSession: Pick<AppSession, 'id' | 'name' | 'email' | 'role'>) {
  const client = getStreamServerClient()
  await connectToDatabase()

  const activeUsers = await User.find({ isActive: true }).select('_id name email role')
  const streamUsers = activeUsers.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f172a&color=ffffff`,
  }))

  await client.upsertUsers(streamUsers)

  const members = streamUsers.map((user) => user.id)
  const channel = client.channel(STREAM_CHANNEL_TYPE, ALL_TEAM_CHANNEL_ID, {
    name: 'Whole Team',
    members,
    created_by_id: currentSession.id,
    kind: 'team',
  } as any)

  try {
    await channel.create()
  } catch {
    await channel.query()
    const currentMembers = Object.keys(channel.state.members || {})
    const missingMembers = members.filter((memberId) => !currentMembers.includes(memberId))

    if (missingMembers.length > 0) {
      await channel.addMembers(missingMembers)
    }

    await channel.updatePartial({
      set: {
        name: 'Whole Team',
        kind: 'team',
      },
    } as any)
  }

  return channel
}

export async function createConversation(params: {
  session: Pick<AppSession, 'id' | 'name' | 'email' | 'role'>
  memberIds: string[]
  name?: string
}) {
  const client = getStreamServerClient()
  const uniqueMembers = Array.from(new Set([params.session.id, ...params.memberIds])).filter(Boolean)

  if (uniqueMembers.length < 2) {
    throw new Error('Select at least one teammate to start a conversation.')
  }

  await ensureAllTeamChannel(params.session)

  if (uniqueMembers.length === 2) {
    const channel = client.channel(STREAM_CHANNEL_TYPE, {
      members: uniqueMembers,
      created_by_id: params.session.id,
      kind: 'dm',
    } as any)

    await channel.create()
    return channel
  }

  const channelId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const channel = client.channel(STREAM_CHANNEL_TYPE, channelId, {
    members: uniqueMembers,
    name: params.name?.trim() || 'Project Room',
    created_by_id: params.session.id,
    kind: 'group',
  } as any)

  await channel.create()
  return channel
}
