from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.chat_service import ChatService
from src.ai.client import get_ai_client
from src.core.database import get_async_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.schemas.ai import ChatRequest, ChatResponse

# router de FastAPI para endpoints relacionados con AI
router = APIRouter()

# endpoint para el chat
@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
) -> ChatResponse:
    service = ChatService(client=get_ai_client(), session=db)
    result = await service.chat(
        message=body.message,
        conversation_id=body.conversation_id,
        user_role=current_user.role.value,
    )
    return ChatResponse(**result)
