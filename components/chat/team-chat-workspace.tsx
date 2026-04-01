"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { StreamChat } from "stream-chat"
import {
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  LoadingIndicator,
  MessageInput,
  MessageList,
  Thread,
  useChatContext,
  Window,
} from "stream-chat-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Loader2, MessageCircleMore, MessagesSquare, Plus, Users2 } from "lucide-react"
import { toast } from "sonner"

interface StreamBootstrap {
  apiKey: string
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface Teammate {
  _id: string
  name: string
  email: string
  role: string
}

type ChannelView = "all" | "team" | "dm" | "group"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Request failed")
  }

  return data
}

function ChatSetupCard({ message }: { message: string }) {
  return (
    <Card className="border-dashed border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle>Stream setup needed</CardTitle>
        <CardDescription>
          Add `NEXT_PUBLIC_STREAM_CHAT_API_KEY` and `STREAM_CHAT_API_SECRET` to enable team chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  )
}

function ActiveChannelPane() {
  const { channel } = useChatContext()

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Choose a conversation</h3>
          <p className="text-sm text-muted-foreground">
            Open the whole-team room, start a new DM, or create a private group for a specific set of teammates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Channel channel={channel}>
      <Window>
        <ChannelHeader />
        <MessageList />
        <MessageInput />
      </Window>
      <Thread />
    </Channel>
  )
}

