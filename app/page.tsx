"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Loader2,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

interface AvailabilitySlot {
  dayOfWeek: number
  isActive: boolean
}

interface Settings {
  companyName: string
  maxAdvanceBooking: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BookingPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    title: "",
    description: "",
  })

  const [showManageBooking, setShowManageBooking] = useState(false)
  const [manageBookingId, setManageBookingId] = useState("")

  const { data: availability = [] } = useSWR<AvailabilitySlot[]>(
    "/api/availability",
    fetcher
  )

  const { data: settings } = useSWR<Settings>("/api/settings", fetcher)

  const { data: slotsData, isLoading: slotsLoading } = useSWR<{ slots: TimeSlot[]; message?: string }>(
    selectedDate ? `/api/slots?date=${format(selectedDate, "yyyy-MM-dd")}` : null,
    fetcher
  )

  const slots = slotsData?.slots || []
  const slotsMessage = slotsData?.message

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const availableDays = useMemo(() => {
    return new Set(availability.filter((a) => a.isActive).map((a) => a.dayOfWeek))
  }, [availability])

  const maxDate = settings?.maxAdvanceBooking 
    ? addDays(new Date(), settings.maxAdvanceBooking) 
    : addDays(new Date(), 60)

  const isDateAvailable = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return false
    if (isBefore(maxDate, date)) return false
    return availableDays.has(date.getDay())
  }

  const handleDateSelect = (date: Date) => {
    if (!isDateAvailable(date)) return
    setSelectedDate(date)
    setSelectedSlots([])
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return
    
    const isSelected = selectedSlots.some(s => s.time === slot.time)
    if (isSelected) {
      // Removing a slot
      const index = selectedSlots.findIndex(s => s.time === slot.time)
      // To maintain contiguity, only allow removing from start or end
      if (index === 0 || index === selectedSlots.length - 1) {
        setSelectedSlots(selectedSlots.filter(s => s.time !== slot.time))
      } else {
        // If clicking middle, reset and start new selection
        setSelectedSlots([slot])
      }
    } else {
      if (selectedSlots.length === 0) {
        setSelectedSlots([slot])
      } else {
        // Enforce contiguity
        const first = selectedSlots[0]
        const last = selectedSlots[selectedSlots.length - 1]
        
        if (slot.time === last.endTime) {
          setSelectedSlots(prev => [...prev, slot])
        } else if (slot.endTime === first.time) {
          setSelectedSlots(prev => [slot, ...prev])
        } else {
          // If not contiguous, start new selection
          setSelectedSlots([slot])
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || selectedSlots.length === 0) return
    
    setLoading(true)
    
    const startTime = selectedSlots[0].time
    const endTime = selectedSlots[selectedSlots.length - 1].endTime
    
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: selectedDate.toISOString(),
          startTime,
          endTime,
        }),
      })

      if (res.ok) {
        setShowBookingForm(false)
        setShowConfirmation(true)
        setFormData({
          clientName: "",
          clientEmail: "",
          clientPhone: "",
          title: "",
          description: "",
        })
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to book appointment")
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetBooking = () => {
    setShowConfirmation(false)
    setSelectedDate(null)
    setSelectedSlots([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{settings?.companyName || "Book an Appointment"}</h1>
              <p className="text-sm text-muted-foreground">Schedule a meeting with us</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden sm:flex" onClick={() => setShowManageBooking(true)}>
              Manage Booking
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/login">Staff Login</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-balance">Schedule Your Appointment</h2>
            <p className="mt-2 text-muted-foreground text-pretty">
              Select a date and time that works for you. We will confirm your booking shortly.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Select a Date
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      disabled={isSameMonth(currentMonth, new Date())}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[140px] text-center font-medium">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-sm font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  {days.map((day) => {
                    const available = isDateAvailable(day)
                    const selected = selectedDate && isSameDay(day, selectedDate)
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDateSelect(day)}
                        disabled={!available}
                        className={cn(
                          "relative flex h-12 items-center justify-center rounded-lg text-sm transition-all",
                          !isSameMonth(day, currentMonth) && "text-muted-foreground/50",
                          available && !selected && "hover:bg-primary/10 cursor-pointer",
                          !available && "opacity-30 cursor-not-allowed",
                          selected && "bg-primary text-primary-foreground font-semibold",
                          isToday(day) && !selected && "ring-2 ring-primary ring-offset-2"
                        )}
                      >
                        {format(day, "d")}
                        {available && !selected && (
                          <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
                
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-muted" />
                    <span className="text-muted-foreground">Unavailable</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {selectedDate 
                    ? `Available Times - ${format(selectedDate, "EEEE, MMM d")}`
                    : "Select a Time"
                  }
                </CardTitle>
                <CardDescription>
                  {selectedDate 
                    ? "Choose a time slot that works for you"
                    : "Please select a date first to see available times"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-16 w-16 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">
                      Select a date from the calendar to view available time slots
                    </p>
                  </div>
                ) : slotsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : slotsMessage ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-16 w-16 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">{slotsMessage}</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-16 w-16 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">
                      No available time slots for this date
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleSlotSelect(slot)}
                          disabled={!slot.available}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-lg border p-3 text-sm transition-all",
                            slot.available
                              ? "bg-emerald-50/50 hover:border-emerald-500 hover:bg-emerald-100/50 cursor-pointer"
                              : "opacity-50 cursor-not-allowed bg-muted/50",
                            selectedSlots.some(s => s.time === slot.time) && "border-emerald-500 bg-emerald-100/80"
                          )}
                        >
                          <span className="font-medium">{slot.time}</span>
                          <span className="text-xs text-muted-foreground">
                            to {slot.endTime}
                          </span>
                          {!slot.available && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              Booked
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              {selectedSlots.length > 0 && (
                <div className="p-6 pt-0 border-t bg-muted/20">
                  <Button 
                    className="w-full shadow-lg hover:shadow-xl transition-all" 
                    onClick={() => setShowBookingForm(true)}
                  >
                    Continue with {selectedSlots.length} {selectedSlots.length === 1 ? 'Slot' : 'Slots'}
                    ({selectedSlots[0].time} - {selectedSlots[selectedSlots.length - 1].endTime})
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Booking Form Dialog */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
            <DialogDescription>
              {selectedDate && selectedSlots.length > 0 && (
                <span className="flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  <Clock className="h-4 w-4 ml-2" />
                  {selectedSlots[0].time} - {selectedSlots[selectedSlots.length - 1].endTime}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Meeting Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Project Discussion"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Details</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please share any details about what you would like to discuss..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBookingForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">Booking Request Submitted!</DialogTitle>
            <DialogDescription className="text-center">
              Your appointment request has been sent. You will receive an email confirmation once it has been approved.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDate && selectedSlots.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedSlots[0].time} - {selectedSlots[selectedSlots.length - 1].endTime}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button onClick={resetBooking} className="w-full">
            Book Another Appointment
          </Button>
        </DialogContent>
      </Dialog>
      {/* Manage Booking ID Dialog */}
      <Dialog open={showManageBooking} onOpenChange={setShowManageBooking}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Your Booking</DialogTitle>
            <DialogDescription>
              Enter your Booking ID to view or reschedule your appointment. 
              You can find this ID in your confirmation email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input
                id="bookingId"
                placeholder="e.g. 65f123456789abcde..."
                value={manageBookingId}
                onChange={(e) => setManageBookingId(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              disabled={!manageBookingId}
              onClick={() => {
                if (manageBookingId) {
                  window.location.href = `/manage-booking/${manageBookingId}`
                }
              }}
            >
              Go to Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
