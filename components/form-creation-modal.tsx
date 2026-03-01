'use client'

import { Plus, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface FormCreationModalProps {
  onAI: () => void
  onManual: () => void
  onClose: () => void
}

export function FormCreationModal({ onAI, onManual, onClose }: FormCreationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-3xl font-bold text-foreground">Create a new form</h2>
          <p className="text-muted-foreground">Choose how you want to build your form</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <button
            onClick={onAI}
            className="group relative overflow-hidden rounded-lg border-2 border-border p-8 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20">
                <Wand2 size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-foreground">Create with AI</h3>
                <p className="text-sm text-muted-foreground">
                  Describe your form in plain language and let AI build it for you
                </p>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Fast | Intelligent | Easy</div>
          </button>

          <button
            onClick={onManual}
            className="group relative overflow-hidden rounded-lg border-2 border-border p-8 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20">
                <Plus size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-foreground">Create Manually</h3>
                <p className="text-sm text-muted-foreground">
                  Build your form from scratch with full control over fields and design
                </p>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Flexible | Customizable | Complete</div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
