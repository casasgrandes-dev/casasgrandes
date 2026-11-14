# Decisiones y confirmaciones — CHG-030

| ID | Pregunta o decisión | Respuesta | Quién | Fecha |
|---|---|---|---|---|
| `C-01` | ¿Cómo debe resolverse la imposibilidad de autorizar desde Canal de Ventas reportada por el usuario? | Habilitar los controles de decisión comercial (`Autorizar` y `Rechazar` con motivo) y de doble confirmación (`✓ Venta` y `✓ Cobro`) directamente dentro del modal "Detalle de Cotización" para solicitudes `CHG-025`, comunicándose con `PUT /api/cotizaciones/:id/decision` y `PUT /api/cotizaciones/:id/confirmaciones-contado`, y aislando los clics de botones en la tarjeta del tablero. | Propietario / Agente | 2026-11-14 |
