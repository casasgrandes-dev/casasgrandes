# Plan — CHG-031

1. Documentar paquete `CHG-031` (`PRD-FR-066`, `BDD-SC-129..130`, `TDD-TC-139..141`) y registrar en `docs/`.
2. Agregar escenario BDD ejecutable en `features/chg031_decision_resilience.feature` y pasos en `features/step_definitions/chg031.steps.js`.
3. Agregar pruebas unitarias en `test/chg031_decision_resilience.test.js` y verificar fase roja antes de modificar `server.js`.
4. Implementar adaptación dinámica de columnas y reintento con `ensureQuotationsSchema()` en `PUT /api/cotizaciones/:id/decision` y `PUT /api/cotizaciones/:id/confirmaciones-contado` en `server.js`.
5. Ejecutar `npm run lint`, `npm test`, `npm run test:bdd`, `npm run test:contract`, `npm run lint:openapi`, `npm run test:coverage` y `npm run audit:deps` y registrar evidencia `EVD-027`.
