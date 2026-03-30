"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Save, Plus, Trash2 } from "lucide-react"

interface AvailabilitySlot {
  _id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
  isActive: boolean
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const DURATIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AvailabilityPage() {
  const { data: availability = [], mutate } = useSWR<AvailabilitySlot[]>(
    "/api/availability",
    fetcher
  )
  const [saving, setSaving] = useState<number | null>(null)

  const getAvailabilityForDay = (dayIndex: number): AvailabilitySlot => {
    const existing = Array.isArray(availability) ? availability.find((a) => a.dayOfWeek === dayIndex) : null
    return (existing as AvailabilitySlot) || {
      dayOfWeek: dayIndex,
      startTime: "09:00",
      endTime: "17:00",
      slotDuration: 30,
      isActive: false,
    }
  }

  const handleSave = async (slot: AvailabilitySlot) => {
    setSaving(slot.dayOfWeek)
    
    try {
      await fetch("/api/availability", {
        method: slot._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slot),
      })
      mutate()
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(null)
    }
  }

  const handleToggle = async (dayIndex: number, isActive: boolean) => {
    const slot = getAvailabilityForDay(dayIndex)
    await handleSave({ ...slot, isActive })
  }

  const handleUpdate = async (dayIndex: number, field: string, value: string | number) => {
    const slot = getAvailabilityForDay(dayIndex)
    await handleSave({ ...slot, [field]: value })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
          <CardDescription>
            Set your available hours for each day of the week. Clients will only be able to book during these times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map((day, index) => {
              const slot = getAvailabilityForDay(index)
              const isSaving = saving === index
              
              return (
                <div
                  key={day}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-white/20 dark:border-white/5 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md p-6 transition-all hover:bg-white/80 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <Switch
                      checked={slot.isActive}
                      onCheckedChange={(checked) => handleToggle(index, checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-lg font-bold tracking-tight">{day}</span>
                  </div>
                  
                  {slot.isActive ? (
                    <div className="flex flex-1 flex-wrap items-center gap-6">
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">From</Label>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleUpdate(index, "startTime", e.target.value)}
                          className="w-32 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20"
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">To</Label>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleUpdate(index, "endTime", e.target.value)}
                          className="w-32 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20"
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Duration</Label>
                        <Select
                          value={String(slot.slotDuration)}
                          onValueChange={(value) => handleUpdate(index, "slotDuration", parseInt(value))}
                        >
                          <SelectTrigger className="w-36 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {DURATIONS.map((duration) => (
                              <SelectItem key={duration.value} value={String(duration.value)}>
                                {duration.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {isSaving && (
                        <div className="flex items-center gap-2 text-primary animate-pulse">
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span className="text-xs font-bold uppercase tracking-widest">Saving</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground/40 italic">Unavailable for bookings</span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>
            Apply common availability patterns quickly
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              // Monday-Friday 9-5
              for (let i = 1; i <= 5; i++) {
                await handleSave({
                  dayOfWeek: i,
                  startTime: "09:00",
                  endTime: "17:00",
                  slotDuration: 30,
                  isActive: true,
                })
              }
              // Disable weekends
              for (const i of [0, 6]) {
                await handleSave({
                  dayOfWeek: i,
                  startTime: "09:00",
                  endTime: "17:00",
                  slotDuration: 30,
                  isActive: false,
                })
              }
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Mon-Fri 9AM-5PM
          </Button>
          
          <Button
            variant="outline"
            onClick={async () => {
              // All days 10-6
              for (let i = 0; i <= 6; i++) {
                await handleSave({
                  dayOfWeek: i,
                  startTime: "10:00",
                  endTime: "18:00",
                  slotDuration: 60,
                  isActive: true,
                })
              }
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            All Days 10AM-6PM
          </Button>
          
          <Button
            variant="outline"
            onClick={async () => {
              // Disable all
              for (let i = 0; i <= 6; i++) {
                const slot = getAvailabilityForDay(i)
                if (slot._id) {
                  await handleSave({ ...slot, isActive: false })
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
