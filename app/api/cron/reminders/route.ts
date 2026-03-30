import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Appointment, Notification, Settings } from '@/lib/models'
import { sendEmail, getReminderEmail } from '@/lib/email'
import { format, addMinutes, subMinutes, differenceInMinutes } from 'date-fns'

/**
 * API Endpoint: GET /api/cron/reminders
 * Triggered periodically to send 15m and 5m meeting reminders.
 */
export async function GET(request: Request) {
  try {
    // Basic security check (optional search param or header)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      console.warn('Unauthorized cron attempt')
    }

    await connectToDatabase()
    
    // Get company settings for admin email and timezone info
    const settings = await Settings.findOne()
    const adminEmail = settings?.companyEmail || process.env.ADMIN_EMAIL

    const now = new Date()
    
    // Define the time windows
    // We fetch appointments for the next hour to be safe
    const searchEnd = addMinutes(now, 60)
    const searchStart = subMinutes(now, 60)

    const appointments = await Appointment.find({
      status: 'approved',
      date: { $gte: searchStart, $lte: searchEnd }
    })

    const results = { sent15: 0, sent5: 0, processed: 0 }

    for (const apt of appointments) {
      results.processed++
      
      // Calculate appointment start time (with robustness)
      const aptDate = new Date(apt.date)
      const [hours, mins] = apt.startTime.split(':').map(Number)
      aptDate.setHours(hours, mins, 0, 0)

      // Time difference in minutes
      const diffInMinutes = differenceInMinutes(aptDate, now)
      
      let reminderType: '15m' | '5m' | null = null

      // Logic: 
      // 15m reminder between 14-18 minutes before
      // 5m reminder between 4-8 minutes before
      if (diffInMinutes > 12 && diffInMinutes <= 17 && !apt.remindersSent?.includes('15m')) {
        reminderType = '15m'
      } else if (diffInMinutes > 2 && diffInMinutes <= 7 && !apt.remindersSent?.includes('5m')) {
        reminderType = '5m'
      }

      if (reminderType) {
        const minutesLeft = reminderType === '15m' ? 15 : 5
        
        console.log(`Sending ${reminderType} reminder for: ${apt.title} (Starting in ${diffInMinutes}m)`)

        // 1. Send Email to Client
        await sendEmail({
          to: apt.clientEmail,
          subject: `${minutesLeft} Min Reminder: ${apt.title}`,
          html: getReminderEmail({
            clientName: apt.clientName,
            date: format(new Date(apt.date), 'MMMM d, yyyy'),
            startTime: apt.startTime,
            endTime: apt.endTime,
            title: apt.title,
            meetingLink: apt.meetingLink,
            minutesLeft
          })
        })

        // 2. Send Email to Admin (if configured)
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: `Reminder: Meeting with ${apt.clientName} in ${minutesLeft}m`,
            html: getReminderEmail({
              clientName: 'Admin',
              date: format(new Date(apt.date), 'MMMM d, yyyy'),
              startTime: apt.startTime,
              endTime: apt.endTime,
              title: apt.title,
              meetingLink: apt.meetingLink,
              minutesLeft
            })
          })
        }

        // 3. Create In-App Notification for Admin
        const notification = new Notification({
          type: 'reminder',
          title: `${minutesLeft} Min Reminder`,
          message: `Meeting with ${apt.clientName} starts in ${minutesLeft} minutes.`,
          appointmentId: apt._id,
          forAdmin: true
        })
        await notification.save()

        // 4. Create In-App Notification for Client
        const clientNotification = new Notification({
          type: 'reminder',
          title: `Starting in ${minutesLeft}m`,
          message: `Your meeting "${apt.title}" starts in ${minutesLeft} minutes.`,
          appointmentId: apt._id,
          forAdmin: false,
          clientEmail: apt.clientEmail
        })
        await clientNotification.save()


        // Update appointment to mark reminder as sent
        await Appointment.findByIdAndUpdate(apt._id, {
          $addToSet: { remindersSent: reminderType }
        })

        if (reminderType === '15m') results.sent15++
        if (reminderType === '5m') results.sent5++
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Reminder CRON Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
