# Casos TDD — CHG-032

- `TDD-TC-142`: `validateSizeAssignments` permite asignar el mismo tamaño repartido en distintos lotes y rechaza `(tamaño, lote)` repetido, conservando rechazo de tamaño repetido sin lote.
- `TDD-TC-143`: `GET /api/almacen/solicitudes/:id/disponibilidad` devuelve el desglose `lotes` por `(tamano, lote)` además del agregado `tamanos`.
- `TDD-TC-144`: `POST /api/almacen/solicitudes/:id/asignaciones` valida disponibilidad por `(producto_id, tamano, lote)` y persiste `lote` en `cotizacion_reservas`.
- `TDD-TC-145`: `public/js/app.js` envía `producto_id` y `lote` en el payload de `asignaciones` y renderiza los controles por lote en `openWarehouseAssignment`.
