# language: es
Característica: Asignación previa de tamaños/lotes desde Apartado o Crédito autorizado y paso a Entrega CHG-035

  Escenario: BDD-SC-141 Administrador y Almacen pueden asignar tamaños y lotes desde una solicitud de Apartado o Crédito autorizada
    Dado un usuario autenticado con rol "Administrador" para CHG-035
    Y una solicitud CHG-025 de condición "APARTADO" en estatus "Autorizada" con almacen_estado "PENDIENTE" para CHG-035
    Y existencias físicas de 120 bolsas en tamaño "BT1" lote "LOTE-A" en CHG-035
    Cuando asigna 100 bolsas de "BT1" lote "LOTE-A" en POST /api/almacen/solicitudes/:id/asignaciones en CHG-035
    Entonces la respuesta tiene código 201 en CHG-035
    Y la solicitud queda en estatus "Vendido" y almacen_estado "RESERVADA" con 1 reserva activa en CHG-035

  Escenario: BDD-SC-142 Almacen puede pasar a Entregado una solicitud previamente asignada descontando los mismos tamaños y lotes
    Dado un usuario autenticado con rol "Almacen" para CHG-035
    Y una solicitud CHG-025 de condición "CREDITO" en estatus "Vendido" con almacen_estado "RESERVADA" y reserva activa de 100 bolsas en "BT1" lote "LOTE-A" para CHG-035
    Y existencias físicas de 120 bolsas en tamaño "BT1" lote "LOTE-A" en CHG-035
    Cuando marca la solicitud como "Entregado" en PUT /api/cotizaciones/:id/status en CHG-035
    Entonces la respuesta tiene código 200 en CHG-035
    Y se registra la salida física en almacen_movimientos con tamaño "BT1" y lote "LOTE-A" en CHG-035

  Escenario: BDD-SC-143 Bloquear paso a Entregado si la solicitud no tiene asignación previa
    Dado un usuario autenticado con rol "Almacen" para CHG-035
    Y una solicitud CHG-025 de condición "APARTADO" en estatus "Autorizada" con almacen_estado "PENDIENTE" para CHG-035
    Cuando marca la solicitud como "Entregado" en PUT /api/cotizaciones/:id/status en CHG-035
    Entonces la respuesta tiene código 409 en CHG-035

  Escenario: BDD-SC-144 Almacen no puede cancelar ni revertir y Coordinador/Asesor no pueden asignar tamaños
    Dado un usuario autenticado con rol "Almacen" para CHG-035
    Y una solicitud CHG-025 de condición "CREDITO" en estatus "Vendido" con almacen_estado "RESERVADA" y reserva activa de 100 bolsas en "BT1" lote "LOTE-A" para CHG-035
    Cuando intenta cambiar la solicitud a "Cancelada" en PUT /api/cotizaciones/:id/status en CHG-035
    Entonces la respuesta tiene código 403 en CHG-035
