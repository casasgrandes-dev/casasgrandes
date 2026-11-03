# Plan — CHG-028

- Objetivo: OBJ-022
- Requisitos: PRD-FR-054, PRD-FR-056, PRD-FR-057, PRD-FR-063
- Decisión: ADR-016 (no aplica ADR nuevo)
- Escenarios: BDD-SC-119, BDD-SC-120
- Pruebas: TDD-TC-131, TDD-TC-132
- Gate de salida: CI verde y aprobación explícita del propietario para merge o despliegue

| Orden | Tarea | IDs | Evidencia esperada | Estado |
|---|---|---|---|---|
| 1 | Cerrar historia, requisito, ADR y paquete documental | CHG-028, PRD-FR-063 | Paquete en `docs/cambios/CHG-028` y actualización de `docs/02..09` | completed |
| 2 | Escribir Gherkin y casos TDD en rojo | BDD-SC-119, BDD-SC-120, TDD-TC-131, TDD-TC-132 | Fallo controlado en `npm run test:bdd` y `node --test` | completed |
| 3 | Implementar migración resiliente en `db.js`, autorrecuperación en `server.js` y limpieza de payload en `public/js/app.js` | SDD-CMP-048, SDD-DB-019, PRD-FR-063 | Pruebas focalizadas y BDD en verde | completed |
| 4 | Correr CI local completo | lint, suite, BDD, cobertura, contrato, dependencias | Salida real con código 0 | completed |
| 5 | Entregar cambios listos para revisión | CHG-028 | Evidencia en `docs/06-matriz-trazabilidad.md` (`EVD-024`) | completed |
