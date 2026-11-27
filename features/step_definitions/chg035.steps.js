'use strict';

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Given, When, Then } = require('@cucumber/cucumber');
const db = require('../../db');
const { TEST_JWT_SECRET } = require('../support/preload');

let token35 = null;
let quote35 = null;
let detail35 = null;
let activeReservations35 = [];
let stockQty35 = 0;
let insertedReservas35 = [];
let insertedMoves35 = [];

Given('un usuario autenticado con rol {string} para CHG-035', function (rol) {
  const user = {
    id: 95,
    nombre: `Usuario ${rol} CHG-035`,
    usuario: `user.${rol.toLowerCase()}.chg035`,
    nivel_rol: rol,
    session_version: 1,
    activo: 1
  };
  token35 = jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    TEST_JWT_SECRET
  );
  quote35 = null;
  detail35 = null;
  activeReservations35 = [];
  stockQty35 = 0;
  insertedReservas35 = [];
  insertedMoves35 = [];

  db.ensureQuotationsSchema = async () => {};
  db.ensureWarehouseMovementsSchema = async () => {};
  db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
  db.all = async () => [];

  db.transaction = async callback => {
    const tx = {
      get: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) return quote35 ? { ...quote35 } : null;
        if (text.includes('SELECT tipo_movimiento FROM almacen_movimientos')) return null;
        if (text.includes('SELECT existencias_resultantes FROM almacen_movimientos')) return { existencias_resultantes: stockQty35 };
        if (text.includes('FROM almacen_movimientos')) return { cantidad: stockQty35 };
        if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) return detail35 ? [{ ...detail35 }] : [];
        if (text.includes('FROM productos')) return detail35 ? [{ id: detail35.producto_id }] : [];
        if (text.includes('FROM cotizacion_reservas')) return activeReservations35.map(r => ({ ...r }));
        return [];
      },
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('INSERT INTO cotizacion_reservas')) {
          insertedReservas35.push({ sql: text, params });
        }
        if (text.includes('INSERT INTO almacen_movimientos')) {
          insertedMoves35.push({ sql: text, params });
        }
        if (text.includes('UPDATE cotizaciones') && quote35) {
          if (text.includes("almacen_estado = 'RESERVADA'")) quote35.almacen_estado = 'RESERVADA';
          if (text.includes("almacen_estado = 'ENTREGADA'")) quote35.almacen_estado = 'ENTREGADA';
          if (text.includes("estatus = 'Vendido'")) quote35.estatus = 'Vendido';
          if (text.includes('SET estatus = ?') && params?.[0]) quote35.estatus = params[0];
        }
        return { id: insertedReservas35.length + insertedMoves35.length, changes: 1 };
      }
    };
    return callback(tx);
  };
});

Given(
  'una solicitud CHG-025 de condición {string} en estatus {string} con almacen_estado {string} para CHG-035',
  function (condicionesPago, estatus, almacenEstado) {
    quote35 = {
      id: 951,
      folio_cotizacion: 'CG-2026-CHG035',
      cliente_id: 10,
      asesor_id: 3,
      flujo_version: 'CHG-025',
      condiciones_pago: condicionesPago,
      estatus,
      almacen_estado: almacenEstado
    };
    detail35 = {
      id: 1051,
      cotizacion_id: 951,
      producto_id: 7,
      cantidad_ordenada: 100
    };
  }
);

Given(
  'una solicitud CHG-025 de condición {string} en estatus {string} con almacen_estado {string} y reserva activa de {int} bolsas en {string} lote {string} para CHG-035',
  function (condicionesPago, estatus, almacenEstado, qty, tamano, lote) {
    quote35 = {
      id: 952,
      folio_cotizacion: 'CG-2026-CHG035-RES',
      cliente_id: 10,
      asesor_id: 3,
      flujo_version: 'CHG-025',
      condiciones_pago: condicionesPago,
      estatus,
      almacen_estado: almacenEstado
    };
    detail35 = {
      id: 1052,
      cotizacion_id: 952,
      producto_id: 7,
      cantidad_ordenada: qty
    };
    activeReservations35 = [{
      id: 1,
      cotizacion_id: 952,
      cotizacion_detalle_id: 1052,
      producto_id: 7,
      tamano,
      lote,
      cantidad: qty,
      estado: 'ACTIVA'
    }];
  }
);

Given(
  'existencias físicas de {int} bolsas en tamaño {string} lote {string} en CHG-035',
  function (qty, _size, _lot) {
    stockQty35 = qty;
  }
);

When(
  'asigna {int} bolsas de {string} lote {string} en POST \\/api\\/almacen\\/solicitudes\\/:id\\/asignaciones en CHG-035',
  async function (qty, tamano, lote) {
    this.response = await this.http()
      .post(`/api/almacen/solicitudes/${quote35.id}/asignaciones`)
      .set('Authorization', `Bearer ${token35}`)
      .send({
        detalles: [{
          cotizacion_detalle_id: detail35.id,
          asignaciones: [{ producto_id: detail35.producto_id, tamano, lote, cantidad: qty }]
        }]
      });
  }
);

When('marca la solicitud como {string} en PUT \\/api\\/cotizaciones\\/:id\\/status en CHG-035', async function (estatus) {
  this.response = await this.http()
    .put(`/api/cotizaciones/${quote35.id}/status`)
    .set('Authorization', `Bearer ${token35}`)
    .send({ estatus });
});

When('intenta cambiar la solicitud a {string} en PUT \\/api\\/cotizaciones\\/:id\\/status en CHG-035', async function (estatus) {
  this.response = await this.http()
    .put(`/api/cotizaciones/${quote35.id}/status`)
    .set('Authorization', `Bearer ${token35}`)
    .send({ estatus });
});

Then('la respuesta tiene código {int} en CHG-035', function (status) {
  assert.equal(this.response.status, status);
});

Then(
  'la solicitud queda en estatus {string} y almacen_estado {string} con {int} reserva activa en CHG-035',
  function (expectedStatus, expectedState, expectedCount) {
    assert.equal(quote35.estatus, expectedStatus);
    assert.equal(quote35.almacen_estado, expectedState);
    assert.equal(insertedReservas35.length, expectedCount);
  }
);

Then(
  'se registra la salida física en almacen_movimientos con tamaño {string} y lote {string} en CHG-035',
  function (expectedSize, expectedLot) {
    assert.equal(insertedMoves35.length, 1);
    const params = insertedMoves35[0].params || [];
    assert.ok(params.includes(expectedSize), `Salida debe incluir tamaño ${expectedSize}`);
    assert.ok(params.includes(expectedLot), `Salida debe incluir lote ${expectedLot}`);
  }
);
