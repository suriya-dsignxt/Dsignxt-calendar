import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Appointment, Notification, Settings } from '@/lib/models'
import { isAuthenticated, getSession } from '@/lib/auth'
import { sendEmail, getBookingRequestEmail, getClientConfirmationEmail } from '@/lib/email'
import { format } from 'date-fns'

export async function GET(request: Request) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const query: Record<string, unknown> = {}
    
    if (status && status !== 'all') {
      query.status = status
    }
    
    if (startDate && endDate) {
      const sDateOnly = startDate.split('T')[0]
      const eDateOnly = endDate.split('T')[0]
      query.date = {
        $gte: new Date(`${sDateOnly}T00:00:00Z`),
        $lte: new Date(`${eDateOnly}T00:00:00Z`)
      }
    }

    const assignedTo = searchParams.get('assignedTo')
    if (assignedTo === 'me') {
      const session = await getSession()
      if (session) {
        query.assignedTo = { $in: [session.id] }
      }
    } else if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = { $in: [assignedTo] }
    }
    
    const appointments = await Appointment.find(query).sort({ date: 1, startTime: 1 })
    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const data = await request.json()
    
    const dateOnly = data.date.split('T')[0]
    const targetDate = new Date(`${dateOnly}T00:00:00Z`)

    // Check if any part of the requested time range is already booked
    const overlappingAppointment = await Appointment.findOne({
      date: targetDate,
      status: { $in: ['pending', 'approved'] },
      $and: [
        { startTime: { $lt: data.endTime } },
        { endTime: { $gt: data.startTime } }
      ]
    })
    
    if (overlappingAppointment) {
      return NextResponse.json(
        { error: 'One or more of the selected time slots are no longer available' },
        { status: 409 }
      )
    }
    
    // Get settings to check if auto-approve is enabled
    const settings = await Settings.findOne()
    const autoApprove = settings?.autoApprove || false
    
    // Generate 6-digit OTP for client access
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    const appointment = new Appointment({
      ...data,
      date: targetDate,
      status: autoApprove ? 'approved' : 'pending',
      otpCode
    })
    await appointment.save()
    
    // Create notification for admin
    const notification = new Notification({
      type: 'new_booking',
      title: 'New Booking Request',
      message: `${data.clientName} has requested a booking for ${format(new Date(data.date), 'MMM d, yyyy')} at ${data.startTime}`,
      appointmentId: appointment._id,
      forAdmin: true
    })
    await notification.save()
    
    // Send email notification to admin
    if (settings?.companyEmail) {
      await sendEmail({
        to: settings.companyEmail,
        subject: 'New Booking Request',
        html: getBookingRequestEmail({
          clientName: data.clientName,
          date: format(new Date(data.date), 'MMMM d, yyyy'),
          startTime: data.startTime,
          endTime: data.endTime,
          title: data.title,
          description: data.description
        })
      })
    }
    
    // Send email notification to client
    await sendEmail({
      to: data.clientEmail,
      subject: 'Booking Request Received',
      html: getClientConfirmationEmail({
        id: appointment._id.toString(),
        clientName: data.clientName,
        date: format(new Date(data.date), 'MMMM d, yyyy'),
        startTime: data.startTime,
        endTime: data.endTime,
        title: data.title,
        otpCode: otpCode
      })
    })

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
