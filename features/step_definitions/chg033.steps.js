'use strict';

const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Given, When, Then } = require('@cucumber/cucumber');
const db = require('../../db');
const { TEST_JWT_SECRET } = require('../support/preload');

let quote33 = null;
let detail33 = null;
let stockBySize33 = {};
let insertedReservas33 = [];
let token33 = null;
let existenciasState33 = null;

Given(
  'una solicitud CHG-025 de tipo {string} en estatus {string} con almacen_estado {string} para CHG-033',
  function (condicionesPago, estatus, almacenEstado) {
    quote33 = {
      id: 601,
      folio_cotizacion: 'CG-2026-CHG033',
      cliente_id: 10,
      asesor_id: 3,
      flujo_version: 'CHG-025',
      condiciones_pago: condicionesPago,
      estatus,
      almacen_estado: almacenEstado
    };
    detail33 = {
      id: 701,
      cotizacion_id: 601,
      producto_id: 7,
      cantidad_ordenada: 200
    };
    insertedReservas33 = [];
    existenciasState33 = null;
  }
);

Given(
  'existencias físicas en tamaños {string} \\({int}\\) y {string} \\({int}\\) en CHG-033',
  function (sizeA, qtyA, sizeB, qtyB) {
    stockBySize33 = {
      [sizeA.toUpperCase()]: qtyA,
      [sizeB.toUpperCase()]: qtyB
    };
  }
);

Given(
  'productos con existencia física {int} y reservas activas {int} en lote {string} tamaño {string} para CHG-033',
  function (fisico, reservado, lote, tamano) {
    quote33 = null;
    detail33 = null;
    insertedReservas33 = [];
    existenciasState33 = {
      productoId: 7,
      producto: 'Híbrido Demostración CHG-033',
      tipo_categoria: 'Semilla',
      fisico,
      reservado,
      lote,
      tamano
    };
  }
);

Given('un usuario autenticado con rol {string} en CHG-033', function (rol) {
  const user = { id: 55, usuario: `user.${rol.toLowerCase()}.chg033`, nivel_rol: rol, session_version: 1, activo: 1 };
  token33 = jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    TEST_JWT_SECRET
  );

  db.get = async sql => {
    if (String(sql).includes('FROM asesores')) return user;
    return null;
  };

  db.all = async sql => {
    const text = String(sql);
    if (existenciasState33) {
      if (text.includes('FROM productos')) {
        return [{
          id: existenciasState33.productoId,
          producto: existenciasState33.producto,
          tipo_categoria: existenciasState33.tipo_categoria,
          existencias: existenciasState33.fisico,
          reservado: existenciasState33.reservado
        }];
      }
      if (text.includes('FROM cotizacion_reservas')) {
        return [{
          producto_id: existenciasState33.productoId,
          lote: existenciasState33.lote,
          tamano: existenciasState33.tamano,
          reservado: existenciasState33.reservado
        }];
      }
      if (text.includes('FROM almacen_movimientos')) {
        return [{
          producto_id: existenciasState33.productoId,
          lote: existenciasState33.lote,
          tamano: existenciasState33.tamano,
          stock: existenciasState33.fisico,
          reservado: existenciasState33.reservado
        }];
      }
    }
    if (detail33 && text.includes('FROM cotizacion_detalles')) return [detail33];
    return [];
  };

  db.transaction = async callback => {
    const tx = {
      get: async (sql, params) => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) return quote33;
        if (text.includes('FROM almacen_movimientos')) {
          const sizeKey = String(params?.[1] || '').toUpperCase();
          return { cantidad: stockBySize33[sizeKey] || 0 };
        }
        if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) return detail33 ? [detail33] : [];
        if (text.includes('FROM productos')) return detail33 ? [{ id: detail33.producto_id }] : [];
        if (text.includes('FROM cotizacion_reservas')) return [];
        return [];
      },
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('INSERT INTO cotizacion_reservas')) {
          insertedReservas33.push({ sql: text, params });
        }
        if (text.includes('UPDATE cotizaciones')) {
          if (text.includes("almacen_estado = 'RESERVADA'")) {
            quote33.almacen_estado = 'RESERVADA';
          }
          if (text.includes("estatus = 'Vendido'") || text.includes('estatus = ?')) {
            quote33.estatus = text.includes("estatus = 'Vendido'") ? 'Vendido' : params?.[0] || quote33.estatus;
          }
        }
        return { id: insertedReservas33.length, changes: 1 };
      }
    };
    return callback(tx);
  };
});

When(
  'asigna {int} bolsas de {string} y {int} bolsas de {string} en CHG-033',
  async function (qtyA, sizeA, qtyB, sizeB) {
    this.response = await this.http()
      .post(`/api/almacen/solicitudes/${quote33.id}/asignaciones`)
      .set('Authorization', `Bearer ${token33}`)
      .send({
        detalles: [{
          cotizacion_detalle_id: detail33.id,
          asignaciones: [
            { producto_id: detail33.producto_id, tamano: sizeA, cantidad: qtyA },
            { producto_id: detail33.producto_id, tamano: sizeB, cantidad: qtyB }
          ]
        }]
      });
  }
);

When('consulta las existencias de almacén en CHG-033', async function () {
  this.response = await this.http()
    .get('/api/almacen/existencias')
    .set('Authorization', `Bearer ${token33}`);
});

Then('la respuesta tiene código {int} en CHG-033', function (status) {
  assert.equal(this.response.status, status);
});

Then(
  'la solicitud queda con estatus {string} y almacen_estado {string} en CHG-033',
  function (expectedStatus, expectedAlmacenEstado) {
    assert.equal(this.response.body.estatus, expectedStatus);
    assert.equal(quote33.estatus, expectedStatus);
    assert.equal(quote33.almacen_estado, expectedAlmacenEstado);
  }
);

Then('se registran {int} reservas activas en CHG-033', function (count) {
  assert.equal(insertedReservas33.length, count);
});

Then(
  'la solicitud permanece en estatus {string} y almacen_estado {string} en CHG-033',
  function (expectedStatus, expectedAlmacenEstado) {
    assert.equal(quote33.estatus, expectedStatus);
    assert.equal(quote33.almacen_estado, expectedAlmacenEstado);
  }
);

Then('no se registra ninguna reserva en CHG-033', function () {
  assert.equal(insertedReservas33.length, 0);
});

Then(
  'las existencias muestran reservado {int} y disponible {int} en producto y lote en CHG-033',
  function (expectedReserved, expectedAvailable) {
    const product = this.response.body.find(item => Number(item.id) === existenciasState33.productoId);
    assert.ok(product, 'Debe devolver el producto');
    assert.equal(product.existencias, existenciasState33.fisico);
    assert.equal(product.reservado, expectedReserved);
    assert.equal(product.disponible, expectedAvailable);
    assert.ok(Array.isArray(product.lotes) && product.lotes.length > 0, 'Debe incluir lotes para Almacen');
    const lot = product.lotes.find(item => item.lote === existenciasState33.lote && item.tamano === existenciasState33.tamano);
    assert.ok(lot, 'Debe incluir el lote reservado');
    assert.equal(lot.reservado, expectedReserved);
    assert.equal(lot.disponible, expectedAvailable);
  }
);
