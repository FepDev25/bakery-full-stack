from anthropic.types import ToolParam

TOOLS: list[ToolParam] = [
    {
        "name": "get_sales_summary",
        "description": (
            "Resumen de ventas en un período: total de ingresos, cantidad de ventas, ticket promedio "
            "y cantidad de ventas canceladas. Usar para preguntas sobre dinero generado, volumen de "
            "transacciones o comparaciones entre períodos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "from_date": {
                    "type": "string",
                    "description": "Fecha de inicio en formato YYYY-MM-DD (requerida).",
                },
                "to_date": {
                    "type": "string",
                    "description": "Fecha de fin en formato YYYY-MM-DD (requerida).",
                },
                "status": {
                    "type": "string",
                    "enum": ["completada", "cancelada"],
                    "description": "Filtrar por estado de venta. Si no se especifica, incluye completadas.",
                },
            },
            "required": ["from_date", "to_date"],
        },
    },
    {
        "name": "get_top_products",
        "description": (
            "Ranking de productos por ingresos o cantidad vendida en un período. "
            "Usar para preguntas como '¿qué se vende más?', '¿qué es más rentable?' "
            "o '¿cuáles son los productos estrella?'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["today", "7d", "30d", "90d"],
                    "description": "Período de análisis: hoy, últimos 7 días, 30 días o 90 días.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Cantidad de productos a devolver (1-10). Por defecto: 5.",
                    "minimum": 1,
                    "maximum": 10,
                },
                "by": {
                    "type": "string",
                    "enum": ["revenue", "quantity"],
                    "description": "Ordenar por ingresos totales (revenue) o unidades vendidas (quantity). Por defecto: revenue.",
                },
            },
            "required": ["period"],
        },
    },
    {
        "name": "get_stock_status",
        "description": (
            "Estado actual del inventario de productos terminados e ingredientes. "
            "Usar para preguntas sobre qué hay en stock, alertas de bajo stock o "
            "para responder '¿tenemos suficiente X?' o '¿qué ingredientes están por agotarse?'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["products", "ingredients", "both"],
                    "description": "Qué inventario consultar. Por defecto: both.",
                },
                "only_alerts": {
                    "type": "boolean",
                    "description": "Si es true, devuelve solo los ítems con stock por debajo del mínimo configurado.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_production_stats",
        "description": (
            "Estadísticas de lotes de producción: lotes completados, descartados, tasa de merma "
            "y costo promedio de ingredientes. Usar para preguntas sobre eficiencia de producción, "
            "merma o costos de fabricación."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "from_date": {
                    "type": "string",
                    "description": "Fecha de inicio en formato YYYY-MM-DD (requerida).",
                },
                "to_date": {
                    "type": "string",
                    "description": "Fecha de fin en formato YYYY-MM-DD (requerida).",
                },
                "product_name": {
                    "type": "string",
                    "description": "Filtrar por nombre de producto (búsqueda aproximada, opcional).",
                },
            },
            "required": ["from_date", "to_date"],
        },
    },
    {
        "name": "get_expense_summary",
        "description": (
            "Resumen de gastos operativos por período y/o categoría. "
            "Usar para preguntas sobre cuánto se gastó en alquiler, sueldos, servicios u otras categorías, "
            "o para comparar gastos entre períodos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "from_date": {
                    "type": "string",
                    "description": "Fecha de inicio en formato YYYY-MM-DD (requerida).",
                },
                "to_date": {
                    "type": "string",
                    "description": "Fecha de fin en formato YYYY-MM-DD (requerida).",
                },
                "category": {
                    "type": "string",
                    "enum": ["alquiler", "servicios", "salarios", "mantenimiento", "marketing", "impuestos", "otros"],
                    "description": "Filtrar por categoría de gasto (opcional).",
                },
            },
            "required": ["from_date", "to_date"],
        },
    },
    {
        "name": "get_ingredient_cost_trend",
        "description": (
            "Evolución del precio de compra de un ingrediente a lo largo del tiempo, comparando proveedores. "
            "Usar para preguntas sobre si el precio de un ingrediente subió, para comparar proveedores "
            "o detectar variaciones de costo de materias primas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ingredient_name": {
                    "type": "string",
                    "description": "Nombre del ingrediente a analizar (búsqueda aproximada, requerido).",
                },
                "last_n_purchases": {
                    "type": "integer",
                    "description": "Cantidad de compras recientes a analizar. Por defecto: 10.",
                    "minimum": 2,
                    "maximum": 50,
                },
            },
            "required": ["ingredient_name"],
        },
    },
    {
        "name": "search_catalog",
        "description": (
            "Lista los productos e ingredientes registrados en el sistema, con sus nombres exactos. "
            "Usar ANTES de llamar get_ingredient_cost_trend o get_production_stats cuando el usuario menciona "
            "un nombre que podría no coincidir exactamente con el registrado en la base de datos "
            "(ej: 'mantequilla' puede estar como 'manteca', 'harina' puede ser 'Harina 000' o 'Harina integral'). "
            "También útil para responder '¿qué productos tenemos?' o '¿qué ingredientes usamos?'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["products", "ingredients", "both"],
                    "description": "Qué catálogo listar. Por defecto: both.",
                },
                "query": {
                    "type": "string",
                    "description": "Filtro opcional por nombre (búsqueda aproximada). Si se omite, devuelve todos.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_customer_stats",
        "description": (
            "Estadísticas de clientes: top compradores, puntos de fidelidad acumulados y frecuencia de compra. "
            "Usar para preguntas sobre clientes frecuentes, fidelización o quiénes son los mejores clientes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Cantidad de clientes a devolver (1-20). Por defecto: 5.",
                    "minimum": 1,
                    "maximum": 20,
                },
                "order_by": {
                    "type": "string",
                    "enum": ["total_spent", "visit_count", "loyalty_points"],
                    "description": "Criterio de ordenamiento. Por defecto: total_spent.",
                },
            },
            "required": [],
        },
    },
]
