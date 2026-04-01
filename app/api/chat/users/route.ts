import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const users = await User.find({
      isActive: true,
      _id: { $ne: session.id },
    })
      .select('name email role')
      .sort({ role: 1, name: 1 })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching chat users:', error)
    return NextResponse.json(
      { error: 'Failed to load teammates.' },
      { status: 500 }
    )
  }
}
