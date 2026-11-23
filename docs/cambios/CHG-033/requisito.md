# Requisito — CHG-033

- ID de requisito: `PRD-FR-068`
- Objetivo: `OBJ-022`
- Cambio: `CHG-033`
- Decisiones: `ADR-016`, `ADR-020`
- Estado: en-progreso

## Enunciado

1. En el Canal de Ventas (`renderKanbanBoard`) y en el modal `Detalle de Cotización` (`showQuoteDetails`), las solicitudes `CHG-025` de condición `CREDITO` o `APARTADO` en `estatus = 'Autorizada'` pendientes de asignación (`almacen_estado = 'PENDIENTE'`) deben mostrar el botón `"Asignar tamaños"` exclusivamente para el rol `Almacen` (oculto para `Administrador`, `Coordinador`, `Asesor` y `Observador`), permitiendo abrir el flujo de asignación multi-tamaño y multi-lote sin exigir navegar manualmente a la pestaña de Almacén.
2. En `POST /api/almacen/solicitudes/:id/asignaciones`, al confirmar asignaciones sobre una solicitud `CHG-025` en `estatus = 'Autorizada'` (`CREDITO` o `APARTADO`), el servidor debe actualizar atómicamente en la misma transacción `almacen_estado = 'RESERVADA'` y `estatus = 'Vendido'`, conservando la creación de reservas `ACTIVA` en `cotizacion_reservas` sin generar salida física en `almacen_movimientos` (`ADR-016`, `ADR-020`).
3. Al revertir una entrega en `PUT /api/cotizaciones/:id/status` (`Entregado` -> paso anterior), las solicitudes `CHG-025` regresan a `estatus = 'Vendido'` con `almacen_estado = 'RESERVADA'` y sus reservas reactivadas en estado `ACTIVA`.
4. `GET /api/almacen/existencias` debe incluir por producto los campos `reservado` (suma de `cotizacion_reservas.cantidad` con `estado = 'ACTIVA'`) y `disponible` (`existencias - reservado`), y `#stock-tbody` en `public/js/app.js` debe renderizar tanto `reservado` como `disponible` además de las existencias físicas para que el descuento de la reserva sea visible de inmediato.

## Fuera de alcance

- Modificar la regla de salida física de `ADR-016` (los movimientos en `almacen_movimientos` continúan registrándose al pasar a `Entregado`).
- Habilitar el botón `"Asignar tamaños"` o `POST /api/almacen/solicitudes/:id/asignaciones` para roles distintos de `Almacen`.
- Modificar el contrato externo del API de bots (`/api/v1/bot`).
