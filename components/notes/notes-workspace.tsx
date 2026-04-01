"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  FolderPlus,
  Heart,
  Loader2,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

interface NoteFolder {
  _id: string
  name: string
  color: string
  icon: string
  isDefault: boolean
  noteCount: number
}

interface NoteChecklistItem {
  id: string
  text: string
  checked: boolean
}

interface NoteDocument {
  _id: string
  folderId: string
  title: string
  body: string
  tags: string[]
  checklist: NoteChecklistItem[]
  pinned: boolean
  favorite: boolean
  color: string
  updatedAt: string
  createdAt: string
}

type NotesView = "all" | "pinned" | "favorites"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Request failed")
  }

  return data
}

function summarizeNote(note: NoteDocument) {
  const checklistPreview = note.checklist
    .map((item) => `${item.checked ? "Done" : "Todo"}: ${item.text}`)
    .join(" • ")
  const preview = [note.body, checklistPreview].find(Boolean) || "No additional content yet."
  return preview.slice(0, 110)
}

function normalizeNote(note: NoteDocument) {
  return {
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : [],
    checklist: Array.isArray(note.checklist) ? note.checklist : [],
  }
}

export function NotesWorkspace() {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [view, setView] = useState<NotesView>("all")
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [folderColor, setFolderColor] = useState("#f59e0b")
  const [draft, setDraft] = useState<NoteDocument | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  const foldersKey = "/api/note-folders"
  const notesKey = useMemo(() => {
    const params = new URLSearchParams()

    if (selectedFolderId !== "all") {
      params.set("folderId", selectedFolderId)
    }

    if (search.trim()) {
      params.set("q", search.trim())
    }

    if (view !== "all") {
      params.set("view", view)
    }

    const query = params.toString()
    return `/api/notes${query ? `?${query}` : ""}`
  }, [search, selectedFolderId, view])

  const {
    data: folders = [],
    mutate: mutateFolders,
  } = useSWR<NoteFolder[]>(foldersKey, fetcher)
  const {
    data: notes = [],
    isLoading: notesLoading,
    mutate: mutateNotes,
  } = useSWR<NoteDocument[]>(notesKey, fetcher)

  useEffect(() => {
    if (!notes.length) {
      setSelectedNoteId(null)
      setDraft(null)
      return
    }

    const existing = notes.find((note) => note._id === selectedNoteId)
    const next = existing || notes[0]

    setSelectedNoteId(next._id)
    setDraft(normalizeNote(next))
  }, [notes, selectedNoteId])

  const activeNote = notes.find((note) => note._id === selectedNoteId) || null

  useEffect(() => {
    if (!activeNote) {
      return
    }

    setDraft((current) => {
      if (current?._id === activeNote._id) {
        return current
      }

      return normalizeNote(activeNote)
    })
  }, [activeNote])

  useEffect(() => {
    if (!draft || !activeNote) {
      return
    }

    const nextPayload = JSON.stringify({
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      checklist: draft.checklist,
      pinned: draft.pinned,
      favorite: draft.favorite,
      color: draft.color,
      folderId: draft.folderId,
    })

    const activePayload = JSON.stringify({
      title: activeNote.title,
      body: activeNote.body,
      tags: activeNote.tags,
      checklist: activeNote.checklist,
      pinned: activeNote.pinned,
      favorite: activeNote.favorite,
      color: activeNote.color,
      folderId: activeNote.folderId,
    })

    if (nextPayload === activePayload) {
      return
    }

    setSaveState("saving")

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/notes/${draft._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to save note")
        }

        await mutateNotes()
        await mutateFolders()
        setSaveState("saved")
      } catch (error: any) {
        toast.error(error.message || "Failed to save note")
        setSaveState("idle")
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [activeNote, draft, mutateFolders, mutateNotes])

  const handleCreateNote = async () => {
    try {
      const targetFolder = selectedFolderId === "all" ? folders[0]?._id : selectedFolderId
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: targetFolder,
          title: "Untitled Note",
          body: "",
          checklist: [],
          tags: [],
          color: "#f9fafb",
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create note")
      }

      await mutateNotes()
      await mutateFolders()
      setSelectedNoteId(data._id)
      toast.success("New note created.")
    } catch (error: any) {
      toast.error(error.message || "Failed to create note")
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNoteId) {
      return
    }

    try {
      const response = await fetch(`/api/notes/${selectedNoteId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete note")
      }

      await mutateNotes()
      await mutateFolders()
      toast.success("Note deleted.")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note")
    }
  }

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Folder name is required.")
      return
    }

    try {
      const response = await fetch("/api/note-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          color: folderColor,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create folder")
      }

      await mutateFolders()
      setSelectedFolderId(data._id)
      setFolderDialogOpen(false)
      setFolderName("")
      toast.success("Folder created.")
    } catch (error: any) {
      toast.error(error.message || "Failed to create folder")
    }
  }

  const setChecklistItem = (itemId: string, updates: Partial<NoteChecklistItem>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            checklist: current.checklist.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          }
        : current
    )
  }

  const activeFolder = folders.find((folder) => folder._id === draft?.folderId)

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Notes</h2>
            <p className="text-sm text-muted-foreground">
              Organize folders, pin important ideas, and keep quick checklists in an Apple Notes-inspired workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <Button onClick={handleCreateNote}>
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[250px_320px_1fr]">
          <Card className="border-white/20 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Folders</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId("all")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      selectedFolderId === "all" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                    )}
                  >
                    <span className="font-medium">All Notes</span>
                    <Badge variant="secondary">{notes.length}</Badge>
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder._id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder._id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
                        selectedFolderId === folder._id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: folder.color }} />
                        <div>
                          <p className="font-medium">{folder.name}</p>
                          {folder.isDefault ? (
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Default</p>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="secondary">{folder.noteCount}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Smart Views</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Everything", value: "all" as const, icon: Sparkles },
                    { label: "Pinned", value: "pinned" as const, icon: Pin },
                    { label: "Favorites", value: "favorites" as const, icon: Heart },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={view === option.value ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setView(option.value)}
                    >
                      <option.icon className="mr-2 h-4 w-4" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/20 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-background/80 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notes, checklist items, tags..."
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>

              <ScrollArea className="h-[58vh] pr-3">
                <div className="space-y-3">
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="rounded-3xl border border-dashed p-8 text-center">
                      <NotebookPen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-4 font-medium">No notes yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create a note to start capturing ideas, checklists, and meeting summaries.
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <button
                        key={note._id}
                        type="button"
                        onClick={() => {
                          setSelectedNoteId(note._id)
                          setDraft(normalizeNote(note))
                        }}
                        className={cn(
                          "w-full rounded-3xl border p-4 text-left transition-colors",
                          selectedNoteId === note._id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{note.title || "Untitled Note"}</p>
                            <p className="text-xs text-muted-foreground">
                              Edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {note.pinned ? <Pin className="h-4 w-4 text-amber-500" /> : null}
                            {note.favorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : null}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{summarizeNote(note)}</p>
                        {note.tags?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {note.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-white/20 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
            <CardContent className="space-y-5 p-5">
              {draft ? (
                <>
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{activeFolder?.name || "Folder"}</Badge>
                        <Badge variant="outline">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Ready"}</Badge>
                      </div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Created {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={draft.pinned ? "default" : "outline"}
                        onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}
                      >
                        <Pin className="mr-2 h-4 w-4" />
                        Pin
                      </Button>
                      <Button
                        type="button"
                        variant={draft.favorite ? "default" : "outline"}
                        onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Favorite
                      </Button>
                      <Button type="button" variant="outline" onClick={handleDeleteNote}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="Untitled Note"
                    className="border-0 px-0 text-3xl font-black shadow-none focus-visible:ring-0"
                  />

                  <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <Input
                        value={draft.tags.join(", ")}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            tags: event.target.value
                              .split(",")
                              .map((tag) => tag.trim().toLowerCase())
                              .filter(Boolean),
                          })
                        }
                        placeholder="meeting, follow-up, ideas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Folder</Label>
                      <select
                        value={draft.folderId}
                        onChange={(event) => setDraft({ ...draft, folderId: event.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {folders.map((folder) => (
                          <option key={folder._id} value={folder._id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      value={draft.body}
                      onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                      placeholder="Start writing..."
                      className="min-h-[220px] resize-none rounded-3xl bg-background/80"
                    />
                  </div>

                  <div className="space-y-3 rounded-3xl border bg-background/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Checklist</p>
                        <p className="text-sm text-muted-foreground">Track action items inside the same note.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            checklist: [
                              ...draft.checklist,
                              { id: crypto.randomUUID(), text: "", checked: false },
                            ],
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add item
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {draft.checklist.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                          No checklist items yet.
                        </div>
                      ) : (
                        draft.checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-2xl border px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(event) => setChecklistItem(item.id, { checked: event.target.checked })}
                              className="h-4 w-4"
                            />
                            <Input
                              value={item.text}
                              onChange={(event) => setChecklistItem(item.id, { text: event.target.value })}
                              placeholder="Checklist item"
                              className="border-0 px-0 shadow-none focus-visible:ring-0"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  checklist: draft.checklist.filter((checklistItem) => checklistItem.id !== item.id),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[58vh] items-center justify-center">
                  <div className="max-w-sm space-y-3 text-center">
                    <NotebookPen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="text-lg font-semibold">Select or create a note</p>
                    <p className="text-sm text-muted-foreground">
                      Your editor will appear here with auto-save, tags, and checklist support.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>Use folders the way you would in Apple Notes to keep work tidy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Ideas, Meetings, Product..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-color">Accent color</Label>
              <Input
                id="folder-color"
                type="color"
                value={folderColor}
                onChange={(event) => setFolderColor(event.target.value)}
                className="h-12"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>Create Folder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
