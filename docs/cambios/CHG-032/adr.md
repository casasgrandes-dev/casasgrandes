# Decisión arquitectónica — CHG-032

No requiere ADR nuevo. Extiende `cotizacion_reservas` y el flujo de reservas `CHG-025` bajo `ADR-016` con columna aditiva `lote` y unicidad por `(cotizacion_detalle_id, UPPER(tamano), UPPER(COALESCE(lote, '')))`.
