import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface EmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  if (!resend) {
    console.log('Email not sent - RESEND_API_KEY not configured')
    console.log('Would send to:', to)
    console.log('Subject:', subject)
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Calendar App <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

export function getBookingRequestEmail(appointment: {
  clientName: string
  date: string
  startTime: string
  endTime: string
  title: string
  description?: string
}) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">New Booking Request</h2>
      <p>You have received a new booking request:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Client:</strong> ${appointment.clientName}</p>
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
        <p><strong>Title:</strong> ${appointment.title}</p>
        ${appointment.description ? `<p><strong>Description:</strong> ${appointment.description}</p>` : ''}
      </div>
      <p>Please log in to your admin dashboard to approve or reject this request.</p>
    </div>
  `
}

export function getApprovalEmail(appointment: {
  id: string
  clientName: string
  date: string
  startTime: string
  endTime: string
  title: string
  meetingLink?: string
  otpCode?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const manageUrl = `${appUrl}/manage-booking/${appointment.id}`
  const meetingSection = appointment.meetingLink 
    ? `<div style="margin-top: 25px;">
        <p><strong>Join Meeting:</strong></p>
        <a href="${appointment.meetingLink}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Google Meet</a>
        <p style="font-size: 12px; color: #666; margin-top: 8px;">Meeting link: ${appointment.meetingLink}</p>
       </div>`
    : '';

  const bookingIdSection = `<div style="margin-top: 15px; font-size: 13px; color: #666;">
    <p><strong>Booking ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #334155;">${appointment.id}</code></p>
    <p style="font-size: 11px; margin-top: 4px;">(Copy this ID to manage your booking on our website)</p>
  </div>`;

  const otpSection = appointment.otpCode
    ? `<div style="margin-top: 25px; border: 1px dashed #16a34a; padding: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #666; font-size: 14px;">Use this 6-digit code for rescheduling:</p>
        <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #16a34a;">${appointment.otpCode}</p>
        <p style="margin: 10px 0 0 0; font-size: 12px;"><a href="${manageUrl}">Manage Booking</a></p>
       </div>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #16a34a;">Booking Confirmed!</h2>
      <p>Hi ${appointment.clientName},</p>
      <p>Great news! Your booking has been approved. We look forward to meeting with you.</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p><strong>Meeting:</strong> ${appointment.title}</p>
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
        ${bookingIdSection}
        ${meetingSection}
        ${otpSection}
      </div>
      <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666;">
        If you need to reschedule or cancel, use the code above on our <a href="${manageUrl}">management page</a>.
      </p>
    </div>
  `
}

export function getClientConfirmationEmail(appointment: {
  id: string
  clientName: string
  date: string
  startTime: string
  endTime: string
  title: string
  otpCode: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const manageUrl = `${appUrl}/manage-booking/${appointment.id}`
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #2563eb;">Booking Request Received</h2>
      <p>Hi ${appointment.clientName},</p>
      <p>Thank you for requesting a booking. We have received your request and will review it shortly.</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p><strong>Meeting:</strong> ${appointment.title}</p>
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
        <div style="margin-top: 15px; font-size: 13px; color: #666;">
          <p><strong>Booking ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #334155;">${appointment.id}</code></p>
          <p style="font-size: 11px; margin-top: 4px;">(Copy this ID to manage your booking on our website)</p>
        </div>
        
        <div style="margin-top: 25px; border: 1px dashed #2563eb; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #666; font-size: 14px;">Your 6-digit access code:</p>
          <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${appointment.otpCode}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px;"><a href="${manageUrl}">Manage Booking</a></p>
        </div>
      </div>
      <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666;">
        You can use this code to <a href="${manageUrl}">view or reschedule</a> your booking anytime.
      </p>
    </div>
  `
}

export function getRejectionEmail(appointment: {
  clientName: string
  date: string
  title: string
  reason?: string
}) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Booking Not Available</h2>
      <p>Hi ${appointment.clientName},</p>
      <p>Unfortunately, we are unable to accommodate your booking request:</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Meeting:</strong> ${appointment.title}</p>
        ${appointment.reason ? `<p><strong>Reason:</strong> ${appointment.reason}</p>` : ''}
      </div>
      <p>Please feel free to book another available time slot.</p>
    </div>
  `
}

export function getReminderEmail(appointment: {
  clientName: string
  date: string
  startTime: string
  endTime: string
  title: string
  meetingLink?: string
  minutesLeft: number
}) {
  const meetingSection = appointment.meetingLink 
    ? `<div style="margin-top: 25px;">
        <p><strong>Quick Join:</strong></p>
        <a href="${appointment.meetingLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Meeting</a>
       </div>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2563eb; margin-bottom: 10px;">Meeting Starting Soon</h2>
        <p style="font-size: 18px; font-weight: bold; color: #1e40af;">In exactly ${appointment.minutesLeft} Minutes</p>
      </div>
      
      <p>Hi ${appointment.clientName},</p>
      <p>This is a reminder for your upcoming meeting:</p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0;"><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Title</strong><br/>${appointment.title}</p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Date</strong><br/>${appointment.date}</p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Time</strong><br/>${appointment.startTime} - ${appointment.endTime}</p>
        ${meetingSection}
      </div>
      
      <p style="font-size: 14px; color: #64748b;">If you are unable to attend, please let us know as soon as possible.</p>
    </div>
  `
}

export function getAssignmentEmail(appointment: {
  id: string
  clientName: string
  date: string
  startTime: string
  endTime: string
  title: string
  description?: string
  meetingLink?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const manageUrl = `${appUrl}/team/calendar`
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <h2 style="color: #2563eb;">New Meeting Assignment</h2>
      <p>You have been assigned to a new meeting:</p>
      
      <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Title:</strong> ${appointment.title}</p>
        <p><strong>Client:</strong> ${appointment.clientName}</p>
        <p><strong>Date:</strong> ${appointment.date}</p>
        <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
        ${appointment.description ? `<p><strong>Details:</strong> ${appointment.description}</p>` : ''}
        ${appointment.meetingLink ? `<p><strong>Link:</strong> <a href="${appointment.meetingLink}">${appointment.meetingLink}</a></p>` : ''}
      </div>
      
      <p>View your updated schedule on the <a href="${manageUrl}">Team Dashboard</a>.</p>
    </div>
  `
}

