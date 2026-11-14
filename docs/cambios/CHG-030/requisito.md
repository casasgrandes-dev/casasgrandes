# Requisito — CHG-030

- ID de requisito: PRD-FR-065
- Objetivo: OBJ-022
- Cambio: CHG-030
- Decisión: ADR-016 (no requiere ADR nuevo)
- Estado: propuesta-implementada

## Enunciado

El modal "Detalle de Cotización" en la interfaz web de AgriSales Pro debe permitir a los roles `Administrador` y `Coordinador` emitir la decisión comercial (Autorizar y Rechazar con captura de motivo) para solicitudes `CHG-025` de condición `CREDITO` y `APARTADO`, así como registrar la doble confirmación independiente (Venta y Cobro) para propuestas de condición `CONTADO`, invocando directamente los endpoints de decisión transaccionales (`PUT /api/cotizaciones/:id/decision` y `PUT /api/cotizaciones/:id/confirmaciones-contado`) en lugar del endpoint de estatus legado. Asimismo, el tablero Kanban debe garantizar que el evento de clic en los botones de acción rápida de las tarjetas pendientes no dispare la apertura accidental del modal en dispositivos táctiles o móviles.

## Reglas

- `PRD-FR-065`. Decisión comercial y doble confirmación en el Detalle de Cotización:
  - En `public/js/app.js` (`showQuoteDetails`):
    - Si la cotización es `CHG-025` y su estatus es pendiente (`Pendiente`, `Pendiente Autorización` o `Borrador`):
      - Para condición `CREDITO` o `APARTADO`: si el usuario autenticado tiene rol `Administrador` o `Coordinador`, exponer el botón `Autorizar Cotización` (verde) y el botón `Rechazar` (rojo).
        - Al autorizar: confirmar la acción y enviar `PUT /api/cotizaciones/:id/decision` con `{ decision: 'AUTORIZAR' }`. Al responder con éxito (200), cerrar el modal y actualizar el tablero Kanban.
        - Al rechazar: solicitar el motivo mediante diálogo y enviar `PUT /api/cotizaciones/:id/decision` con `{ decision: 'RECHAZAR', motivo }`. Al responder con éxito (200), cerrar el modal y actualizar el tablero.
      - Para condición `CONTADO`: si el usuario es `Administrador` o `Coordinador`, exponer controles de confirmación independiente para `✓ Venta` y `✓ Cobro`, reflejando visualmente el estado actual (`quote.venta_confirmada`, `quote.cobro_confirmado`) y permitiendo confirmarlos individualmente mediante `PUT /api/cotizaciones/:id/confirmaciones-contado`.
    - Si la cotización pertenece al flujo legado (pre-CHG-025): mantener el comportamiento histórico para rol `Administrador` invocando `authorizeQuote()`.
    - Si el usuario tiene rol `Asesor`: los botones de decisión comercial y confirmación no deben ser visibles ni manipulables en el modal.
  - En `public/index.html`:
    - Incorporar los elementos requeridos en el pie del modal de detalle: `btn-reject-commercial-request`, `btn-confirm-cash-sale`, `btn-confirm-cash-payment`, manteniendo la coherencia de estilos y accesibilidad.
  - En `public/js/app.js` (`renderKanbanBoard`):
    - En la columna `Borrador` (prospectos/pendientes), el `click` de la tarjeta debe comprobar `if (e.target.closest('button') || e.target.closest('input')) return;` para evitar que pulsar botones de acción rápida en pantallas táctiles (Safari iPad) dispare simultáneamente la apertura del modal.

## Fuera de alcance

- Modificar contratos de API de bots (`/api/v1/bot`).
- Alterar las restricciones de Almacén (`PRD-FR-059`) o permitir asignación de semilla desde Cotizaciones.

## Criterios de aceptación

- `BDD-SC-126`, `BDD-SC-127` y `BDD-SC-128` en `docs/cambios/CHG-030/aceptacion.feature` y `features/chg030_decision_modal.feature`.
