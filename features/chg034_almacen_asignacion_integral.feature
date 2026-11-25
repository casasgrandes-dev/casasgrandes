# language: es
Característica: Asignación integral por tamaños y lotes para Almacén en Canal de Ventas y reservas CHG-034

  Escenario: BDD-SC-138 El rol Almacen puede consultar cotizaciones para el Canal de Ventas pero no ejecutar mutaciones comerciales
    Dado un usuario autenticado con rol "Almacen" para CHG-034
    Y una solicitud CHG-025 de condición "CREDITO" en estatus "Autorizada" con almacen_estado nulo
    Cuando consulta GET /api/cotizaciones en CHG-034
    Entonces la respuesta tiene código 200 en CHG-034
    Y la solicitud devuelta expone almacen_estado "PENDIENTE" para permitir asignar tamaños
    Cuando intenta autorizar o rechazar en PUT /api/cotizaciones/:id/decision en CHG-034
    Entonces la respuesta tiene código 403 en CHG-034

  Escenario: BDD-SC-139 Disponibilidad y asignación permiten seleccionar tamaños y lotes incluso sobre lotes registrados sin tamaño previo o con autorrecuperación de esquema
    Dado un usuario autenticado con rol "Almacen" para CHG-034
    Y una solicitud CHG-025 en estatus "Autorizada" con 100 bolsas solicitadas del producto 7
    Y existencias físicas en almacen_movimientos con lote "LOTE-SIN-TAM" de 60 bolsas sin tamaño y lote "LOTE-BT2" de 50 bolsas con tamaño "BT2"
    Cuando consulta GET /api/almacen/solicitudes/:id/disponibilidad en CHG-034
    Entonces la respuesta tiene código 200 en CHG-034
    Y la disponibilidad en CHG-034 expone los lotes "LOTE-SIN-TAM" y "LOTE-BT2" junto con tamanos_catalogo
    Cuando asigna 60 bolsas seleccionando tamaño "BT1" del lote "LOTE-SIN-TAM" y 40 bolsas de tamaño "BT2" del lote "LOTE-BT2" en CHG-034
    Entonces la respuesta tiene código 201 en CHG-034
    Y la solicitud pasa a estatus "Vendido" y almacen_estado "RESERVADA" con 2 reservas activas con tamaño y lote

  Escenario: BDD-SC-140 Solicitudes de Almacén incluye solicitudes autorizadas cuyo almacen_estado quedó nulo en esquemas previos
    Dado un usuario autenticado con rol "Almacen" para CHG-034
    Y una solicitud CHG-025 de condición "APARTADO" en estatus "Autorizada" con almacen_estado nulo
    Cuando consulta GET /api/almacen/solicitudes en CHG-034
    Entonces la respuesta tiene código 200 en CHG-034
    Y el listado de solicitudes incluye el folio con almacen_estado "PENDIENTE"
