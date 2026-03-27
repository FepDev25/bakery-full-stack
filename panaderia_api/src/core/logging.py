# módulo centralizado para configurar logging en formato JSON
import json
import logging
import sys
from datetime import datetime, timezone

# clase interna para formatear logs como JSON, no expuesta fuera de este módulo
class _JsonFormatter(logging.Formatter):

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Campos extra que los loggers pueden inyectar
        for key in ("correlation_id", "method", "path", "status_code", "duration_ms"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)

# función para configurar el logging global de la aplicación, llamada desde main.py
def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    if root.handlers:
        # ya fue configurado, no sobrescribir
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())

    root.setLevel(level)
    root.addHandler(handler)

    # silenciar loggers ruidosos de librerías
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
