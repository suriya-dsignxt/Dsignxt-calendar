"use client"

import { useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon, Plus, Trash2, CalendarOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BlockedDate {
  _id: string
  date: string
  allDay: boolean
  startTime?: string
  endTime?: string
  reason?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BlockedDatesPage() {
  const { data: blockedDates = [], mutate } = useSWR<BlockedDate[]>(
    "/api/blocked-dates",
    fetcher
  )
  
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!selectedDate) return
    setLoading(true)
    
    try {
      await fetch("/api/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          allDay,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          reason,
        }),
      })
      mutate()
      setSelectedDate(undefined)
      setReason("")
    } catch (error) {
      console.error("Failed to add:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/blocked-dates?id=${id}`, { method: "DELETE" })
      mutate()
    } catch (error) {
      console.error("Failed to delete:", error)
    }
  }

  const upcomingBlocked = Array.isArray(blockedDates) ? blockedDates
    .filter((bd) => new Date(bd.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : []

  const pastBlocked = Array.isArray(blockedDates) ? blockedDates
    .filter((bd) => new Date(bd.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-white/20 dark:border-white/5 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden self-start">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-black tracking-tighter">Block a Date</CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            Pause your schedule for specific periods
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-bold rounded-2xl bg-white/50 dark:bg-zinc-900/50 border-white/20 h-12 shadow-sm transition-all hover:translate-x-1",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4 opacity-50" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-white/20 shadow-2xl" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-2xl transition-colors hover:bg-black/10 dark:hover:bg-white/10">
            <Switch
              id="all-day"
              checked={allDay}
              onCheckedChange={setAllDay}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="all-day" className="font-bold cursor-pointer">Block entire day</Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Reason (optional)</Label>
            <Input
              placeholder="e.g., Holiday, Personal day"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-2xl bg-white/50 dark:bg-zinc-900/50 border-white/20 h-12"
            />
          </div>

          <Button
            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            onClick={handleAdd}
            disabled={!selectedDate || loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Processing</span>
              </div>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Block Date
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/20 dark:border-white/5 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden self-start">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-black tracking-tighter">Blocked Dates</CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            Manage your pause periods
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <ScrollArea className="h-[500px] pr-4">
            {blockedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6">
                  <CalendarOff className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">
                  No pause periods scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {upcomingBlocked.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 px-2">Upcoming</h4>
                    {upcomingBlocked.map((blocked) => (
                      <div
                        key={blocked._id}
                        className="group flex items-center justify-between rounded-2xl border border-white/20 dark:border-white/5 bg-white/30 dark:bg-zinc-900/30 p-5 transition-all hover:bg-white/60 dark:hover:bg-zinc-900/60 hover:translate-x-1"
                      >
                        <div className="space-y-1">
                          <p className="font-bold tracking-tight">
                            {format(new Date(blocked.date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20">
                              {blocked.allDay ? "All Day" : `${blocked.startTime} - ${blocked.endTime}`}
                            </Badge>
                            {blocked.reason && (
                              <span className="text-xs font-medium text-muted-foreground opacity-70 italic truncate max-w-[150px]">
                                {blocked.reason}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(blocked._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {pastBlocked.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-2">History</h4>
                    {pastBlocked.slice(0, 5).map((blocked) => (
                      <div
                        key={blocked._id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 dark:border-white/5 bg-transparent p-4 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100"
                      >
                        <div>
                          <p className="text-sm font-bold">
                            {format(new Date(blocked.date), "MMMM d, yyyy")}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {blocked.allDay ? "All day" : `${blocked.startTime} - ${blocked.endTime}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-lg"
                          onClick={() => handleDelete(blocked._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
