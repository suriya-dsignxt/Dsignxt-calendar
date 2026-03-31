"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { format, addDays, subDays, startOfDay, isSameDay } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Trash2,
  ArrowRight,
  Loader2,
  ListTodo,
  MoreVertical,
  MousePointer2,
  CalendarCheck2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor
} from "@dnd-kit/core"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Task {
  _id: string
  title: string
  description?: string
  dueDate: string
  status: 'pending' | 'completed'
}

function DraggableTaskItem({ 
  task, 
  onToggle, 
  onPush, 
  onDelete, 
  onView, 
  isSelected, 
  onSelect 
}: { 
  task: Task, 
  onToggle: (id: string, status: string) => void,
  onPush: (id: string) => void,
  onDelete: (id: string) => void,
  onView: (task: Task) => void,
  isSelected: boolean,
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1
  } : undefined;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/50 dark:bg-zinc-900/50 transition-all hover:shadow-lg hover:border-white/30 cursor-grab active:cursor-grabbing",
        isDragging && "ring-2 ring-primary/50 shadow-2xl scale-105",
        isSelected && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex flex-col items-center gap-4 py-1">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onSelect(task._id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-md border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-none"
        />
        <button 
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag when toggling
          onClick={() => onToggle(task._id, task.status)} 
          className="transition-transform active:scale-90"
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0" onClick={() => onView(task)}>
        <h4 className={cn(
          "text-sm font-bold tracking-tight mb-1",
          task.status === 'completed' && "line-through opacity-50"
        )}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-1 group-hover:line-clamp-none transition-all">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all" onPointerDown={(e) => e.stopPropagation()}>
           {task.status === 'pending' && (
             <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onPush(task._id); }} className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg border-primary/20 hover:bg-primary hover:text-primary-foreground">
                <ArrowRight className="h-3 w-3 mr-1" />
                Push
             </Button>
           )}
           <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(task._id); }} className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10 rounded-lg">
              <Trash2 className="h-3 w-3" />
           </Button>
           <div className="ml-auto p-1 opacity-20 group-hover:opacity-60">
             <MoreVertical className="h-4 w-4" />
           </div>
        </div>
      </div>
    </div>
  );
}

