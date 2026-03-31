"use client"

import { useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
  Search,
  ArrowRight,
} from "lucide-react"

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
  status: "pending" | "approved" | "rejected" | "cancelled"
  createdAt: string
  adminNotes?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TeamAppointmentsPage() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const { data: appointments = [] } = useSWR<Appointment[]>(
    `/api/appointments?assignedTo=me${selectedTab !== "all" ? `&status=${selectedTab}` : ""}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const filteredAppointments = Array.isArray(appointments) ? appointments.filter(
    (apt) =>
      apt.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      apt.clientEmail?.toLowerCase().includes(search.toLowerCase()) ||
      apt.title?.toLowerCase().includes(search.toLowerCase())
  ) : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>
      case "cancelled":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Appointments</CardTitle>
          <CardDescription>
            View and manage your assigned appointment requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full justify-start overflow-x-auto h-11 bg-muted/30 p-1 rounded-xl">
              <TabsTrigger value="all" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Rejected</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              <ScrollArea className="h-[500px]">
                {filteredAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      No appointments found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-white/5 p-4 hover:bg-white/5 transition-all cursor-pointer gap-4 group"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-sm tracking-tight">{appointment.title}</p>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-xs font-medium text-muted-foreground/80 truncate max-w-[280px] sm:max-w-md">
                            {appointment.clientName} <span className="opacity-50 mx-1">|</span> {appointment.clientEmail}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            <span className="flex items-center gap-1.5 bg-black/20 dark:bg-white/5 px-2 py-1 rounded-lg">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(appointment.date), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1.5 bg-black/20 dark:bg-white/5 px-2 py-1 rounded-lg">
                              <Clock className="h-3 w-3" />
                              {appointment.startTime} - {appointment.endTime}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground rounded-xl self-end sm:self-center">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black tracking-tight">{selectedAppointment?.title}</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Appointment details
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            {selectedAppointment && (
              <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
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
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(selectedAppointment.date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAppointment.startTime} - {selectedAppointment.endTime}</span>
                </div>
              </div>

              {selectedAppointment.description && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground rounded-lg border p-3">
                    {selectedAppointment.description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(selectedAppointment.status)}
              </div>
            </div>
          )}
          </ScrollArea>
          <div className="p-6 pt-0 border-white/10">
            <Button variant="outline" className="w-full rounded-xl border-white/10 font-bold uppercase tracking-widest text-[10px] h-10" onClick={() => setSelectedAppointment(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
