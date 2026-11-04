# Casos TDD — CHG-029

Escribir y correr en rojo antes de implementar el cambio de producción.

| ID | Escenario BDD | Qué valida | Nivel | Archivo de prueba |
|---|---|---|---|---|
| `TDD-TC-120` | `BDD-SC-097`, `BDD-SC-121` | Redacción de tamaños en catálogo/Kardex fuera de Almacén, permiso de movimientos manuales y filtro de lotes por tamaño para `Almacen` y `Administrador`, y bloqueo `403` para otros roles (`Coordinador`) | Unidad + HTTP | `test/chg025_internal_proposals_reservations.test.js` |
| `TDD-TC-133` | `BDD-SC-121` | Permiso de `Administrador` para filtrar lotes por tamaño y registrar entradas/salidas manuales de semilla en `POST /api/almacen/movimientos`, selector de híbridos/calibres en `public/js/app.js`, y exclusividad de `Solicitudes de Almacén` para `Almacen` (`403` a `Administrador`) | Unidad + HTTP + BDD | `test/chg025_internal_proposals_reservations.test.js`, `features/chg025_reservas.feature` |
