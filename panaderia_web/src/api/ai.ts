import { apiClient } from './client'

export interface ChatRequest {
  message: string
  conversation_id: string | null
}

export interface ToolSource {
  tool: string
  result: Record<string, unknown>
}

export interface ChatResponse {
  reply: string
  conversation_id: string
  sources: ToolSource[]
}

export async function sendChatMessage(body: ChatRequest): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/api/v1/ai/chat', body)
  return data
}
