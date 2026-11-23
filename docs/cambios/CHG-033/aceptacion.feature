# language: es
Característica: Asignación de tamaños desde Canal de Ventas, promoción a Vendido y disponible en Existencias CHG-033

  Escenario: BDD-SC-134 Confirmar asignación de Almacén promueve solicitud autorizada de Crédito o Apartado a Vendido sin salida física inmediata
    Dado una solicitud CHG-025 de condición "CREDITO" en estatus "Autorizada" y almacen_estado "PENDIENTE"
    Y existencias físicas de 150 bolsas en tamaño "BT1" lote "LOTE-A" para el producto de la solicitud
    Y un usuario autenticado con rol "Almacen" para CHG-033
    Cuando confirma la asignación de 100 bolsas de "BT1" lote "LOTE-A" en POST /api/almacen/solicitudes/:id/asignaciones
    Entonces la respuesta tiene código 201
    Y la solicitud queda atómicamente con almacen_estado "RESERVADA" y estatus "Vendido"
    Y se crea la reserva "ACTIVA" en cotizacion_reservas sin registrar salida física en almacen_movimientos

  Escenario: BDD-SC-135 Existencias refleja reservado y disponible de inmediato tras asignar tamaños
    Dado un producto con existencia física de 150 bolsas y 100 bolsas en reservas "ACTIVA" en cotizacion_reservas
    Y un usuario autenticado con acceso a Existencias para CHG-033
    Cuando consulta GET /api/almacen/existencias
    Entonces la respuesta tiene código 200
    Y el producto reporta existencias 150, reservado 100 y disponible 50
    Y la tabla #stock-tbody muestra reservado y disponible junto al saldo físico

  Escenario: BDD-SC-136 Botón Asignar tamaños en Canal de Ventas y Detalle de Cotización es exclusivo del rol Almacen
    Dado una solicitud CHG-025 de condición "APARTADO" en columna "Cotizado (Autorizada)" con almacen_estado "PENDIENTE"
    Cuando un usuario con rol "Almacen" visualiza el Canal de Ventas y el modal "Detalle de Cotización"
    Entonces el botón "Asignar tamaños" es visible tanto en la tarjeta Kanban como en el modal
    Pero cuando un usuario con rol "Administrador", "Coordinador", "Asesor" u "Observador" visualiza la misma solicitud
    Entonces el botón "Asignar tamaños" no se muestra en la tarjeta ni en el modal

  Escenario: BDD-SC-137 Revertir entrega de solicitud CHG-025 la regresa a Vendido conservando la reserva activa
    Dado una solicitud CHG-025 de condición "CREDITO" en estatus "Entregado" con almacen_estado "ENTREGADA"
    Y un usuario autenticado con rol "Administrador" o "Coordinador" para CHG-033
    Cuando revierte la entrega en PUT /api/cotizaciones/:id/status hacia el paso anterior
    Entonces la respuesta tiene código 200
    Y la solicitud regresa a estatus "Vendido" con almacen_estado "RESERVADA" y reserva reactivada en estado "ACTIVA"
