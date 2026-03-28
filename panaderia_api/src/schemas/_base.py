from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Tipo Decimal que serializa como float en JSON (Pydantic v2 idiomatic)
# when_used='json' asegura que solo aplica al serializar a JSON, no en model_dump() regular
DecimalJSON = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]
