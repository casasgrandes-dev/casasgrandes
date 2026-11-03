# Registro de decisiones — CHG-028

| Fecha | ID | Decisión | Quién | Estado |
|---|---|---|---|---|
| 2026-11-03 | CHG-028 | Garantizar migración idempotente de `cotizaciones`/`cotizacion_detalles` (`ensureQuotationsSchema`), eliminar `NOT NULL` heredado en `temporada_id` con respaldo de temporada activa sin descuento y limpiar el payload de Cotizador fuera de `CONTADO` | agente, por solicitud del propietario | implementado-local |

## Aprobaciones que siguen abiertas

- Merge: aprobado explícitamente por el propietario (2026-11-03).
- Despliegue / push a `main`: aprobado explícitamente por el propietario (2026-11-03).

## Evidencia

- Comando: `npm run lint && npm test && npm run test:bdd && npm run test:contract && npm run lint:openapi && npm run test:coverage && npm run audit:deps`
- Resultado: registrado en `EVD-024` dentro de `docs/06-matriz-trazabilidad.md`.
