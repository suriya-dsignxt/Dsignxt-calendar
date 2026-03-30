"use client"

import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import Link from "next/link"

interface Appointment {
  _id: string
  clientName: string
  clientEmail: string
  date: string
  startTime: string
  endTime: string
  title: string
  status: "pending" | "approved" | "rejected" | "cancelled"
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDashboardPage() {
  const today = new Date()
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const { data: weekAppointments = [] } = useSWR<Appointment[]>(
    `/api/appointments?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`,
    fetcher
  )

  const { data: monthAppointments = [] } = useSWR<Appointment[]>(
    `/api/appointments?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`,
    fetcher
  )

  const { data: pendingAppointments = [] } = useSWR<Appointment[]>(
    "/api/appointments?status=pending",
    fetcher,
    { refreshInterval: 30000 }
  )

  const stats = {
    thisWeek: Array.isArray(weekAppointments) ? weekAppointments.filter((a) => a.status === "approved").length : 0,
    thisMonth: Array.isArray(monthAppointments) ? monthAppointments.filter((a) => a.status === "approved").length : 0,
    pending: Array.isArray(pendingAppointments) ? pendingAppointments.length : 0,
    approved: Array.isArray(monthAppointments) ? monthAppointments.filter((a) => a.status === "approved").length : 0,
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
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">confirmed appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">total appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>Appointments awaiting your approval</CardDescription>
            </div>
            <Link href="/admin/appointments?status=pending">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {!Array.isArray(pendingAppointments) || pendingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No pending appointments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(pendingAppointments) && pendingAppointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment._id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{appointment.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(appointment.date), "MMM d, yyyy")}
                          <Clock className="ml-2 h-3 w-3" />
                          {appointment.startTime} - {appointment.endTime}
                        </div>
                      </div>
                      <Link href={`/admin/appointments?id=${appointment._id}`}>
                        <Button size="sm">Review</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Your schedule for this week</CardDescription>
            </div>
            <Link href="/admin/calendar">
              <Button variant="ghost" size="sm">
                View calendar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {!Array.isArray(weekAppointments) || weekAppointments.filter((a) => a.status === "approved").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No appointments this week
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(weekAppointments) && weekAppointments
                    .filter((a) => a.status === "approved")
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 5)
                    .map((appointment) => (
                      <div
                        key={appointment._id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.clientName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(appointment.date), "EEE, MMM d")}
                            <Clock className="ml-2 h-3 w-3" />
                            {appointment.startTime}
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
