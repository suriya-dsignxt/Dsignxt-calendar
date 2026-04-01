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
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
} from "date-fns"
import { toZonedTime, formatInTimeZone } from "date-fns-tz"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Video,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Appointment {
  _id: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  date: string
  startTime: string
  endTime: string
  title: string
  description?: string
  status: "pending" | "approved" | "rejected" | "cancelled" | "rescheduled"
  color?: string
  meetingLink?: string
  assignedTo?: string[]
}

type ViewMode = "month" | "week" | "day"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CalendarPage() {
  const { data: settings } = useSWR<any>("/api/settings", fetcher)
  const timezone = settings?.timezone || "Asia/Kolkata"
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), timezone))
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate))
      const end = endOfWeek(endOfMonth(currentDate))
      return { start, end }
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return { start, end }
    } else {
      return { start: currentDate, end: currentDate }
    }
  }, [currentDate, viewMode])

  const { data: appointments = [], mutate } = useSWR<Appointment[]>(
    `/api/appointments?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`,
    fetcher
  )
  
  const { data: teamMembers = [] } = useSWR<any[]>("/api/team", fetcher)

  const days = useMemo(() => {
    if (viewMode === "day") {
      return [currentDate]
    }
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
  }, [dateRange, viewMode, currentDate])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getAppointmentsForDay = (date: Date) => {
    return Array.isArray(appointments) ? appointments.filter((apt) => isSameDay(new Date(apt.date), date)) : []
  }

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    } else if (viewMode === "week") {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    } else {
      setCurrentDate(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1))
    }
  }

  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone))

  const getStatusColor = (apt: Appointment) => {
    switch (apt.status) {
      case "pending":
        return "bg-amber-500"
      case "approved":
        return "bg-emerald-500"
      case "rejected":
        return "bg-red-500"
      case "cancelled":
      case "rescheduled":
        return "bg-orange-500"
      default:
        return "bg-muted"
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      mutate()
      setSelectedAppointment(null)
    } catch (error) {
      console.error("Failed to update:", error)
    }
  }

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="bg-muted p-1 sm:p-2 text-center text-[10px] sm:text-sm font-bold uppercase tracking-tight sm:tracking-normal">
          <span className="hidden sm:inline">{day}</span>
          <span className="inline sm:hidden">{day.charAt(0)}</span>
        </div>
      ))}
      {days.map((day) => {
        const dayAppointments = getAppointmentsForDay(day)
        
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "min-h-[120px] bg-card p-2",
              !isSameMonth(day, currentDate) && "bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  isToday(day) && "bg-primary text-primary-foreground font-bold",
                  !isSameMonth(day, currentDate) && "text-muted-foreground"
                )}
              >
                {formatInTimeZone(day, timezone, "d")}
              </span>
            </div>
            <div className="space-y-1">
              {dayAppointments.slice(0, 3).map((apt) => (
                <button
                  key={apt._id}
                  onClick={() => setSelectedAppointment(apt)}
                  className={cn(
                    "w-full text-left text-xs p-1 rounded truncate text-white",
                    getStatusColor(apt)
                  )}
                >
                  {apt.startTime} {apt.title}
                </button>
              ))}
              {dayAppointments.length > 3 && (
                <p className="text-xs text-muted-foreground pl-1">
                  +{dayAppointments.length - 3} more
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderWeekView = () => (
    <div className="flex flex-col">
      <div className="grid grid-cols-8 border-b">
        <div className="p-2 text-sm font-medium text-muted-foreground" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-2 text-center border-l",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-sm font-medium">{formatInTimeZone(day, timezone, "EEE")}</div>
            <div
              className={cn(
                "text-2xl",
                isToday(day) && "text-primary font-bold"
              )}
            >
              {formatInTimeZone(day, timezone, "d")}
            </div>
          </div>
        ))}
      </div>
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-8">
          <div className="border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 text-xs text-muted-foreground text-right pr-2 pt-1"
              >
                {formatInTimeZone(new Date().setHours(hour, 0), timezone, "h a")}
              </div>
            ))}
          </div>
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day)
            
            return (
              <div key={day.toISOString()} className="relative border-l">
                {hours.map((hour) => (
                  <div key={hour} className="h-16 border-b border-dashed" />
                ))}
                {dayAppointments.map((apt) => {
                  const [startHour, startMin] = apt.startTime.split(":").map(Number)
                  const [endHour, endMin] = apt.endTime.split(":").map(Number)
                  const top = startHour * 64 + (startMin / 60) * 64
                  const height = (endHour - startHour) * 64 + ((endMin - startMin) / 60) * 64
                  
                  return (
                    <button
                      key={apt._id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={cn(
                        "absolute left-0.5 right-0.5 p-1 rounded text-xs text-white overflow-hidden",
                        getStatusColor(apt)
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="font-medium truncate">{apt.title}</div>
                      <div className="truncate opacity-90">{apt.clientName}</div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(currentDate)
    
    return (
      <div className="flex">
        <div className="w-20 border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-16 text-xs text-muted-foreground text-right pr-2 pt-1"
            >
              {formatInTimeZone(new Date().setHours(hour, 0), timezone, "h a")}
            </div>
          ))}
        </div>
        <ScrollArea className="flex-1 h-[600px]">
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="h-16 border-b border-dashed" />
            ))}
            {dayAppointments.map((apt) => {
              const [startHour, startMin] = apt.startTime.split(":").map(Number)
              const [endHour, endMin] = apt.endTime.split(":").map(Number)
              const top = startHour * 64 + (startMin / 60) * 64
              const height = (endHour - startHour) * 64 + ((endMin - startMin) / 60) * 64
              
              return (
                <button
                  key={apt._id}
                  onClick={() => setSelectedAppointment(apt)}
                  className={cn(
                    "absolute left-2 right-2 p-2 rounded text-white",
                    getStatusColor(apt)
                  )}
                  style={{ top: `${top}px`, height: `${Math.max(height, 32)}px` }}
                >
                  <div className="font-medium">{apt.title}</div>
                  <div className="text-sm opacity-90">
                    {apt.startTime} - {apt.endTime} | {apt.clientName}
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate("prev")} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate("next")} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={goToToday} size="sm" className="h-8 sm:h-9">
            Today
          </Button>
          <h2 className="text-sm sm:text-lg font-black tracking-tight ml-2">
            {viewMode === "day"
              ? formatInTimeZone(currentDate, timezone, "EEEE, MMMM d, yyyy")
              : viewMode === "week"
              ? `${formatInTimeZone(dateRange.start, timezone, "MMM d")} - ${formatInTimeZone(dateRange.end, timezone, "MMM d, yyyy")}`
              : formatInTimeZone(currentDate, timezone, "MMMM yyyy")}
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/20" />
              <span>Other</span>
            </div>
          </div>
          
          <div className="flex border rounded-xl overflow-hidden bg-muted/30 p-0.5 shrink-0">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 sm:h-8 text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 sm:px-4",
                  viewMode === mode ? "shadow-sm" : "hover:bg-transparent"
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedAppointment?.title}</span>
              {selectedAppointment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(selectedAppointment._id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(selectedAppointment._id, "rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                      Reject
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DialogTitle>
            <DialogDescription>Appointment details</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-white", getStatusColor(selectedAppointment))}>
                  {selectedAppointment.status}
                </Badge>
              </div>
              
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{formatInTimeZone(new Date(selectedAppointment.date), timezone, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAppointment.startTime} - {selectedAppointment.endTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAppointment.clientName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAppointment.clientEmail}</span>
                </div>
                {selectedAppointment.clientPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAppointment.clientPhone}</span>
                  </div>
                )}
                {selectedAppointment.meetingLink && (
                  <div className="flex items-center gap-3 pt-1">
                    <Video className="h-4 w-4 text-primary" />
                    <a 
                      href={selectedAppointment.meetingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}
              </div>

              {selectedAppointment.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedAppointment.description}
                  </p>
                </div>
              )}

              {selectedAppointment.assignedTo && selectedAppointment.assignedTo.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assigned Team Members</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppointment.assignedTo.map(id => {
                      const member = teamMembers.find(m => m._id === id)
                      return (
                        <Badge key={id} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          {member?.name || 'Unknown Member'}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedAppointment.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStatusChange(selectedAppointment._id, "approved")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleStatusChange(selectedAppointment._id, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
