# Historia de usuario — CHG-031

- Como: Administrador o Coordinador en el Canal de Ventas
- Quiero: Poder autorizar o rechazar solicitudes de Crédito/Apartado y confirmar Venta/Cobro en Contado sin errores 500 por columnas aditivas ausentes en `cotizaciones`
- Para: Registrar decisiones comerciales de forma confiable en entornos con esquemas heredados o permisos DDL restringidos

## Criterio de cierre

- `PUT /api/cotizaciones/:id/decision` autoriza o rechaza una solicitud `CHG-025` aun cuando `cotizaciones` omita columnas aditivas (`decision_en`, `decision_por_id`, `motivo_rechazo`, `almacen_estado`), recuperando el esquema con `ensureQuotationsSchema()` o adaptando el `UPDATE` a las columnas disponibles.
- `PUT /api/cotizaciones/:id/confirmaciones-contado` aplica la misma resiliencia ante ausencia de columnas aditivas (`venta_confirmada_en`, `cobro_confirmado_en`, `almacen_estado`).
