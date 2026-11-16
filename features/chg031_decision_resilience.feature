# language: es
Característica: Resiliencia de esquema en decisión comercial CHG-031

  Escenario: BDD-SC-129 Autorizar solicitud CHG-025 cuando falta columna aditiva en cotizaciones
    Dado una solicitud CHG-025 de Crédito con folio "CG-2026-RES-01" en estatus "Pendiente"
    Y una base de datos con columna aditiva "decision_por_id" ausente en "cotizaciones"
    Y un usuario autenticado con rol "Administrador" para CHG-031
    Cuando decide la solicitud CHG-031 con acción "AUTORIZAR"
    Entonces la respuesta de decisión tiene código 200
    Y la solicitud queda en estatus "Autorizada"

  Escenario: BDD-SC-130 Confirmar venta de Contado CHG-025 cuando falta columna de marca temporal
    Dado una propuesta CHG-025 de Contado con folio "CG-2026-RES-02" en estatus "Pendiente"
    Y una base de datos con columna aditiva "venta_confirmada_en" ausente en "cotizaciones"
    Y un usuario autenticado con rol "Coordinador" para CHG-031
    Cuando confirma venta en CHG-031
    Entonces la respuesta de decisión tiene código 200
    Y la venta queda confirmada
