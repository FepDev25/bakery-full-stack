-- PANADERÍA SaaS - DATOS SEMILLA (SEED DATA)
-- Datos de prueba realistas para desarrollo y testing

BEGIN;

-- 1. USUARIOS (Empleados del sistema)

INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES
-- Password: admin123 (hash bcrypt)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@panaderia.com', crypt('admin123', gen_salt('bf')), 'Carlos Mendoza', 'admin', true),
-- Password: cajero123
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'cajero1@panaderia.com', crypt('cajero123', gen_salt('bf')), 'María González', 'cajero', true),
('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'cajero2@panaderia.com', crypt('cajero123', gen_salt('bf')), 'Lucas Fernández', 'cajero', true),
-- Password: panadero123
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'panadero@panaderia.com', crypt('panadero123', gen_salt('bf')), 'Roberto Silva', 'panadero', true),
-- Password: contador123
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'contador@panaderia.com', crypt('contador123', gen_salt('bf')), 'Ana Torres', 'contador', true);

-- 2. CATEGORÍAS DE PRODUCTOS

INSERT INTO categories (id, name, description, is_active) VALUES
('10000000-0000-0000-0000-000000000001', 'Panadería', 'Panes artesanales y productos de panadería tradicional', true),
('10000000-0000-0000-0000-000000000002', 'Pastelería', 'Tortas, tartas y postres elaborados', true),
('10000000-0000-0000-0000-000000000003', 'Galletas y Facturas', 'Productos de pastelería seca y facturas', true),
('10000000-0000-0000-0000-000000000004', 'Bebidas', 'Café, infusiones y bebidas', true);

-- 3. PROVEEDORES

INSERT INTO suppliers (id, name, contact_person, phone, email, address, tax_id, is_active) VALUES
('20000000-0000-0000-0000-000000000001', 'Molino La Estrella S.A.', 'Juan Pérez', '011-4567-8900', 'ventas@molinolaestrella.com.ar', 'Av. Industrial 1234, San Martín, Buenos Aires', '30-12345678-9', true),
('20000000-0000-0000-0000-000000000002', 'Distribuidora Central', 'Laura Martínez', '011-4567-8901', 'pedidos@distcentral.com.ar', 'Calle Comercio 567, CABA', '30-87654321-0', true),
('20000000-0000-0000-0000-000000000003', 'Lácteos del Valle', 'Pedro Ramírez', '011-4567-8902', 'ventas@lacteosvallle.com.ar', 'Ruta 5 Km 45, Luján, Buenos Aires', '30-11223344-5', true);

-- 4. INGREDIENTES (Materias Primas)

INSERT INTO ingredients (id, name, unit, stock_quantity, min_stock_alert, unit_cost, is_active) VALUES
-- Harinas
('30000000-0000-0000-0000-000000000001', 'Harina 000', 'kg', 150.000, 50.000, 450.00, true),
('30000000-0000-0000-0000-000000000002', 'Harina 0000', 'kg', 80.000, 30.000, 480.00, true),
('30000000-0000-0000-0000-000000000003', 'Harina Integral', 'kg', 40.000, 20.000, 520.00, true),
-- Levaduras
('30000000-0000-0000-0000-000000000004', 'Levadura Fresca', 'kg', 5.000, 2.000, 1200.00, true),
('30000000-0000-0000-0000-000000000005', 'Levadura Seca Instantánea', 'kg', 2.500, 1.000, 2500.00, true),
-- Básicos
('30000000-0000-0000-0000-000000000006', 'Azúcar', 'kg', 60.000, 25.000, 380.00, true),
('30000000-0000-0000-0000-000000000007', 'Sal Fina', 'kg', 30.000, 10.000, 120.00, true),
-- Grasas
('30000000-0000-0000-0000-000000000008', 'Manteca', 'kg', 25.000, 10.000, 2800.00, true),
('30000000-0000-0000-0000-000000000009', 'Margarina', 'kg', 20.000, 10.000, 1800.00, true),
-- Lácteos
('30000000-0000-0000-0000-000000000010', 'Leche Entera', 'litro', 50.000, 20.000, 420.00, true),
('30000000-0000-0000-0000-000000000011', 'Crema de Leche', 'litro', 15.000, 5.000, 980.00, true),
('30000000-0000-0000-0000-000000000012', 'Queso Crema', 'kg', 10.000, 5.000, 3200.00, true),
-- Otros
('30000000-0000-0000-0000-000000000013', 'Huevos', 'unidad', 300.000, 100.000, 85.00, true),
('30000000-0000-0000-0000-000000000014', 'Dulce de Leche', 'kg', 20.000, 8.000, 1500.00, true),
('30000000-0000-0000-0000-000000000015', 'Chocolate Cobertura', 'kg', 12.000, 5.000, 3500.00, true),
('30000000-0000-0000-0000-000000000016', 'Esencia de Vainilla', 'litro', 2.000, 0.500, 4500.00, true),
('30000000-0000-0000-0000-000000000017', 'Polvo de Hornear', 'kg', 5.000, 2.000, 800.00, true);

