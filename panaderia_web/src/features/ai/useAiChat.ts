import { useState } from 'react'
import { sendChatMessage } from '@/api/ai'
import { toast } from 'sonner'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hola, soy tu asistente de análisis. Puedo ayudarte con ventas, stock, producción, gastos y clientes. ¿Qué querés saber?',
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const sendMessage = async (text: string) => {
    if (!text.trim() || isPending) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsPending(true)

    try {
      const data = await sendChatMessage({ message: text, conversation_id: conversationId })
      setConversationId(data.conversation_id)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      toast.error('No se pudo conectar con el asistente. Intentá de nuevo.')
      // quitar el mensaje del usuario si falló para que el usuario pueda reintentar
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsPending(false)
    }
  }

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE])
    setConversationId(null)
  }

  return { messages, sendMessage, isPending, clearChat }
}
