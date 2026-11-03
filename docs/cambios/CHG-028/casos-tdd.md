# Casos TDD — CHG-028

## TDD-TC-131 — Creación HTTP y autorrecuperación de esquema en `POST /api/cotizaciones` para `CREDITO` y `APARTADO`

- Cubre: BDD-SC-119, BDD-SC-120, PRD-FR-054, PRD-FR-056, PRD-FR-057, PRD-FR-063
- Nivel: HTTP y unitario de esquema
- Archivo: `test/chg025_internal_proposals_reservations.test.js`
- Fixture: datos ficticios (`asesor.chg025@example.test`, `Productor Demo`). Prohibido leer CSV de la raíz.
- Acción:
  1. Verificar que `db.ensureQuotationsSchema` existe, asegura las columnas de `cotizaciones` y `cotizacion_detalles` y ejecuta `ALTER TABLE cotizacion_detalles ALTER COLUMN temporada_id DROP NOT NULL`.
  2. Enviar `POST /api/cotizaciones` con `condiciones_pago: 'CREDITO'` e `items` con descuento residual manipulado/redondeado, verificando respuesta `201`, `total_mxn = precio_lleno * 1.08 * cantidad`, `estatus = 'Pendiente'` y `flujo_version = 'CHG-025'`.
  3. Enviar `POST /api/cotizaciones` con `condiciones_pago: 'APARTADO'` simulando un primer fallo PostgreSQL `42703` / `23502` sobre `cotizacion_detalles`, verificando que el endpoint invoca `db.ensureQuotationsSchema()`, reintenta la transacción una vez y responde `201` con `total_mxn = 0` y `estatus = 'Pendiente'`.
- Aserciones: códigos 201, importes exactos, reintento único tras `ensureQuotationsSchema` y compatibilidad de `temporada_id`.
- Rojo esperado antes de implementar: `db.ensureQuotationsSchema` no existe y `POST /api/cotizaciones` devuelve `500 { error: 'Failed to create quotation' }` ante `42703` o `23502` en `temporada_id`.
- Estado: passed-local

## TDD-TC-132 — Saneamiento de payload y slider en Cotizador al cambiar a `CREDITO` o `APARTADO`

- Cubre: BDD-SC-119, BDD-SC-120, PRD-FR-054, PRD-FR-063
- Nivel: unitario / contrato frontend
- Archivo: `test/chg025_internal_proposals_reservations.test.js`
- Fixture: inspección determinista de `public/js/app.js` y `public/index.html`.
- Acción: verificar `getQuotePayload()` y `debouncedLiveCalculation()` cuando `condiciones_pago !== 'CONTADO'`.
- Aserciones:
  1. En `getQuotePayload()`, cuando `condiciones_pago !== 'CONTADO'`, `descuento_aplicado` es `0` y `precio_propuesto` es `null` sin arrastrar diferencias de redondeo de centavos ni `slider.max` previo de `CONTADO`.
  2. En `debouncedLiveCalculation()`, la rama sin descuento de asesor (`!hasAdvisorDiscount`) restablece `slider.max = 0` además de `slider.value = 0` y `slider.disabled = true`.
  3. `public/index.html` actualiza la versión de `js/app.js` para invalidar caché del navegador.
- Rojo esperado antes de implementar: `getQuotePayload()` calcula `rawAdd` aun fuera de `CONTADO` y `debouncedLiveCalculation()` no reinicia `slider.max = 0`.
- Estado: passed-local

## Comandos

```bash
node --test test/chg025_internal_proposals_reservations.test.js
npm run test:bdd
npm test
```
