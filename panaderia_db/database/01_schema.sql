-- PANADERÍA SaaS — SCHEMA COMPLETO
-- Incluye: tablas, constraints, índices y triggers de integridad referencial.
-- Decisión arquitectónica: la lógica de negocio (stock, puntos de fidelidad, numeración de ventas, costos promedio) vive en la capa de aplicación
-- (FastAPI + SQLAlchemy), no en triggers. Los triggers aquí son exclusivamente para validación de integridad de datos (lo que la app no puede rechazar
-- antes de llegar a la BD).
--
-- Orden de ejecución:
--   1. 00_init.sql  — extensiones
--   2. 01_schema.sql (este archivo)

-- ── users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(255)  NOT NULL,
    role          VARCHAR(50)   NOT NULL CHECK (role IN ('admin', 'cajero', 'panadero', 'contador')),
    is_active     BOOLEAN       NOT NULL DEFAULT true,
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role) WHERE is_active = true;

COMMENT ON TABLE  users       IS 'Empleados y usuarios del sistema con control de acceso basado en roles';
COMMENT ON COLUMN users.role  IS 'admin: gestión completa | cajero: ventas | panadero: producción | contador: reportes';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt generado por la aplicación';


-- ── categories ───────────────────────────────────────────────────────────────

CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_name ON categories(name) WHERE is_active = true;

COMMENT ON TABLE categories IS 'Clasificación de productos (Panadería, Pastelería, Galletas, Bebidas)';


-- ── suppliers ────────────────────────────────────────────────────────────────

