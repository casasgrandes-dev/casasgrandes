# language: es
Característica: CHG-029 Movimientos manuales de semilla en Almacén para Administrador

  Escenario: BDD-SC-121 Administrador consulta lotes por tamaño y registra salida manual de semilla mientras Solicitudes permanece exclusivo de Almacén
    Dado un administrador ficticio autenticado en Almacén
    Cuando consulta lotes disponibles del híbrido 7 para el tamaño "BT1" y registra una salida manual de 10 bolsas "BT1"
    Entonces la consulta de lotes responde 200 y el movimiento manual responde 201
    Y si el administrador intenta consultar las solicitudes de reserva de Almacén recibe 403
