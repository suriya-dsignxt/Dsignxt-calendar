"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Mail, UserPlus, Shield, Trash2, CheckCircle2, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/providers/confirm-provider"

interface TeamMember {
  _id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'team'
  isActive: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TeamManagementPage() {
  const { data: teamMembers = [], isLoading } = useSWR<TeamMember[]>("/api/team", fetcher)
  const [currentUser, setCurrentUser] = useState<{ role: string, email: string } | null>(null)
  
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [newMember, setNewMember] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "team" 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const confirm = useConfirm()

  // Fetch current user session to determine permissions
  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => setCurrentUser(data))
      .catch(() => setCurrentUser(null))
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to invite member")
      }

      toast.success(`${newMember.role === 'admin' ? 'Admin' : 'Team member'} invited successfully`)
      setIsInviteOpen(false)
      setNewMember({ name: "", email: "", password: "", role: "team" })
      mutate("/api/team")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, role: string) => {
    const isConfirmed = await confirm({
      title: `Delete ${role === 'admin' ? 'Admin' : 'Team Member'}`,
      message: `Are you sure you want to delete this ${role.replace('_', ' ')}? This action cannot be undone and they will lose all access.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    })

    if (!isConfirmed) return

    try {
      const res = await fetch(`/api/team?id=${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete user")
      }

      toast.success("User deleted successfully")
      mutate("/api/team")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update role")
      }

      toast.success("Role updated successfully")
      mutate("/api/team")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const isSuperAdmin = currentUser?.role === 'super_admin'
  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">Manage your team members and their permissions</p>
        </div>
        <Button onClick={() => setIsInviteOpen(!isInviteOpen)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {isInviteOpen ? "Cancel" : "Invite Member"}
        </Button>
      </div>

      {isInviteOpen && (
        <Card className="animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>Invite New Member</CardTitle>
            <CardDescription>Enter the details of the team member you want to invite.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newMember.role}
                    onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team Member</SelectItem>
                      {isSuperAdmin && (
                        <SelectItem value="admin">System Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Role</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 capitalize">
              {currentUser?.role?.replace('_', ' ') || "Loading..."}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Control</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {isSuperAdmin ? "Full Control" : "Limited Access"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
          <CardDescription>A list of team members manageble by your role.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">No team members found</p>
              </div>
            ) : (
              <div className="divide-y">
                {teamMembers.map((member) => {
                  // Role protection check for UI delete button
                  // Super Admin can delete Admin and Team
                  // Admin can ONLY delete Team
                  const canDelete = isSuperAdmin 
                    ? ['admin', 'team'].includes(member.role)
                    : member.role === 'team'

                  return (
                    <div key={member._id} className="flex items-center justify-between py-4 group">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold relative
                          ${member.role === 'super_admin' ? 'bg-orange-500/10 text-orange-600' : 
                            member.role === 'admin' ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                          {member.name.charAt(0)}
                          {member.role === 'super_admin' && (
                            <Shield className="h-3 w-3 absolute -bottom-1 -right-1 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.name}</p>
                            {member.email === currentUser?.email && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 leading-none uppercase tracking-widest text-muted-foreground/60">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(isSuperAdmin || (isAdmin && member.role === 'team')) && member.role !== 'super_admin' ? (
                          <Select
                            disabled={member.email === currentUser?.email}
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member._id, value)}
                          >
                            <SelectTrigger className={`h-7 text-[11px] font-semibold w-[110px] bg-transparent capitalize ${
                              member.role === 'admin' ? 'border-blue-500/20 text-blue-600' : ''
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="team">Team member</SelectItem>
                              {isSuperAdmin && (
                                <SelectItem value="admin">System Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={`capitalize ${
                            member.role === 'super_admin' ? 'border-orange-500/20 text-orange-600' : 
                            member.role === 'admin' ? 'border-blue-500/20 text-blue-600' : ''
                          }`}>
                            {member.role.replace('_', ' ')}
                          </Badge>
                        )}
                        {member.isActive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={() => handleDelete(member._id, member.role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
