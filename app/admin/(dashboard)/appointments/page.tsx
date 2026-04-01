"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Shield,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConfirm } from "@/providers/confirm-provider"

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
  createdAt: string
  adminNotes?: string
  assignedTo?: string[]
  meetingLink?: string
}

interface User {
  _id: string
  name: string
  email: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AppointmentsPage() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [meetingLink, setMeetingLink] = useState("")
  const [loading, setLoading] = useState(false)
  const confirm = useConfirm()
  const router = useRouter()

  const { data: appointments = [], mutate } = useSWR<Appointment[]>(
    `/api/appointments${selectedTab !== "all" ? `?status=${selectedTab}` : ""}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: teamMembers = [] } = useSWR<User[]>("/api/team", fetcher)
  const [assignedTo, setAssignedTo] = useState<string[]>([])

  // Update modal state when an appointment is selected
  useEffect(() => {
    if (selectedAppointment) {
      setMeetingLink(selectedAppointment.meetingLink || "")
      
      const aptAssignedTo = selectedAppointment.assignedTo
      if (aptAssignedTo) {
        setAssignedTo(Array.isArray(aptAssignedTo) ? aptAssignedTo : [aptAssignedTo])
      } else {
        setAssignedTo([])
      }
    }
  }, [selectedAppointment])

  const filteredAppointments = Array.isArray(appointments) ? appointments.filter(
    (apt) =>
      apt.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      apt.clientEmail?.toLowerCase().includes(search.toLowerCase()) ||
      apt.title?.toLowerCase().includes(search.toLowerCase())
  ) : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">Pending</Badge>
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">Rejected</Badge>
      case "cancelled":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleApprove = async () => {
    if (!selectedAppointment) return
    setLoading(true)
    
    try {
      await fetch(`/api/appointments/${selectedAppointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "approved",
          meetingLink,
          assignedTo: assignedTo.length > 0 ? assignedTo : undefined
        }),
      })
      mutate()
      setSelectedAppointment(null)
      setMeetingLink("")
      setAssignedTo([])
    } catch (error) {
      console.error("Failed to approve:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedAppointment) return
    setLoading(true)
    
    try {
      await fetch(`/api/appointments/${selectedAppointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "rejected",
          adminNotes: rejectReason 
        }),
      })
      mutate()
      setSelectedAppointment(null)
      setRejectReason("")
    } catch (error) {
      console.error("Failed to reject:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Appointment",
      message: "Are you sure you want to delete this appointment? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Keep it",
      variant: "danger"
    })

    if (!isConfirmed) return
    
    try {
      await fetch(`/api/appointments/${id}`, { method: "DELETE" })
      mutate()
    } catch (error) {
      console.error("Failed to delete:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Appointments</CardTitle>
          <CardDescription>
            View, approve, or reject appointment requests from clients
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
                {!Array.isArray(filteredAppointments) || filteredAppointments.length === 0 ? (
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
                              {format(parseISO(appointment.date.split('T')[0]), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1.5 bg-black/20 dark:bg-white/5 px-2 py-1 rounded-lg">
                              <Clock className="h-3 w-3" />
                              {appointment.startTime} - {appointment.endTime}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-0 border-white/5">
                          {appointment.status === "pending" && (
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 sm:flex-none h-8 text-[10px] font-bold uppercase tracking-widest text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 rounded-xl"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAppointment(appointment)
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 sm:flex-none h-8 text-[10px] font-bold uppercase tracking-widest text-red-600 border-red-500/20 hover:bg-red-500/10 rounded-xl"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAppointment(appointment)
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                Reject
                              </Button>
                            </div>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl ml-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(appointment._id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={(open) => {
        if (!open) {
          setSelectedAppointment(null)
          setMeetingLink("")
          setRejectReason("")
          setAssignedTo([])
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black tracking-tight">{selectedAppointment?.title}</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Review appointment details and take action
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
                  <span>{format(parseISO(selectedAppointment.date.split('T')[0]), "EEEE, MMMM d, yyyy")}</span>
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

              {selectedAppointment.assignedTo && selectedAppointment.assignedTo.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Assigned Team Members</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppointment.assignedTo.map(id => {
                      const member = teamMembers.find(m => m._id === id)
                      return (
                        <Badge key={id} variant="secondary" className="bg-primary/20 text-primary border-none">
                          {member?.name || 'Unknown Member'}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {["pending", "approved"].includes(selectedAppointment.status) && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="meetingLink" className="text-sm font-medium">Meeting Link (Google Meet, Zoom, etc.)</Label>
                    <Input
                      id="meetingLink"
                      placeholder="https://meet.google.com/..."
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">This link will be sent to the client in the confirmation email.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Assign to Team Members</Label>
                    <ScrollArea className="h-[120px] rounded-md border border-white/10 bg-white/5 p-2">
                      <div className="grid grid-cols-1 gap-2">
                        {teamMembers.map((member) => (
                          <div key={member._id} className="flex items-center space-x-2 rounded-md p-1 hover:bg-white/5 transition-colors">
                            <input
                              type="checkbox"
                              id={`member-${member._id}`}
                              checked={assignedTo.includes(member._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedTo([...assignedTo, member._id])
                                } else {
                                  setAssignedTo(assignedTo.filter(id => id !== member._id))
                                }
                              }}
                              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-primary ring-offset-zinc-950 focus:ring-primary"
                            />
                            <label
                              htmlFor={`member-${member._id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {member.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignedTo.length > 0 ? (
                        assignedTo.map(id => {
                          const member = teamMembers.find(m => m._id === id)
                          return member ? (
                            <Badge key={id} variant="secondary" className="bg-primary/20 text-primary-foreground text-[10px] py-0 px-2 border-none">
                              {member.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No members assigned</span>
                      )}
                    </div>
                  </div>

                  {selectedAppointment.status === "pending" && (
                    <div className="space-y-2">
                      <Label htmlFor="rejectReason" className="text-sm font-medium">Rejection reason (optional)</Label>
                      <Textarea
                        id="rejectReason"
                        placeholder="Provide a reason if rejecting..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          </ScrollArea>
          
          <DialogFooter className="p-6 pt-4 border-t border-white/10 bg-muted/20 shrink-0">
            {selectedAppointment?.status === "pending" && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 h-10 text-[11px] font-bold uppercase tracking-widest text-red-600 border-red-500/20 hover:bg-red-500/10 rounded-xl"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 h-10 text-[11px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
            {selectedAppointment?.status === "approved" && (
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="w-full h-11 text-xs font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
            {selectedAppointment?.status !== "pending" && selectedAppointment?.status !== "approved" && (
              <Button variant="outline" onClick={() => setSelectedAppointment(null)} className="w-full h-11 text-xs font-black uppercase tracking-[0.2em] rounded-xl border-white/10">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
