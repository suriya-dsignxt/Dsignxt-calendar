import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Appointment, Notification, Settings } from '@/lib/models'
import mongoose from 'mongoose'
import { getSession } from '@/lib/auth'
import { format } from 'date-fns'

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

    // Find the appointment
    const appointment = await Appointment.findById(id)
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Auth check: Either session (admin/team) or valid OTP
    const session = await getSession()
    const isValidOtp = otpCode && appointment.otpCode === otpCode
    
    // Meeting must not be completed
    if (appointment.status === 'completed') {
      return NextResponse.json({ error: 'This meeting has already been completed and cannot be modified' }, { status: 400 })
    }

    if (!session && !isValidOtp) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for overlaps (excluding the current appointment)
    const overlappingAppointment = await Appointment.findOne({
      _id: { $ne: id },
      date: new Date(date),
      status: { $in: ['pending', 'approved'] },
      $and: [
        { startTime: { $lt: endTime } },
        { endTime: { $gt: startTime } }
      ]
    })
    
    if (overlappingAppointment) {
      return NextResponse.json(
        { error: 'The selected time slot is already booked' },
        { status: 409 }
      )
    }

    // Handle rescheduling by creating a new appointment and marking the old one
    const oldDateStr = format(new Date(appointment.date), 'MMMM d, yyyy')
    const oldTimeStr = `${appointment.startTime} - ${appointment.endTime}`
    
    // Create the new pending appointment
    const newAppointment = new Appointment({
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      date: new Date(date),
      startTime: startTime,
      endTime: endTime,
      title: appointment.title,
      description: appointment.description,
      status: 'pending', // Always require approval
      assignedTo: appointment.assignedTo,
      otpCode: appointment.otpCode, // Reuse OTP for ease of management
      color: '#3b82f6', // Reset to default blue for new request
    })
    
    await newAppointment.save()

    // 1. Mark original appointment as cancelled and turn it orange
    appointment.status = 'cancelled'
    appointment.color = '#f59e0b' // Keep it orange to signal it was rescheduled
    // Keep the meetingLink for historical reference or clear it? 
    // User said "once resheducled again the admin should accept the request then only meeting will be accepted then only new gmeet link"
    // So the old link is technically invalid now or should be deactivated.
    // I'll keep it on the old record but it shouldn't be used.
    
    await appointment.save()

    // Create notification for admin
    const reschedulerName = session ? 'Admin/Team' : appointment.clientName
    const notification = new Notification({
      type: 'reschedule',
      title: 'Reschedule Request',
      message: `${reschedulerName} requested to reschedule "${appointment.title}" from ${oldDateStr} (${oldTimeStr}) to ${format(new Date(date), 'MMM d, yyyy')} at ${startTime}.`,
      appointmentId: newAppointment._id,
      forAdmin: true
    })
    await notification.save()

    return NextResponse.json({ 
      message: 'Reschedule request submitted for approval',
      oldAppointment: appointment,
      newAppointment: newAppointment
    })
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule appointment' },
      { status: 500 }
    )
  }
}
