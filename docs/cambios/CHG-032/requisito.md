# Requisito — CHG-032

- ID de requisito: PRD-FR-067
- Objetivo: OBJ-022
- Cambio: CHG-032
- Decisión: ADR-016 (no requiere ADR nuevo)
- Estado: propuesta

## Enunciado

1. El modal de asignación de Almacén (`public/js/app.js`) debe enviar `producto_id` (y `lote` cuando aplique) en cada elemento de `asignaciones` al invocar `POST /api/almacen/solicitudes/:id/asignaciones`.
2. `GET /api/almacen/solicitudes/:id/disponibilidad` debe devolver tanto el agregado por tamaño (`tamanos`) como el desglose disponible por tamaño y lote (`lotes`), restando reservas activas.
3. `cotizacion_reservas`, `validateSizeAssignments` y `POST /api/almacen/solicitudes/:id/asignaciones` deben permitir dividir una misma partida y un mismo tamaño entre múltiples lotes distintos, validando disponibilidad por `(producto_id, tamano, lote)` y conservando compatibilidad con asignaciones sin lote.
4. `PUT /api/cotizaciones/:id/status` al transicionar a `Entregado` o revertir desde `Entregado` debe propagar `lote` de cada reserva hacia `almacen_movimientos`.

## Fuera de alcance

- Modificar permisos de roles (Almacén sigue siendo el único rol para `Solicitudes de Almacén`).
- Modificar el API de bots (`/api/v1/bot`).
