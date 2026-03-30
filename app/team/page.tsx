"use client"

import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, User } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  meetingLink?: string
  assignedTo?: string[]
}

interface User {
  _id: string
  name: string
  role: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TeamDashboardPage() {
  const { data: appointments = [], isLoading } = useSWR<Appointment[]>(
    "/api/appointments?assignedTo=me", 
    fetcher
  )

  const { data: teamMembers = [] } = useSWR<User[]>("/api/team", fetcher)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    approved: appointments.filter((a) => a.status === "approved").length,
    upcoming: appointments.filter((a) => a.status === "approved" && new Date(a.date) >= new Date()).length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Assigned</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">total appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">approved meetings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
                {appointments.filter(a => a.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Appointments</CardTitle>
            <CardDescription>Recent and upcoming meetings assigned to you</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/team/appointments">View Full List</a>
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
               <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">No appointments assigned to you yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.slice(0, 10).map((appointment) => (
                  <div 
                    key={appointment._id} 
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{appointment.title}</p>
                      <p className="text-sm text-muted-foreground">{appointment.clientName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(appointment.date), "MMM d, yyyy")}</div>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {appointment.startTime} - {appointment.endTime}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(appointment.status)}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                         <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.title}</DialogTitle>
            <DialogDescription>Meeting details and assignments</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedAppointment.status)}
              </div>
              
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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
                {selectedAppointment.meetingLink && (
                  <div className="flex items-center gap-3 pt-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                    {selectedAppointment.description}
                  </p>
                </div>
              )}

              {selectedAppointment.assignedTo && selectedAppointment.assignedTo.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Collaborators Assigned</p>
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

              <DialogHeader className="pt-2">
                <Button variant="outline" className="w-full" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </DialogHeader>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
