# Casos TDD — CHG-031

- `TDD-TC-139`: `PUT /api/cotizaciones/:id/decision` (AUTORIZAR y RECHAZAR) recupera esquema y adapta el `UPDATE` cuando falta una columna aditiva (`decision_por_id` / `almacen_estado`, error PostgreSQL `42703`), devolviendo `200`.
- `TDD-TC-140`: `PUT /api/cotizaciones/:id/confirmaciones-contado` adapta el `UPDATE` cuando falta una columna aditiva (`venta_confirmada_en` / `cobro_confirmado_en`, error PostgreSQL `42703`), devolviendo `200`.
- `TDD-TC-141`: Ante errores no relacionados con esquema (por ejemplo fallo de conexión), `PUT /api/cotizaciones/:id/decision` no reintenta indefinidamente y conserva respuesta `500`.
