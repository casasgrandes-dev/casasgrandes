# Registro de decisiones — CHG-035

- 2026-11-26: El propietario confirma las opciones recomendadas 1A y 2A:
  - 1A: Habilitar asignación previa de tamaños y lotes (`#tab-solicitudes`, Canal de Ventas, *Detalle de Cotización* y `/api/almacen/solicitudes*`) para `Almacen` y `Administrador`, manteniendo bloqueo `403` para `Coordinador`, `Asesor` y `Observador`.
  - 2A: Habilitar la acción visible `"🚚 Marcar como Entregado"` (en escritorio y móvil) para `Administrador`, `Coordinador` y `Almacen` únicamente cuando la solicitud `CHG-025` ya está asignada (`almacen_estado === 'RESERVADA'`), manteniendo bloqueadas para `Almacen` las cancelaciones y reversiones. Documentado en `ADR-021`.
