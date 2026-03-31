import { useEffect, useRef } from 'react'
import { MessageBubble, TypingIndicator } from './MessageBubble'
import type { ChatMessage } from './useAiChat'

interface Props {
  messages: ChatMessage[]
  isPending: boolean
}

export function ChatWindow({ messages, isPending }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {isPending && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
