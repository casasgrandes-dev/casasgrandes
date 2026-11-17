# language: es
Característica: Asignación de tamaños y múltiples lotes en Almacén CHG-032

  Escenario: BDD-SC-131 Consultar disponibilidad desglosada por tamaño y lote
    Dado una solicitud CHG-025 pendiente de asignación con producto 7 y 200 bolsas solicitadas
    Y existencias físicas en lotes "LOTE-A" y "LOTE-B" para el tamaño "BT1"
    Y un usuario autenticado con rol "Almacen" para CHG-032
    Cuando consulta la disponibilidad de la solicitud en CHG-032
    Entonces la respuesta tiene código 200 en CHG-032
    Y la disponibilidad incluye el desglose de lotes "LOTE-A" y "LOTE-B"

  Escenario: BDD-SC-132 Asignar una misma partida y tamaño repartida en diferentes lotes
    Dado una solicitud CHG-025 pendiente de asignación con producto 7 y 200 bolsas solicitadas
    Y existencias físicas en lotes "LOTE-A" (120) y "LOTE-B" (100) para el tamaño "BT1"
    Y un usuario autenticado con rol "Almacen" para CHG-032
    Cuando asigna 120 bolsas de "BT1" lote "LOTE-A" y 80 bolsas de "BT1" lote "LOTE-B"
    Entonces la respuesta tiene código 201 en CHG-032
    Y se registran 2 reservas activas con sus lotes correspondientes

  Escenario: BDD-SC-133 Rechazar asignación que excede la existencia del lote seleccionado
    Dado una solicitud CHG-025 pendiente de asignación con producto 7 y 200 bolsas solicitadas
    Y existencias físicas en lotes "LOTE-A" (50) y "LOTE-B" (200) para el tamaño "BT1"
    Y un usuario autenticado con rol "Almacen" para CHG-032
    Cuando asigna 100 bolsas de "BT1" lote "LOTE-A" y 100 bolsas de "BT1" lote "LOTE-B"
    Entonces la respuesta tiene código 409 en CHG-032
