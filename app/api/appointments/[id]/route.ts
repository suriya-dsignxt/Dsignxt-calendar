import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Appointment, Notification, User } from '@/lib/models'
import { isAuthenticated } from '@/lib/auth'
import { sendEmail, getApprovalEmail, getRejectionEmail, getAssignmentEmail } from '@/lib/email'
import { format } from 'date-fns'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectToDatabase()
    const appointment = await Appointment.findById(id)
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectToDatabase()
    const data = await request.json()
    
    const appointment = await Appointment.findById(id)
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }
    
    const previousStatus = appointment.status
    const assignedToValue = appointment.assignedTo
    const previousAssignedTo = assignedToValue 
      ? (Array.isArray(assignedToValue) 
          ? assignedToValue.map((id: any) => id.toString()) 
          : [assignedToValue.toString()])
      : []
    
    Object.assign(appointment, data)
    await appointment.save()

    // Notify newly assigned team members
    if (data.assignedTo && Array.isArray(data.assignedTo)) {
      const currentAssignedTo = data.assignedTo as string[]
      const newlyAssigned = currentAssignedTo.filter(id => !previousAssignedTo.includes(id))
      
      if (newlyAssigned.length > 0) {
        const users = await User.find({ _id: { $in: newlyAssigned } })
        
        for (const user of users) {
          if (user.email) {
            await sendEmail({
              to: user.email,
              subject: 'New Meeting Assignment',
              html: getAssignmentEmail({
                id: appointment._id.toString(),
                clientName: appointment.clientName,
                date: format(appointment.date, 'MMMM d, yyyy'),
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                title: appointment.title,
                description: appointment.description,
                meetingLink: appointment.meetingLink
              })
            })
          }
        }
      }
    }
    
    // Send notification if status changed
    if (data.status && data.status !== previousStatus) {
      if (data.status === 'approved') {
        // Create client notification
        const notification = new Notification({
          type: 'approval',
          title: 'Booking Approved',
          message: `Your booking for ${format(appointment.date, 'MMM d, yyyy')} at ${appointment.startTime} has been approved!`,
          appointmentId: appointment._id,
          forAdmin: false,
          clientEmail: appointment.clientEmail
        })
        await notification.save()
        
        // Send approval email
        await sendEmail({
          to: appointment.clientEmail,
          subject: 'Your Booking is Confirmed!',
          html: getApprovalEmail({
            id: appointment._id.toString(),
            clientName: appointment.clientName,
            date: format(appointment.date, 'MMMM d, yyyy'),
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            title: appointment.title,
            meetingLink: appointment.meetingLink,
            otpCode: appointment.otpCode
          })
        })
      } else if (data.status === 'rejected') {
        // Create client notification
        const notification = new Notification({
          type: 'rejection',
          title: 'Booking Not Available',
          message: `Unfortunately, your booking for ${format(appointment.date, 'MMM d, yyyy')} could not be accommodated.`,
          appointmentId: appointment._id,
          forAdmin: false,
          clientEmail: appointment.clientEmail
        })
        await notification.save()
        
        // Send rejection email
        await sendEmail({
          to: appointment.clientEmail,
          subject: 'Booking Update',
          html: getRejectionEmail({
            clientName: appointment.clientName,
            date: format(appointment.date, 'MMMM d, yyyy'),
            title: appointment.title,
            reason: data.adminNotes
          })
        })
      }
    }
    
    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectToDatabase()
    await Appointment.findByIdAndDelete(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
