"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { useParams, useRouter } from "next/navigation"
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
  CheckCircle2,
  Loader2,
  CalendarDays,
  Lock,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

interface Appointment {
  _id: string
  clientName: string
  clientEmail: string
  date: string
  startTime: string
  endTime: string
  title: string
  status: string
  description?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function GuestManageBookingPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [otpCode, setOtpCode] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch appointment details (only if verified)
  const { data: appointment, error: appointmentError } = useSWR<Appointment>(
    isVerified ? `/api/appointments/${id}` : null,
    fetcher
  )

  const { data: availability = [] } = useSWR("/api/availability", fetcher)
  const { data: settings } = useSWR("/api/settings", fetcher)
  const { data: slotsData, isLoading: slotsLoading } = useSWR<{ slots: TimeSlot[]; message?: string }>(
    isVerified && selectedDate ? `/api/slots?date=${format(selectedDate, "yyyy-MM-dd")}&exclude=${id}` : null,
    fetcher
  )

  const slots = slotsData?.slots || []

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code")
      return
    }

    setVerifying(true)
    try {
      const res = await fetch(`/api/appointments/${id}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode }),
      })

      if (res.ok) {
        setIsVerified(true)
        toast.success("Verification successful")
      } else {
        const data = await res.json()
        toast.error(data.error || "Invalid code")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setVerifying(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedDate || selectedSlots.length === 0) return
    
    setLoading(true)
    const startTime = selectedSlots[0].time
    const endTime = selectedSlots[selectedSlots.length - 1].endTime
    
    try {
      const res = await fetch(`/api/appointments/${id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          startTime,
          endTime,
          otpCode,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success("Reschedule request submitted for approval")
        setShowRescheduleConfirm(false)
        setSelectedDate(null)
        setSelectedSlots([])
        
        // Redirect to the new appointment so they can track its status
        if (data.newAppointment?._id) {
          router.push(`/manage-booking/${data.newAppointment._id}`)
        } else {
          mutate(`/api/appointments/${id}`)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to reschedule")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const availableDays = useMemo(() => {
    return new Set(availability.filter((a: any) => a.isActive).map((a: any) => a.dayOfWeek))
  }, [availability])

  const isDateAvailable = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return false
    const maxDate = settings?.maxAdvanceBooking ? addDays(new Date(), settings.maxAdvanceBooking) : addDays(new Date(), 60)
    if (isBefore(maxDate, date)) return false
    return availableDays.has(date.getDay())
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return
    const isSelected = selectedSlots.some(s => s.time === slot.time)
    if (isSelected) {
      const index = selectedSlots.findIndex(s => s.time === slot.time)
      if (index === 0 || index === selectedSlots.length - 1) {
        setSelectedSlots(selectedSlots.filter(s => s.time !== slot.time))
      } else {
        setSelectedSlots([slot])
      }
    } else {
      if (selectedSlots.length === 0) {
        setSelectedSlots([slot])
      } else {
        const first = selectedSlots[0]
        const last = selectedSlots[selectedSlots.length - 1]
        if (slot.time === last.endTime) {
          setSelectedSlots(prev => [...prev, slot])
        } else if (slot.endTime === first.time) {
          setSelectedSlots(prev => [slot, ...prev])
        } else {
          setSelectedSlots([slot])
        }
      }
    }
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-200/50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 p-4 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />

        <Card className="w-full max-w-md shadow-2xl border-white/20 dark:border-white/5 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 relative z-10 transition-all duration-500 hover:shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6 shadow-lg shadow-primary/20 transform -rotate-3 transition-transform hover:rotate-0">
              <Lock className="h-7 w-7" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Access Securely</CardTitle>
            <CardDescription className="text-base mt-2">
              Enter the 6-digit access code sent to your email to manage your booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="......"
                    className="text-center text-4xl tracking-[0.5em] font-black h-20 w-full max-w-[280px] border-2 focus:border-primary/50 bg-white/20 dark:bg-black/20 backdrop-blur-sm transition-all"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]" disabled={verifying || otpCode.length !== 6}>
                {verifying ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Verify Access"
                )}
              </Button>
            </form>
          </CardContent>
          <div className="px-6 py-5 border-t border-white/10 dark:border-white/5 text-center text-xs text-muted-foreground/60 italic">
            Check your spam folder if you haven't received the code.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex flex-col relative transition-colors duration-500">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/20 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70 shadow-sm transition-all">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 md:py-5 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
             <Button variant="ghost" size="icon" onClick={() => setIsVerified(false)} className="rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0">
                <ArrowLeft className="h-5 w-5" />
             </Button>
            <div className="flex h-10 w-10 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-xl md:rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold tracking-tight truncate">Manage Booking</h1>
              <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate">{appointment?.title}</p>
            </div>
          </div>
          <Badge variant={appointment?.status === 'approved' ? 'default' : 'secondary'} className="px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-sm text-[10px] md:text-xs font-bold uppercase transition-all shrink-0">
            {appointment?.status}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 flex-1 relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-7">
            {/* Appointment Summary */}
            <Card className="lg:col-span-2 h-fit border-white/20 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-white/10">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                   <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">Appointment Window</Label>
                   <div className="space-y-2.5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold">{appointment && format(new Date(appointment.date), "EEEE, MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold tracking-tight">{appointment?.startTime} — {appointment?.endTime}</span>
                    </div>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">Client Snapshot</Label>
                   <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <p className="text-base font-bold leading-none mb-1">{appointment?.clientName}</p>
                    <p className="text-sm text-muted-foreground font-medium opacity-80">{appointment?.clientEmail}</p>
                   </div>
                </div>

                {appointment?.description && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">Personal Note</Label>
                    <p className="text-sm italic text-muted-foreground bg-white/50 dark:bg-black/20 p-4 rounded-xl leading-relaxed border border-white/10 shadow-inner">
                      "{appointment.description}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rescheduling Interface */}
            <div className="lg:col-span-5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex flex-col gap-2 p-1 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent px-1">Reschedule Your Session</h2>
                  <p className="text-muted-foreground text-sm md:text-base px-1">Modify your current booking to a time that fits your schedule better.</p>
               </div>
               
               <div className="grid gap-8 grid-cols-1 md:grid-cols-5">
                  <Card className="md:col-span-3 border-white/20 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden self-start transition-all hover:shadow-2xl">
                    <CardHeader className="pb-3 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold">Pick a Date</CardTitle>
                        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full transition-transform hover:scale-110 active:scale-95" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={isSameMonth(currentMonth, new Date())}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-xs font-black uppercase tracking-widest min-w-[80px] text-center">{format(currentMonth, "MMM yyyy")}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full transition-transform hover:scale-110 active:scale-95" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div className="grid grid-cols-7 gap-1 md:gap-2.5 text-center">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                          <div key={`${d}-${idx}`} className="text-[9px] md:text-[10px] font-black text-muted-foreground/30 uppercase pb-2">{d}</div>
                        ))}
                        {days.map(day => {
                          const available = isDateAvailable(day)
                          const selected = selectedDate && isSameDay(day, selectedDate)
                          const isTdy = isToday(day)
                          
                          return (
                            <button
                              key={day.toISOString()}
                              onClick={() => { setSelectedDate(day); setSelectedSlots([]); }}
                              disabled={!available}
                              className={cn(
                                "group relative h-9 w-full md:h-11 rounded-lg md:rounded-2xl text-[10px] md:text-xs font-bold transition-all duration-300",
                                !isSameMonth(day, currentMonth) && "opacity-10",
                                available && !selected && "bg-zinc-100/50 dark:bg-zinc-800/30 hover:bg-primary/20 hover:scale-105 active:scale-95",
                                !available && "bg-transparent opacity-20 cursor-not-allowed",
                                selected && "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110 z-10",
                                isTdy && !selected && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                              )}
                            >
                              {format(day, "d")}
                              {isTdy && !selected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-primary" />}
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 border-white/20 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden self-start transition-all hover:shadow-2xl">
                    <CardHeader className="pb-3 border-b border-white/10">
                      <CardTitle className="text-base font-bold">Available Slots</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {!selectedDate ? (
                        <div className="h-[300px] flex flex-col items-center justify-center text-center p-8">
                           <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 transition-transform hover:animate-pulse">
                              <Calendar className="h-8 w-8 text-muted-foreground opacity-30" />
                           </div>
                           <p className="text-sm font-medium text-muted-foreground">Select a date to unlock available time slots</p>
                        </div>
                      ) : slotsLoading ? (
                        <div className="h-[300px] flex flex-col items-center justify-center gap-3">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                           <span className="text-xs font-bold text-muted-foreground uppercase animate-pulse">Loading slots...</span>
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="h-[300px] flex flex-col items-center justify-center p-8 text-center">
                           <Clock className="h-8 w-8 text-red-400 opacity-20 mb-3" />
                           <p className="text-sm font-bold text-red-500/60 uppercase">Day Fully Booked</p>
                           <p className="text-xs text-muted-foreground mt-2">Try another date on the calendar.</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px] px-5 py-5">
                           <div className="grid grid-cols-1 gap-3">
                              {slots.map(slot => (
                                <button
                                  key={slot.time}
                                  onClick={() => handleSlotSelect(slot)}
                                  disabled={!slot.available}
                                  className={cn(
                                    "px-4 py-3.5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-start gap-0.5",
                                    slot.available ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-transparent hover:border-emerald-500/20 hover:bg-emerald-100/50 hover:translate-x-1" : "opacity-30 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 border-transparent grayscale",
                                    selectedSlots.some(s => s.time === slot.time) && "border-emerald-500 bg-emerald-100/80 dark:bg-emerald-900/40 shadow-md shadow-emerald-500/10 -translate-x-1"
                                  )}
                                >
                                  <span className="text-sm font-black tracking-tight">{slot.time}</span>
                                  <span className="text-[10px] font-bold uppercase opacity-50 tracking-widest leading-none">ends at {slot.endTime}</span>
                                </button>
                              ))}
                              <div className="h-4" /> {/* Spacer for scroll padding */}
                           </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                    {selectedSlots.length > 0 && (
                      <div className="p-5 border-t border-white/10 bg-primary/5">
                        <Button className="w-full text-sm font-black h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all rounded-xl" onClick={() => setShowRescheduleConfirm(true)}>
                          Continue Selection
                        </Button>
                      </div>
                    )}
                  </Card>
               </div>

               {/* Footer notice */}
               <p className="text-center text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30 mt-8">
                  Dsignxt VidGen • Session Management System
               </p>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showRescheduleConfirm} onOpenChange={setShowRescheduleConfirm}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-3xl bg-background/95 backdrop-blur-2xl">
          <div className="p-8 space-y-6">
            <DialogHeader className="space-y-2">
              <div className="h-12 w-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg shadow-amber-500/20 rotate-3">
                <Clock className="h-7 w-7" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Final Confirmation</DialogTitle>
              <DialogDescription className="text-base font-medium">
                Please verify your new requested session window below before submitting.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-3xl border border-white/10 space-y-4">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">New Date</span>
                    <span className="text-base font-bold">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">New Time Range</span>
                    <span className="text-base font-black text-amber-600 tracking-tighter">{selectedSlots[0]?.time} — {selectedSlots[selectedSlots.length - 1]?.endTime}</span>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-3 w-full pt-2">
              <Button onClick={handleReschedule} disabled={loading} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-95">
                 {loading ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : "Confirm & Send Request"}
              </Button>
              <Button variant="ghost" onClick={() => setShowRescheduleConfirm(false)} className="w-full h-12 text-sm font-bold text-muted-foreground/60 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                Cancel, rethink timing
              </Button>
            </div>
          </div>
          
          <div className="bg-amber-500/10 p-4 border-t border-amber-500/10 text-center">
             <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Administrator review required after submission</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
