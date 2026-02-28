"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  text: string
  isProcessing?: boolean
}

interface AIWorkflowChatProps {
  onClose: () => void
  onFormCreated: (form: any) => void
}

export function AIWorkflowChat({ onClose, onFormCreated }: AIWorkflowChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMsg: Message = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    const userInput = input
    setInput('')
    setIsProcessing(true)

    // Add processing message
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      text: '🔄 Processing your request...', 
      isProcessing: true 
    }])

    // Simulate workflow steps
    await new Promise(r => setTimeout(r, 800))

    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = { 
        role: 'assistant', 
        text: '📋 Analyzing form requirements...' 
      }
      return updated
    })

    await new Promise(r => setTimeout(r, 800))

    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = { 
        role: 'assistant', 
        text: '🏗️ Structuring form fields...' 
      }
      return updated
    })

    await new Promise(r => setTimeout(r, 800))

    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = { 
        role: 'assistant', 
        text: '✅ Form created successfully!' 
      }
      return updated
    })

    setIsProcessing(false)

    // Create the form
    const newForm = {
      id: String(Date.now()),
      name: extractFormName(userInput),
      description: userInput,
      submissionCount: 0,
      createdAt: new Date().toISOString(),
      eventId: 'event-' + Date.now(),
    }

    // Auto-close after 1 second
    setTimeout(() => {
      onFormCreated(newForm)
    }, 1000)
  }

  const extractFormName = (text: string): string => {
    const words = text.split(' ').slice(0, 3).join(' ')
    return words || 'New Form'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-96 bg-card rounded-lg shadow-xl flex flex-col h-96 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Create Form with AI</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <p>Describe the form you want to create.</p>
              <p className="text-xs mt-2">Example: "Event registration form with name, email, and attendance"</p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <span
                className={`inline-block px-3 py-2 rounded max-w-[85%] text-sm ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground"
            value={input}
            onChange={e => setInput(e.target.value)}
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
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
