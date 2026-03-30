import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Settings } from '@/lib/models'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    await connectToDatabase()
    let settings = await Settings.findOne()
    
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
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
    
    let settings = await Settings.findOne()
    
    if (settings) {
      Object.assign(settings, data)
      await settings.save()
    } else {
      settings = new Settings(data)
      await settings.save()
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
