import { BotMessageSquare, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatWindow } from './ChatWindow'
import { ChatInput } from './ChatInput'
import { useAiChat } from './useAiChat'

export default function AiAssistantPage() {
  const { messages, sendMessage, isPending, clearChat } = useAiChat()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BotMessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Asistente de Análisis</h1>
            <p className="text-xs text-muted-foreground">Consultá sobre ventas, stock, producción y gastos</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={isPending}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Nueva conversación
        </Button>
      </div>

      {/* Historial de mensajes */}
      <ChatWindow messages={messages} isPending={isPending} />

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <ChatInput onSend={sendMessage} disabled={isPending} />
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
          El asistente consulta datos reales del negocio · Solo lectura
        </p>
      </div>
    </div>
  )
}
