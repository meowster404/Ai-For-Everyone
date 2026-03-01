"use client"

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'date'
  | 'time'
  | 'phone'
  | 'link'
  | 'upload'
  | 'rating'
  | 'payment'
  | 'signature'
  | 'linear-scale'
  | 'matrix'
  | 'ranking'

type FormField = {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
}

type AIFormResult = {
  name: string
  description: string
  fields: FormField[]
  generatedWith?: string
}

type Message = {
  role: 'user' | 'assistant'
  text: string
}

type AIWorkflowChatProps = {
  onClose: () => void
  onFormCreated: (form: {
    id?: string
    name: string
    description: string
    submissionCount?: number
    createdAt?: string
    eventId?: string
    fields?: FormField[]
    formConfig?: Record<string, unknown>
  }) => void
}

export function AIWorkflowChat({ onClose, onFormCreated }: AIWorkflowChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message])
  }

  const handleSend = async () => {
    const userInput = input.trim()
    if (!userInput || isProcessing) return

    appendMessage({ role: 'user', text: userInput })
    setInput('')
    setIsProcessing(true)

    appendMessage({ role: 'assistant', text: 'Analyzing requirements and building your form...' })

    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userInput,
          maxFields: 12,
        }),
      })

      const json = await response.json()
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'AI form generation failed')
      }

      const data = json.data as AIFormResult
      appendMessage({
        role: 'assistant',
        text: `Form ready: "${data.name}" with ${data.fields.length} fields. Opening editor...`,
      })

      setTimeout(() => {
        onFormCreated({
          name: data.name,
          description: data.description,
          eventId: '',
          fields: data.fields,
          formConfig: {
            generatedWithAI: true,
            aiPrompt: userInput,
            aiSource: data.generatedWith || 'fallback',
          },
        })
      }, 350)
    } catch (error) {
      appendMessage({
        role: 'assistant',
        text: error instanceof Error ? error.message : 'AI form generation failed. Please try again.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isProcessing) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[28rem] w-[min(95vw,24rem)] flex-col rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Create Form with AI</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>Describe the form you want to create.</p>
              <p className="mt-2 text-xs">Example: Event registration form with name, email, and attendance</p>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <span
                className={`inline-block max-w-[85%] rounded px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {message.text}
              </span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <input
            type="text"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your form..."
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
            size="sm"
            className="px-3"
          >
            {isProcessing ? 'Working...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
