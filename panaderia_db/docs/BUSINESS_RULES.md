# Reglas de Negocio — App Panadería SaaS

## Entidades Principales

### 1. **Productos y Categorías**
- **Categorías**: Organización lógica (Panadería, Pastelería, Galletas, Bebidas).
- **Productos**: Artículos finales que se venden al cliente.
  - Cada producto tiene precio, stock actual y alerta de stock mínimo.
  - Los productos pueden estar activos/inactivos (para temporadas o descontinuados).
  - Unidad de medida flexible: unidad, kg, docena, etc.

### 2. **Ingredientes y Recetas**
- **Ingredientes**: Materias primas (harina, azúcar, levadura, huevos).
  - Control de stock y costo unitario.
  - Alerta de stock mínimo para reposición.
- **Recetas**: Tabla intermedia que define **qué ingredientes y en qué cantidad** lleva cada producto.
  - Ejemplo: "Baguette necesita 0.5kg de Harina 000, 10g de levadura, 5g de sal".
  - Esto permite calcular el **costo de producción** de cada producto.

### 3. **Proveedores y Compras**
- **Proveedores**: Empresas que suministran ingredientes.
  - Datos de contacto, CUIT/RFC, estado activo/inactivo.
- **Compras de Ingredientes**: Registro de cada compra.
  - Incrementa el stock de ingredientes.
  - Actualiza el costo unitario (puede variar según factura).
  - Guarda número de factura para auditoría.

### 4. **Clientes y Programa de Fidelidad**
- **Clientes**: Opcionalmente registrados para programa de puntos.
  - Ventas anónimas permitidas (`customer_id` NULL).
  - Acumulación de puntos por compra (a definir: 1 punto por cada $100).

### 5. **Ventas (Punto de Venta)**
- **Ventas**: Transacción completa.
  - Generación automática de número de venta (VTA-2026-00001).
  - Soporte para descuentos (por promoción o puntos canjeados).
  - Método de pago: efectivo, tarjeta, transferencia.
  - Estado: completada o cancelada.
- **Items de Venta**: Detalle de productos vendidos.
  - Guarda el precio al momento de la venta (histórico).
  - Al confirmar venta: **descuenta stock de productos**.

### 6. **Producción Diaria**
- **Batches de Producción**: Registro de cuánto se hornea cada día.
  - Fecha de producción, cantidad, panadero responsable.
  - Estado: en_proceso, completado, descartado (por merma).
  - Costo de ingredientes (calculado según receta).
  - Al completar producción: **incrementa stock de productos**.
  - Opcionalmente: **descuenta stock de ingredientes** según receta.

### 7. **Gastos Operativos**
- Registro de gastos: alquiler, servicios, salarios, mantenimiento.
- Asociado a un usuario que lo registra.
- Categorización para reportes financieros.

### 8. **Usuarios (Empleados)**
- Roles: `admin`, `cajero`, `panadero`, `contador`.
- Control de acceso basado en roles (RBAC).
- Estado activo/inactivo (despidos o licencias).

---

## Reglas de Negocio Críticas

### RN-001: Stock de Productos
**Regla**: Al confirmar una venta, el stock de cada producto vendido debe decrementarse automáticamente.

**Casos Borde**:
- ¿Qué pasa si se intenta vender un producto sin stock suficiente?
  - **Solución**: Trigger o validación en aplicación que rechace la venta.
  - **Alternativa**: Permitir stock negativo para productos bajo pedido (parámetro configurable).

### RN-002: Stock de Ingredientes
**Regla**: Al completar un batch de producción, el stock de ingredientes debe decrementarse según la receta.

**Ejemplo**:
- Producción de 50 baguettes.
- Receta: 1 baguette = 0.5kg harina, 10g levadura.
- Descuento: 25kg harina, 500g levadura.

**Casos Borde**:
- ¿Qué pasa si no hay suficientes ingredientes?
  - **Solución**: No permitir completar el batch si faltan ingredientes.
  - Mostrar alerta de faltantes.

### RN-003: Compras de Ingredientes
**Regla**: Al registrar una compra, el stock de ingredientes aumenta y se actualiza el costo unitario.

**Cálculo de Costo Promedio Ponderado**:
```
nuevo_costo = (stock_anterior * costo_anterior + cantidad_comprada * precio_compra) / (stock_anterior + cantidad_comprada)
```

### RN-004: Precios Históricos
**Regla**: Los precios de productos pueden cambiar, pero las ventas pasadas deben conservar el precio al momento de la venta.

**Implementación**:
- `sale_items.unit_price` guarda el precio histórico.
- No usar FK directa a `products.price`.

### RN-005: Soft Deletes para Productos e Ingredientes
**Regla**: No eliminar físicamente productos o ingredientes que tengan ventas o recetas asociadas.

**Implementación**:
- Usar columna `is_active` en lugar de DELETE.
- Constraint en `products`: no permitir desactivar si tiene stock > 0 (opcional).

### RN-006: Validación de Ventas Canceladas
**Regla**: Si una venta se cancela, el stock de productos debe revertirse.

**Implementación**:
- Trigger que ejecute un `UPDATE products SET stock_quantity = stock_quantity + canceled_quantity`.
- Validación: solo se puede cancelar una venta el mismo día (política de negocio).

### RN-007: Programa de Fidelidad
**Regla**: Los clientes acumulan 1 punto por cada $10 de compra (configurable).

**Redención**:
- 100 puntos = $10 de descuento (configurable).
- Al aplicar descuento, decrementar puntos del cliente.

### RN-008: Control de Merma
**Regla**: La producción puede marcarse como "descartado" (pan quemado, vencido).

**Impacto**:
- No incrementa stock de productos.
- Sí decrementa ingredientes (costo perdido).
- Reportes de merma para análisis.

### RN-009: Usuarios y Roles
**Regla**: Solo usuarios con rol `admin` pueden:
- Crear/editar productos, ingredientes, proveedores.
- Acceder a reportes financieros.

Cajeros:
- Solo pueden registrar ventas.

Panaderos:
- Solo pueden registrar producción.

### RN-010: Numeración de Ventas
**Regla**: Generar números de venta secuenciales únicos: `VTA-2026-00001`.

**Implementación**:
- Secuencia de PostgreSQL o función que calcule el siguiente número.
- Constraint `UNIQUE` en `sales.sale_number`.

---

## Resumen de Entidades (12)

| Entidad | Propósito |
|---------|-----------|
| `categories` | Clasificación de productos |
| `products` | Productos finales de venta |
| `ingredients` | Materias primas |
| `recipes` | Composición de productos |
| `suppliers` | Proveedores de ingredientes |
| `ingredient_purchases` | Compras de insumos |
| `customers` | Clientes con fidelización |
| `sales` | Ventas (cabecera) |
| `sale_items` | Detalle de ventas |
| `production_batches` | Producción diaria |
| `expenses` | Gastos operativos |
| `users` | Empleados del sistema |

---
