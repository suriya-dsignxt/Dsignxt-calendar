"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Info, CheckCircle2, HelpCircle } from "lucide-react"

type ConfirmOptions = {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info" | "success"
}

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((res) => {
      setOptions(options)
      setResolve(() => res)
      setIsOpen(true)
    })
  }, [])

  const handleCancel = () => {
    setIsOpen(false)
    resolve?.(false)
  }

  const handleConfirm = () => {
    setIsOpen(false)
    resolve?.(true)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-[400px] border-zinc-800 bg-zinc-950/90 backdrop-blur-xl text-slate-100 p-0 overflow-hidden">
          <div className="p-6 pt-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`p-3 rounded-full 
                ${options?.variant === 'danger' ? 'bg-red-500/10 text-red-500' : 
                  options?.variant === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
                  options?.variant === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                  'bg-blue-500/10 text-blue-500'}`}>
                {options?.variant === 'danger' && <AlertTriangle className="h-6 w-6" />}
                {options?.variant === 'warning' && <HelpCircle className="h-6 w-6" />}
                {options?.variant === 'success' && <CheckCircle2 className="h-6 w-6" />}
                {(options?.variant === 'info' || !options?.variant) && <Info className="h-6 w-6" />}
              </div>
              
              <div className="space-y-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  {options?.title || "Are you sure?"}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-sm leading-relaxed">
                  {options?.message}
                </DialogDescription>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex row p-4 gap-2 bg-white/5 dark:bg-black/20 border-t border-white/5 mt-2 sm:justify-center">
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              className="flex-1 text-slate-400 hover:text-white hover:bg-white/5 border-none h-11 font-semibold uppercase tracking-widest text-[10px]"
            >
              {options?.cancelText || "Cancel"}
            </Button>
            <Button 
              variant={options?.variant === 'danger' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              className={`flex-1 h-11 font-bold uppercase tracking-widest text-[10px] shadow-lg
                ${options?.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                  options?.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 
                  options?.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                  'bg-primary hover:bg-primary/90'}`}
            >
              {options?.confirmText || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return context.confirm
}
