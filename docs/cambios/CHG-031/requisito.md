# Requisito — CHG-031

- ID de requisito: PRD-FR-066
- Objetivo: OBJ-022
- Cambio: CHG-031
- Decisión: ADR-016 (no requiere ADR nuevo)
- Estado: propuesta

## Enunciado

`PUT /api/cotizaciones/:id/decision` y `PUT /api/cotizaciones/:id/confirmaciones-contado` deben tolerar esquemas PostgreSQL donde alguna columna aditiva de `CHG-025` en `cotizaciones` (`decision_por_id`, `decision_en`, `motivo_rechazo`, `almacen_estado`, `venta_confirmada_en`, `cobro_confirmado_en`) aún no exista (código PostgreSQL `42703` o error de columna inexistente), ejecutando `db.ensureQuotationsSchema()` en el primer reintento y adaptando dinámicamente la sentencia `UPDATE cotizaciones` a las columnas disponibles sin devolver `500` `"No fue posible registrar la decisión."`.

## Fuera de alcance

- Modificar permisos de roles (`Administrador` y `Coordinador` siguen siendo los únicos autorizados).
- Modificar contratos del API de bots (`/api/v1/bot`).
- Modificar el flujo de Almacén o las reglas de precios.

## Criterios de aceptación

- `BDD-SC-129` y `BDD-SC-130` en `docs/cambios/CHG-031/aceptacion.feature` y `features/chg031_decision_resilience.feature`.
