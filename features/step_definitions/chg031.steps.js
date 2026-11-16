'use strict';

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Given, When, Then } = require('@cucumber/cucumber');
const db = require('../../db');
const { TEST_JWT_SECRET } = require('../support/preload');

const MOCK_USERS = {
  Administrador: { id: 1, usuario: 'admin.chg031', nivel_rol: 'Administrador', session_version: 1, activo: 1 },
  Coordinador: { id: 2, usuario: 'coord.chg031', nivel_rol: 'Coordinador', session_version: 1, activo: 1 }
};

let quote31 = null;
let missingColumn31 = null;
let token31 = null;

Given('una solicitud CHG-025 de Crédito con folio {string} en estatus {string}', function (folio, estatus) {
  quote31 = {
    id: 201,
    folio_cotizacion: folio,
    cliente_id: 10,
    asesor_id: 3,
    condiciones_pago: 'CREDITO',
    flujo_version: 'CHG-025',
    estatus,
    almacen_estado: null,
    motivo_rechazo: null
  };
});

Given('una propuesta CHG-025 de Contado con folio {string} en estatus {string}', function (folio, estatus) {
  quote31 = {
    id: 202,
    folio_cotizacion: folio,
    cliente_id: 10,
    asesor_id: 3,
    condiciones_pago: 'CONTADO',
    flujo_version: 'CHG-025',
    estatus,
    almacen_estado: null,
    venta_confirmada: 0,
    cobro_confirmado: 0
  };
});

Given('una base de datos con columna aditiva {string} ausente en {string}', function (colName, _tableName) {
  missingColumn31 = colName;
});

Given('un usuario autenticado con rol {string} para CHG-031', function (rol) {
  const user = MOCK_USERS[rol] || MOCK_USERS.Administrador;
  token31 = jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    TEST_JWT_SECRET
  );

  db.get = async sql => {
    if (String(sql).includes('FROM asesores')) return user;
    return null;
  };
  db.all = async () => [];
  db.ensureQuotationsSchema = async () => {};
  db.transaction = async callback => {
    const tx = {
      get: async sql => (String(sql).includes('FROM cotizaciones') ? quote31 : null),
      all: async () => [],
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('UPDATE cotizaciones')) {
          if (missingColumn31 && text.includes(missingColumn31)) {
            const err = new Error(`column "${missingColumn31}" of relation "cotizaciones" does not exist`);
            err.code = '42703';
            throw err;
          }
          if (text.includes('venta_confirmada =')) {
            quote31.venta_confirmada = params[0];
            quote31.cobro_confirmado = params[1];
          } else {
            quote31.estatus = params[0];
          }
        }
        return { changes: 1 };
      }
    };
    return callback(tx);
  };
});

When('decide la solicitud CHG-031 con acción {string}', async function (decision) {
  this.response = await this.http()
    .put(`/api/cotizaciones/${quote31.id}/decision`)
    .set('Authorization', `Bearer ${token31}`)
    .send({ decision });
});

When('confirma venta en CHG-031', async function () {
  this.response = await this.http()
    .put(`/api/cotizaciones/${quote31.id}/confirmaciones-contado`)
    .set('Authorization', `Bearer ${token31}`)
    .send({ venta_confirmada: true });
});

Then('la respuesta de decisión tiene código {int}', function (status) {
  assert.equal(this.response.status, status);
});

Then('la solicitud queda en estatus {string}', function (estatus) {
  assert.equal(this.response.body.estatus, estatus);
  assert.equal(quote31.estatus, estatus);
});

Then('la venta queda confirmada', function () {
  assert.equal(this.response.body.venta_confirmada, true);
  assert.equal(quote31.venta_confirmada, 1);
});
