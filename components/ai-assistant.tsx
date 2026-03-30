"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Loader2, 
  Bot, 
  User, 
  Calendar,
  CheckCircle,
  Minimize2,
  Maximize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    maxSteps: 5,
    onResponse: () => {
       // Scroll to bottom when response arrives
    }
  })

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              filter: "blur(0px)",
              height: isMinimized ? "auto" : "550px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            className={cn(
              "w-[380px] bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden flex flex-col pointer-events-auto transition-all duration-300",
              isMinimized && "w-[240px]"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-lg relative overflow-hidden">
               {/* Decorative background */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               
               <div className="flex items-center gap-2 relative z-10">
                 <div className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Sparkles className="h-4 w-4" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest leading-none">Dsignxt</span>
                    <span className="text-[10px] font-bold opacity-70 leading-none mt-1">Smart Assistant</span>
                 </div>
               </div>

               <div className="flex items-center gap-1 relative z-10">
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10 rounded-lg" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10 rounded-lg" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                 </Button>
               </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Area */}
                <ScrollArea className="flex-1 p-4" scrollHideDelay={100} ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 opacity-50">
                         <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center rotate-3 transition-transform hover:rotate-0">
                            <Bot className="h-8 w-8 text-primary" />
                         </div>
                         <div className="max-w-[200px]">
                            <p className="text-sm font-bold uppercase tracking-tight">How can I help?</p>
                            <p className="text-[10px] font-medium mt-1">Ask me to check appointments, add tasks, or manage your calendar.</p>
                         </div>
                      </div>
                    )}
                    
                    {messages.map((m: any) => (
                      <div key={m.id} className={cn(
                        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        m.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}>
                        <div className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                          m.role === "user" ? "bg-zinc-200 dark:bg-zinc-800" : "bg-primary text-white"
                        )}>
                          {m.role === "user" ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm",
                          m.role === "user" 
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tr-none" 
                            : "bg-white dark:bg-zinc-950/80 border border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-100 rounded-tl-none shadow-xl"
                        )}>
                          {m.content}
                          {m.toolInvocations?.map((tool: any) => (
                            <div key={tool.toolCallId} className="mt-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-primary/10 text-[10px] flex items-center gap-2 italic text-muted-foreground">
                              {tool.state === 'call' ? (
                                <><Loader2 className="h-3 w-3 animate-spin" /> Using {tool.toolName}...</>
                              ) : (
                                <><CheckCircle className="h-3 w-3 text-emerald-500" /> {tool.toolName} completed</>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0">
                           <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                        <div className="bg-white dark:bg-zinc-950/50 border border-white/10 p-3 rounded-2xl rounded-tl-none shadow-sm">
                           <div className="flex gap-1">
                              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
                              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce delay-75" />
                              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce delay-150" />
                           </div>
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold text-center border border-red-500/20">
                         Something went wrong. Please check your connection.
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-lg">
                  <form onSubmit={handleSubmit} className="relative">
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Type your message..."
                      className="h-11 pl-4 pr-12 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20 focus:bg-white focus:border-primary transition-all text-xs font-semibold shadow-inner"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isLoading || !input?.trim()}
                      className="absolute right-1 top-1 h-9 w-9 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-110 active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <p className="text-[10px] text-center text-muted-foreground/40 font-bold uppercase tracking-widest mt-3">
                     Powered by Groq Llama 3.3
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-16 w-16 rounded-3xl shadow-2xl transition-all duration-500 pointer-events-auto transform hover:rotate-6 active:scale-90",
          isOpen ? "bg-zinc-800 text-white rotate-90" : "bg-primary text-white"
        )}
      >
        {isOpen ? <X className="h-7 w-7" /> : <Sparkles className="h-8 w-8" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </Button>
    </div>
  )
}
