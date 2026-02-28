"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Type,
  Mail,
  Phone,
  Link2,
  Upload,
  Calendar,
  Clock,
  Sliders,
  Grid3x3,
  Star,
  CreditCard,
  PenTool,
  TrendingUp,
  Wallet,
  Hash,
  FileText,
  CheckSquare,
  Square,
  List,
  ListChecks,
  Zap,
  Eye,
  Lock,
  MapPin,
  X,
  Search,
} from 'lucide-react'

interface FieldType {
  id: string
  label: string
  type:
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
  icon: React.ReactNode
}

interface Category {
  name: string
  fields: FieldType[]
}

interface FieldSelectorProps {
  onSelect: (fieldType: FieldType) => void
  onClose: () => void
}

const categories: Category[] = [
  {
    name: 'Questions',
    fields: [
      { id: 'short-answer', label: 'Short answer', type: 'text', icon: <Type size={18} /> },
      { id: 'long-answer', label: 'Long answer', type: 'textarea', icon: <FileText size={18} /> },
      { id: 'multiple-choice', label: 'Multiple choice', type: 'radio', icon: <CheckSquare size={18} /> },
      { id: 'checkboxes', label: 'Checkboxes', type: 'checkbox', icon: <Square size={18} /> },
      { id: 'dropdown', label: 'Dropdown', type: 'select', icon: <List size={18} /> },
      { id: 'multi-select', label: 'Multi-select', type: 'select', icon: <ListChecks size={18} /> },
    ]
  },
  {
    name: 'Input blocks',
    fields: [
      { id: 'number', label: 'Number', type: 'number', icon: <Hash size={18} /> },
      { id: 'email', label: 'Email', type: 'email', icon: <Mail size={18} /> },
      { id: 'phone', label: 'Phone number', type: 'phone', icon: <Phone size={18} /> },
      { id: 'link', label: 'Link', type: 'link', icon: <Link2 size={18} /> },
      { id: 'file', label: 'File upload', type: 'upload', icon: <Upload size={18} /> },
      { id: 'date', label: 'Date', type: 'date', icon: <Calendar size={18} /> },
      { id: 'time', label: 'Time', type: 'time', icon: <Clock size={18} /> },
    ]
  },
  {
    name: 'Advanced blocks',
    fields: [
      { id: 'linear-scale', label: 'Linear scale', type: 'linear-scale', icon: <Sliders size={18} /> },
      { id: 'matrix', label: 'Matrix', type: 'matrix', icon: <Grid3x3 size={18} /> },
      { id: 'rating', label: 'Rating', type: 'rating', icon: <Star size={18} /> },
      { id: 'payment', label: 'Payment', type: 'payment', icon: <CreditCard size={18} /> },
      { id: 'signature', label: 'Signature', type: 'signature', icon: <PenTool size={18} /> },
      { id: 'ranking', label: 'Ranking', type: 'ranking', icon: <TrendingUp size={18} /> },
    ]
  },
]

export function FieldSelector({ onSelect, onClose }: FieldSelectorProps) {
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState<Category[]>(categories)

  const handleSearch = (query: string) => {
    setSearch(query)
    if (!query.trim()) {
      setFiltered(categories)
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = categories
      .map(cat => ({
        ...cat,
        fields: cat.fields.filter(f => f.label.toLowerCase().includes(lowerQuery))
      }))
      .filter(cat => cat.fields.length > 0)
    
    setFiltered(filtered)
  }

  const handleSelect = (field: FieldType) => {
    onSelect(field)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-96 max-h-96 flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Add a field</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Field Categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No fields found</p>
            </div>
          ) : (
            filtered.map(category => (
              <div key={category.name}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {category.name}
                </h4>
                <div className="space-y-1">
                  {category.fields.map(field => (
                    <button
                      key={field.id}
                      onClick={() => handleSelect(field)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                    >
                      <span className="text-muted-foreground">{field.icon}</span>
                      <span className="text-sm font-medium text-foreground">{field.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
