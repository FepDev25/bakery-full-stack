from datetime import date, timedelta
from typing import Any

from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.customer import Customer
from src.models.enums import ProductionBatchStatus, SaleStatus
from src.models.expense import Expense
from src.models.ingredient import Ingredient
from src.models.ingredient_purchase import IngredientPurchase
from src.models.product import Product
from src.models.production_batch import ProductionBatch
from src.models.sale import Sale
from src.models.sale_item import SaleItem
from src.models.supplier import Supplier


def _period_to_dates(period: str) -> tuple[date, date]:
    today = date.today()
    if period == "today":
        return today, today
    days = {"7d": 7, "30d": 30, "90d": 90}
    return today - timedelta(days=days[period]), today


class ToolExecutor:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def execute(self, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
        handlers = {
            "get_sales_summary": self.get_sales_summary,
            "get_top_products": self.get_top_products,
            "get_stock_status": self.get_stock_status,
            "get_production_stats": self.get_production_stats,
            "get_expense_summary": self.get_expense_summary,
            "get_ingredient_cost_trend": self.get_ingredient_cost_trend,
            "search_catalog": self.search_catalog,
            "get_customer_stats": self.get_customer_stats,
        }
        handler = handlers.get(tool_name)
        if handler is None:
            return {"error": f"Tool desconocida: {tool_name}"}
        try:
            return await handler(**tool_input)
        except Exception as exc:
            return {"error": str(exc)}

    async def get_sales_summary(
        self,
        from_date: str,
        to_date: str,
        status: str | None = None,
    ) -> dict[str, Any]:
        fd = date.fromisoformat(from_date)
        td = date.fromisoformat(to_date)
        filter_status = SaleStatus(status) if status else SaleStatus.COMPLETADA

        q = (
            select(
                func.count(Sale.id).label("sale_count"),
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_revenue"),
                func.coalesce(func.avg(Sale.total_amount), 0).label("avg_ticket"),
            )
            .where(cast(Sale.sale_date, Date) >= fd)
            .where(cast(Sale.sale_date, Date) <= td)
            .where(Sale.status == filter_status)
        )
        row = (await self.session.execute(q)).one()

        # cancelled count
        q_cancelled = (
            select(func.count(Sale.id))
            .where(cast(Sale.sale_date, Date) >= fd)
            .where(cast(Sale.sale_date, Date) <= td)
            .where(Sale.status == SaleStatus.CANCELADA)
        )
        cancelled = (await self.session.execute(q_cancelled)).scalar_one()

        return {
            "from_date": from_date,
            "to_date": to_date,
            "status_filter": filter_status.value,
            "sale_count": row.sale_count,
            "total_revenue": float(row.total_revenue),
            "avg_ticket": round(float(row.avg_ticket), 2),
            "cancelled_count": cancelled,
        }

    async def get_top_products(
        self,
        period: str,
        limit: int = 5,
        by: str = "revenue",
    ) -> dict[str, Any]:
        from_date, to_date = _period_to_dates(period)

        order_col = (
            func.sum(SaleItem.subtotal) if by == "revenue"
            else func.sum(SaleItem.quantity)
        )

        q = (
            select(
                Product.name.label("product_name"),
                func.sum(SaleItem.subtotal).label("total_revenue"),
                func.sum(SaleItem.quantity).label("total_quantity"),
                func.avg(SaleItem.unit_price).label("avg_price"),
            )
            .join(SaleItem, SaleItem.product_id == Product.id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(cast(Sale.sale_date, Date) >= from_date)
            .where(cast(Sale.sale_date, Date) <= to_date)
            .where(Sale.status == SaleStatus.COMPLETADA)
            .group_by(Product.id, Product.name)
            .order_by(order_col.desc())
            .limit(limit)
        )
        rows = (await self.session.execute(q)).all()

        return {
            "period": period,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "ordered_by": by,
            "products": [
                {
                    "product_name": r.product_name,
                    "total_revenue": float(r.total_revenue),
                    "total_quantity": float(r.total_quantity),
                    "avg_price": round(float(r.avg_price), 2),
                }
                for r in rows
            ],
        }

    async def get_stock_status(
        self,
        type: str = "both",
        only_alerts: bool = False,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {}

        if type in ("products", "both"):
            q = select(
                Product.name,
                Product.stock_quantity,
                Product.min_stock_alert,
            ).where(Product.is_active == True)  # noqa: E712
            if only_alerts:
                q = q.where(Product.stock_quantity <= Product.min_stock_alert)
            rows = (await self.session.execute(q)).all()
            result["products"] = [
                {
                    "name": r.name,
                    "stock_quantity": float(r.stock_quantity),
                    "min_stock_alert": float(r.min_stock_alert),
                    "is_low": float(r.stock_quantity) <= float(r.min_stock_alert),
                }
                for r in rows
            ]

        if type in ("ingredients", "both"):
            q = select(
                Ingredient.name,
                Ingredient.stock_quantity,
                Ingredient.min_stock_alert,
                Ingredient.unit,
            ).where(Ingredient.is_active == True)  # noqa: E712
            if only_alerts:
                q = q.where(Ingredient.stock_quantity <= Ingredient.min_stock_alert)
            rows = (await self.session.execute(q)).all()
            result["ingredients"] = [
                {
                    "name": r.name,
                    "stock_quantity": float(r.stock_quantity),
                    "min_stock_alert": float(r.min_stock_alert),
                    "unit": r.unit,
                    "is_low": float(r.stock_quantity) <= float(r.min_stock_alert),
                }
                for r in rows
            ]

        # total alerts across everything
        alert_count = sum(
            1 for item in result.get("products", []) + result.get("ingredients", [])
            if item["is_low"]
        )
        result["alert_count"] = alert_count
        return result

    async def get_production_stats(
        self,
        from_date: str,
        to_date: str,
        product_name: str | None = None,
    ) -> dict[str, Any]:
        fd = date.fromisoformat(from_date)
        td = date.fromisoformat(to_date)

        q = select(
            ProductionBatch.status,
            func.count(ProductionBatch.id).label("count"),
            func.coalesce(func.sum(ProductionBatch.ingredient_cost), 0).label("total_cost"),
            func.coalesce(func.sum(ProductionBatch.quantity_produced), 0).label("total_units"),
        ).where(
            ProductionBatch.production_date >= fd,
            ProductionBatch.production_date <= td,
        )

        if product_name:
            q = q.join(Product, Product.id == ProductionBatch.product_id).where(
                Product.name.ilike(f"%{product_name}%")
            )

        q = q.group_by(ProductionBatch.status)
        rows = (await self.session.execute(q)).all()

        stats: dict[str, Any] = {
            "from_date": from_date,
            "to_date": to_date,
            "completed_batches": 0,
            "discarded_batches": 0,
            "in_progress_batches": 0,
            "total_ingredient_cost": 0.0,
            "units_produced": 0.0,
        }
        for r in rows:
            cost = float(r.total_cost)
            units = float(r.total_units)
            if r.status == ProductionBatchStatus.COMPLETADO:
                stats["completed_batches"] = r.count
                stats["total_ingredient_cost"] += cost
                stats["units_produced"] = units
            elif r.status == ProductionBatchStatus.DESCARTADO:
                stats["discarded_batches"] = r.count
                stats["total_ingredient_cost"] += cost
            elif r.status == ProductionBatchStatus.EN_PROCESO:
                stats["in_progress_batches"] = r.count

        total_closed = stats["completed_batches"] + stats["discarded_batches"]
        stats["waste_rate_pct"] = (
            round(stats["discarded_batches"] / total_closed * 100, 1) if total_closed else 0.0
        )
        stats["avg_cost_per_batch"] = (
            round(stats["total_ingredient_cost"] / total_closed, 2) if total_closed else 0.0
        )
        stats["total_ingredient_cost"] = round(stats["total_ingredient_cost"], 2)
        return stats

    async def get_expense_summary(
        self,
        from_date: str,
        to_date: str,
        category: str | None = None,
    ) -> dict[str, Any]:
        fd = date.fromisoformat(from_date)
        td = date.fromisoformat(to_date)

        q = select(
            Expense.category,
            func.count(Expense.id).label("count"),
            func.sum(Expense.amount).label("amount"),
        ).where(
            Expense.expense_date >= fd,
            Expense.expense_date <= td,
        )
        if category:
            q = q.where(Expense.category == category)
        q = q.group_by(Expense.category).order_by(func.sum(Expense.amount).desc())
        rows = (await self.session.execute(q)).all()

        total = sum(float(r.amount) for r in rows)
        by_category = [
            {
                "category": r.category.value if hasattr(r.category, "value") else r.category,
                "count": r.count,
                "amount": float(r.amount),
                "pct_of_total": round(float(r.amount) / total * 100, 1) if total else 0.0,
            }
            for r in rows
        ]

        return {
            "from_date": from_date,
            "to_date": to_date,
            "total_expenses": round(total, 2),
            "by_category": by_category,
        }

    async def get_ingredient_cost_trend(
        self,
        ingredient_name: str,
        last_n_purchases: int = 10,
    ) -> dict[str, Any]:
        q = (
            select(
                IngredientPurchase.purchase_date,
                IngredientPurchase.unit_price,
                IngredientPurchase.quantity,
                IngredientPurchase.unit,
                Supplier.name.label("supplier_name"),
                Ingredient.name.label("ingredient_name"),
            )
            .join(Ingredient, Ingredient.id == IngredientPurchase.ingredient_id)
            .join(Supplier, Supplier.id == IngredientPurchase.supplier_id)
            .where(Ingredient.name.ilike(f"%{ingredient_name}%"))
            .order_by(IngredientPurchase.purchase_date.desc())
            .limit(last_n_purchases)
        )
        rows = (await self.session.execute(q)).all()

        if not rows:
            return {"error": f"No se encontraron compras para el ingrediente '{ingredient_name}'"}

        prices = [float(r.unit_price) for r in rows]
        purchases = [
            {
                "date": r.purchase_date.isoformat(),
                "supplier": r.supplier_name,
                "unit_price": float(r.unit_price),
                "quantity": float(r.quantity),
                "unit": r.unit,
            }
            for r in rows
        ]

        price_change_pct = (
            round((prices[0] - prices[-1]) / prices[-1] * 100, 1)
            if len(prices) > 1 and prices[-1] != 0
            else 0.0
        )

        return {
            "ingredient_name": rows[0].ingredient_name,
            "purchases": purchases,
            "avg_price": round(sum(prices) / len(prices), 2),
            "min_price": min(prices),
            "max_price": max(prices),
            "price_change_pct": price_change_pct,
        }

    async def search_catalog(
        self,
        type: str = "both",
        query: str | None = None,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {}

        if type in ("products", "both"):
            q = select(Product.name, Product.unit, Product.price).where(
                Product.is_active == True  # noqa: E712
            )
            if query:
                q = q.where(Product.name.ilike(f"%{query}%"))
            q = q.order_by(Product.name)
            rows = (await self.session.execute(q)).all()
            result["products"] = [
                {"name": r.name, "unit": r.unit, "price": float(r.price)}
                for r in rows
            ]

        if type in ("ingredients", "both"):
            q = select(Ingredient.name, Ingredient.unit).where(
                Ingredient.is_active == True  # noqa: E712
            )
            if query:
                q = q.where(Ingredient.name.ilike(f"%{query}%"))
            q = q.order_by(Ingredient.name)
            rows = (await self.session.execute(q)).all()
            result["ingredients"] = [
                {"name": r.name, "unit": r.unit}
                for r in rows
            ]

        return result

    async def get_customer_stats(
        self,
        limit: int = 5,
        order_by: str = "total_spent",
    ) -> dict[str, Any]:
        order_col = {
            "total_spent": func.sum(Sale.total_amount).desc(),
            "visit_count": func.count(Sale.id).desc(),
            "loyalty_points": Customer.loyalty_points.desc(),
        }.get(order_by, func.sum(Sale.total_amount).desc())

        q = (
            select(
                Customer.name,
                Customer.loyalty_points,
                func.count(Sale.id).label("visit_count"),
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_spent"),
                func.max(cast(Sale.sale_date, Date)).label("last_purchase_date"),
            )
            .outerjoin(Sale, (Sale.customer_id == Customer.id) & (Sale.status == SaleStatus.COMPLETADA))
            .where(Customer.is_active == True)  # noqa: E712
            .group_by(Customer.id, Customer.name, Customer.loyalty_points)
            .order_by(order_col)
            .limit(limit)
        )
        rows = (await self.session.execute(q)).all()

        return {
            "ordered_by": order_by,
            "customers": [
                {
                    "customer_name": r.name,
                    "total_spent": float(r.total_spent),
                    "visit_count": r.visit_count,
                    "loyalty_points": r.loyalty_points,
                    "last_purchase_date": r.last_purchase_date.isoformat() if r.last_purchase_date else None,
                }
                for r in rows
            ],
        }
