"""
Script para generar datos de demo realistas para el asistente AI.

Genera ~400 ventas en 90 días con patrones estacionales, clientes frecuentes,
variación de costos de ingredientes y producción con merma realista.

Uso:
    cd panaderia_api
    uv run python ../panaderia_db/scripts/generate_demo_data.py

Requiere el backend corriendo o bien PostgreSQL accesible.
Lee la conexión de panaderia_api/.env
"""

import os
import random
import uuid
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

# ──────────────────────────────────────────────────────────────────────────────
# Configuración de conexión
# ──────────────────────────────────────────────────────────────────────────────

def _load_env() -> dict:
    env_path = Path(__file__).parent.parent.parent / "panaderia_api" / ".env"
    env: dict = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def get_connection():
    env = _load_env()
    return psycopg2.connect(
        host=env.get("POSTGRES_SERVER", "localhost"),
        port=int(env.get("POSTGRES_PORT", 5433)),
        user=env.get("POSTGRES_USER", "panaderia_user"),
        password=env.get("POSTGRES_PASSWORD", "panaderia_pass"),
        dbname=env.get("POSTGRES_DB", "panaderia_db"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# IDs fijos del seeds.sql base (no los tocamos)
# ──────────────────────────────────────────────────────────────────────────────

USERS = {
    "admin":    "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "cajero1":  "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
    "cajero2":  "b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
    "panadero": "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14",
    "contador": "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15",
}

SUPPLIERS = {
    "molino":   "20000000-0000-0000-0000-000000000001",
    "central":  "20000000-0000-0000-0000-000000000002",
    "lacteos":  "20000000-0000-0000-0000-000000000003",
}

INGREDIENTS = {
    "harina_000":       ("30000000-0000-0000-0000-000000000001", "kg",     450.00),
    "harina_0000":      ("30000000-0000-0000-0000-000000000002", "kg",     480.00),
    "harina_integral":  ("30000000-0000-0000-0000-000000000003", "kg",     520.00),
    "levadura_fresca":  ("30000000-0000-0000-0000-000000000004", "kg",    1200.00),
    "azucar":           ("30000000-0000-0000-0000-000000000006", "kg",     380.00),
    "sal":              ("30000000-0000-0000-0000-000000000007", "kg",     120.00),
    "manteca":          ("30000000-0000-0000-0000-000000000008", "kg",    2800.00),
    "margarina":        ("30000000-0000-0000-0000-000000000009", "kg",    1800.00),
    "leche":            ("30000000-0000-0000-0000-000000000010", "litro",  420.00),
    "crema":            ("30000000-0000-0000-0000-000000000011", "litro",  980.00),
    "queso_crema":      ("30000000-0000-0000-0000-000000000012", "kg",    3200.00),
    "huevos":           ("30000000-0000-0000-0000-000000000013", "unidad",  85.00),
    "dulce_de_leche":   ("30000000-0000-0000-0000-000000000014", "kg",    1500.00),
    "chocolate":        ("30000000-0000-0000-0000-000000000015", "kg",    3500.00),
}

# (id, precio_unitario, categoria, peso_de_popularidad)
PRODUCTS = [
    ("40000000-0000-0000-0000-000000000001", "Baguette",              850.00,  "Panadería",          25),
    ("40000000-0000-0000-0000-000000000002", "Pan Francés",           950.00,  "Panadería",          18),
    ("40000000-0000-0000-0000-000000000003", "Pan Integral",         1200.00,  "Panadería",          10),
    ("40000000-0000-0000-0000-000000000004", "Pan de Miga",          2500.00,  "Panadería",           5),
    ("40000000-0000-0000-0000-000000000005", "Medialunas de Manteca", 300.00,  "Panadería",          35),
    ("40000000-0000-0000-0000-000000000006", "Torta de Chocolate",   8500.00,  "Pastelería",          2),
    ("40000000-0000-0000-0000-000000000007", "Cheesecake",           9200.00,  "Pastelería",          2),
    ("40000000-0000-0000-0000-000000000008", "Lemon Pie",            7800.00,  "Pastelería",          2),
    ("40000000-0000-0000-0000-000000000009", "Alfajores de Maicena",  450.00,  "Pastelería",         14),
    ("40000000-0000-0000-0000-000000000010", "Pepas de Membrillo",    180.00,  "Galletas y Facturas", 8),
    ("40000000-0000-0000-0000-000000000011", "Bizcochitos de Grasa",  200.00,  "Galletas y Facturas", 7),
    ("40000000-0000-0000-0000-000000000012", "Croissants",            650.00,  "Galletas y Facturas", 16),
    ("40000000-0000-0000-0000-000000000013", "Facturas Surtidas",     350.00,  "Galletas y Facturas", 12),
    ("40000000-0000-0000-0000-000000000014", "Café Espresso",         900.00,  "Bebidas",              6),
    ("40000000-0000-0000-0000-000000000015", "Café con Leche",       1100.00,  "Bebidas",              5),
]

EXISTING_CUSTOMERS = [
    "50000000-0000-0000-0000-000000000001",
    "50000000-0000-0000-0000-000000000002",
    "50000000-0000-0000-0000-000000000003",
    "50000000-0000-0000-0000-000000000004",
    "50000000-0000-0000-0000-000000000005",
    "50000000-0000-0000-0000-000000000006",
]

NEW_CUSTOMERS = [
    (str(uuid.uuid4()), "Isabel Vargas",    "11-7890-1234", "isabel.vargas@email.com"),
    (str(uuid.uuid4()), "Tomás Iglesias",   "11-8901-2345", None),
    (str(uuid.uuid4()), "Lucía Romero",     "11-9012-3456", "lucia.romero@email.com"),
    (str(uuid.uuid4()), "Facundo Leiva",    None,           "facundo.leiva@email.com"),
    (str(uuid.uuid4()), "Paula Méndez",     "11-0123-4567", "paula.mendez@email.com"),
    (str(uuid.uuid4()), "Rodrigo Suárez",   "11-1234-5678", None),
    (str(uuid.uuid4()), "Florencia Ríos",   "11-2345-6789", "florencia.rios@email.com"),
    (str(uuid.uuid4()), "Ezequiel Ponce",   "11-3456-7890", "ezequiel.ponce@email.com"),
    (str(uuid.uuid4()), "Natalia Gómez",    None,           "natalia.gomez@email.com"),
    (str(uuid.uuid4()), "Sebastián Luna",   "11-4567-8901", None),
    (str(uuid.uuid4()), "Carolina Ortega",  "11-5678-9012", "carolina.ortega@email.com"),
    (str(uuid.uuid4()), "Andrés Soria",     "11-6789-0123", "andres.soria@email.com"),
    (str(uuid.uuid4()), "Mariana Ibáñez",   "11-7890-1235", "mariana.ibanez@email.com"),
    (str(uuid.uuid4()), "Gustavo Herrera",  "11-8901-2346", None),
]

PAYMENT_METHODS = ["efectivo", "tarjeta_debito", "tarjeta_credito", "transferencia", "qr"]
PAYMENT_WEIGHTS  = [40,         20,               15,                10,              15]

EXPENSE_CATEGORIES = ["alquiler", "servicios", "salarios", "mantenimiento", "marketing", "impuestos", "otros"]


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def uid() -> str:
    return str(uuid.uuid4())


def sales_per_day(d: date) -> int:
    """Ventas por día según día de la semana. Sábado y domingo +40%."""
    dow = d.weekday()  # 0=lunes, 6=domingo
    if dow in (5, 6):
        return random.randint(10, 14)
    elif dow in (3, 4):
        return random.randint(7, 10)
    else:
        return random.randint(4, 7)


def items_per_sale() -> int:
    return random.choices([1, 2, 3, 4], weights=[30, 40, 20, 10])[0]


def pick_product() -> tuple:
    weights = [p[4] for p in PRODUCTS]
    return random.choices(PRODUCTS, weights=weights)[0]


def pick_customer(all_customers: list) -> str | None:
    """70% de ventas con cliente registrado, 30% anónimas."""
    if random.random() < 0.70:
        return random.choice(all_customers)
    return None


def ingredient_price_at_date(base_price: float, d: date, today: date) -> float:
    """
    Simula variación de precio: harina 000 sube ~15% en los últimos 30 días.
    Otros ingredientes varían ±5% aleatoriamente.
    """
    days_ago = (today - d).days
    if days_ago < 30:
        trend = 1.0 + (30 - days_ago) / 30 * 0.15
    elif days_ago < 60:
        trend = 1.05
    else:
        trend = 1.0
    noise = random.uniform(0.97, 1.03)
    return round(base_price * trend * noise, 2)


# ──────────────────────────────────────────────────────────────────────────────
# Generadores
# ──────────────────────────────────────────────────────────────────────────────

def generate_customers(cur) -> list:
    print("  → Insertando clientes nuevos...")
    rows = [
        (c_id, name, phone, email, 0, True)
        for c_id, name, phone, email in NEW_CUSTOMERS
    ]
    execute_values(cur, """
        INSERT INTO customers (id, name, phone, email, loyalty_points, is_active)
        VALUES %s
        ON CONFLICT (id) DO NOTHING
    """, rows)
    all_customers = EXISTING_CUSTOMERS + [r[0] for r in rows]
    print(f"     Total clientes: {len(all_customers)}")
    return all_customers


def generate_sales(cur, all_customers: list, today: date) -> None:
    print("  → Generando ventas (90 días)...")
    start = today - timedelta(days=90)
    sale_counter = 10000  # evitar colisión con VTA-2026-9000x del seeds base
    total_sales = 0
    total_items = 0

    cajeros = [USERS["cajero1"], USERS["cajero2"]]

    for day_offset in range(91):
        d = start + timedelta(days=day_offset)
        n_sales = sales_per_day(d)

        for _ in range(n_sales):
            sale_id = uid()
            sale_number = f"VTA-DEMO-{sale_counter:06d}"
            sale_counter += 1
            customer_id = pick_customer(all_customers)
            cajero = random.choice(cajeros)
            payment = random.choices(PAYMENT_METHODS, weights=PAYMENT_WEIGHTS)[0]

            # Construir items
            n_items = items_per_sale()
            selected = random.sample(PRODUCTS, min(n_items, len(PRODUCTS)))
            items = []
            subtotal = 0.0
            for prod in selected:
                qty = random.choices(
                    [1, 2, 3, 4, 6, 12],
                    weights=[40, 25, 15, 10, 6, 4]
                )[0]
                unit_price = prod[2]
                item_sub = round(qty * unit_price, 2)
                subtotal += item_sub
                items.append((sale_id, prod[0], qty, "unidad", unit_price, item_sub))

            subtotal = round(subtotal, 2)
            discount = round(subtotal * 0.05, 2) if random.random() < 0.08 else 0.0
            total = round(subtotal - discount, 2)

            # Sale date con hora aleatoria entre 7:00 y 20:00
            hour = random.randint(7, 20)
            minute = random.randint(0, 59)
            sale_datetime = f"{d.isoformat()} {hour:02d}:{minute:02d}:00+00"

            cur.execute("""
                INSERT INTO sales
                    (id, sale_number, customer_id, user_id, subtotal, discount_amount,
                     tax_amount, total_amount, payment_method, status, sale_date)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (sale_id, sale_number, customer_id, cajero,
                  subtotal, discount, 0.0, total,
                  payment, "completada", sale_datetime))

            execute_values(cur, """
                INSERT INTO sale_items (id, sale_id, product_id, quantity, unit, unit_price, subtotal)
                VALUES %s
            """, [(uid(), *item) for item in items])

            total_sales += 1
            total_items += len(items)

    # ~3% de ventas canceladas distribuidas en el período
    cancelled_count = max(1, total_sales // 33)
    for i in range(cancelled_count):
        sale_id = uid()
        d = start + timedelta(days=random.randint(0, 90))
        sale_datetime = f"{d.isoformat()} {random.randint(8,18):02d}:00:00+00"
        prod = pick_product()
        qty = random.randint(1, 3)
        item_sub = round(qty * prod[2], 2)
        sale_number = f"VTA-CANC-{i+1:04d}"
        cur.execute("""
            INSERT INTO sales
                (id, sale_number, customer_id, user_id, subtotal, discount_amount,
                 tax_amount, total_amount, payment_method, status, sale_date, notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (sale_id, sale_number, None, random.choice(cajeros),
              item_sub, 0.0, 0.0, item_sub,
              "efectivo", "cancelada", sale_datetime, "Cliente canceló la compra"))
        cur.execute("""
            INSERT INTO sale_items (id, sale_id, product_id, quantity, unit, unit_price, subtotal)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (uid(), sale_id, prod[0], qty, "unidad", prod[2], item_sub))

    print(f"     Ventas completadas: {total_sales}  |  Canceladas: {cancelled_count}  |  Items: {total_items + cancelled_count}")


def generate_production(cur, today: date) -> None:
    print("  → Generando lotes de producción (90 días)...")
    start = today - timedelta(days=90)
    # Productos que se producen (no bebidas)
    producibles = [p for p in PRODUCTS if p[3] != "Bebidas"]
    count = 0

    for day_offset in range(91):
        d = start + timedelta(days=day_offset)
        # 3-5 lotes por día hábil, 5-7 en fines de semana
        dow = d.weekday()
        n_batches = random.randint(5, 7) if dow in (5, 6) else random.randint(3, 5)

        selected_products = random.sample(producibles, min(n_batches, len(producibles)))
        for prod in selected_products:
            # ~12% de probabilidad de descarte
            status = "descartado" if random.random() < 0.12 else "completado"
            qty = random.randint(20, 80) if "Torta" in prod[1] or "Cheesecake" in prod[1] or "Lemon" in prod[1] else random.randint(30, 120)
            ingredient_cost = round(qty * prod[2] * random.uniform(0.25, 0.40), 2)
            notes = random.choice([None, None, None, "Producción matutina", "Horneado extra", "Pedido especial"])
            if status == "descartado":
                notes = random.choice(["Falla en fermentación", "Error de temperatura", "Problema con ingrediente"])

            cur.execute("""
                INSERT INTO production_batches
                    (id, product_id, user_id, quantity_produced, unit, production_date,
                     ingredient_cost, status, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (uid(), prod[0], USERS["panadero"], qty, "unidad",
                  d.isoformat(), ingredient_cost, status, notes))
            count += 1

    print(f"     Lotes generados: {count}")


def generate_purchases(cur, today: date) -> None:
    """
    Compras de ingredientes distribuidas en 90 días.
    Harina 000 tiene trend de precio +15% en últimas 4 semanas (detectable por la IA).
    """
    print("  → Generando compras de ingredientes (90 días)...")
    start = today - timedelta(days=90)

    # (ingrediente_key, supplier_key, qty_range, frecuencia_cada_n_dias)
    purchase_schedule = [
        ("harina_000",      "molino",   (80, 120),  10),
        ("harina_0000",     "molino",   (40,  70),  12),
        ("harina_integral", "molino",   (20,  40),  15),
        ("azucar",          "central",  (30,  60),  14),
        ("manteca",         "central",  (15,  30),  10),
        ("margarina",       "central",  (10,  25),  12),
        ("levadura_fresca", "central",  ( 3,   8),   7),
        ("sal",             "central",  (15,  25),  20),
        ("leche",           "lacteos",  (40,  70),   8),
        ("crema",           "lacteos",  (10,  20),  10),
        ("queso_crema",     "lacteos",  ( 5,  12),  12),
        ("huevos",          "central",  (200, 400),  7),
        ("dulce_de_leche",  "central",  (10,  25),  14),
        ("chocolate",       "central",  ( 5,  12),  15),
    ]

    count = 0
    invoice_seq = 200

    for ing_key, sup_key, qty_range, interval_days in purchase_schedule:
        ing_id, unit, base_price = INGREDIENTS[ing_key]
        sup_id = SUPPLIERS[sup_key]

        d = start + timedelta(days=random.randint(0, interval_days - 1))
        while d <= today:
            # Cantidad entera para que qty * unit_price sea exacto a 2 decimales
            # (el check constraint exige total_amount = quantity * unit_price exacto)
            qty = float(random.randint(int(qty_range[0]), int(qty_range[1])))
            unit_price = ingredient_price_at_date(base_price, d, today)
            # Harina 000: sube más pronunciado en los últimos 30 días
            if ing_key == "harina_000" and (today - d).days < 30:
                unit_price = round(unit_price * random.uniform(1.10, 1.18), 2)
            # total exacto: qty es entero, unit_price tiene 2 decimales → producto exacto
            total = float(Decimal(str(int(qty))) * Decimal(str(unit_price)))
            invoice = f"FC-AUTO-{invoice_seq:06d}"
            invoice_seq += 1

            cur.execute("""
                INSERT INTO ingredient_purchases
                    (id, supplier_id, ingredient_id, user_id, quantity, unit,
                     unit_price, total_amount, purchase_date, invoice_number)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (uid(), sup_id, ing_id, USERS["contador"],
                  qty, unit, unit_price, total,
                  d.isoformat(), invoice))
            count += 1
            d += timedelta(days=interval_days + random.randint(-2, 3))

    print(f"     Compras generadas: {count}")


def generate_expenses(cur, today: date) -> None:
    """
    Gastos operativos: alquiler y salarios mensuales fijos +
    servicios y otros variables en 3 meses.
    """
    print("  → Generando gastos operativos (3 meses)...")
    count = 0

    months = []
    for m_offset in range(3, 0, -1):
        ref = today.replace(day=1) - timedelta(days=m_offset * 28)
        months.append(ref.replace(day=1))

    month_names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    for month_start in months:
        month_name = month_names[month_start.month - 1]
        year = month_start.year

        # Alquiler (día 1 de cada mes)
        cur.execute("""
            INSERT INTO expenses (id, user_id, category, description, amount, expense_date)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (uid(), USERS["contador"], "alquiler",
              f"Alquiler del local - {month_name} {year}",
              random.uniform(270000, 295000),
              month_start + timedelta(days=1)))
        count += 1

        # Salarios (día 15)
        salary_day = month_start + timedelta(days=14)
        salaries = [
            ("Roberto Silva (panadero)", random.uniform(510000, 540000)),
            ("María González (cajera)",  random.uniform(440000, 465000)),
            ("Lucas Fernández (cajero)", random.uniform(440000, 465000)),
        ]
        for name, amount in salaries:
            cur.execute("""
                INSERT INTO expenses (id, user_id, category, description, amount, expense_date)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (uid(), USERS["admin"], "salarios",
                  f"Salario {month_name} {year} - {name}",
                  round(amount, 2), salary_day))
            count += 1

        # Luz (día 8)
        cur.execute("""
            INSERT INTO expenses (id, user_id, category, description, amount, expense_date, invoice_number)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (uid(), USERS["contador"], "servicios",
              f"Factura de luz - Edenor {month_name} {year}",
              round(random.uniform(42000, 58000), 2),
              month_start + timedelta(days=7),
              f"EDENOR-{year}-{month_start.month:02d}"))
        count += 1

        # Gas (día 10)
        cur.execute("""
            INSERT INTO expenses (id, user_id, category, description, amount, expense_date, invoice_number)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (uid(), USERS["contador"], "servicios",
              f"Factura de gas - Metrogas {month_name} {year}",
              round(random.uniform(35000, 50000), 2),
              month_start + timedelta(days=9),
              f"METRO-{year}-{month_start.month:02d}"))
        count += 1

        # Mantenimiento (ocasional, 60% de meses)
        if random.random() < 0.60:
            descriptions = [
                "Mantenimiento preventivo horno",
                "Reparación amasadora",
                "Servicio técnico cámara frigorífica",
                "Reparación cañería",
            ]
            cur.execute("""
                INSERT INTO expenses (id, user_id, category, description, amount, expense_date)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (uid(), USERS["contador"], "mantenimiento",
                  random.choice(descriptions),
                  round(random.uniform(35000, 120000), 2),
                  month_start + timedelta(days=random.randint(5, 25))))
            count += 1

        # Marketing (cada mes)
        cur.execute("""
            INSERT INTO expenses (id, user_id, category, description, amount, expense_date)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (uid(), USERS["admin"], "marketing",
              f"Publicidad en redes sociales - {month_name} {year}",
              round(random.uniform(18000, 35000), 2),
              month_start + timedelta(days=random.randint(3, 10))))
        count += 1

        # Impuestos (trimestrales)
        if month_start.month % 3 == 0:
            cur.execute("""
                INSERT INTO expenses (id, user_id, category, description, amount, expense_date)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (uid(), USERS["contador"], "impuestos",
                  f"Ingresos Brutos trimestre - {year}",
                  round(random.uniform(80000, 150000), 2),
                  month_start + timedelta(days=20)))
            count += 1

        # Otros variables
        otros = [
            ("Compra de bandejas y moldes", random.uniform(15000, 35000)),
            ("Uniformes personal",          random.uniform(20000, 40000)),
            ("Limpieza y desinfección",     random.uniform(12000, 22000)),
        ]
        selected = random.sample(otros, random.randint(1, 2))
        for desc, amount in selected:
            cur.execute("""
                INSERT INTO expenses (id, user_id, category, description, amount, expense_date)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (uid(), USERS["contador"], "otros",
                  desc, round(amount, 2),
                  month_start + timedelta(days=random.randint(10, 28))))
            count += 1

    print(f"     Gastos generados: {count}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    random.seed(42)  # reproducible
    today = date.today()

    print("\n═══════════════════════════════════════════════════")
    print("  Panadería SaaS — Generador de Datos de Demo")
    print(f"  Fecha base: {today.isoformat()}")
    print("═══════════════════════════════════════════════════\n")

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("Limpiando datos anteriores de demo (respetando seeds base)...")
        # Orden inverso por FK: primero items, luego cabeceras
        cur.execute("""
            DELETE FROM sale_items
            WHERE sale_id IN (
                SELECT id FROM sales WHERE sale_number LIKE 'VTA-DEMO-%' OR sale_number LIKE 'VTA-CANC-%'
            )
        """)
        cur.execute("DELETE FROM sales WHERE sale_number LIKE 'VTA-DEMO-%' OR sale_number LIKE 'VTA-CANC-%'")
        cur.execute("""
            DELETE FROM production_batches
            WHERE id NOT IN (
                SELECT id FROM production_batches
                WHERE notes IN ('Producción matutina', 'Medialunas para el día',
                                'Alfajores premium', 'Tortas para el fin de semana',
                                'Croissants en el horno', 'Se quemó el horno. Merma total.')
            )
            AND production_date < CURRENT_DATE - INTERVAL '7 days'
        """)
        # Limpiar compras y gastos demo (los que tienen invoice FC-AUTO-)
        cur.execute("DELETE FROM ingredient_purchases WHERE invoice_number LIKE 'FC-AUTO-%'")
        # Limpiar gastos demo (los no base)
        cur.execute("""
            DELETE FROM expenses
            WHERE invoice_number IS NULL
            AND description NOT LIKE '%Enero 2026%'
            AND description NOT LIKE '%Reparación de horno principal%'
            AND description NOT LIKE '%bandejas y moldes nuevos%'
        """)
        # Limpiar clientes demo anteriores
        cur.execute("""
            DELETE FROM customers
            WHERE id NOT IN %s
        """, (tuple(EXISTING_CUSTOMERS),))

        print("\nGenerando datos...\n")

        all_customers = generate_customers(cur)
        generate_sales(cur, all_customers, today)
        generate_production(cur, today)
        generate_purchases(cur, today)
        generate_expenses(cur, today)

        conn.commit()

        # Resumen final
        cur.execute("SELECT COUNT(*) FROM sales WHERE sale_number LIKE 'VTA-DEMO-%'")
        n_sales = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM sales WHERE sale_number LIKE 'VTA-CANC-%'")
        n_cancelled = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.sale_number LIKE 'VTA-%'")
        n_items = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM production_batches")
        n_batches = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM ingredient_purchases")
        n_purchases = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM expenses")
        n_expenses = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM customers")
        n_customers = cur.fetchone()[0]

        print(f"""
  Demo data generada exitosamente

  Clientes            {n_customers}
  Ventas completadas  {n_sales}
  Ventas canceladas   {n_cancelled}
  Sale items          {n_items}
  Lotes producción    {n_batches}
  Compras ingred.     {n_purchases}
  Gastos              {n_expenses}
""")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
