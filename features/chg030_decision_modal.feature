# language: es
Característica: BDD-SC-126..128 Decisión comercial y autorizaciones en Detalle de Cotización

  Antecedentes:
    Dado una cotización CHG-025 de Crédito con folio "CG-2026-648865" en estatus "Pendiente"

  Escenario: BDD-SC-126 autorizar solicitud de Crédito desde el endpoint transaccional de decisión
    Dado un usuario autenticado con rol "Administrador"
    Cuando decide la cotización con acción "AUTORIZAR"
    Entonces la respuesta es 200
    Y la cotización queda con estatus "Autorizada" y almacen_estado "PENDIENTE"

  Escenario: BDD-SC-126 Coordinador puede autorizar solicitud de Crédito
    Dado un usuario autenticado con rol "Coordinador"
    Cuando decide la cotización con acción "AUTORIZAR"
    Entonces la respuesta es 200
    Y la cotización queda con estatus "Autorizada"

  Escenario: BDD-SC-127 rechazar solicitud con motivo opcional
    Dado un usuario autenticado con rol "Administrador"
    Cuando decide la cotización con acción "RECHAZAR" y motivo "Capacidad de crédito excedida"
    Entonces la respuesta es 200
    Y la cotización queda con estatus "Rechazada" y motivo "Capacidad de crédito excedida"

  Escenario: BDD-SC-128 confirmar venta y cobro para propuesta de Contado
    Dado un usuario autenticado con rol "Administrador"
    Y una propuesta CHG-025 de Contado en estatus "Pendiente"
    Cuando confirma la venta de la propuesta
    Entonces la respuesta es 200
    Y la propuesta tiene venta confirmada
    Cuando confirma el cobro de la propuesta
    Entonces la respuesta es 200
    Y la propuesta tiene cobro confirmado y califica para Almacén
