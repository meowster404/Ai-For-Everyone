'use client'

import { Hash, Link2, Mail, Phone, Star } from 'lucide-react'

interface FormFieldProps {
  fieldId?: string
  label: string
  type: string
  required: boolean
  onChange?: (value: any) => void
  value?: any
  options?: string[]
  showLabel?: boolean
}

const iconMap: Record<string, React.ReactNode> = {
  email: <Mail size={18} className="text-muted-foreground" />,
  number: <Hash size={18} className="text-muted-foreground" />,
  phone: <Phone size={18} className="text-muted-foreground" />,
  link: <Link2 size={18} className="text-muted-foreground" />,
}

export function FormFieldRenderer({
  fieldId,
  label,
  type,
  required,
  onChange,
  value,
  options = [],
  showLabel = true,
}: FormFieldProps) {
  const icon = iconMap[type]
  const controlName = fieldId || label || `field-${crypto.randomUUID()}`
  const lineInputClass =
    'w-full px-0 py-2 bg-transparent border-0 border-b border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors rounded-none shadow-none'
  const safeOptions = options.length > 0 ? options : ['Option 1', 'Option 2']

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'file') {
      const fileName = e.target.files?.[0]?.name || ''
      onChange?.(fileName)
      return
    }
    onChange?.(e.target.value)
  }

  const renderField = () => {
    switch (type) {
      case 'text':
      case 'short answer':
        return <input type="text" placeholder="" value={value || ''} onChange={handleChange} className={lineInputClass} />

      case 'long answer':
      case 'textarea':
      case 'matrix':
        return (
          <textarea
            placeholder=""
            value={value || ''}
            onChange={handleChange}
            className={`${lineInputClass} min-h-20 resize-y`}
            rows={4}
          />
        )

      case 'email':
        return (
          <div className="relative">
            <input type="email" placeholder="" value={value || ''} onChange={handleChange} className={`${lineInputClass} pr-8`} />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">{icon}</div>
          </div>
        )

      case 'phone':
      case 'phone number':
        return (
          <div className="relative">
            <input type="tel" placeholder="" value={value || ''} onChange={handleChange} className={`${lineInputClass} pr-8`} />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">{icon}</div>
          </div>
        )

      case 'link':
        return (
          <div className="relative">
            <input type="url" placeholder="" value={value || ''} onChange={handleChange} className={`${lineInputClass} pr-8`} />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">{icon}</div>
          </div>
        )

      case 'number':
        return (
          <div className="relative">
            <input type="number" placeholder="" value={value || ''} onChange={handleChange} className={`${lineInputClass} pr-8`} />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">{icon}</div>
          </div>
        )

      case 'checkbox':
      case 'checkboxes':
        return (
          <div className="space-y-2">
            {safeOptions.map((option, index) => (
              <label key={`${controlName}-check-${index}`} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(Array.isArray(value) ? value.includes(option) : false)}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : []
                    if (current.includes(option)) {
                      onChange?.(current.filter((item: string) => item !== option))
                    } else {
                      onChange?.([...current, option])
                    }
                  }}
                  className="w-4 h-4 rounded border-border cursor-pointer"
                />
                <span className="text-foreground">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'radio':
      case 'multiple choice':
        return (
          <div className="space-y-2">
            {safeOptions.map((option, index) => (
              <label key={`${controlName}-radio-${index}`} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={controlName}
                  checked={value === option}
                  onChange={() => onChange?.(option)}
                  className="w-4 h-4 rounded-full border-border cursor-pointer"
                />
                <span className="text-foreground">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'select':
      case 'dropdown':
      case 'ranking':
        return (
          <select value={value || ''} onChange={handleChange} className={`${lineInputClass} appearance-none`}>
            <option value="">Select an option</option>
            {safeOptions.map((option, index) => (
              <option key={`${controlName}-option-${index}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'date':
        return <input type="date" value={value || ''} onChange={handleChange} className={lineInputClass} />

      case 'time':
        return <input type="time" value={value || ''} onChange={handleChange} className={lineInputClass} />

      case 'upload':
        return (
          <input
            type="file"
            onChange={handleChange}
            className="w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-foreground"
          />
        )

      case 'rating': {
        const selectedValue = Number(value || 0)
        return (
          <div className="flex items-center gap-1 py-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={`${controlName}-star-${score}`}
                type="button"
                onClick={() => onChange?.(score)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Star size={18} className={score <= selectedValue ? 'fill-foreground text-foreground' : ''} />
              </button>
            ))}
          </div>
        )
      }

      case 'linear-scale':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={1}
              max={10}
              value={Number(value || 1)}
              onChange={(event) => onChange?.(Number(event.target.value))}
              className="w-full accent-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        )

      case 'payment':
        return <input type="number" min={0} step="0.01" placeholder="Amount" value={value || ''} onChange={handleChange} className={lineInputClass} />

      case 'signature':
        return <input type="text" placeholder="Type your full name" value={value || ''} onChange={handleChange} className={lineInputClass} />

      default:
        return <input type="text" placeholder="" value={value || ''} onChange={handleChange} className={lineInputClass} />
    }
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {renderField()}
    </div>
  )
}
