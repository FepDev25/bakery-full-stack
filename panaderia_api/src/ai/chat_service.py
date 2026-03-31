import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.tool_executor import ToolExecutor
from src.ai.tools import TOOLS
from src.core.config import settings

# se crear un sytem prompt dinamico basado en el rol
def _build_system_prompt(user_role: str) -> str:
    role_context = {
        "admin": "Tienes acceso completo a todos los datos del negocio.",
        "cajero": "Tienes acceso a información de ventas, clientes y productos.",
        "panadero": "Tienes acceso a información de producción, ingredientes e inventario.",
        "contador": "Tienes acceso a información financiera: ventas, gastos e ingredientes.",
    }
    access_info = role_context.get(user_role, "Tienes acceso a los datos del negocio.")

    return (
        f"Eres un asistente de análisis para una panadería artesanal. "
        f"Tienes acceso a datos reales del negocio: ventas, producción, inventario, gastos y clientes. "
        f"Hoy es {date.today().isoformat()}. "
        f"El usuario tiene rol: {user_role}. {access_info}\n\n"
        f"Reglas:\n"
        f"- Responde siempre en español, de forma concisa y directa.\n"
        f"- Cuando cites números monetarios, usa el formato $X.XXX,XX.\n"
        f"- Si una tool devuelve un error, menciona que no pudiste obtener ese dato específico.\n"
        f"- No inventes datos. Si no tienes información suficiente, dilo.\n"
        f"- Para períodos como 'esta semana' usa from_date=lunes de esta semana, "
        f"to_date=hoy. Para 'este mes' usa from_date=primer día del mes actual, to_date=hoy."
    )


# almacenamiento en memoria: conversation_id → {messages, last_access}
_conversations: dict[str, dict[str, Any]] = {}
_TTL_MINUTES = 30 # tiempo de vida de una conversación sin actividad antes de considerarla stale y eliminarla


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

# Limpiar conversaciones stale (sin actividad por más de TTL_MINUTES) para evitar crecimiento indefinido en memoria
def _cleanup_stale() -> None:
    cutoff = _utcnow() - timedelta(minutes=_TTL_MINUTES)
    stale = []
    for cid, data in _conversations.items():
        last_access = data["last_access"]
        # Compatibilidad con valores naive previos en memoria.
        if isinstance(last_access, datetime) and last_access.tzinfo is None:
            last_access = last_access.replace(tzinfo=timezone.utc)
        if last_access < cutoff:
            stale.append(cid)
    for cid in stale:
        del _conversations[cid]

# obtener o crear una conversacio, si hay id y existe se actualiza last_access, sino se crea nueva con id dado o generado nuevo
def _get_or_create(conversation_id: str | None) -> tuple[str, list]:
    _cleanup_stale()
    if conversation_id and conversation_id in _conversations:
        _conversations[conversation_id]["last_access"] = _utcnow()
        return conversation_id, _conversations[conversation_id]["messages"]
    new_id = conversation_id or str(uuid.uuid4())
    _conversations[new_id] = {"messages": [], "last_access": _utcnow()}
    return new_id, _conversations[new_id]["messages"]

# para evitar que el historial crezca indefinidamente, se aplica una "ventana deslizante" que conserva solo las
#  últimas max_turns rondas completas.
def _apply_sliding_window(messages: list, max_turns: int) -> list:
    if not messages:
        return messages
    user_turn_indices = [
        i for i, m in enumerate(messages)
        if m["role"] == "user"
        and (
            isinstance(m["content"], str)
            or (isinstance(m["content"], list) and any(
                b.get("type") != "tool_result" for b in m["content"] if isinstance(b, dict)
            ))
        )
    ]
    if len(user_turn_indices) <= max_turns:
        return messages
    cut = user_turn_indices[-max_turns]
    return messages[cut:]

# clase de servicio de chat que maneja la lógica de conversación, integración con el cliente AI y ejecución de herramientas.
class ChatService:
    def __init__(self, client: AsyncAnthropic, session: AsyncSession) -> None:
        self.client = client
        self.session = session
        self.executor = ToolExecutor(session)

    async def chat(self, message: str, conversation_id: str | None, user_role: str) -> dict[str, Any]:

        # obtener o crear conversación
        conv_id, history = _get_or_create(conversation_id)
        system_prompt = _build_system_prompt(user_role)

        # agregar mensaje del usuario al historial
        history.append({"role": "user", "content": message})

        sources: list[dict[str, Any]] = []
        MAX_LOOPS = 10  # evitar loops infinitos

        # ciclo principal de interacción con el modelo, que puede incluir llamadas a herramientas
        for _ in range(MAX_LOOPS):

            # llamar al modelo con el historial actual y el system prompt
            response = await self.client.messages.create(
                model=settings.AI_MODEL,
                max_tokens=settings.AI_MAX_TOKENS,
                system=system_prompt,
                messages=history,
                tools=TOOLS,  # type: ignore[arg-type]
            )

            # agregar respuesta del asistente al historial
            history.append({"role": "assistant", "content": response.content})

            # manejar stop_reason para determinar si el modelo terminó su respuesta
            if response.stop_reason == "end_turn":
                break
            
            # si el modelo quiere usar una herramienta, ejecutarla y agregar resultados al historial para la siguiente iteración
            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    result = await self.executor.execute(block.name, block.input)
                    sources.append({"tool": block.name, "result": result})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    })

                history.append({"role": "user", "content": tool_results})
                continue

            # stop_reason inesperado (max_tokens, etc.)
            break

        # extraer texto final
        reply = ""
        for block in response.content:
            if hasattr(block, "text"):
                reply += block.text

        # aplicar sliding window antes de guardar
        _conversations[conv_id]["messages"] = _apply_sliding_window(
            history, settings.AI_MAX_TURNS
        )

        return {
            "reply": reply,
            "conversation_id": conv_id,
            "sources": sources,
        }
