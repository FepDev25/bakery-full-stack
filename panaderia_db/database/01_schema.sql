-- PANADERÍA SaaS - SCHEMA PRINCIPAL
-- Tablas, Relaciones, Constraints e Índices
-- Orden: Tablas independientes → Tablas dependientes

-- TABLA: users (Empleados y usuarios del sistema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'cajero', 'panadero', 'contador')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;

COMMENT ON TABLE users IS 'Empleados y usuarios del sistema con control de acceso basado en roles';
COMMENT ON COLUMN users.role IS 'Roles: admin (gestión completa), cajero (ventas), panadero (producción), contador (reportes)';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt de la contraseña (generado con pgcrypto)';

-- TABLA: categories (Categorías de productos)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_name ON categories(name) WHERE is_active = true;

COMMENT ON TABLE categories IS 'Clasificación de productos (Panadería, Pastelería, Galletas, Bebidas)';
COMMENT ON COLUMN categories.name IS 'Nombre único de la categoría (ej: Panadería Artesanal)';

-- TABLA: suppliers (Proveedores de ingredientes)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_id VARCHAR(50) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_suppliers_contact CHECK (
        phone IS NOT NULL OR email IS NOT NULL
    )
);

CREATE INDEX idx_suppliers_name ON suppliers(name) WHERE is_active = true;
CREATE INDEX idx_suppliers_tax_id ON suppliers(tax_id);

COMMENT ON TABLE suppliers IS 'Proveedores de materias primas e ingredientes';
COMMENT ON COLUMN suppliers.tax_id IS 'CUIT/RUC/RFC del proveedor para facturación';
COMMENT ON CONSTRAINT chk_suppliers_contact ON suppliers IS 'Debe tener al menos teléfono o email';

-- TABLA: customers (Clientes con programa de fidelidad)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_customers_contact CHECK (
        phone IS NOT NULL OR email IS NOT NULL
    )
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_loyalty ON customers(loyalty_points DESC) WHERE is_active = true;

COMMENT ON TABLE customers IS 'Clientes registrados con programa de fidelidad (ventas anónimas no requieren registro)';
COMMENT ON COLUMN customers.loyalty_points IS 'Puntos acumulados: 1 punto por cada $10 de compra';

-- TABLA: products (Productos finales de venta)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'unidad' CHECK (unit IN ('unidad', 'kg', 'gramo', 'docena', 'media docena')),
    stock_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, category_id)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock ON products(stock_quantity) WHERE is_active = true;
CREATE INDEX idx_products_low_stock ON products(stock_quantity) WHERE stock_quantity < min_stock_alert AND is_active = true;

COMMENT ON TABLE products IS 'Productos finales que se venden (panes, pasteles, galletas)';
COMMENT ON COLUMN products.price IS 'Precio de venta actual (histórico se guarda en sale_items)';
COMMENT ON COLUMN products.stock_quantity IS 'Stock actual disponible para venta';
COMMENT ON COLUMN products.min_stock_alert IS 'Nivel de stock que activa alerta de reposición';

-- TABLA: ingredients (Materias primas)
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    unit VARCHAR(50) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'gramo', 'litro', 'ml', 'unidad')),
    stock_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_stock ON ingredients(stock_quantity) WHERE is_active = true;
CREATE INDEX idx_ingredients_low_stock ON ingredients(stock_quantity) WHERE stock_quantity < min_stock_alert AND is_active = true;

COMMENT ON TABLE ingredients IS 'Materias primas e insumos (harina, azúcar, levadura, etc.)';
COMMENT ON COLUMN ingredients.unit_cost IS 'Costo promedio ponderado por unidad (se actualiza con cada compra)';
COMMENT ON COLUMN ingredients.stock_quantity IS 'Stock actual disponible para producción';

-- TABLA: recipes (Composición de productos)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL CHECK (unit IN ('kg', 'gramo', 'litro', 'ml', 'unidad')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, ingredient_id)
);

CREATE INDEX idx_recipes_product ON recipes(product_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_id);

COMMENT ON TABLE recipes IS 'Define qué ingredientes y en qué cantidad lleva cada producto (para calcular costos)';
COMMENT ON COLUMN recipes.quantity IS 'Cantidad de ingrediente necesaria para producir 1 unidad del producto';
COMMENT ON COLUMN recipes.unit IS 'Unidad de medida (debe ser compatible con ingredients.unit)';

