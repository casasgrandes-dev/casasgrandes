# Historia de usuario — CHG-030

- ID: CHG-030
- Fecha: 2026-11-14
- Actor: Administrador y Coordinador
- Estado: propuesta-implementada

Como Administrador o Coordinador comercial, quiero poder autorizar o rechazar solicitudes de Crédito y Apartado (así como confirmar Venta y Cobro en Contado) directamente desde el modal "Detalle de Cotización" en el Canal de Ventas, para poder tomar la decisión comercial inmediatamente después de haber revisado a detalle los productos, precios de cosecha, cliente y notas, y sin que la interacción en pantalla táctil o móvil bloquee u omita las acciones ejecutivas.

## Fuera de alcance

- Alterar las fórmulas de precio de cosecha (`precio_lleno * 1.08`) de Crédito o el valor total cero de Apartado.
- Permitir que un usuario con rol `Asesor` autorice o rechace cotizaciones propias o ajenas.
- Modificar el flujo de Almacén para asignación o reserva de calibres/tamaños (`PRD-FR-059`).
- Modificar el contrato OpenAPI `/api/v1/bot`.

## Notas

- No incluir datos reales de personas en pruebas ni ejemplos; usar correos `@example.test` y clientes ficticios.
