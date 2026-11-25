'use strict';

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Given, When, Then } = require('@cucumber/cucumber');
const db = require('../../db');
const { TEST_JWT_SECRET } = require('../support/preload');

let token34 = null;
let quote34 = null;
let detail34 = null;
let lots34 = [];
let insertedReservas34 = [];
let simulateMissingLotColOnce34 = false;

Given('un usuario autenticado con rol {string} para CHG-034', function (rol) {
  const user = {
    id: 84,
    nombre: `Usuario ${rol} CHG-034`,
    usuario: `user.${rol.toLowerCase()}.chg034`,
    nivel_rol: rol,
    session_version: 1,
    activo: 1
  };
  token34 = jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    TEST_JWT_SECRET
  );
  quote34 = null;
  detail34 = null;
  lots34 = [];
  insertedReservas34 = [];
  simulateMissingLotColOnce34 = false;

  db.ensureQuotationsSchema = async () => {};
  db.ensureWarehouseMovementsSchema = async () => {};

  db.get = async sql => {
    const text = String(sql);
    if (text.includes('FROM asesores')) return user;
    if (text.includes('FROM productos') && detail34) {
      return {
        id: detail34.producto_id,
        producto: 'Híbrido Calamar CHG-034',
        tipo_categoria: 'Semilla',
        tamanos: 'BT1, BT2, BT3, BW1, BW2, PT1, PT2, PT3, PW1, PW2'
      };
    }
    return null;
  };

  db.all = async sql => {
    const text = String(sql);
    if (text.includes('FROM cotizaciones q')) {
      if (text.includes("q.almacen_estado IN ('PENDIENTE', 'RESERVADA')") && !text.includes('q.almacen_estado IS NULL')) {
        return quote34 && quote34.almacen_estado ? [quote34] : [];
      }
      return quote34 ? [{ ...quote34 }] : [];
    }
    if (text.includes('FROM cotizacion_detalles')) {
      return detail34 ? [{ ...detail34 }] : [];
    }
    if (text.includes('FROM almacen_movimientos')) {
      if (simulateMissingLotColOnce34 && text.includes('FROM cotizacion_reservas')) {
        simulateMissingLotColOnce34 = false;
        const err = new Error('column r.lote does not exist');
        err.code = '42703';
        throw err;
      }
      const requiresNonEmptySize = /m\.tamano\s+IS\s+NOT\s+NULL\s+AND\s+BTRIM\(m\.tamano\)\s*<>\s*''/i.test(text);
      return lots34
        .filter(item => !requiresNonEmptySize || Boolean(item.tamano))
        .map(item => ({
          tamano: item.tamano,
          lote: item.lote,
          fisico: item.fisico,
          reservado: 0
        }));
    }
    if (text.includes('FROM cotizacion_reservas')) {
      return [];
    }
    return [];
  };

  db.transaction = async callback => {
    const tx = {
      get: async (sql, params) => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) return quote34 ? { ...quote34 } : null;
        if (text.includes('FROM almacen_movimientos')) {
          const allowEmptySize = /BTRIM\(COALESCE\(tamano,\s*''\)\)\s*=\s*''/i.test(text);
          if (params && params.length >= 3) {
            const reqSize = String(params[1] || '').trim().toUpperCase();
            const reqLot = String(params[2] || '').trim().toUpperCase();
            const sum = lots34
              .filter(l => l.lote.toUpperCase() === reqLot && (l.tamano.toUpperCase() === reqSize || (allowEmptySize && !l.tamano)))
              .reduce((acc, l) => acc + l.fisico, 0);
            return { cantidad: sum };
          }
          const reqSize = String(params?.[1] || '').trim().toUpperCase();
          const sum = lots34
            .filter(l => l.tamano.toUpperCase() === reqSize || (allowEmptySize && !l.tamano))
            .reduce((acc, l) => acc + l.fisico, 0);
          return { cantidad: sum };
        }
        if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) return detail34 ? [{ ...detail34 }] : [];
        if (text.includes('FROM productos')) return detail34 ? [{ id: detail34.producto_id }] : [];
        if (text.includes('FROM cotizacion_reservas')) return [];
        return [];
      },
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('INSERT INTO cotizacion_reservas')) {
          insertedReservas34.push({ sql: text, params });
        }
        if (text.includes('UPDATE cotizaciones') && quote34) {
          if (text.includes("almacen_estado = 'RESERVADA'")) quote34.almacen_estado = 'RESERVADA';
          if (text.includes("estatus = 'Vendido'")) quote34.estatus = 'Vendido';
        }
        return { id: insertedReservas34.length, changes: 1 };
      }
    };
    return callback(tx);
  };
});

Given(
  'una solicitud CHG-025 de condición {string} en estatus {string} con almacen_estado nulo',
  function (condicionesPago, estatus) {
    quote34 = {
      id: 801,
      folio_cotizacion: 'CG-2026-CHG034',
      cliente_id: 12,
      asesor_id: 4,
      cliente_nombre: 'Productor Ficticio CHG-034',
      asesor_nombre: 'Asesor Ficticio CHG-034',
      flujo_version: 'CHG-025',
      condiciones_pago: condicionesPago,
      estatus,
      almacen_estado: null,
      total_mxn: 150000
    };
    detail34 = {
      id: 901,
      cotizacion_id: 801,
      producto_id: 7,
      producto_nombre: 'Híbrido Calamar CHG-034',
      tipo_categoria: 'Semilla',
      cantidad_ordenada: 100,
      tamano: 'BT1'
    };
  }
);