-- TABLA: sales (Ventas - Cabecera)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'qr')),
    status VARCHAR(50) NOT NULL DEFAULT 'completada' CHECK (status IN ('completada', 'cancelada')),
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sales_total CHECK (total_amount = subtotal - discount_amount + tax_amount)
);

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_date ON sales(sale_date DESC);
CREATE INDEX idx_sales_status ON sales(status, sale_date);

COMMENT ON TABLE sales IS 'Ventas realizadas (cabecera de la transacción)';
COMMENT ON COLUMN sales.customer_id IS 'Cliente (NULL si es venta anónima)';
COMMENT ON COLUMN sales.sale_number IS 'Número de venta único (ej: VTA-2026-00001)';
COMMENT ON COLUMN sales.discount_amount IS 'Descuento aplicado (por puntos, promoción, etc.)';
COMMENT ON COLUMN sales.user_id IS 'Cajero que procesó la venta';

-- TABLA: sale_items (Detalle de ventas)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sale_items_subtotal CHECK (subtotal = quantity * unit_price)
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

COMMENT ON TABLE sale_items IS 'Detalle de productos vendidos en cada venta';
COMMENT ON COLUMN sale_items.unit_price IS 'Precio histórico del producto al momento de la venta (NO usar products.price)';
COMMENT ON COLUMN sale_items.subtotal IS 'Cantidad * precio unitario (calculado)';

-- TABLA: production_batches (Producción diaria)
CREATE TABLE production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    quantity_produced DECIMAL(10, 3) NOT NULL CHECK (quantity_produced > 0),
    unit VARCHAR(50) NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ingredient_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (ingredient_cost >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('en_proceso', 'completado', 'descartado')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_production_product ON production_batches(product_id);
CREATE INDEX idx_production_user ON production_batches(user_id);
CREATE INDEX idx_production_date ON production_batches(production_date DESC);
CREATE INDEX idx_production_status ON production_batches(status, production_date);

COMMENT ON TABLE production_batches IS 'Registro de producción diaria (horneado)';
COMMENT ON COLUMN production_batches.ingredient_cost IS 'Costo calculado de ingredientes según receta (para rentabilidad)';
COMMENT ON COLUMN production_batches.status IS 'en_proceso: iniciado | completado: agregado a stock | descartado: merma/desperdicio';
COMMENT ON COLUMN production_batches.user_id IS 'Panadero responsable de la producción';

-- TABLA: ingredient_purchases (Compras de ingredientes)
CREATE TABLE ingredient_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_purchases_total CHECK (total_amount = quantity * unit_price)
);

CREATE INDEX idx_purchases_supplier ON ingredient_purchases(supplier_id);
CREATE INDEX idx_purchases_ingredient ON ingredient_purchases(ingredient_id);
CREATE INDEX idx_purchases_user ON ingredient_purchases(user_id);
CREATE INDEX idx_purchases_date ON ingredient_purchases(purchase_date DESC);
CREATE INDEX idx_purchases_invoice ON ingredient_purchases(invoice_number);

COMMENT ON TABLE ingredient_purchases IS 'Compras de materias primas a proveedores';
COMMENT ON COLUMN ingredient_purchases.user_id IS 'Usuario que registró la compra (admin o contador)';
COMMENT ON COLUMN ingredient_purchases.invoice_number IS 'Número de factura del proveedor (para auditoría)';
COMMENT ON COLUMN ingredient_purchases.unit_price IS 'Precio por unidad en esta compra (puede variar)';

-- TABLA: expenses (Gastos operativos)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('alquiler', 'servicios', 'salarios', 'mantenimiento', 'marketing', 'impuestos', 'otros')),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);

COMMENT ON TABLE expenses IS 'Gastos operativos de la panadería (alquiler, servicios, salarios, etc.)';
COMMENT ON COLUMN expenses.category IS 'Categoría contable del gasto para reportes financieros';
COMMENT ON COLUMN expenses.user_id IS 'Usuario que registró el gasto (admin o contador)';

-- FINALIZACIÓN
-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Schema de Panadería SaaS creado exitosamente';
    RAISE NOTICE 'Total de tablas: 12';
    RAISE NOTICE 'Siguiente paso: ejecutar 02_triggers.sql';
END $$;