-- 5. PRODUCTOS (Productos Finales)

INSERT INTO products (id, category_id, name, description, price, unit, stock_quantity, min_stock_alert, is_active) VALUES
-- PANADERÍA
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Baguette', 'Pan francés tradicional crujiente', 850.00, 'unidad', 45.000, 20.000, true),
('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Pan Francés', 'Pan de miga blanca clásico', 950.00, 'unidad', 30.000, 15.000, true),
('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Pan Integral', 'Pan de harina integral con semillas', 1200.00, 'unidad', 20.000, 10.000, true),
('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Pan de Miga', 'Pan de sandwich blanco', 2500.00, 'unidad', 12.000, 8.000, true),
('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Medialunas de Manteca', 'Medialunas dulces artesanales', 300.00, 'unidad', 60.000, 30.000, true),

-- PASTELERÍA
('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Torta de Chocolate', 'Torta húmeda con ganache de chocolate', 8500.00, 'unidad', 3.000, 2.000, true),
('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Cheesecake de Frutos Rojos', 'Tarta fría de queso con salsa de frutos rojos', 9200.00, 'unidad', 2.000, 2.000, true),
('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'Lemon Pie', 'Tarta de limón con merengue italiano', 7800.00, 'unidad', 4.000, 2.000, true),
('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'Alfajores de Maicena', 'Alfajores rellenos de dulce de leche', 450.00, 'unidad', 80.000, 40.000, true),

-- GALLETAS Y FACTURAS
('40000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', 'Pepas de Membrillo', 'Galletas rellenas de dulce de membrillo', 180.00, 'unidad', 100.000, 50.000, true),
('40000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', 'Bizcochitos de Grasa', 'Bizcochos salados tradicionales', 200.00, 'unidad', 80.000, 40.000, true),
('40000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', 'Croissants', 'Croissants de manteca hojaldrados', 650.00, 'unidad', 40.000, 20.000, true),
('40000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000003', 'Facturas Surtidas', 'Vigilantes, bolas de fraile, cañoncitos', 350.00, 'unidad', 50.000, 25.000, true),

-- BEBIDAS
('40000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000004', 'Café Espresso', 'Café espresso italiano', 900.00, 'unidad', 0.000, 0.000, true),
('40000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000004', 'Café con Leche', 'Café con leche tradicional', 1100.00, 'unidad', 0.000, 0.000, true);

-- 6. RECETAS (Composición de Productos)

-- Baguette (40000000-0000-0000-0000-000000000001)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 0.250, 'kg'),  -- Harina 000
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 0.008, 'kg'),  -- Levadura fresca
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', 0.005, 'kg');  -- Sal

-- Pan Francés (40000000-0000-0000-0000-000000000002)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 0.300, 'kg'),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004', 0.010, 'kg'),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', 0.006, 'kg'),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 0.015, 'kg');  -- Azúcar

-- Pan Integral (40000000-0000-0000-0000-000000000003)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 0.280, 'kg'),  -- Harina integral
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 0.070, 'kg'),  -- Harina 000
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', 0.012, 'kg'),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', 0.007, 'kg');

-- Medialunas de Manteca (40000000-0000-0000-0000-000000000005)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 0.045, 'kg'),  -- Harina 0000
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000008', 0.018, 'kg'),  -- Manteca
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000006', 0.012, 'kg'),  -- Azúcar
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', 0.004, 'kg'),  -- Levadura
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000013', 0.500, 'unidad');  -- Huevos

-- Torta de Chocolate (40000000-0000-0000-0000-000000000006)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', 0.300, 'kg'),
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000015', 0.200, 'kg'),  -- Chocolate
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', 0.250, 'kg'),
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000008', 0.150, 'kg'),
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000013', 4.000, 'unidad');

-- Alfajores de Maicena (40000000-0000-0000-0000-000000000009)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000002', 0.025, 'kg'),
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000006', 0.015, 'kg'),
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000008', 0.010, 'kg'),
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000014', 0.020, 'kg');  -- Dulce de leche

-- Croissants (40000000-0000-0000-0000-000000000012)
INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000002', 0.060, 'kg'),
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000008', 0.025, 'kg'),
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000004', 0.005, 'kg'),
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000006', 0.008, 'kg');

