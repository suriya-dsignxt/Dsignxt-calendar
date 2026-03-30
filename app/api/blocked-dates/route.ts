import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { BlockedDate } from '@/lib/models'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const blockedDates = await BlockedDate.find().sort({ date: 1 })
    return NextResponse.json(blockedDates)
  } catch (error) {
    console.error('Error fetching blocked dates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blocked dates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    const data = await request.json()
    
    const blockedDate = new BlockedDate({
      ...data,
      date: new Date(data.date)
    })
    await blockedDate.save()
    
    return NextResponse.json(blockedDate)
  } catch (error) {
    console.error('Error creating blocked date:', error)
    return NextResponse.json(
      { error: 'Failed to create blocked date' },
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    await connectToDatabase()
    await BlockedDate.findByIdAndDelete(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blocked date:', error)
    return NextResponse.json(
      { error: 'Failed to delete blocked date' },
      { status: 500 }
    )
  }
}