CREATE TABLE suppliers (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    phone          VARCHAR(50),
    email          VARCHAR(255),
    address        TEXT,
    tax_id         VARCHAR(50)  UNIQUE,
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_suppliers_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_suppliers_name   ON suppliers(name)   WHERE is_active = true;
CREATE INDEX idx_suppliers_tax_id ON suppliers(tax_id);

COMMENT ON TABLE  suppliers        IS 'Proveedores de materias primas e ingredientes';
COMMENT ON COLUMN suppliers.tax_id IS 'CUIT/RUC/RFC del proveedor para facturación';


-- ── customers ────────────────────────────────────────────────────────────────

CREATE TABLE customers (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    phone          VARCHAR(50),
    email          VARCHAR(255),
    address        TEXT,
    loyalty_points INTEGER      NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_customers_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_customers_phone   ON customers(phone);
CREATE INDEX idx_customers_email   ON customers(email);
CREATE INDEX idx_customers_loyalty ON customers(loyalty_points DESC) WHERE is_active = true;

COMMENT ON TABLE  customers                IS 'Clientes con programa de fidelidad (ventas anónimas no requieren registro)';
COMMENT ON COLUMN customers.loyalty_points IS '1 punto por cada N pesos de compra (configurable en la app via LOYALTY_POINTS_RATIO)';


-- ── products ─────────────────────────────────────────────────────────────────

CREATE TABLE products (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id      UUID          NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name             VARCHAR(255)  NOT NULL,
    description      TEXT,
    price            DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    unit             VARCHAR(50)   NOT NULL DEFAULT 'unidad'
                       CHECK (unit IN ('unidad', 'kg', 'gramo', 'docena', 'media docena')),
    stock_quantity   DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert  DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
    is_active        BOOLEAN       NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(name, category_id)
);

CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_name      ON products(name);
CREATE INDEX idx_products_stock     ON products(stock_quantity) WHERE is_active = true;
CREATE INDEX idx_products_low_stock ON products(stock_quantity)
    WHERE stock_quantity < min_stock_alert AND is_active = true;

COMMENT ON TABLE  products       IS 'Productos finales que se venden (panes, pasteles, galletas)';
COMMENT ON COLUMN products.price IS 'Precio de venta actual (el precio histórico se guarda en sale_items.unit_price)';


-- ── ingredients ──────────────────────────────────────────────────────────────

CREATE TABLE ingredients (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(255)  NOT NULL UNIQUE,
    unit             VARCHAR(50)   NOT NULL DEFAULT 'kg'
                       CHECK (unit IN ('kg', 'gramo', 'litro', 'ml', 'unidad')),
    stock_quantity   DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert  DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
    unit_cost        DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    is_active        BOOLEAN       NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredients_name      ON ingredients(name);
CREATE INDEX idx_ingredients_stock     ON ingredients(stock_quantity) WHERE is_active = true;
CREATE INDEX idx_ingredients_low_stock ON ingredients(stock_quantity)
    WHERE stock_quantity < min_stock_alert AND is_active = true;

COMMENT ON TABLE  ingredients           IS 'Materias primas e insumos (harina, azúcar, levadura, etc.)';
COMMENT ON COLUMN ingredients.unit_cost IS 'Costo promedio ponderado (actualizado por la app en cada compra — RN-003)';


-- ── recipes ──────────────────────────────────────────────────────────────────

CREATE TABLE recipes (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID          NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
    ingredient_id UUID          NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity      DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit          VARCHAR(50)   NOT NULL CHECK (unit IN ('kg', 'gramo', 'litro', 'ml', 'unidad')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, ingredient_id)
);

CREATE INDEX idx_recipes_product    ON recipes(product_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_id);

COMMENT ON TABLE  recipes          IS 'Composición de productos: qué ingredientes y en qué cantidad lleva 1 unidad';
COMMENT ON COLUMN recipes.quantity IS 'Cantidad de ingrediente necesaria para producir 1 unidad del producto';
COMMENT ON COLUMN recipes.unit     IS 'Debe coincidir con ingredients.unit (validado por trigger validate_recipe_unit)';

-- Trigger: valida que la unidad de la receta sea compatible con la del ingrediente.
-- Responsabilidad de la BD porque es una restricción de integridad referencial de datos,
-- no lógica de negocio.
CREATE OR REPLACE FUNCTION validate_recipe_unit()
RETURNS TRIGGER AS $$
DECLARE
    ingredient_unit VARCHAR(50);
BEGIN
    SELECT unit INTO ingredient_unit FROM ingredients WHERE id = NEW.ingredient_id;

    IF NEW.unit != ingredient_unit THEN
        RAISE EXCEPTION 'Incompatibilidad de unidades: receta usa "%" pero el ingrediente "%" usa "%"',
            NEW.unit,
            (SELECT name FROM ingredients WHERE id = NEW.ingredient_id),
            ingredient_unit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_recipe_unit
    BEFORE INSERT OR UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION validate_recipe_unit();

COMMENT ON FUNCTION validate_recipe_unit() IS
    'Garantiza que la unidad de la receta coincida con la del ingrediente referenciado';


-- ── sales ────────────────────────────────────────────────────────────────────

CREATE TABLE sales (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id    UUID          REFERENCES customers(id) ON DELETE SET NULL,
    user_id        UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sale_number    VARCHAR(50)   NOT NULL UNIQUE,
    subtotal       DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount     DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50)   NOT NULL
                     CHECK (payment_method IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'qr')),
    status         VARCHAR(50)   NOT NULL DEFAULT 'completada'
                     CHECK (status IN ('completada', 'cancelada')),
    sale_date      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sales_total       CHECK (total_amount = subtotal - discount_amount + tax_amount),
    CONSTRAINT chk_sales_date_not_future CHECK (sale_date <= NOW())
);

CREATE INDEX idx_sales_customer   ON sales(customer_id);
CREATE INDEX idx_sales_user       ON sales(user_id);
CREATE INDEX idx_sales_number     ON sales(sale_number);
CREATE INDEX idx_sales_date       ON sales(sale_date DESC);
CREATE INDEX idx_sales_status     ON sales(status, sale_date);
-- Índice compuesto para reportes de ventas por cajero
CREATE INDEX idx_sales_user_date  ON sales(user_id, sale_date DESC) WHERE status = 'completada';

COMMENT ON TABLE  sales             IS 'Ventas realizadas — cabecera de la transacción';
COMMENT ON COLUMN sales.customer_id IS 'Cliente (NULL si es venta anónima)';
COMMENT ON COLUMN sales.sale_number IS 'Formato VTA-YYYY-NNNNN, generado por la app (RN-010)';
COMMENT ON COLUMN sales.discount_amount IS 'Descuento aplicado (por puntos, promoción, etc.)';


-- ── sale_items ────────────────────────────────────────────────────────────────

CREATE TABLE sale_items (
    id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id    UUID          NOT NULL REFERENCES sales(id)     ON DELETE CASCADE,
    product_id UUID          NOT NULL REFERENCES products(id)  ON DELETE RESTRICT,
    quantity   DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit       VARCHAR(50)   NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal   DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sale_items_subtotal CHECK (subtotal = quantity * unit_price)
);

CREATE INDEX idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

COMMENT ON TABLE  sale_items            IS 'Detalle de productos por venta';
COMMENT ON COLUMN sale_items.unit_price IS 'Precio histórico al momento de la venta — NO usar products.price para reportes (RN-004)';


-- ── production_batches ───────────────────────────────────────────────────────

CREATE TABLE production_batches (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id        UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    user_id           UUID          NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
    quantity_produced DECIMAL(10,3) NOT NULL CHECK (quantity_produced > 0),
    unit              VARCHAR(50)   NOT NULL,
    production_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    ingredient_cost   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (ingredient_cost >= 0),
    status            VARCHAR(50)   NOT NULL DEFAULT 'en_proceso'
                        CHECK (status IN ('en_proceso', 'completado', 'descartado')),
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_production_date_not_future CHECK (production_date <= CURRENT_DATE)
);

CREATE INDEX idx_production_product   ON production_batches(product_id);
CREATE INDEX idx_production_user      ON production_batches(user_id);
CREATE INDEX idx_production_date      ON production_batches(production_date DESC);
CREATE INDEX idx_production_status    ON production_batches(status, production_date);
-- Índice compuesto para reportes de producción por panadero
CREATE INDEX idx_production_user_date ON production_batches(user_id, production_date DESC)
    WHERE status = 'completado';

COMMENT ON TABLE  production_batches              IS 'Registro de lotes de producción diaria';
COMMENT ON COLUMN production_batches.ingredient_cost IS 'Costo de ingredientes calculado por la app al completar el lote (RN-002)';
COMMENT ON COLUMN production_batches.status       IS 'en_proceso → completado (suma stock) | en_proceso → descartado (merma, RN-008)';


-- ── ingredient_purchases ─────────────────────────────────────────────────────

CREATE TABLE ingredient_purchases (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id    UUID          NOT NULL REFERENCES suppliers(id)   ON DELETE RESTRICT,
    ingredient_id  UUID          NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    user_id        UUID          NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
    quantity       DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit           VARCHAR(50)   NOT NULL,
    unit_price     DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    purchase_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_purchases_total           CHECK (total_amount = quantity * unit_price),
    CONSTRAINT chk_purchase_date_not_future  CHECK (purchase_date <= CURRENT_DATE)
);

CREATE INDEX idx_purchases_supplier        ON ingredient_purchases(supplier_id);
CREATE INDEX idx_purchases_ingredient      ON ingredient_purchases(ingredient_id);
CREATE INDEX idx_purchases_user            ON ingredient_purchases(user_id);
CREATE INDEX idx_purchases_date            ON ingredient_purchases(purchase_date DESC);
CREATE INDEX idx_purchases_invoice         ON ingredient_purchases(invoice_number);
-- Índice compuesto para análisis de variación de precios
CREATE INDEX idx_purchases_ingredient_date ON ingredient_purchases(ingredient_id, purchase_date DESC);

COMMENT ON TABLE  ingredient_purchases              IS 'Compras de materias primas a proveedores';
COMMENT ON COLUMN ingredient_purchases.unit_price   IS 'Precio por unidad en esta compra (varía por compra; el costo promedio está en ingredients.unit_cost)';
COMMENT ON COLUMN ingredient_purchases.invoice_number IS 'Número de factura del proveedor para auditoría contable';

-- Trigger: evita modificar datos críticos de una compra registrada (inmutabilidad contable).
-- Una compra es un hecho histórico; las correcciones se hacen con ajustes separados.
CREATE OR REPLACE FUNCTION prevent_purchase_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.quantity       != NEW.quantity    OR
       OLD.unit_price     != NEW.unit_price  OR
       OLD.supplier_id    != NEW.supplier_id OR
       OLD.ingredient_id  != NEW.ingredient_id THEN
        RAISE EXCEPTION
            'Las compras registradas son inmutables. '
            'Para correcciones, crear un ajuste o una nueva compra.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_purchase_modification
    BEFORE UPDATE ON ingredient_purchases
    FOR EACH ROW EXECUTE FUNCTION prevent_purchase_modification();

COMMENT ON FUNCTION prevent_purchase_modification() IS
    'Previene modificación de datos contables de compras (cantidad, precio, proveedor, ingrediente)';


-- ── expenses ─────────────────────────────────────────────────────────────────

CREATE TABLE expenses (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category       VARCHAR(100)  NOT NULL
                     CHECK (category IN ('alquiler', 'servicios', 'salarios', 'mantenimiento', 'marketing', 'impuestos', 'otros')),
    description    VARCHAR(255)  NOT NULL,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    expense_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expense_date_not_future CHECK (expense_date <= CURRENT_DATE)
);

CREATE INDEX idx_expenses_user     ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date     ON expenses(expense_date DESC);

COMMENT ON TABLE  expenses          IS 'Gastos operativos de la panadería (alquiler, servicios, salarios, etc.)';
COMMENT ON COLUMN expenses.category IS 'Categoría contable para reportes financieros';


-- ── Verificación ──────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE 'Schema de Panadería SaaS creado exitosamente';
    RAISE NOTICE '  Tablas: 12';
    RAISE NOTICE '  Triggers de integridad: validate_recipe_unit, prevent_purchase_modification';
    RAISE NOTICE '  Nota: lógica de negocio (stock, puntos, sale_number) vive en la app, no en triggers';
END $$;
