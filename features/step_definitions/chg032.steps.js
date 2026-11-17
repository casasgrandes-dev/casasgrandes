'use strict';

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Given, When, Then } = require('@cucumber/cucumber');
const db = require('../../db');
const { TEST_JWT_SECRET } = require('../support/preload');

let lotStock = {};
let insertedReservas = [];
let token32 = null;

Given('una solicitud CHG-025 pendiente de asignación con producto {int} y {int} bolsas solicitadas', function (productId, qty) {
  this.detail32 = { id: 301, cotizacion_id: 401, producto_id: productId, cantidad_ordenada: qty };
  this.quote32 = { id: 401, flujo_version: 'CHG-025', almacen_estado: 'PENDIENTE', condiciones_pago: 'APARTADO' };
  insertedReservas = [];
});

Given('existencias físicas en lotes {string} y {string} para el tamaño {string}', function (lotA, lotB, size) {
  lotStock = {
    [`${size}:${lotA}`]: 120,
    [`${size}:${lotB}`]: 100
  };
});

Given('existencias físicas en lotes {string} \\({int}\\) y {string} \\({int}\\) para el tamaño {string}', function (lotA, qtyA, lotB, qtyB, size) {
  lotStock = {
    [`${size}:${lotA}`]: qtyA,
    [`${size}:${lotB}`]: qtyB
  };
});

Given('un usuario autenticado con rol {string} para CHG-032', function (rol) {
  const user = { id: 40, usuario: 'almacen.chg032', nivel_rol: rol, session_version: 1, activo: 1 };
  token32 = jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    TEST_JWT_SECRET
  );

  db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
  db.all = async sql => {
    const text = String(sql);
    if (text.includes('FROM cotizacion_detalles')) return [this.detail32];
    if (text.includes('FROM almacen_movimientos')) {
      return Object.entries(lotStock).map(([key, fisico]) => {
        const [tamano, lote] = key.split(':');
        return { tamano, lote, fisico, reservado: 0 };
      });
    }
    return [];
  };
  db.transaction = async callback => {
    const tx = {
      get: async (sql, params) => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) return this.quote32;
        if (text.includes('FROM almacen_movimientos')) {
          if (params && params.length >= 3) {
            const key = `${String(params[1]).toUpperCase()}:${String(params[2]).toUpperCase()}`;
            const found = Object.entries(lotStock).find(([k]) => k.toUpperCase() === key);
            return { cantidad: found ? found[1] : 0 };
          }
          const sizeKey = String(params?.[1] || '').toUpperCase();
          const sum = Object.entries(lotStock)
            .filter(([k]) => k.toUpperCase().startsWith(`${sizeKey}:`))
            .reduce((acc, [, v]) => acc + v, 0);
          return { cantidad: sum };
        }
        if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) return [this.detail32];
        if (text.includes('FROM productos')) return [{ id: this.detail32.producto_id }];
        if (text.includes('FROM cotizacion_reservas')) return [];
        return [];
      },
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('INSERT INTO cotizacion_reservas')) {
          insertedReservas.push({ sql: text, params });
        }
        return { id: insertedReservas.length, changes: 1 };
      }
    };
    return callback(tx);
  };
});

When('consulta la disponibilidad de la solicitud en CHG-032', async function () {
  this.response = await this.http()
    .get(`/api/almacen/solicitudes/${this.quote32.id}/disponibilidad`)
    .set('Authorization', `Bearer ${token32}`);
});

When('asigna {int} bolsas de {string} lote {string} y {int} bolsas de {string} lote {string}', async function (qtyA, sizeA, lotA, qtyB, sizeB, lotB) {
  this.response = await this.http()
    .post(`/api/almacen/solicitudes/${this.quote32.id}/asignaciones`)
    .set('Authorization', `Bearer ${token32}`)
    .send({
      detalles: [{
        cotizacion_detalle_id: this.detail32.id,
        asignaciones: [
          { producto_id: this.detail32.producto_id, tamano: sizeA, lote: lotA, cantidad: qtyA },
          { producto_id: this.detail32.producto_id, tamano: sizeB, lote: lotB, cantidad: qtyB }
        ]
      }]
    });
});

Then('la respuesta tiene código {int} en CHG-032', function (status) {
  assert.equal(this.response.status, status);
});

Then('la disponibilidad incluye el desglose de lotes {string} y {string}', function (lotA, lotB) {
  const lotes = this.response.body[0]?.lotes || [];
  assert.ok(lotes.some(item => item.lote === lotA), `Debe incluir ${lotA}`);
  assert.ok(lotes.some(item => item.lote === lotB), `Debe incluir ${lotB}`);
});

Then('se registran {int} reservas activas con sus lotes correspondientes', function (count) {
  assert.equal(insertedReservas.length, count);
  assert.ok(insertedReservas.every(r => r.sql.includes('lote')), 'INSERT debe persistir lote');
});
