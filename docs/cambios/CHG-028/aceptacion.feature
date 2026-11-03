# language: es
Característica: PRD-FR-063 — Creación resiliente de solicitudes de Crédito y Apartado

  Antecedentes:
    Dado un asesor ficticio autenticado con un híbrido de precio lleno 7000

  Escenario: BDD-SC-119 creación exitosa de solicitud de Crédito a precio de cosecha
    Cuando crea una solicitud "CREDITO" de 10 unidades con descuento residual 500
    Entonces la respuesta es 201
    Y la solicitud creada tiene condición "CREDITO", estatus "Pendiente" y total 75600

  Escenario: BDD-SC-120 creación exitosa de solicitud de Apartado sin importes y con autorrecuperación de esquema
    Cuando crea una solicitud "APARTADO" de 25 unidades ante un esquema con restricción heredada en temporada
    Entonces la respuesta es 201
    Y la solicitud creada tiene condición "APARTADO", estatus "Pendiente" y total 0
