# Historia de usuario — CHG-029

- Rol: Administrador
- Necesito: registrar entradas y salidas manuales de semilla por tamaño y lote en el módulo de Almacén, conservando la bandeja de solicitudes y la asignación de tamaños a pedidos exclusivamente para el rol Almacén.
- Para: operar movimientos manuales de inventario de semilla e híbridos desde la cuenta administrativa sin interferir con el flujo de asignación de reservas de Almacén.

## Resultado observable

Al ingresar a la pestaña de Almacén con rol `Administrador`, el filtro de categoría `Semilla` está disponible, los productos de categoría `Híbrido` y `Semilla` aparecen en el selector de productos del formulario de Entradas y Salidas, el selector de tamaño muestra los calibres oficiales, la consulta de lotes disponibles por tamaño responde `200` y el registro de movimientos manuales en `POST /api/almacen/movimientos` responde `201` validando tamaño y disponibilidad no reservada. La pestaña `Solicitudes de Almacén` (`#tab-solicitudes`) y las rutas `/api/almacen/solicitudes` y `/api/almacen/solicitudes/:id/asignaciones` permanecen exclusivas para el rol `Almacen`.

## Fuera de alcance

- Habilitar la bandeja de `Solicitudes de Almacén` o la asignación de calibres a pedidos comerciales para el rol `Administrador` (permanece exclusiva de `Almacen`).
- Exponer tamaños en el Cotizador o al rol `Asesor`.
- Modificar contratos del API de bots (`CHG-027`).
