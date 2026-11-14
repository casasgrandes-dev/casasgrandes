# language: es
Característica: Decisión comercial y autorizaciones en Detalle de Cotización
  Como Administrador o Coordinador
  Quiero autorizar o rechazar solicitudes desde el modal de detalle
  Para validar completamente el pedido antes de emitir la decisión comercial

  Escenario: Autorizar solicitud de Crédito CHG-025 desde el modal de detalle
    Dado un usuario autenticado con rol "Administrador"
    Y una cotización CHG-025 en estatus "Pendiente" con condición "CREDITO"
    Cuando el usuario abre el modal "Detalle de Cotización"
    Entonces el modal muestra el botón "Autorizar Cotización"
    Y el modal muestra el botón "Rechazar"
    Cuando el usuario confirma la autorización en el modal
    Entonces el servidor registra la autorización en "/api/cotizaciones/:id/decision"
    Y el estatus de la cotización cambia a "Autorizada"
    Y la solicitud pasa a estado "PENDIENTE" para Almacén

  Escenario: Coordinador puede decidir sobre solicitud de Apartado en el modal
    Dado un usuario autenticado con rol "Coordinador"
    Y una cotización CHG-025 en estatus "Pendiente" con condición "APARTADO"
    Cuando el usuario abre el modal "Detalle de Cotización"
    Entonces los botones de decisión comercial están habilitados
    Cuando el usuario rechaza la solicitud indicando motivo "Sin disponibilidad"
    Entonces la cotización queda en estatus "Rechazada" y se registra el motivo

  Escenario: Asesor no tiene botones de autorización en el modal de detalle
    Dado un usuario autenticado con rol "Asesor"
    Y una cotización propia en estatus "Pendiente"
    Cuando el usuario abre el modal "Detalle de Cotización"
    Entonces los botones de autorizar, rechazar o confirmar no son visibles
