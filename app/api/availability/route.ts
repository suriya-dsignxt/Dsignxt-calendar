import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Availability } from '@/lib/models'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const availability = await Availability.find({ isActive: true }).sort({ dayOfWeek: 1 })
    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
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
    
    // Check if availability for this day already exists
    const existing = await Availability.findOne({ dayOfWeek: data.dayOfWeek })
    
    if (existing) {
      // Update existing
      Object.assign(existing, data)
      await existing.save()
      return NextResponse.json(existing)
    } else {
      // Create new
      const availability = new Availability(data)
      await availability.save()
      return NextResponse.json(availability)
    }
  } catch (error) {
    console.error('Error creating availability:', error)
    return NextResponse.json(
      { error: 'Failed to create availability' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    const data = await request.json()
    
    const availability = await Availability.findByIdAndUpdate(
      data._id,
      data,
      { new: true }
    )
    
    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json(
      { error: 'Failed to update availability' },
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
    await Availability.findByIdAndDelete(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting availability:', error)
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    )
  }
}
