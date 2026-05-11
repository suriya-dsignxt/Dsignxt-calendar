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
  Maximize2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false) // Default to false to avoid permission issues on load
  const [browserSupport, setBrowserSupport] = useState({ stt: true, tts: true })
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const wakeWordRecognitionRef = useRef<any>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append } = useChat({
    api: "/api/chat",
    maxSteps: 5
  })

  // Check support on mount
  useEffect(() => {
    const stt = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    const tts = !!('speechSynthesis' in window)
    setBrowserSupport({ stt, tts })
    
    if (!stt) console.warn("Speech Recognition not supported in this browser.")
    if (!tts) console.warn("Speech Synthesis not supported in this browser.")
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        console.log("Speech recognition result:", transcript)
        setIsListening(false)
        
        // Append the message directly to the chat
        append({
          role: 'user',
          content: transcript,
        })
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("STT Error:", event.error)
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Wake Word Setup
    if (SpeechRecognition && !wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current = new SpeechRecognition()
      wakeWordRecognitionRef.current.continuous = true
      wakeWordRecognitionRef.current.interimResults = true
      wakeWordRecognitionRef.current.lang = "en-US"

      wakeWordRecognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1
        const transcript = event.results[last][0].transcript.toLowerCase()
        
        console.log("Wake word hearing:", transcript)

        if (transcript.includes("dsignxt") || 
            transcript.includes("design next") || 
            transcript.includes("hey design") || 
            transcript.includes("hey disin") || 
            transcript.includes("hey dis") || 
            transcript.includes("hi design") || 
            transcript.includes("hey sign") || 
            transcript.includes("hi sign") ||
            transcript.includes("design") ||
            transcript.includes("disin") ||
            transcript.includes("hey assistant")) {
          console.log("Wake word MATCHED!")
          setIsOpen(true)
          setIsMinimized(false)
          setIsSpeaking(true)
          
          // Small delay before starting active listening to let wake word finish
          setTimeout(() => {
            startListening()
          }, 400)
          
          // Stop wake word to avoid conflict
          wakeWordRecognitionRef.current.stop()
        }
      }

      wakeWordRecognitionRef.current.onend = () => {
        if (wakeWordEnabled && !isListening) {
          try {
            wakeWordRecognitionRef.current.start()
          } catch (e) {}
        }
      }
    }
  }, [wakeWordEnabled, isListening])

  // Handle Wake Word Toggle
  useEffect(() => {
    if (wakeWordEnabled) {
      try {
        wakeWordRecognitionRef.current?.start()
        console.log("Wake word detection started")
      } catch (e) {
        console.error("Could not start wake word:", e)
      }
    } else {
      wakeWordRecognitionRef.current?.stop()
    }
  }, [wakeWordEnabled])

  const startListening = () => {
    if (!browserSupport.stt) {
      alert("Speech recognition is not supported in your browser. Please try Chrome or Edge.")
      return
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch (e) {}
      setIsListening(false)
    } else {
      try {
        // Ensure wake word is stopped first
        if (wakeWordRecognitionRef.current) {
          wakeWordRecognitionRef.current.onend = null // Temporarily disable restart
          wakeWordRecognitionRef.current.stop()
        }
        
        setIsListening(true)
        // Small delay to ensure previous instance is fully stopped
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (e) {
            console.error("Start listening inner error:", e)
            setIsListening(false)
          }
        }, 100)
      } catch (e) {
        console.error("Start listening error:", e)
        setIsListening(false)
      }
    }
  }

  const speak = (text: string) => {
    if (!browserSupport.tts) return
    
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    
    const voices = window.speechSynthesis.getVoices()
    const preferredVoices = ["Google US English", "Microsoft Aria", "Samantha", "Microsoft Zira", "Victoria"]
    const selectedVoice = voices.find(v => preferredVoices.some(p => v.name.includes(p))) || voices[0]
    
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.pitch = 1.0
    utterance.rate = 1.0
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isLoading) {
      const lastMessage = messages[messages.length - 1].content
      if (isSpeaking) speak(lastMessage)
    }
  }, [messages, isLoading])

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
              "w-[calc(100vw-2rem)] sm:w-[380px] bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden flex flex-col pointer-events-auto transition-all duration-300",
              isMinimized && "w-[240px]"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-lg relative overflow-hidden">
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
                 {browserSupport.stt && (
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-7 w-7 text-white hover:bg-white/10 rounded-lg transition-colors",
                        wakeWordEnabled ? "bg-emerald-500/20 text-emerald-100" : "opacity-40"
                      )} 
                      onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                      title={wakeWordEnabled ? "Wake word active" : "Enable wake word"}
                    >
                      <Mic className="h-3 w-3" />
                   </Button>
                 )}
                 {browserSupport.tts && (
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-7 w-7 text-white hover:bg-white/10 rounded-lg", isSpeaking && "bg-white/20 animate-pulse")} 
                      onClick={() => {
                        if (isSpeaking) {
                          window.speechSynthesis.cancel()
                          setIsSpeaking(false)
                        } else {
                          setIsSpeaking(!isSpeaking)
                          if (!isSpeaking) speak("Voice responses enabled")
                        }
                      }}
                    >
                      {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                   </Button>
                 )}
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
                <ScrollArea className="flex-1 p-4" scrollHideDelay={100} ref={scrollRef}>
                  <div className="space-y-4">
                    {(!browserSupport.stt || !browserSupport.tts) && (
                      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-500 font-bold flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Some voice features are not supported in this browser.
                      </div>
                    )}
                    
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 opacity-50">
                         <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center rotate-3">
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
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0">
                           <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-white/10 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-lg">
                  <form id="ai-chat-form" onSubmit={handleSubmit} className="relative">
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder={isListening ? "Listening..." : "Type your message..."}
                      className={cn(
                        "h-11 pl-4 pr-24 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-white/20 focus:bg-white focus:border-primary transition-all text-xs font-semibold shadow-inner",
                        isListening && "ring-2 ring-primary border-transparent animate-pulse"
                      )}
                      disabled={isLoading}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={startListening}
                        className={cn(
                          "h-9 w-9 rounded-lg transition-all",
                          isListening ? "bg-primary text-white scale-110" : "text-muted-foreground hover:bg-primary/10"
                        )}
                      >
                        {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      </Button>
                      <Button 
                        type="submit" 
                        size="icon" 
                        disabled={isLoading || !input?.trim()}
                        className="h-9 w-9 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-110 active:scale-95"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
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
      </Button>
    </div>
  )
}
