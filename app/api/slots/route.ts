import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Availability, BlockedDate, Appointment, Settings } from '@/lib/models'
import { format, parseISO, addMinutes, isBefore, startOfDay, addHours } from 'date-fns'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

function generateTimeSlots(startTime: string, endTime: string, duration: number, date: Date, timezone: string): { time: string; endTime: string }[] {
  const slots: { time: string; endTime: string }[] = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  // Create start and end times in the target timezone
  const startDateTime = new Date(date)
  startDateTime.setUTCHours(startHour, startMin, 0, 0)
  // Note: Since 'date' is already UTC midnight for the target day, 
  // setting UTC hours to local hours is just a starting point for the string-based HH:mm generation.
  // The actual availability is defined by these HH:mm strings in that timezone's context.

  let currentTime = new Date()
  currentTime.setHours(startHour, startMin, 0, 0)
  
  const endDateTime = new Date()
  endDateTime.setHours(endHour, endMin, 0, 0)
  
  while (isBefore(currentTime, endDateTime)) {
    const slotEnd = addMinutes(currentTime, duration)
    if (!isBefore(endDateTime, slotEnd)) {
      slots.push({
        time: format(currentTime, 'HH:mm'),
        endTime: format(slotEnd, 'HH:mm')
      })
    }
    currentTime = slotEnd
  }
  
  return slots
}

export async function GET(request: Request) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    
    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }
    
    const dateOnly = dateStr.split('T')[0]
    const date = new Date(`${dateOnly}T00:00:00Z`)
    const nextDayUtc = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    const dayOfWeek = date.getUTCDay()
    
    // Get settings for lead time and timezone
    const settings = await Settings.findOne()
    const timezone = settings?.timezone || 'UTC'
    const leadTimeHours = settings?.bookingLeadTime || 24
    
    // Check if this date is in the past or within lead time
    const now = new Date()
    const minBookingTime = addHours(now, leadTimeHours)
    
    if (isBefore(startOfDay(date), startOfDay(now))) {
      return NextResponse.json({ slots: [], message: 'Cannot book past dates' })
    }
    
    // Get availability for this day of week
    const availability = await Availability.findOne({ 
      dayOfWeek,
      isActive: true 
    })
    
    if (!availability) {
      return NextResponse.json({ 
        slots: [], 
        message: 'No availability set for this day' 
      })
    }
    
    // Check if date is blocked
    const blockedDate = await BlockedDate.findOne({
      date: {
        $gte: date,
        $lt: nextDayUtc
      }
    })
    
    if (blockedDate?.allDay) {
      return NextResponse.json({ 
        slots: [], 
        message: blockedDate.reason || 'This day is not available' 
      })
    }
    
    // Generate base time slots
    const baseSlots = generateTimeSlots(
      availability.startTime,
      availability.endTime,
      availability.slotDuration,
      date,
      timezone
    )
    
    // Get existing appointments for this date
    const appointments = await Appointment.find({
      date: {
        $gte: date,
        $lt: nextDayUtc
      },
      status: { $in: ['pending', 'approved'] }
    })
    
    const bookedTimes = new Set(appointments.map(apt => apt.startTime))
    
    // Mark slots as available or not
    const slots: TimeSlot[] = baseSlots.map(slot => {
      // Check if slot is booked
      const isBooked = bookedTimes.has(slot.time)
      
      // Check if slot is within blocked time range
      let isBlocked = false
      if (blockedDate && !blockedDate.allDay && blockedDate.startTime && blockedDate.endTime) {
        isBlocked = slot.time >= blockedDate.startTime && slot.time < blockedDate.endTime
      }
      
      // Check if slot is within lead time
      let isPastLeadTime = false
      const slotDateTimeStr = `${dateOnly} ${slot.time}`
      // Convert the slot's local time to a UTC Date object for comparison
      const slotDateTime = fromZonedTime(slotDateTimeStr, timezone)
      isPastLeadTime = isBefore(slotDateTime, minBookingTime)
      
      return {
        ...slot,
        available: !isBooked && !isBlocked && !isPastLeadTime
      }
    })
    
    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    )
  }
}
