# Registro de decisiones — CHG-031

- 2026-11-16: Se confirma que el error `"No fue posible registrar la decisión."` en producción proviene del bloque `catch` (`500`) de `PUT /api/cotizaciones/:id/decision`, no de permisos, roles ni tiempos. Se aprueba aplicar adaptación dinámica de columnas y reintento con `ensureQuotationsSchema()` en `PUT /api/cotizaciones/:id/decision` y `PUT /api/cotizaciones/:id/confirmaciones-contado`.
