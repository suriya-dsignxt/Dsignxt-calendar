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
  Check,
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
        "group relative flex items-center gap-4 p-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white shadow-md dark:bg-white/5 backdrop-blur-xl transition-all hover:bg-black/[0.01] dark:hover:bg-white/10 cursor-grab active:cursor-grabbing",
        isDragging && "ring-1 ring-primary shadow-xl scale-102 z-50",
        isSelected && "border-primary/50 bg-primary/[0.05] dark:bg-primary/10 shadow-inner"
      )}
    >
      <div className="flex shrink-0 p-1" onPointerDown={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onSelect(task._id)}
          className="h-5 w-5 rounded-md border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all shadow-sm"
        />
      </div>

      <div className="flex-1 min-w-0" onClick={() => onView(task)}>
        <h4 className={cn(
          "text-sm font-bold tracking-tight",
          task.status === 'completed' && "line-through opacity-40"
        )}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none mt-1 line-clamp-1">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
         <button 
           onClick={() => onToggle(task._id, task.status)} 
           className="transition-all hover:scale-110 active:scale-90 p-1"
         >
           {task.status === 'completed' ? (
             <div className="h-5 w-5 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
             </div>
           ) : (
             <Circle className="h-5 w-5 text-muted-foreground/30 transition-colors hover:text-primary" />
           )}
         </button>

         {task.status === 'pending' && (
           <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onPush(task._id); }} className="h-8 px-3 text-[8px] font-black uppercase tracking-widest rounded-lg border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all shadow-sm">
              <ArrowRight className="h-3 w-3 mr-1.5" />
              Push
           </Button>
         )}
         
         <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(task._id); }} className="h-8 w-8 p-0 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all">
            <Trash2 className="h-3 w-3" />
         </Button>
         
         <div className="p-1 opacity-10 group-hover:opacity-100 transition-all cursor-move">
           <MoreVertical className="h-4 w-4" />
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
        "border-black/5 dark:border-white/5 bg-zinc-50/30 dark:bg-white/5 backdrop-blur-2xl shadow-xl rounded-[1.5rem] overflow-hidden self-start transition-all duration-500",
        isOver && "ring-1 ring-primary/50 bg-primary/[0.02] scale-[1.005]",
        id === 'completed' && "opacity-80 grayscale-[0.3] hover:grayscale-0 hover:opacity-100"
      )}
    >
      <CardHeader className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-black/20 p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-black tracking-tight text-foreground/90">{title}</CardTitle>
            <CardDescription className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">{subtitle}</CardDescription>
          </div>
          <Badge variant="secondary" className={cn(
            "rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-white/5 shadow-md",
            id === 'pending' ? "bg-primary text-primary-foreground" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {count} {badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/20">Syncing...</span>
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
               <div className="h-14 w-14 bg-black/5 rounded-xl border border-black/5 flex items-center justify-center -rotate-3 transition-transform hover:rotate-0">
                  <ListTodo className="h-7 w-7 text-primary/10" />
               </div>
               <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/20">Sector Clear</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
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
  const [mounted, setMounted] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [viewingTask, setViewingTask] = useState<Task | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-50/80 dark:bg-white/5 backdrop-blur-2xl p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent uppercase">Daily Planner</h2>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40 mt-1">Operational Oversight</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
           <div className="flex items-center gap-1.5 bg-white/50 dark:bg-black/40 p-1.5 rounded-xl border border-black/5 dark:border-white/5 shadow-inner">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary transition-all" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
             </Button>
             <div className="h-4 w-[1px] bg-black/5 dark:bg-white/10" />
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary transition-all" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
           
           <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-black/5 shadow-md min-w-[160px] justify-center">
              <CalendarIcon className="h-3.5 w-3.5 text-primary/40" />
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/70">
                {mounted ? format(selectedDate, "EEE, MMM d") : "Loading..."}
              </span>
           </div>

           <Button onClick={() => setIsAddOpen(true)} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[9px] tracking-[0.2em] shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all">
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
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
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#02031c] text-white px-6 py-4 rounded-[2rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-6"
              >
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                  <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-[10px] shadow-lg shadow-primary/30">
                    {selectedTasks.size}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white leading-none">Selected</span>
                    <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Operational Batch</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handlePushSelected} 
                    disabled={isSubmitting}
                    className="h-10 rounded-lg bg-white text-black hover:bg-white/90 text-[8px] font-black uppercase tracking-[0.2em] px-4 shadow-xl"
                  >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ArrowRight className="h-3 w-3 mr-2" />}
                    Move Tomorrow
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedTasks(new Set())}
                    className="h-10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-[8px] font-black uppercase tracking-[0.2em] px-4"
                  >
                    Abort
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
