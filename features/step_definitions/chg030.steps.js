'use strict';

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Given, When, Then } = require('@cucumber/cucumber');
const db = require('../../db');
const { TEST_JWT_SECRET } = require('../support/preload');

const MOCK_USERS = {
  Administrador: { id: 1, usuario: 'admin.chg030', nivel_rol: 'Administrador', session_version: 1, activo: 1 },
  Coordinador: { id: 2, usuario: 'coord.chg030', nivel_rol: 'Coordinador', session_version: 1, activo: 1 },
  Asesor: { id: 3, usuario: 'asesor.chg030', nivel_rol: 'Asesor', session_version: 1, activo: 1 }
};

let currentQuote = null;
let currentAuthToken = null;
let lastResponse = null;

Given('una cotización CHG-025 de Crédito con folio {string} en estatus {string}', function (folio, estatus) {
  currentQuote = {
    id: 101,
    folio_cotizacion: folio,
    cliente_id: 10,
    asesor_id: 3,
    condiciones_pago: 'CREDITO',
    flujo_version: 'CHG-025',
    estatus,
    almacen_estado: null,
    motivo_rechazo: null,
    total_mxn: 772740
  };
});

Given('un usuario autenticado con rol {string}', function (rol) {
  const user = MOCK_USERS[rol] || { id: 99, usuario: 'test', nivel_rol: rol, session_version: 1, activo: 1 };
  currentAuthToken = jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    TEST_JWT_SECRET
  );

  db.get = async sql => {
    const text = String(sql);
    if (text.includes('FROM asesores')) return user;
    return null;
  };

  db.transaction = async callback => {
    const tx = {
      get: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) return currentQuote;
        return null;
      },
      all: async () => [],
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('UPDATE cotizaciones')) {
          if (text.includes('venta_confirmada =')) {
            currentQuote.venta_confirmada = params[0];
            currentQuote.cobro_confirmado = params[1];
            currentQuote.almacen_estado = params[4];
            currentQuote.estatus = params[5];
          } else if (params && params.length >= 6) {
            currentQuote.estatus = params[0];
            currentQuote.motivo_rechazo = params[3];
            currentQuote.almacen_estado = params[4];
          }
        }
        return { changes: 1 };
      }
    };
    return callback(tx);
  };
});

When('decide la cotización con acción {string}', async function (decision) {
  this.response = await this.http()
    .put('/api/cotizaciones/101/decision')
    .set('Authorization', `Bearer ${currentAuthToken}`)
    .send({ decision });
});

When('decide la cotización con acción {string} y motivo {string}', async function (decision, motivo) {
  this.response = await this.http()
    .put('/api/cotizaciones/101/decision')
    .set('Authorization', `Bearer ${currentAuthToken}`)
    .send({ decision, motivo });
});

Given('una propuesta CHG-025 de Contado en estatus {string}', function (estatus) {
  currentQuote = {
    id: 102,
    folio_cotizacion: 'CG-2026-CONTADO',
    cliente_id: 10,
    asesor_id: 3,
    condiciones_pago: 'CONTADO',
    flujo_version: 'CHG-025',
    estatus,
    almacen_estado: null,
    venta_confirmada: 0,
    cobro_confirmado: 0,
    total_mxn: 50000
  };
});

When('confirma la venta de la propuesta', async function () {
  this.response = await this.http()
    .put('/api/cotizaciones/102/confirmaciones-contado')
    .set('Authorization', `Bearer ${currentAuthToken}`)
    .send({ venta_confirmada: true });
  if (this.response.status === 200) currentQuote.venta_confirmada = 1;
});

When('confirma el cobro de la propuesta', async function () {
  this.response = await this.http()
    .put('/api/cotizaciones/102/confirmaciones-contado')
    .set('Authorization', `Bearer ${currentAuthToken}`)
    .send({ cobro_confirmado: true });
  if (this.response.status === 200) {
    currentQuote.cobro_confirmado = 1;
    currentQuote.almacen_estado = 'PENDIENTE';
  }
});

Then('la cotización queda con estatus {string} y almacen_estado {string}', function (estatus, almacenEstado) {
  assert.equal(this.response.status, 200);
  assert.equal(this.response.body.estatus, estatus);
  assert.equal(this.response.body.almacen_estado, almacenEstado);
});

Then('la cotización queda con estatus {string}', function (estatus) {
  assert.equal(this.response.status, 200);
  assert.equal(this.response.body.estatus, estatus);
});

Then('la cotización queda con estatus {string} y motivo {string}', function (estatus, motivo) {
  assert.equal(this.response.status, 200);
  assert.equal(this.response.body.estatus, estatus);
  assert.equal(currentQuote.motivo_rechazo, motivo);
});

Then('la propuesta tiene venta confirmada', function () {
  assert.equal(this.response.status, 200);
  assert.equal(currentQuote.venta_confirmada, 1);
});

Then('la propuesta tiene cobro confirmado y califica para Almacén', function () {
  assert.equal(this.response.status, 200);
  assert.equal(currentQuote.cobro_confirmado, 1);
  assert.equal(this.response.body.almacen_estado, 'PENDIENTE');
});
