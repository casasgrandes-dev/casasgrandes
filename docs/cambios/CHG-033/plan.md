# Plan — CHG-033

1. Documentar paquete `CHG-033` (`OBJ-022`, `PRD-FR-068`, `ADR-016`, `ADR-020`, `BDD-SC-134..137`, `TDD-TC-146..151`) en `docs/cambios/CHG-033/`, `docs/adr/ADR-020.md` y documentos maestros en `docs/`.
2. Agregar escenarios BDD ejecutables (`features/chg033_*.feature` y pasos en `features/step_definitions/`) y casos TDD (`test/chg033_*.test.js`) en fase roja antes de implementar.
3. Implementar en `server.js`:
   - Promoción atómica a `estatus = 'Vendido'` y `almacen_estado = 'RESERVADA'` en `POST /api/almacen/solicitudes/:id/asignaciones` para solicitudes `CHG-025` en `Autorizada` (`CREDITO` / `APARTADO`).
   - Cálculo de `reservado` y `disponible` en `GET /api/almacen/existencias`.
   - Reversión desde `Entregado` a `Vendido` (con `almacen_estado = 'RESERVADA'` y reserva `ACTIVA`) en `PUT /api/cotizaciones/:id/status`.
4. Implementar en `public/js/app.js` y `public/index.html`:
   - Botón `"Asignar tamaños"` exclusivo de `Almacen` en tarjetas de `Cotizado (Autorizada)` (`renderKanbanBoard`) y en `Detalle de Cotización` (`showQuoteDetails`), abriendo `openWarehouseAssignment` aunque no se haya visitado la pestaña de Almacén.
   - Renderizado de `reservado` y `disponible` en `#stock-tbody`.
5. Ejecutar suite completa (`npm run lint`, `npm test`, `npm run test:bdd`, `npm run test:coverage`, etc.) y registrar evidencia.
