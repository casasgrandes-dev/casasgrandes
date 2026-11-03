# Requisito — CHG-028

- ID de requisito: PRD-FR-063
- Objetivo: OBJ-022
- Cambio: CHG-028
- Decisión: ADR-016 (no requiere ADR nuevo)
- Estado: implementado-local

## Enunciado

`POST /api/cotizaciones` debe persistir solicitudes de `CREDITO` y `APARTADO` bajo el contrato `CHG-025` con estatus `Pendiente`, garantizando en `db.js` y en tiempo de transacción la existencia de las columnas aditivas de `cotizaciones` y `cotizacion_detalles`, eliminando o respaldando la restricción `NOT NULL` heredada en `cotizacion_detalles.temporada_id`, e impidiendo que el frontend envíe residuos de descuento o precio propuesto cuando la condición de pago no es `CONTADO`.

## Reglas

- `PRD-FR-063`. Resiliencia de persistencia y contrato de payload en `CREDITO` y `APARTADO`:
  - `db.ensureQuotationsSchema()` asegura de forma idempotente todas las columnas de `cotizaciones` y `cotizacion_detalles` requeridas por `CHG-009`..`CHG-025` y ejecuta `ALTER TABLE cotizacion_detalles ALTER COLUMN temporada_id DROP NOT NULL`.
  - Si `initSchema()` falla transitoriamente durante el arranque, libera `initSchemaPromise = null` para permitir reintentos posteriores.
  - En `POST /api/cotizaciones`, cuando `condiciones_pago` es `CREDITO` o `APARTADO`, el servidor ignora cualquier `descuento_aplicado` residual y conserva la temporada activa como referencia técnica si el esquema subyacente exige `temporada_id NOT NULL`, sin aplicar descuento de temporada.
  - Si durante la transacción de `POST /api/cotizaciones` PostgreSQL devuelve `42703` (`undefined_column`) o `23502` (`not_null_violation` en `temporada_id`), el servidor invoca `db.ensureQuotationsSchema()` y reintenta la transacción una vez de forma transparente.
  - En `public/js/app.js`, `getQuotePayload()` envía `descuento_aplicado: 0` y `precio_propuesto: null` siempre que `condiciones_pago !== 'CONTADO'`, y `debouncedLiveCalculation()` restablece `slider.max = 0` cuando la condición no permite descuento de asesor.

## Fuera de alcance

- Cambios al contrato OpenAPI de bots (`docs/api/bot-v1.yaml`).
- Modificaciones a las reglas de asignación de calibres en Almacén (`PRD-FR-059`).

## Criterios de aceptación

- `BDD-SC-119` y `BDD-SC-120` en `docs/cambios/CHG-028/aceptacion.feature`, `docs/04-BDD.md` y ejecutables en `features/chg025_contratos.feature`.
