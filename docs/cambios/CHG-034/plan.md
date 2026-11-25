# Plan — CHG-034

1. Documentar el paquete `CHG-034` (`OBJ-022`, `PRD-FR-069`, `ADR-016`, `ADR-020`, `BDD-SC-138..140`, `TDD-TC-152..155`) en `docs/cambios/CHG-034/` y actualizar `docs/02-PRD.md`, `docs/04-BDD.md`, `docs/05-TDD.md`, `docs/06-matriz-trazabilidad.md` y `docs/09-registro-cambios.md`.
2. Crear pruebas BDD ejecutables (`features/chg034_almacen_asignacion_integral.feature` y `features/step_definitions/chg034.steps.js`) y pruebas unitarias TDD (`test/chg034_almacen_asignacion_integral.test.js`) y verificar que fallen en fase roja.
3. Implementar en `db.js`:
   - Asegurar `cotizacion_reservas`, columna `lote`, índice `uq_cotizacion_reserva_activa_detalle_tamano_lote` y backfill de `flujo_version` y `almacen_estado = 'PENDIENTE'` dentro de `ensureQuotationsSchema()`.
4. Implementar en `server.js`:
   - Permitir `GET /api/cotizaciones` al rol `Almacen` en el guard perimetral de `/api/cotizaciones` y normalizar `almacen_estado = 'PENDIENTE'` en solicitudes `CHG-025` `Autorizada` con `almacen_estado` nulo.
   - Resiliencia de esquema y soporte de lotes con o sin tamaño previo en `GET /api/almacen/solicitudes`, `GET /api/almacen/solicitudes/:id/disponibilidad` y `POST /api/almacen/solicitudes/:id/asignaciones`.
5. Implementar en `public/js/app.js` y `public/index.html`:
   - Carga resiliente del Canal de Ventas (`loadCRMBoardData`) y Tablero (`loadDashboardData`) para `Almacen`.
   - Selectores de tamaño y lote en `openWarehouseAssignment` y `addWarehouseAssignmentRow`, con consolidación de `(tamano, lote)` en el envío del formulario.
   - Actualización de versión de cache-busting en `public/index.html`.
6. Ejecutar lint, pruebas unitarias, BDD, contrato OpenAPI y cobertura, y abrir Pull Request.
