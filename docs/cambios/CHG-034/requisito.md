# Requisito — CHG-034

- ID de requisito: `PRD-FR-069`
- Objetivo: `OBJ-022`
- Cambio: `CHG-034`
- Decisiones: `ADR-016`, `ADR-020` (no requiere ADR nuevo)
- Estado: en-progreso

## Enunciado

1. `GET /api/cotizaciones` debe permitir acceso de solo lectura al rol `Almacen` para que el Canal de Ventas (`loadCRMBoardData`) y el modal `Detalle de Cotización` (`showQuoteDetails`) carguen las solicitudes sin recibir HTTP `403`, manteniendo bloqueadas con `403` todas las rutas de creación, edición, decisión o eliminación comercial en `/api/cotizaciones/*` para `Almacen`. En el frontend, `loadCRMBoardData()` no debe fallar para `Almacen` por las rutas comerciales `/api/clientes` ni `/api/prospectos`.
2. `db.ensureQuotationsSchema()` debe garantizar de forma idempotente la tabla `cotizacion_reservas`, su columna `lote`, la eliminación del índice antiguo `uq_cotizacion_reserva_activa_detalle_tamano`, la creación del índice `uq_cotizacion_reserva_activa_detalle_tamano_lote` y el backfill de `flujo_version = 'CHG-025'` y `almacen_estado = 'PENDIENTE'` en solicitudes ya autorizadas cuyo `almacen_estado` haya quedado nulo por esquemas previos.
3. `GET /api/almacen/solicitudes`, `GET /api/almacen/solicitudes/:id/disponibilidad` y `POST /api/almacen/solicitudes/:id/asignaciones` deben autorrecuperar el esquema ante errores `42703`/`42P01`, reconocer solicitudes autorizadas con `almacen_estado` nulo como `PENDIENTE`, preservar siempre el desglose de lotes de `almacen_movimientos` (incluyendo lotes registrados con o sin tamaño previo y el catálogo de tamaños del producto `tamanos_catalogo`) y validar disponibilidad por `(producto_id, tamano, lote)` con normalización `BTRIM`.
4. El modal `#warehouse-assignment-modal` (`openWarehouseAssignment` en `public/js/app.js`) debe permitir al almacenista seleccionar tamaños y lotes tanto sobre cada lote disponible (incluyendo selector de tamaño cuando un lote en inventario no tenga calibre preasignado) como agregando renglones mediante selectores de Tamaño y Lote (`addWarehouseAssignmentRow`), consolidando cantidades y actualizando la versión de assets en `public/index.html`.

## Fuera de alcance

- Modificar la regla de salida física de `ADR-016` y `ADR-020` (la salida en `almacen_movimientos` ocurre al pasar a `Entregado`).
- Habilitar la asignación de almacén para roles distintos de `Almacen`.
- Modificar el contrato externo del API de bots (`/api/v1/bot`).
