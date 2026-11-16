# Decisión arquitectónica — CHG-031

No requiere ADR nuevo. Extiende la resiliencia de esquema introducida en `CHG-028` (`POST /api/cotizaciones`) a los endpoints transaccionales de decisión comercial (`PUT /api/cotizaciones/:id/decision` y `PUT /api/cotizaciones/:id/confirmaciones-contado`) bajo `ADR-016`.
