# Casos TDD — CHG-030

- Requisito: PRD-FR-065
- Objetivo: OBJ-022
- Escenarios cubiertos: BDD-SC-126, BDD-SC-127, BDD-SC-128

## Casos de prueba

### TDD-TC-135 — Exposición de botones de decisión comercial en Detalle de Cotización para Crédito y Apartado CHG-025
- **Objetivo**: Verificar que al abrir el modal "Detalle de Cotización" para una cotización `CHG-025` en estatus pendiente (`Pendiente`, `Borrador` o `Pendiente Autorización`) con condición `CREDITO` o `APARTADO`, si el rol es `Administrador` o `Coordinador`, se muestren los botones `btn-authorize-quote` y `btn-reject-commercial-request`, y se oculten si el rol es `Asesor`.
- **Aserciones**: Visibilidad (`inline-flex` o `inline-block`) de botones de autorizar y rechazar para Administrador y Coordinador; display `none` para Asesor.

### TDD-TC-136 — Ejecución de decisión comercial (Autorizar / Rechazar) desde el modal invocando `/api/cotizaciones/:id/decision`
- **Objetivo**: Asegurar que al hacer clic en "Autorizar" en el modal de detalle para una cotización CHG-025 se confirme y se invoque `PUT /api/cotizaciones/:id/decision` con `{ decision: 'AUTORIZAR' }`, cerrando el modal y refrescando el tablero; y al hacer clic en "Rechazar" se capture el motivo y se invoque `{ decision: 'RECHAZAR', motivo }`.
- **Aserciones**: Invocación al endpoint correcto (no `/status`), paso de payload válido y cierre de modal.

### TDD-TC-137 — Doble confirmación de Contado CHG-025 en el Detalle de Cotización
- **Objetivo**: Verificar que en propuestas `CONTADO` de CHG-025 se expongan en el modal los controles para confirmar Venta y Cobro de forma independiente para roles Administrador y Coordinador, reflejando el estado actual (`venta_confirmada`, `cobro_confirmado`) e invocando `PUT /api/cotizaciones/:id/confirmaciones-contado`.
- **Aserciones**: Presencia de botones en el modal, estado deshabilitado si ya fue confirmado, llamada al endpoint transaccional de confirmaciones.

### TDD-TC-138 — Aislamiento de eventos de clic en tarjeta Kanban para evitar colisión en dispositivos táctiles
- **Objetivo**: Comprobar que en la columna `Borrador` de `renderKanbanBoard()`, el manejador de clic de la tarjeta comprueba `e.target.closest('button')` o `e.target.closest('input')` para evitar abrir el modal al presionar los botones de acción rápida en la tarjeta.
- **Aserciones**: Filtrado de eventos de click originados en botones dentro de la tarjeta.
