# Requisito — CHG-035

- ID de requisito: `PRD-FR-070`
- Objetivo: `OBJ-022`
- Cambio: `CHG-035`
- Decisiones: `ADR-016`, `ADR-020`, `ADR-021`
- Estado: en-progreso

## Enunciado

1. `GET /api/almacen/solicitudes`, `GET /api/almacen/solicitudes/:id/disponibilidad` y `POST /api/almacen/solicitudes/:id/asignaciones` deben permitir acceso a los roles `Almacen` y `Administrador`, rechazando con `403` a `Coordinador`, `Asesor`, `Director` y `Observador`.
2. `GET /api/cotizaciones` debe adjuntar el arreglo `reservas` activas (tamaño, lote, cantidad) únicamente para `Almacen` y `Administrador`, ocultándolo al resto de roles.
3. `PUT /api/cotizaciones/:id/status` debe permitir al rol `Almacen` ejecutar exclusivamente la transición hacia `estatus = 'Entregado'` sobre solicitudes `CHG-025` en estado `Autorizada` o `Vendido` con `almacen_estado = 'RESERVADA'`, manteniendo `403` para `Almacen` en cancelaciones, reversiones o cotizaciones `LEGACY`, y `409` si se intenta entregar una solicitud `PENDIENTE` sin reservas activas.
4. La interfaz (`public/index.html`, `public/js/app.js`, `public/js/security.js`) debe:
   - Mostrar `#tab-solicitudes` y el botón `"📦 Asignar tamaños"` (Canal de Ventas y *Detalle de Cotización*) para `Almacen` y `Administrador`.
   - Mostrar el resumen de tamaños y lotes reservados en *Detalle de Cotización* y tarjetas `RESERVADA` para `Almacen` y `Administrador`.
   - Mostrar el botón `"🚚 Marcar como Entregado"` (visible en escritorio y móvil, en tarjeta Kanban y *Detalle de Cotización*) únicamente cuando `almacen_estado === 'RESERVADA'` y el usuario sea `Almacen`, `Administrador` o `Coordinador`.

## Fuera de alcance

- Permitir entregar sin asignación previa (`409` obligatorio).
- Modificar el contrato externo del API de bots (`/api/v1/bot`).
- Habilitar asignación o entrega para `Asesor` u `Observador`.
