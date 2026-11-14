# Plan — CHG-030

- Objetivo: OBJ-022
- Requisitos: PRD-FR-058, PRD-FR-065
- Decisión: ADR-016 (no aplica ADR nuevo)
- Escenarios: BDD-SC-126, BDD-SC-127, BDD-SC-128
- Pruebas: TDD-TC-135, TDD-TC-136, TDD-TC-137, TDD-TC-138
- Gate de salida: CI verde y aprobación explícita del propietario para merge o despliegue

| Orden | Tarea | IDs | Evidencia esperada | Estado |
|---|---|---|---|---|
| 1 | Cerrar historia, requisito, ADR y paquete documental | CHG-030, PRD-FR-065 | Paquete en `docs/cambios/CHG-030` y actualización de `docs/02..09` | completed |
| 2 | Escribir Gherkin y casos TDD en rojo | BDD-SC-126..128, TDD-TC-135..138 | Fallo controlado en `npm run test:bdd` y `node --test` | pending |
| 3 | Implementar elementos en `public/index.html` y lógica en `public/js/app.js` | SDD-CMP-048, PRD-FR-065 | Pruebas focalizadas y BDD en verde | pending |
| 4 | Correr CI local completo | lint, suite, BDD, cobertura, contrato, dependencias | Salida real con código 0 | pending |
| 5 | Entregar cambios listos para revisión en la rama | CHG-030 | Evidencia en `docs/06-matriz-trazabilidad.md` (`EVD-026`) | pending |
