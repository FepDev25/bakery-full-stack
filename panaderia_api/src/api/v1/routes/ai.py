from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.chat_service import ChatService
from src.ai.client import get_ai_client
from src.core.database import get_async_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.schemas.ai import ChatRequest, ChatResponse

router = APIRouter()

# Rate limit: 30 requests por usuario por hora (en memoria, se resetea al reiniciar dyno)
_AI_RATE_LIMIT = 30
_ai_usage: dict[str, list[datetime]] = defaultdict(list)


def _check_rate_limit(user_id: str) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=1)
    _ai_usage[user_id] = [t for t in _ai_usage[user_id] if t > cutoff]
    if len(_ai_usage[user_id]) >= _AI_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Límite de {_AI_RATE_LIMIT} consultas por hora alcanzado. Intentá de nuevo más tarde.",
        )
    _ai_usage[user_id].append(now)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
) -> ChatResponse:
    _check_rate_limit(str(current_user.id))
    service = ChatService(client=get_ai_client(), session=db)
    result = await service.chat(
        message=body.message,
        conversation_id=body.conversation_id,
        user_role=current_user.role.value,
    )
    return ChatResponse(**result)
