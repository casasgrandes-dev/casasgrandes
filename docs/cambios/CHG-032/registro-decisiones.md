# Registro de decisiones — CHG-032

- 2026-11-17: Se identifica que `public/js/app.js` omitía `producto_id` en `asignaciones` (provocando HTTP 400 en todas las asignaciones desde la UI) y que `cotizacion_reservas` / `disponibilidad` / `validateSizeAssignments` no contemplaban `lote`. Se aprueba corregir el payload y habilitar asignación multi-lote por tamaño.
