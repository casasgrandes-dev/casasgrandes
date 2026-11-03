# Historia de usuario — CHG-028

- ID: CHG-028
- Fecha: 2026-11-03
- Actor: Asesor, Administrador y Coordinador
- Estado: implementado-local

Como Asesor comercial (o Administrador / Coordinador), quiero crear y guardar solicitudes de `CREDITO` (precio a cosecha) y `APARTADO` (sin importes) desde el Cotizador interno sin recibir el error `Failed to create quotation`, para que la solicitud quede registrada con estatus `Pendiente` y pueda ser autorizada en el Canal de Ventas.

## Fuera de alcance

- Modificar fórmulas monetarias de Contado, Crédito (`precio_lleno * 1.08`) o Apartado (`0`).
- Cambiar permisos de autorización de Ventas o de reservas de Almacén.
- Alterar el contrato OpenAPI `/api/v1/bot`.

## Notas

- Sin datos personales ni secretos en los ejemplos ni en las pruebas; todas las pruebas usan actores y productores ficticios (`@example.test`).
