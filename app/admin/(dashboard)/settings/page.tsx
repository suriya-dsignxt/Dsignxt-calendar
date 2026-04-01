"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2 } from "lucide-react"

interface Settings {
  _id?: string
  companyName: string
  companyEmail: string
  timezone: string
  bookingLeadTime: number
  maxAdvanceBooking: number
  autoApprove: boolean
}

const TIMEZONES = [
  { value: "UTC", label: "(UTC+00:00) UTC" },
  { value: "America/Anchorage", label: "(UTC-09:00) Alaska Time" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time (PT)" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time (MT)" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time (CT)" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time (ET)" },
  { value: "America/Halifax", label: "(UTC-04:00) Atlantic Time" },
  { value: "America/Sao_Paulo", label: "(UTC-03:00) Brasilia" },
  { value: "Atlantic/Cape_Verde", label: "(UTC-01:00) Cape Verde" },
  { value: "Europe/London", label: "(UTC+00:00) London (GMT)" },
  { value: "Europe/Paris", label: "(UTC+01:00) Paris (CET)" },
  { value: "Africa/Cairo", label: "(UTC+02:00) Cairo" },
  { value: "Europe/Moscow", label: "(UTC+03:00) Moscow" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Dubai (GST)" },
  { value: "Asia/Kolkata", label: "(UTC+05:30) India (IST)" },
  { value: "Asia/Dhaka", label: "(UTC+06:00) Dhaka" },
  { value: "Asia/Bangkok", label: "(UTC+07:00) Bangkok" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo (JST)" },
  { value: "Australia/Sydney", label: "(UTC+11:00) Sydney (AEDT)" },
  { value: "Pacific/Auckland", label: "(UTC+13:00) Auckland" },
]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SettingsPage() {
  const { data: settings, mutate } = useSWR<Settings>("/api/settings", fetcher)
  const [formData, setFormData] = useState<Settings>({
    companyName: "",
    companyEmail: "",
    timezone: "UTC",
    bookingLeadTime: 24,
    maxAdvanceBooking: 60,
    autoApprove: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Only update if settings is a valid object and not an error response from the API
    if (settings && typeof settings === 'object' && 'companyName' in settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      mutate()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Basic information about your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName || ""}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Your Company Name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Notification Email</Label>
            <Input
              id="companyEmail"
              type="email"
              value={formData.companyEmail || ""}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              placeholder="admin@yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Booking notifications will be sent to this email address
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Rules</CardTitle>
          <CardDescription>
            Configure how clients can book appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leadTime">Minimum Lead Time (hours)</Label>
            <Input
              id="leadTime"
              type="number"
              min="0"
              value={formData.bookingLeadTime ?? 24}
              onChange={(e) => setFormData({ ...formData, bookingLeadTime: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Clients must book at least this many hours in advance
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="advanceBooking">Maximum Advance Booking (days)</Label>
            <Input
              id="advanceBooking"
              type="number"
              min="1"
              value={formData.maxAdvanceBooking ?? 60}
              onChange={(e) => setFormData({ ...formData, maxAdvanceBooking: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground">
              Clients can book up to this many days in advance
            </p>
          </div>
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Auto-approve bookings</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve all booking requests without manual review
              </p>
            </div>
            <Switch
              checked={formData.autoApprove}
              onCheckedChange={(checked) => setFormData({ ...formData, autoApprove: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600">Settings saved successfully!</span>
        )}
      </div>
    </div>
  )
}