-- 7. CLIENTES

INSERT INTO customers (id, name, phone, email, address, loyalty_points, is_active) VALUES
('50000000-0000-0000-0000-000000000001', 'Martín Rodríguez', '11-2345-6789', 'martin.rodriguez@email.com', 'Av. Rivadavia 1234, CABA', 450, true),
('50000000-0000-0000-0000-000000000002', 'Sofía Álvarez', '11-3456-7890', 'sofia.alvarez@email.com', 'Calle San Martín 567, Palermo', 820, true),
('50000000-0000-0000-0000-000000000003', 'Diego Morales', '11-4567-8901', NULL, 'Av. Corrientes 2345, CABA', 120, true),
('50000000-0000-0000-0000-000000000004', 'Valentina Castro', NULL, 'valentina.castro@email.com', 'Calle Belgrano 890, Recoleta', 650, true),
('50000000-0000-0000-0000-000000000005', 'Joaquín Benítez', '11-5678-9012', 'joaquin.benitez@email.com', 'Av. Santa Fe 3456, CABA', 0, true),
('50000000-0000-0000-0000-000000000006', 'Camila Pereyra', '11-6789-0123', 'camila.pereyra@email.com', 'Calle Thames 123, Palermo', 1250, true);

-- 8. COMPRAS DE INGREDIENTES (Últimos 30 días)

-- Compra 1: Harina (hace 25 días)
INSERT INTO ingredient_purchases (supplier_id, ingredient_id, user_id, quantity, unit, unit_price, total_amount, purchase_date, invoice_number) VALUES
('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 100.000, 'kg', 440.00, 44000.00, CURRENT_DATE - INTERVAL '25 days', 'FC-0001-00123456');

-- Compra 2: Ingredientes variados (hace 20 días)
INSERT INTO ingredient_purchases (supplier_id, ingredient_id, user_id, quantity, unit, unit_price, total_amount, purchase_date, invoice_number) VALUES
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 50.000, 'kg', 380.00, 19000.00, CURRENT_DATE - INTERVAL '20 days', 'FC-0002-00045678'),
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 30.000, 'kg', 120.00, 3600.00, CURRENT_DATE - INTERVAL '20 days', 'FC-0002-00045679'),
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000014', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 20.000, 'kg', 1500.00, 30000.00, CURRENT_DATE - INTERVAL '20 days', 'FC-0002-00045680');

-- Compra 3: Lácteos (hace 15 días)
INSERT INTO ingredient_purchases (supplier_id, ingredient_id, user_id, quantity, unit, unit_price, total_amount, purchase_date, invoice_number) VALUES
('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000010', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 50.000, 'litro', 420.00, 21000.00, CURRENT_DATE - INTERVAL '15 days', 'FC-0003-00012345'),
('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000011', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 15.000, 'litro', 980.00, 14700.00, CURRENT_DATE - INTERVAL '15 days', 'FC-0003-00012346'),
('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000012', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 10.000, 'kg', 3200.00, 32000.00, CURRENT_DATE - INTERVAL '15 days', 'FC-0003-00012347');

