import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Appointment } from '@/lib/models'
import mongoose from 'mongoose'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { date, startTime, endTime, otpCode } = await request.json()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid appointment ID format' }, { status: 400 })
    }

    if (!otpCode) {
      return NextResponse.json({ error: 'OTP code is required' }, { status: 400 })
    }

    const appointment = await Appointment.findById(id)

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (appointment.status === 'completed') {
        return NextResponse.json({ error: 'This meeting is already completed' }, { status: 400 })
    }

    if (appointment.otpCode === otpCode) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 401 })
    }
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
