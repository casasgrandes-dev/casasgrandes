'use strict';

// TDD-TC-142..145 — CHG-032 Asignación en Almacén (producto_id + multi-lote por tamaño)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-chg032-secret';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const db = require('../db');
const { app } = require('../server');
const { validateSizeAssignments } = require('../utils/commercialFlow');

function makeAlmacenUser() {
  return {
    id: 41,
    nombre: 'Almacén Prueba',
    usuario: 'almacen.chg032',
    nivel_rol: 'Almacen',
    email: 'almacen@example.test',
    activo: 1,
    session_version: 1
  };
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, nivel_rol: user.nivel_rol, session_version: user.session_version },
    process.env.JWT_SECRET
  );
}

async function requestJson(method, urlPath, token, body) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const json = await res.json();
    return { status: res.status, body: json };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('TDD-TC-142: validateSizeAssignments permite mismo tamaño en distintos lotes y rechaza (tamaño, lote) repetido', () => {
  const normalized = validateSizeAssignments({
    detailId: 10,
    productId: 4,
    requestedQuantity: 200,
    assignments: [
      { producto_id: 4, tamano: 'BT1', lote: 'LOTE-A', cantidad: 120 },
      { producto_id: 4, tamano: 'BT1', lote: 'LOTE-B', cantidad: 80 }
    ]
  });

  assert.deepEqual(normalized, [
    { detailId: 10, productId: 4, size: 'BT1', lote: 'LOTE-A', quantity: 120 },
    { detailId: 10, productId: 4, size: 'BT1', lote: 'LOTE-B', quantity: 80 }
  ]);

  assert.throws(() => validateSizeAssignments({
    detailId: 10,
    productId: 4,
    requestedQuantity: 200,
    assignments: [
      { producto_id: 4, tamano: 'BT1', lote: 'LOTE-A', cantidad: 100 },
      { producto_id: 4, tamano: 'bt1', lote: 'lote-a', cantidad: 100 }
    ]
  }), /repetid/i);
});

test('TDD-TC-143: GET /api/almacen/solicitudes/:id/disponibilidad devuelve desglose lotes además de tamanos', async () => {
  const origGet = db.get;
  const origAll = db.all;
  try {
    const user = makeAlmacenUser();
    const token = makeToken(user);
    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.all = async sql => {
      const text = String(sql);
      if (text.includes('FROM cotizacion_detalles')) return [{ id: 201, producto_id: 7 }];
      if (text.includes('FROM almacen_movimientos')) {
        return [
          { tamano: 'BT1', lote: 'LOTE-A', fisico: 120, reservado: 20 },
          { tamano: 'BT1', lote: 'LOTE-B', fisico: 100, reservado: 0 }
        ];
      }
      return [];
    };

    const res = await requestJson('GET', '/api/almacen/solicitudes/501/disponibilidad', token);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body[0].lotes), 'Debe incluir arreglo lotes');
    assert.equal(res.body[0].lotes.length, 2);
    assert.deepEqual(res.body[0].lotes[0], {
      tamano: 'BT1',
      lote: 'LOTE-A',
      fisico: 120,
      reservado: 20,
      disponible: 100
    });
    assert.equal(res.body[0].tamanos[0].disponible, 200);
  } finally {
    db.get = origGet;
    db.all = origAll;
  }
});

test('TDD-TC-144: POST /api/almacen/solicitudes/:id/asignaciones valida disponibilidad por lote y persiste lote', async () => {
  const origGet = db.get;
  const origTx = db.transaction;
  try {
    const user = makeAlmacenUser();
    const token = makeToken(user);
    const inserts = [];

    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.transaction = async callback => callback({
      get: async (sql, params) => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) {
          return { id: 501, flujo_version: 'CHG-025', almacen_estado: 'PENDIENTE' };
        }
        if (text.includes('FROM almacen_movimientos')) {
          if (params && params.length >= 3) {
            return String(params[2]).toUpperCase() === 'LOTE-A' ? { cantidad: 120 } : { cantidad: 100 };
          }
          return { cantidad: 220 };
        }
        if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) {
          return [{ id: 201, cotizacion_id: 501, producto_id: 7, cantidad_ordenada: 200 }];
        }
        if (text.includes('FROM productos')) return [{ id: 7 }];
        if (text.includes('FROM cotizacion_reservas')) return [];
        return [];
      },
      run: async (sql, params) => {
        if (String(sql).includes('INSERT INTO cotizacion_reservas')) {
          inserts.push({ sql: String(sql), params });
        }
        return { id: inserts.length, changes: 1 };
      }
    });

    const okRes = await requestJson('POST', '/api/almacen/solicitudes/501/asignaciones', token, {
      detalles: [{
        cotizacion_detalle_id: 201,
        asignaciones: [
          { producto_id: 7, tamano: 'BT1', lote: 'LOTE-A', cantidad: 120 },
          { producto_id: 7, tamano: 'BT1', lote: 'LOTE-B', cantidad: 80 }
        ]
      }]
    });
    assert.equal(okRes.status, 201);
    assert.equal(inserts.length, 2);
    assert.ok(inserts.every(row => row.sql.includes('lote')));

    const failRes = await requestJson('POST', '/api/almacen/solicitudes/501/asignaciones', token, {
      detalles: [{
        cotizacion_detalle_id: 201,
        asignaciones: [
          { producto_id: 7, tamano: 'BT1', lote: 'LOTE-A', cantidad: 150 },
          { producto_id: 7, tamano: 'BT1', lote: 'LOTE-B', cantidad: 50 }
        ]
      }]
    });
    assert.equal(failRes.status, 409);
  } finally {
    db.get = origGet;
    db.transaction = origTx;
  }
});

test('TDD-TC-145: public/js/app.js envía producto_id y lote desde el modal de Almacén', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  const modalSection = appJs.slice(
    appJs.indexOf('window.openWarehouseAssignment ='),
    appJs.indexOf('function updateWarehouseMovementLayout()')
  );
  assert.match(modalSection, /data-product-id=/, 'openWarehouseAssignment debe incluir data-product-id en los inputs');
  assert.match(modalSection, /data-lote=/, 'openWarehouseAssignment debe incluir data-lote en los inputs');
  assert.match(modalSection, /producto_id:\s*Number\(input\.dataset\.productId\)/, 'El submit debe enviar producto_id');
  assert.match(modalSection, /available\?\.lotes/, 'openWarehouseAssignment debe usar el desglose por lotes');
});