Given(
  'una solicitud CHG-025 en estatus {string} con {int} bolsas solicitadas del producto {int}',
  function (estatus, cantidad, productoId) {
    quote34 = {
      id: 802,
      folio_cotizacion: 'CG-2026-CHG034-LOTES',
      cliente_id: 12,
      asesor_id: 4,
      cliente_nombre: 'Productor Ficticio CHG-034',
      asesor_nombre: 'Asesor Ficticio CHG-034',
      flujo_version: 'CHG-025',
      condiciones_pago: 'CREDITO',
      estatus,
      almacen_estado: null
    };
    detail34 = {
      id: 902,
      cotizacion_id: 802,
      producto_id: productoId,
      producto_nombre: 'Híbrido Calamar CHG-034',
      tipo_categoria: 'Semilla',
      cantidad_ordenada: cantidad
    };
  }
);

Given(
  'existencias físicas en almacen_movimientos con lote {string} de {int} bolsas sin tamaño y lote {string} de {int} bolsas con tamaño {string}',
  function (lotNoSize, qtyNoSize, lotWithSize, qtyWithSize, size) {
    lots34 = [
      { tamano: '', lote: lotNoSize, fisico: qtyNoSize },
      { tamano: size, lote: lotWithSize, fisico: qtyWithSize }
    ];
    simulateMissingLotColOnce34 = true;
  }
);

When('consulta GET \\/api\\/cotizaciones en CHG-034', async function () {
  this.response = await this.http()
    .get('/api/cotizaciones')
    .set('Authorization', `Bearer ${token34}`);
});

When('intenta autorizar o rechazar en PUT \\/api\\/cotizaciones\\/:id\\/decision en CHG-034', async function () {
  this.response = await this.http()
    .put(`/api/cotizaciones/${quote34.id}/decision`)
    .set('Authorization', `Bearer ${token34}`)
    .send({ decision: 'AUTORIZAR' });
});

When('consulta GET \\/api\\/almacen\\/solicitudes\\/:id\\/disponibilidad en CHG-034', async function () {
  this.response = await this.http()
    .get(`/api/almacen/solicitudes/${quote34.id}/disponibilidad`)
    .set('Authorization', `Bearer ${token34}`);
});

When(
  'asigna {int} bolsas seleccionando tamaño {string} del lote {string} y {int} bolsas de tamaño {string} del lote {string} en CHG-034',
  async function (qtyA, sizeA, lotA, qtyB, sizeB, lotB) {
    this.response = await this.http()
      .post(`/api/almacen/solicitudes/${quote34.id}/asignaciones`)
      .set('Authorization', `Bearer ${token34}`)
      .send({
        detalles: [{
          cotizacion_detalle_id: detail34.id,
          asignaciones: [
            { producto_id: detail34.producto_id, tamano: sizeA, lote: lotA, cantidad: qtyA },
            { producto_id: detail34.producto_id, tamano: sizeB, lote: lotB, cantidad: qtyB }
          ]
        }]
      });
  }
);

When('consulta GET \\/api\\/almacen\\/solicitudes en CHG-034', async function () {
  this.response = await this.http()
    .get('/api/almacen/solicitudes')
    .set('Authorization', `Bearer ${token34}`);
});

Then('la respuesta tiene código {int} en CHG-034', function (status) {
  assert.equal(this.response.status, status);
});

Then('la solicitud devuelta expone almacen_estado {string} para permitir asignar tamaños', function (expectedState) {
  assert.ok(Array.isArray(this.response.body) && this.response.body.length > 0);
  assert.equal(this.response.body[0].almacen_estado, expectedState);
});

Then(
  'la disponibilidad en CHG-034 expone los lotes {string} y {string} junto con tamanos_catalogo',
  function (lotA, lotB) {
    const row = this.response.body[0];
    assert.ok(row, 'Debe devolver disponibilidad para la partida');
    assert.ok(Array.isArray(row.lotes), 'Debe incluir arreglo lotes');
    assert.ok(row.lotes.some(item => item.lote === lotA), `Debe incluir lote ${lotA}`);
    assert.ok(row.lotes.some(item => item.lote === lotB), `Debe incluir lote ${lotB}`);
    assert.ok(Array.isArray(row.tamanos_catalogo) && row.tamanos_catalogo.includes('BT1'), 'Debe incluir tamanos_catalogo');
  }
);

Then(
  'la solicitud pasa a estatus {string} y almacen_estado {string} con {int} reservas activas con tamaño y lote',
  function (expectedStatus, expectedWarehouseState, expectedCount) {
    assert.equal(this.response.body.estatus, expectedStatus);
    assert.equal(quote34.estatus, expectedStatus);
    assert.equal(quote34.almacen_estado, expectedWarehouseState);
    assert.equal(insertedReservas34.length, expectedCount);
    assert.ok(insertedReservas34.every(item => item.sql.includes('lote')));
  }
);

Then('el listado de solicitudes incluye el folio con almacen_estado {string}', function (expectedState) {
  assert.ok(Array.isArray(this.response.body) && this.response.body.length === 1);
  assert.equal(this.response.body[0].folio_cotizacion, quote34.folio_cotizacion);
  assert.equal(this.response.body[0].almacen_estado, expectedState);
});
