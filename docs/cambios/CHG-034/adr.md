# Decisión arquitectónica — CHG-034

No requiere un ADR nuevo. Se rige por [`ADR-016`](../../03-SDD.md) y [`ADR-020`](../../adr/ADR-020.md), corrigiendo el acceso de lectura de `Almacen` a `GET /api/cotizaciones` para el Canal de Ventas, la resiliencia de esquema de `cotizacion_reservas` y la selección de tamaños y lotes en inventario.
