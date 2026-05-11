import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Notification } from '@/lib/models'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    
    const query: Record<string, unknown> = { forAdmin: true }
    if (unreadOnly) {
      query.isRead = false
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('appointmentId')
    
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    const { id, markAllRead } = await request.json()
    
    if (markAllRead) {
      await Notification.updateMany(
        { forAdmin: true, isRead: false },
        { isRead: true }
      )
    } else if (id) {
      await Notification.findByIdAndUpdate(id, { isRead: true })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const { id } = await request.json().catch(() => ({}))
    
    if (id) {
      // Delete specific notification
      await Notification.findByIdAndDelete(id)
    } else {
      // Clear all admin notifications
      await Notification.deleteMany({ forAdmin: true })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    )
  }
}
