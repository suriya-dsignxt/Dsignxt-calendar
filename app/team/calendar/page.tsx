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
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
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
}

type ViewMode = "month" | "week" | "day"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TeamCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
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

  const { data: appointments = [] } = useSWR<Appointment[]>(
    `/api/appointments?assignedTo=me&startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`,
    fetcher
  )

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

  const goToToday = () => setCurrentDate(new Date())

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500"
      case "approved":
        return "bg-emerald-500"
      case "rejected":
        return "bg-red-500"
      case "cancelled":
        return "bg-orange-500" // Rescheduled old meetings stay orange and are marked cancelled
      default:
        return "bg-muted"
    }
  }

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
          {day}
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
                {format(day, "d")}
              </span>
            </div>
            <div className="space-y-1">
              {dayAppointments.slice(0, 3).map((apt) => (
                <button
                  key={apt._id}
                  onClick={() => setSelectedAppointment(apt)}
                  className={cn(
                    "w-full text-left text-xs p-1 rounded truncate text-white",
                    getStatusColor(apt.status)
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
            <div className="text-sm font-medium">{format(day, "EEE")}</div>
            <div
              className={cn(
                "text-2xl",
                isToday(day) && "text-primary font-bold"
              )}
            >
              {format(day, "d")}
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
                {format(new Date().setHours(hour, 0), "h a")}
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
                        getStatusColor(apt.status)
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
              {format(new Date().setHours(hour, 0), "h a")}
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
                    getStatusColor(apt.status)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <h2 className="text-xl font-semibold ml-4">
            {viewMode === "day"
              ? format(currentDate, "EEEE, MMMM d, yyyy")
              : viewMode === "week"
              ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm mr-4">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-orange-500" />
              <span className="text-muted-foreground">Cancelled/Rescheduled</span>
            </div>
          </div>
          
          <div className="flex border rounded-lg">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
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
            <DialogTitle>{selectedAppointment?.title}</DialogTitle>
            <DialogDescription>Appointment details</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-white", getStatusColor(selectedAppointment.status))}>
                  {selectedAppointment.status}
                </Badge>
              </div>
              
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(selectedAppointment.date), "EEEE, MMMM d, yyyy")}</span>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
