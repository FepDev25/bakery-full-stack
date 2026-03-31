from typing import Any
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ToolSource(BaseModel):
    tool: str
    result: dict[str, Any]


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    sources: list[ToolSource]
