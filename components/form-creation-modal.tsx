'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Wand2, Plus } from 'lucide-react'

interface FormCreationModalProps {
  onAI: () => void
  onManual: () => void
  onClose: () => void
}

export function FormCreationModal({ onAI, onManual, onClose }: FormCreationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl border border-border p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Create a new form</h2>
          <p className="text-muted-foreground">Choose how you want to build your form</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Create with AI */}
          <button
            onClick={onAI}
            className="group relative overflow-hidden rounded-lg border-2 border-border p-8 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20">
                <Wand2 size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1 text-lg">Create with AI</h3>
                <p className="text-sm text-muted-foreground">Describe your form in plain language and let AI build it for you</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Fast • Intelligent • Easy</div>
          </button>

          {/* Create Manually */}
          <button
            onClick={onManual}
            className="group relative overflow-hidden rounded-lg border-2 border-border p-8 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20">
                <Plus size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1 text-lg">Create Manually</h3>
                <p className="text-sm text-muted-foreground">Build your form from scratch with full control over fields and design</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Flexible • Customizable • Complete</div>
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