function DroppableContainer({ id, children, title, subtitle, badgeText, count, isLoading }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "border-white/20 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden self-start transition-all duration-300",
        isOver && "ring-2 ring-primary/50 bg-primary/5 scale-[1.01]",
        id === 'completed' && "opacity-90 grayscale-[0.3] hover:grayscale-0 hover:opacity-100"
      )}
    >
      <CardHeader className="border-b border-white/10 bg-gradient-to-r from-primary/5 to-transparent pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black tracking-tight">{title}</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">{subtitle}</CardDescription>
          </div>
          <Badge variant="secondary" className={cn(
            "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase border-none",
            id === 'pending' ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {count} {badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sycing...</span>
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 opacity-40">
               <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center -rotate-3">
                  <ListTodo className="h-8 w-8" />
               </div>
               <p className="text-sm font-bold uppercase tracking-tight">No tasks here</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {children}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function TasksClient() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [viewingTask, setViewingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor)
  );

  const dateStr = format(selectedDate, "yyyy-MM-dd")
  const { data: tasks = [], isLoading } = useSWR<Task[]>(
    `/api/tasks?date=${dateStr}`, 
    fetcher
  )

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTask,
          dueDate: selectedDate.toISOString()
        })
      })

      if (!res.ok) throw new Error("Failed to add task")

      toast.success("Task added successfully")
      setIsAddOpen(false)
      setNewTask({ title: "", description: "" })
      mutate(`/api/tasks?date=${dateStr}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error("Failed to update status")
      mutate(`/api/tasks?date=${dateStr}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const pushToNextDay = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToNextDay: true })
      })

      if (!res.ok) throw new Error("Failed to push task")
      
      toast.success("Task pushed to tomorrow")
      mutate(`/api/tasks?date=${dateStr}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete task")
      
      toast.success("Task deleted")
      mutate(`/api/tasks?date=${dateStr}`)
      // Clear selection if deleted
      if (selectedTasks.has(id)) {
        const next = new Set(selectedTasks);
        next.delete(id);
        setSelectedTasks(next);
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handlePushSelected = async () => {
    if (selectedTasks.size === 0) return;
    setIsSubmitting(true);
    
    try {
      const promises = Array.from(selectedTasks).map(id => 
        fetch(`/api/tasks?id=${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pushToNextDay: true })
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedTasks.size} tasks pushed to tomorrow`);
      setSelectedTasks(new Set());
      mutate(`/api/tasks?date=${dateStr}`);
    } catch (error) {
      toast.error("Failed to push some tasks");
    } finally {
      setIsSubmitting(false);
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTasks(next);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as Task;
    const dropContainerId = over.id as string;

    if (task.status === 'pending' && dropContainerId === 'completed') {
      toggleStatus(task._id, 'pending');
      toast.success("Task marked as completed");
    } else if (task.status === 'completed' && dropContainerId === 'pending') {
      toggleStatus(task._id, 'completed');
      toast.success("Task moved back to active");
    }
  }

  const pendingTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending') : []
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed') : []

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Daily Planner</h2>
          <p className="text-muted-foreground font-medium">Manage your daily tasks and productivity</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/20 shadow-xl">
           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
           </Button>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-xl">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest min-w-[120px] text-center">
                {format(selectedDate, "EEE, MMM d")}
              </span>
           </div>
           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="h-4 w-4" />
           </Button>
           <div className="w-px h-6 bg-white/20 mx-1" />
           <Button onClick={() => setIsAddOpen(true)} className="h-9 rounded-xl shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
           </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-8 lg:grid-cols-2 relative">
          <DroppableContainer 
            id="pending" 
            title="Active Tasks" 
            subtitle="To-do for today" 
            badgeText="Pending" 
            count={pendingTasks.length} 
            isLoading={isLoading}
          >
            {pendingTasks.map(task => (
              <DraggableTaskItem 
                key={task._id} 
                task={task} 
                onToggle={toggleStatus} 
                onPush={pushToNextDay} 
                onDelete={deleteTask} 
                onView={setViewingTask}
                isSelected={selectedTasks.has(task._id)}
                onSelect={toggleSelect}
              />
            ))}
          </DroppableContainer>

          <DroppableContainer 
            id="completed" 
            title="Completed" 
            subtitle="Finished work" 
            badgeText="Done" 
            count={completedTasks.length} 
            isLoading={isLoading}
          >
            {completedTasks.map(task => (
              <DraggableTaskItem 
                key={task._id} 
                task={task} 
                onToggle={toggleStatus} 
                onPush={pushToNextDay} 
                onDelete={deleteTask} 
                onView={setViewingTask}
                isSelected={selectedTasks.has(task._id)}
                onSelect={toggleSelect}
              />
            ))}
          </DroppableContainer>

          {/* Bulk Action Bar */}
          <AnimatePresence>
            {selectedTasks.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 text-white backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/20 shadow-2xl flex items-center gap-6"
              >
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                  <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xs">
                    {selectedTasks.size}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest opacity-70">Selected</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handlePushSelected} 
                    disabled={isSubmitting}
                    className="h-10 rounded-xl bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase tracking-widest px-4"
                  >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Push to Tomorrow
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedTasks(new Set())}
                    className="h-10 rounded-xl text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Clear
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DndContext>

      {/* Add Task Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-3xl bg-background/95 backdrop-blur-2xl">
          <form onSubmit={handleAddTask}>
            <div className="p-8 space-y-6">
              <DialogHeader className="space-y-2">
                <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg shadow-primary/20 rotate-3 transition-transform hover:rotate-0">
                  <Plus className="h-7 w-7" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">New Assignment</DialogTitle>
                <DialogDescription className="text-base font-medium">Create a new daily task for yourself.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest opacity-60">Task Heading</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g., Client sync meeting Preparation" 
                      className="h-14 rounded-xl border-white/10 bg-white/10 backdrop-blur-sm transition-all focus:bg-white/20"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      required
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="desc" className="text-[10px] font-black uppercase tracking-widest opacity-60">Additional Notes</Label>
                    <Input 
                      id="desc" 
                      placeholder="Details about the task..." 
                      className="h-14 rounded-xl border-white/10 bg-white/10 backdrop-blur-sm transition-all focus:bg-white/20"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                 </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-white/10 flex flex-col gap-2">
               <Button type="submit" disabled={isSubmitting || !newTask.title} className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Assignment"}
               </Button>
               <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="w-full h-10 text-xs font-bold uppercase tracking-widest opacity-50">
                  Cancel
               </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Details View Dialog */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => !open && setViewingTask(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-3xl bg-background/95 backdrop-blur-2xl">
          {viewingTask && (
            <div className="p-8 space-y-8">
              <DialogHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={cn(
                    "rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                    viewingTask.status === 'pending' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                  )}>
                    {viewingTask.status}
                  </Badge>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    {format(new Date(viewingTask.dueDate), "MMMM d, yyyy")}
                  </span>
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-3xl font-black tracking-tight leading-tight">{viewingTask.title}</DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Assignment Details</Label>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground bg-muted/30 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                    {viewingTask.description || "No additional notes for this assignment."}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <Label className="text-[8px] font-black uppercase tracking-widest text-primary/60">Status</Label>
                      <div className="flex items-center gap-2">
                        {viewingTask.status === 'completed' ? <CalendarCheck2 className="h-4 w-4 text-emerald-500" /> : <MousePointer2 className="h-4 w-4 text-amber-500" />}
                        <span className="text-xs font-black uppercase tracking-widest">{viewingTask.status}</span>
                      </div>
                   </div>
                   <div className="space-y-2 p-4 rounded-2xl bg-zinc-500/5 border border-white/5">
                      <Label className="text-[8px] font-black uppercase tracking-widest opacity-40">Priority</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-lg text-[9px] font-black px-1.5 py-0">Standard</Badge>
                      </div>
                   </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
                 <Button 
                   onClick={() => { toggleStatus(viewingTask._id, viewingTask.status); setViewingTask(null); }}
                   className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                 >
                    Mark {viewingTask.status === 'pending' ? 'Complete' : 'Pending'}
                 </Button>
                 <Button 
                   variant="ghost" 
                   onClick={() => setViewingTask(null)}
                   className="w-full h-10 rounded-2xl font-black uppercase tracking-widest opacity-50"
                 >
                    Close
                 </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
