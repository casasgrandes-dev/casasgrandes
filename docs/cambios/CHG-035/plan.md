# Plan — CHG-035

1. Documentar `ADR-021` y el paquete `CHG-035` (`OBJ-022`, `PRD-FR-070`, `BDD-SC-141..144`, `TDD-TC-156..159`) en `docs/`.
2. Agregar escenarios BDD ejecutables (`features/chg035_asignacion_previa_entrega.feature` y `features/step_definitions/chg035.steps.js`) y casos TDD (`test/chg035_asignacion_previa_entrega.test.js`) y verificar fase roja.
3. Implementar en `server.js`:
   - Permitir `Almacen` y `Administrador` en `/api/almacen/solicitudes`, `/disponibilidad` y `/asignaciones`.
   - Adjuntar `reservas` activas en `GET /api/cotizaciones` únicamente para `Almacen` y `Administrador`.
   - Permitir al rol `Almacen` la transición `PUT /api/cotizaciones/:id/status` únicamente hacia `Entregado` sobre solicitudes `CHG-025` con `almacen_estado = 'RESERVADA'`.
4. Implementar en `public/index.html`, `public/js/app.js` y `public/js/security.js`:
   - Habilitar `#tab-solicitudes`, `loadWarehouseRequests` y `"📦 Asignar tamaños"` para `Almacen` y `Administrador`.
   - Mostrar reservas previamente asignadas en *Detalle de Cotización* y tarjetas `RESERVADA`.
   - Agregar botón visible `"🚚 Marcar como Entregado"` (`deliverReservedQuote`) en Canal de Ventas (escritorio y móvil) y *Detalle de Cotización* para `Almacen`, `Administrador` y `Coordinador` cuando `almacen_estado === 'RESERVADA'`.
   - Actualizar versión de assets en `public/index.html`.
5. Alinear pruebas previas afectadas por `ADR-021` (`CHG-029`/`CHG-033`) y ejecutar suite completa (`lint`, `test:bdd`, `test:contract`, `lint:openapi`, `test:coverage`).
