# Casos TDD — CHG-033

- `TDD-TC-146`: `POST /api/almacen/solicitudes/:id/asignaciones` promueve atómicamente una solicitud `CHG-025` en `estatus = 'Autorizada'` (`CREDITO` o `APARTADO`) a `estatus = 'Vendido'` y `almacen_estado = 'RESERVADA'`, creando reservas `ACTIVA` sin generar movimientos físicos en `almacen_movimientos`.
- `TDD-TC-147`: `GET /api/almacen/existencias` calcula y expone `reservado` (suma de `cotizacion_reservas` en estado `'ACTIVA'`) y `disponible` (`existencias - reservado`) por producto.
- `TDD-TC-148`: `#stock-tbody` en `public/js/app.js` renderiza las columnas/indicadores de `reservado` y `disponible` además de `existencias` físicas tras consultar `/api/almacen/existencias`.
- `TDD-TC-149`: `renderKanbanBoard()` en `public/js/app.js` muestra el botón `"Asignar tamaños"` en las tarjetas de `Cotizado (Autorizada)` (`CREDITO` / `APARTADO` con `almacen_estado = 'PENDIENTE'`) únicamente cuando `user.nivel_rol === 'Almacen'` y abre el flujo de asignación sin requerir visita previa a la pestaña de Almacén.
- `TDD-TC-150`: `showQuoteDetails()` en `public/js/app.js` muestra el botón `"Asignar tamaños"` en el modal `Detalle de Cotización` para solicitudes `CHG-025` autorizadas pendientes de asignación exclusivamente para el rol `Almacen`, ocultándolo para `Administrador`, `Coordinador`, `Asesor` y `Observador`.
- `TDD-TC-151`: `PUT /api/cotizaciones/:id/status` al revertir una solicitud `CHG-025` desde `Entregado` al paso anterior la devuelve a `estatus = 'Vendido'` con `almacen_estado = 'RESERVADA'` y reserva reactivada en `ACTIVA`.
