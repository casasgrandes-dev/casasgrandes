# language: es
Característica: Asignación en Almacén y canal de ventas CHG-033

  Escenario: BDD-SC-134 Almacén asigna tamaños variados a solicitud Autorizada y la promueve a Vendido
    Dado una solicitud CHG-025 de tipo "APARTADO" en estatus "Autorizada" con almacen_estado "PENDIENTE" para CHG-033
    Y existencias físicas en tamaños "BT1" (120) y "BT2" (100) en CHG-033
    Y un usuario autenticado con rol "Almacen" en CHG-033
    Cuando asigna 100 bolsas de "BT1" y 100 bolsas de "BT2" en CHG-033
    Entonces la respuesta tiene código 201 en CHG-033
    Y la solicitud queda con estatus "Vendido" y almacen_estado "RESERVADA" en CHG-033
    Y se registran 2 reservas activas en CHG-033

  Escenario: BDD-SC-135 Disponibilidad insuficiente mantiene solicitud en Autorizada y PENDIENTE
    Dado una solicitud CHG-025 de tipo "CREDITO" en estatus "Autorizada" con almacen_estado "PENDIENTE" para CHG-033
    Y existencias físicas en tamaños "BT1" (40) y "BT2" (100) en CHG-033
    Y un usuario autenticado con rol "Almacen" en CHG-033
    Cuando asigna 100 bolsas de "BT1" y 100 bolsas de "BT2" en CHG-033
    Entonces la respuesta tiene código 409 en CHG-033
    Y la solicitud permanece en estatus "Autorizada" y almacen_estado "PENDIENTE" en CHG-033
    Y no se registra ninguna reserva en CHG-033

  Escenario: BDD-SC-136 Rol distinto a Almacen recibe 403 al intentar asignar tamaños
    Dado una solicitud CHG-025 de tipo "APARTADO" en estatus "Autorizada" con almacen_estado "PENDIENTE" para CHG-033
    Y existencias físicas en tamaños "BT1" (120) y "BT2" (100) en CHG-033
    Y un usuario autenticado con rol "Administrador" en CHG-033
    Cuando asigna 100 bolsas de "BT1" y 100 bolsas de "BT2" en CHG-033
    Entonces la respuesta tiene código 403 en CHG-033

  Escenario: BDD-SC-137 Existencias reflejan reservado y disponible en producto y lotes
    Dado productos con existencia física 220 y reservas activas 50 en lote "LOTE-A" tamaño "BT1" para CHG-033
    Y un usuario autenticado con rol "Almacen" en CHG-033
    Cuando consulta las existencias de almacén en CHG-033
    Entonces la respuesta tiene código 200 en CHG-033
    Y las existencias muestran reservado 50 y disponible 170 en producto y lote en CHG-033
