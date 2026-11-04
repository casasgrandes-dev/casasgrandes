# Requisito — CHG-029

- Cambio: `CHG-029`
- Objetivos: `OBJ-022`
- Requisitos funcionales: `PRD-FR-054`, `PRD-FR-059`, `PRD-FR-064`
- Requisitos no funcionales: `PRD-NFR-012`

## Comportamiento requerido

1. En la interfaz de Almacén (`public/js/app.js`), los roles `Almacen` y `Administrador` pueden visualizar el filtro `#cat-btn-semilla`, seleccionar productos de categoría `Híbrido` y `Semilla` en el formulario de movimientos manuales (`populateMovementItemProducts`), y elegir el calibre en el selector `.move-item-tamano` (`updateMovementItemTamanos` / `getSizesForProduct`).
2. En el backend (`server.js`), `GET /api/almacen/lotes-disponibles` y `GET /api/almacen/lotes-historial` permiten el parámetro `tamano` tanto a `Almacen` como a `Administrador`, rechazando con `403` a cualquier otro rol.
3. En `POST /api/almacen/movimientos`, los roles `Almacen` y `Administrador` pueden registrar entradas y salidas manuales de productos `Híbrido` o `Semilla` siempre que proporcionen un `tamano` válido y, en salidas, no excedan la disponibilidad libre de reservas activas por calibre. Cualquier otro rol (como `Coordinador` o `Director`) continúa recibiendo `403` al intentar registrar movimientos manuales de semilla.
4. La bandeja `#tab-solicitudes`, `GET /api/almacen/solicitudes` y `POST /api/almacen/solicitudes/:id/asignaciones` se mantienen exclusivas para el rol `Almacen` (`403` para `Administrador` y demás roles).

## Límites y exclusiones

- El catálogo general (`GET /api/productos`) mantiene la redacción de `tamanos` fuera de `Almacen`; el formulario de movimientos resuelve los 10 calibres oficiales para `Híbrido`/`Semilla` cuando el campo no viene en el catálogo.
- No se alteran reglas de precios, comisiones ni autorizaciones comerciales.

## Contrato API

- Rutas afectadas:
  - `GET /api/almacen/lotes-disponibles`
  - `GET /api/almacen/lotes-historial`
  - `POST /api/almacen/movimientos`
- Archivo OpenAPI: no aplica (`docs/api/bot-v1.yaml` no cambia).