export function TeamChatWorkspace() {
  const { data: bootstrap, error: bootstrapError, isLoading: bootstrapLoading } = useSWR<StreamBootstrap>(
    "/api/stream/token",
    fetcher
  )
  const { data: teammates = [] } = useSWR<Teammate[]>("/api/chat/users", fetcher)

  const [client, setClient] = useState<StreamChat | null>(null)
  const [customActiveChannel, setCustomActiveChannel] = useState<string | undefined>(undefined)
  const [view, setView] = useState<ChannelView>("all")
  const [dialogMode, setDialogMode] = useState<"dm" | "group" | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [creatingConversation, setCreatingConversation] = useState(false)

  useEffect(() => {
    if (!bootstrap?.apiKey || !bootstrap?.token) {
      return
    }

    const streamClient = StreamChat.getInstance(bootstrap.apiKey)
    let alive = true

    const connect = async () => {
      try {
        if (streamClient.userID && streamClient.userID !== bootstrap.user.id) {
          await streamClient.disconnectUser()
        }

        if (!streamClient.userID) {
          await streamClient.connectUser(
            {
              id: bootstrap.user.id,
              name: bootstrap.user.name,
            },
            bootstrap.token
          )
        }

        const initialChannels = await streamClient.queryChannels(
          { type: "messaging", members: { $in: [bootstrap.user.id] } },
          { last_message_at: -1 },
          { watch: true, state: true, limit: 20 }
        )

        if (!alive) {
          return
        }

        setClient(streamClient)
        setCustomActiveChannel((current) => current || initialChannels[0]?.id)
      } catch (error) {
        console.error("Failed to connect Stream client", error)
      }
    }

    connect()

    return () => {
      alive = false
      streamClient.disconnectUser().catch(() => undefined)
    }
  }, [bootstrap])

  const filters = useMemo(() => {
    if (!bootstrap?.user.id) {
      return { type: "messaging" }
    }

    const base = {
      type: "messaging",
      members: { $in: [bootstrap.user.id] },
    }

    if (view === "team") {
      return { ...base, kind: "team" }
    }

    if (view === "dm") {
      return { ...base, kind: "dm" }
    }

    if (view === "group") {
      return { ...base, kind: "group" }
    }

    return base
  }, [bootstrap?.user.id, view])

  const sort = useMemo(() => ({ last_message_at: -1 as const }), [])
  const options = useMemo(() => ({ watch: true, state: true, presence: true, limit: 20 }), [])

  const resetComposer = () => {
    setDialogMode(null)
    setSelectedMembers([])
    setGroupName("")
  }

  const handleCreateConversation = async () => {
    if (!dialogMode) {
      return
    }

    if (selectedMembers.length === 0) {
      toast.error("Choose at least one teammate.")
      return
    }

    if (dialogMode === "group" && !groupName.trim()) {
      toast.error("Add a group name so the room is easy to find.")
      return
    }

    setCreatingConversation(true)

    try {
      const response = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedMembers,
          name: dialogMode === "group" ? groupName : undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create conversation")
      }

      if (client) {
        const channel = client.channel("messaging", data.id)
        await channel.watch()
        setCustomActiveChannel(channel.id)
      }

      toast.success(dialogMode === "dm" ? "Direct message ready." : "Group room created.")
      resetComposer()
    } catch (error: any) {
      toast.error(error.message || "Failed to create conversation")
    } finally {
      setCreatingConversation(false)
    }
  }

  if (bootstrapLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border bg-card/60">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (bootstrapError) {
    return <ChatSetupCard message={bootstrapError.message} />
  }

  if (!client || !bootstrap) {
    return <ChatSetupCard message="Chat will appear here once Stream is configured and your user token is ready." />
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Team Chat</h2>
            <p className="text-sm text-muted-foreground">
              Message the whole team, open direct messages, or spin up focused group rooms.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogMode("dm")}>
              <MessageCircleMore className="mr-2 h-4 w-4" />
              New DM
            </Button>
            <Button onClick={() => setDialogMode("group")}>
              <Users2 className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "All", value: "all" as const },
            { label: "Whole Team", value: "team" as const },
            { label: "Direct", value: "dm" as const },
            { label: "Groups", value: "group" as const },
          ].map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={view === option.value ? "default" : "outline"}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/20 bg-white/70 shadow-xl backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
          <Chat client={client} theme="str-chat__theme-light">
            <div className="grid min-h-[72vh] lg:grid-cols-[340px_1fr]">
              <div className="border-b border-border/60 lg:border-b-0 lg:border-r">
                <div className="border-b border-border/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <MessagesSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{bootstrap.user.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {bootstrap.user.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-[calc(72vh-89px)] overflow-hidden">
                  <ChannelList
                    filters={filters}
                    sort={sort}
                    options={options}
                    customActiveChannel={customActiveChannel}
                    setActiveChannelOnMount
                    LoadingIndicator={LoadingIndicator}
                  />
                </div>
              </div>

              <div className="min-h-[72vh] bg-background/60">
                <ActiveChannelPane />
              </div>
            </div>
          </Chat>
        </div>
      </div>

      <Dialog open={!!dialogMode} onOpenChange={(open) => (!open ? resetComposer() : undefined)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "dm" ? "Start a direct message" : "Create a group room"}</DialogTitle>
            <DialogDescription>
              Pick teammates and open a Stream conversation for this workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogMode === "group" && (
              <div className="space-y-2">
                <Label htmlFor="group-name">Group name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Launch prep, Design sync, Client handoff..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Select teammates</Label>
              <ScrollArea className="h-72 rounded-2xl border">
                <div className="space-y-2 p-3">
                  {teammates.map((teammate) => {
                    const active = selectedMembers.includes(teammate._id)

                    return (
                      <button
                        key={teammate._id}
                        type="button"
                        onClick={() =>
                          setSelectedMembers((current) =>
                            active
                              ? current.filter((memberId) => memberId !== teammate._id)
                              : dialogMode === "dm"
                                ? [teammate._id]
                                : [...current, teammate._id]
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                          active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                        )}
                      >
                        <div>
                          <p className="font-medium">{teammate.name}</p>
                          <p className="text-xs text-muted-foreground">{teammate.email}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {teammate.role.replace("_", " ")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetComposer}>
                Cancel
              </Button>
              <Button onClick={handleCreateConversation} disabled={creatingConversation}>
                {creatingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {dialogMode === "dm" ? "Open DM" : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