-- Compra 4: Reposición reciente (hace 5 días)
INSERT INTO ingredient_purchases (supplier_id, ingredient_id, user_id, quantity, unit, unit_price, total_amount, purchase_date, invoice_number) VALUES
('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 80.000, 'kg', 450.00, 36000.00, CURRENT_DATE - INTERVAL '5 days', 'FC-0001-00123499'),
('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 50.000, 'kg', 480.00, 24000.00, CURRENT_DATE - INTERVAL '5 days', 'FC-0001-00123500');

-- Compra 5: Huevos y otros (hace 3 días)
INSERT INTO ingredient_purchases (supplier_id, ingredient_id, user_id, quantity, unit, unit_price, total_amount, purchase_date, invoice_number) VALUES
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000013', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 360.000, 'unidad', 85.00, 30600.00, CURRENT_DATE - INTERVAL '3 days', 'FC-0002-00045789'),
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000015', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 10.000, 'kg', 3500.00, 35000.00, CURRENT_DATE - INTERVAL '3 days', 'FC-0002-00045790');

-- 9. PRODUCCIÓN (Últimos 7 días)

-- Día -6: Producción masiva de pan
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000001', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 50.000, 'unidad', CURRENT_DATE - INTERVAL '6 days', 'completado', 'Producción matutina'),
('40000000-0000-0000-0000-000000000002', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 40.000, 'unidad', CURRENT_DATE - INTERVAL '6 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000005', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 100.000, 'unidad', CURRENT_DATE - INTERVAL '6 days', 'completado', 'Medialunas para el día');

-- Día -5: Producción variada
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000001', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 45.000, 'unidad', CURRENT_DATE - INTERVAL '5 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000003', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 30.000, 'unidad', CURRENT_DATE - INTERVAL '5 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000009', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 100.000, 'unidad', CURRENT_DATE - INTERVAL '5 days', 'completado', 'Alfajores premium');

-- Día -4: Incluye merma
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000002', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 35.000, 'unidad', CURRENT_DATE - INTERVAL '4 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000012', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 50.000, 'unidad', CURRENT_DATE - INTERVAL '4 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000006', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 5.000, 'unidad', CURRENT_DATE - INTERVAL '4 days', 'descartado', 'Se quemó el horno. Merma total.');

-- Día -3: Producción normal
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000001', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 40.000, 'unidad', CURRENT_DATE - INTERVAL '3 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000005', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 80.000, 'unidad', CURRENT_DATE - INTERVAL '3 days', 'completado', NULL);

-- Día -2: Pastelería
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000006', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 5.000, 'unidad', CURRENT_DATE - INTERVAL '2 days', 'completado', 'Tortas para el fin de semana'),
('40000000-0000-0000-0000-000000000007', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 4.000, 'unidad', CURRENT_DATE - INTERVAL '2 days', 'completado', NULL),
('40000000-0000-0000-0000-000000000008', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 6.000, 'unidad', CURRENT_DATE - INTERVAL '2 days', 'completado', NULL);

-- Día -1: Producción reciente
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000001', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 50.000, 'unidad', CURRENT_DATE - INTERVAL '1 day', 'completado', NULL),
('40000000-0000-0000-0000-000000000002', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 30.000, 'unidad', CURRENT_DATE - INTERVAL '1 day', 'completado', NULL);

-- Hoy: En proceso
INSERT INTO production_batches (product_id, user_id, quantity_produced, unit, production_date, status, notes) VALUES
('40000000-0000-0000-0000-000000000012', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 60.000, 'unidad', CURRENT_DATE, 'en_proceso', 'Croissants en el horno');

-- 10. VENTAS (Últimos 5 días)

-- Venta 1: Cliente con puntos (hace 5 días)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90001', '50000000-0000-0000-0000-000000000002', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 4500.00, 0.00, 0.00, 4500.00, 'tarjeta_credito', 'completada', CURRENT_DATE - INTERVAL '5 days');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '5 days' LIMIT 1), '40000000-0000-0000-0000-000000000001', 3.000, 'unidad', 850.00, 2550.00),
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '5 days' LIMIT 1), '40000000-0000-0000-0000-000000000005', 6.000, 'unidad', 300.00, 1800.00),
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '5 days' LIMIT 1), '40000000-0000-0000-0000-000000000014', 1.000, 'unidad', 900.00, 900.00);

-- Venta 2: Anónima (hace 5 días)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90002', NULL, 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 2050.00, 0.00, 0.00, 2050.00, 'efectivo', 'completada', CURRENT_DATE - INTERVAL '5 days');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE customer_id IS NULL AND sale_date = CURRENT_DATE - INTERVAL '5 days' LIMIT 1), '40000000-0000-0000-0000-000000000002', 2.000, 'unidad', 950.00, 1900.00),
((SELECT id FROM sales WHERE customer_id IS NULL AND sale_date = CURRENT_DATE - INTERVAL '5 days' LIMIT 1), '40000000-0000-0000-0000-000000000014', 1.000, 'unidad', 900.00, 900.00);

-- Venta 3: Cliente VIP con uso de puntos (hace 4 días)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90003', '50000000-0000-0000-0000-000000000006', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 9200.00, 50.00, 0.00, 9150.00, 'transferencia', 'completada', CURRENT_DATE - INTERVAL '4 days');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE customer_id = '50000000-0000-0000-0000-000000000006' AND sale_date = CURRENT_DATE - INTERVAL '4 days' LIMIT 1), '40000000-0000-0000-0000-000000000007', 1.000, 'unidad', 9200.00, 9200.00);

-- Venta 4: Compra grande anónima (hace 3 días)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90004', NULL, 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 8950.00, 0.00, 0.00, 8950.00, 'tarjeta_debito', 'completada', CURRENT_DATE - INTERVAL '3 days');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '3 days' AND total_amount = 8950.00 LIMIT 1), '40000000-0000-0000-0000-000000000001', 5.000, 'unidad', 850.00, 4250.00),
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '3 days' AND total_amount = 8950.00 LIMIT 1), '40000000-0000-0000-0000-000000000005', 10.000, 'unidad', 300.00, 3000.00),
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '3 days' AND total_amount = 8950.00 LIMIT 1), '40000000-0000-0000-0000-000000000009', 4.000, 'unidad', 450.00, 1800.00);

