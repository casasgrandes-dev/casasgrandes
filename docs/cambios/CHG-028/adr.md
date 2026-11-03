# ADR — CHG-028

No aplica un ADR nuevo.

## Justificación

CHG-028 corrige un defecto de persistencia y sincronización de estado entre esquemas PostgreSQL heredados (`cotizacion_detalles.temporada_id NOT NULL` y columnas aditivas de `CHG-025`) y el payload del Cotizador al alternar de `CONTADO` a `CREDITO` o `APARTADO`.

La arquitectura y las reglas comerciales siguen gobernadas íntegramente por:

- `ADR-003` (Transacciones explícitas con bloqueos `FOR UPDATE`).
- `ADR-007` (Atomicidad comercial completa en creación y edición de cotizaciones).
- `ADR-016` (Flujo comercial interno por condición de pago y reservas de inventario por tamaño).
