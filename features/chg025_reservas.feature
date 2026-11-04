# language: es
Característica: Reservas CHG-025

  Escenario: BDD-SC-105 rechaza una suma de tamaños distinta de lo solicitado
    Dado un operador de almacén ficticio autenticado
    Y una solicitud CHG-025 de 100 bolsas pendiente de reserva
    Cuando asigna 60 bolsas "BT1" y 30 bolsas "BT2"
    Entonces la respuesta es 400
    Y no se escribe ninguna reserva


  Escenario: BDD-SC-121 Administrador consulta lotes por tamaño y registra salida manual de semilla mientras Solicitudes permanece exclusivo de Almacén
    Dado un administrador ficticio autenticado en Almacén
    Cuando consulta lotes disponibles del híbrido 7 para el tamaño "BT1" y registra una salida manual de 10 bolsas "BT1"
    Entonces la consulta de lotes responde 200 y el movimiento manual responde 201
    Y si el administrador intenta consultar las solicitudes de reserva de Almacén recibe 403