-- Venta 5: Cliente registrado (hace 2 días)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90005', '50000000-0000-0000-0000-000000000001', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 3200.00, 0.00, 0.00, 3200.00, 'qr', 'completada', CURRENT_DATE - INTERVAL '2 days');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE customer_id = '50000000-0000-0000-0000-000000000001' AND sale_date = CURRENT_DATE - INTERVAL '2 days' LIMIT 1), '40000000-0000-0000-0000-000000000012', 4.000, 'unidad', 650.00, 2600.00),
((SELECT id FROM sales WHERE customer_id = '50000000-0000-0000-0000-000000000001' AND sale_date = CURRENT_DATE - INTERVAL '2 days' LIMIT 1), '40000000-0000-0000-0000-000000000015', 2.000, 'unidad', 1100.00, 2200.00);

-- Venta 6: CANCELADA (hace 2 días)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date, notes) VALUES
('VTA-2026-90006', '50000000-0000-0000-0000-000000000003', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 1700.00, 0.00, 0.00, 1700.00, 'efectivo', 'cancelada', CURRENT_DATE - INTERVAL '2 days', 'Cliente se arrepintió. Revertido.');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE status = 'cancelada' LIMIT 1), '40000000-0000-0000-0000-000000000002', 2.000, 'unidad', 950.00, 1900.00);

-- Venta 7: Compra de torta (ayer)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90007', '50000000-0000-0000-0000-000000000004', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 8500.00, 0.00, 0.00, 8500.00, 'tarjeta_credito', 'completada', CURRENT_DATE - INTERVAL '1 day');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE customer_id = '50000000-0000-0000-0000-000000000004' AND sale_date = CURRENT_DATE - INTERVAL '1 day' LIMIT 1), '40000000-0000-0000-0000-000000000006', 1.000, 'unidad', 8500.00, 8500.00);

-- Venta 8: Venta matutina (ayer)
INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, status, sale_date) VALUES
('VTA-2026-90008', NULL, 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 3850.00, 0.00, 0.00, 3850.00, 'efectivo', 'completada', CURRENT_DATE - INTERVAL '1 day');

INSERT INTO sale_items (sale_id, product_id, quantity, unit, unit_price, subtotal) VALUES
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '1 day' AND total_amount = 3850.00 LIMIT 1), '40000000-0000-0000-0000-000000000001', 3.000, 'unidad', 850.00, 2550.00),
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '1 day' AND total_amount = 3850.00 LIMIT 1), '40000000-0000-0000-0000-000000000013', 3.000, 'unidad', 350.00, 1050.00),
((SELECT id FROM sales WHERE sale_date = CURRENT_DATE - INTERVAL '1 day' AND total_amount = 3850.00 LIMIT 1), '40000000-0000-0000-0000-000000000014', 1.000, 'unidad', 900.00, 900.00);

-- 11. GASTOS OPERATIVOS

INSERT INTO expenses (user_id, category, description, amount, expense_date, invoice_number) VALUES
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'alquiler', 'Alquiler del local - Enero 2026', 280000.00, CURRENT_DATE - INTERVAL '28 days', NULL),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'servicios', 'Factura de luz - Edenor', 45000.00, CURRENT_DATE - INTERVAL '20 days', 'EDENOR-2026-01'),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'servicios', 'Factura de gas - Metrogas', 38000.00, CURRENT_DATE - INTERVAL '18 days', 'METRO-2026-01'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'salarios', 'Salario Enero 2026 - Roberto Silva (panadero)', 520000.00, CURRENT_DATE - INTERVAL '15 days', NULL),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'salarios', 'Salario Enero 2026 - María González (cajera)', 450000.00, CURRENT_DATE - INTERVAL '15 days', NULL),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'salarios', 'Salario Enero 2026 - Lucas Fernández (cajero)', 450000.00, CURRENT_DATE - INTERVAL '15 days', NULL),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'mantenimiento', 'Reparación de horno principal', 85000.00, CURRENT_DATE - INTERVAL '10 days', 'SERV-TECNICO-123'),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'marketing', 'Publicidad en redes sociales - Enero', 25000.00, CURRENT_DATE - INTERVAL '5 days', NULL),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'otros', 'Compra de bandejas y moldes nuevos', 18000.00, CURRENT_DATE - INTERVAL '3 days', 'FC-BAZAR-456');

-- FINALIZACIÓN

COMMIT;
