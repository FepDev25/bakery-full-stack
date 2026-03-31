from anthropic import AsyncAnthropic
from src.core.config import settings

_client: AsyncAnthropic | None = None

def get_ai_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client
