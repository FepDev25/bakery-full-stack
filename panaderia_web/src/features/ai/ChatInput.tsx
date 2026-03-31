import { useRef, useState } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    // resetear altura del textarea
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/40">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Preguntá sobre ventas, stock, gastos…"
        rows={1}
        className={cn(
          'flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-relaxed outline-none',
          'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-40',
        )}
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Enviar mensaje"
        className="h-8 w-8 shrink-0"
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </div>
  )
}
