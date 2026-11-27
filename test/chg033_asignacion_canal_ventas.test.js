'use strict';

// TDD-TC-146..151 — CHG-033 Asignación en Almacén y promoción a Vendido en Canal de Ventas

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-chg033-secret-at-least-32-chars';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const db = require('../db');
const { app } = require('../server');

const root = path.join(__dirname, '..');

function makeUser(nivelRol, id = 61) {
  return {
    id,
    nombre: `${nivelRol} Prueba CHG-033`,
    usuario: `${nivelRol.toLowerCase()}.chg033`,
    nivel_rol: nivelRol,
    email: `${nivelRol.toLowerCase()}@example.test`,
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

test('TDD-TC-146: POST /api/almacen/solicitudes/:id/asignaciones promueve solicitud APARTADO Autorizada a Vendido y RESERVADA', async () => {
  const origGet = db.get;
  const origTx = db.transaction;
  try {
    const user = makeUser('Almacen', 61);
    const token = makeToken(user);
    const inserts = [];
    const updates = [];

    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.transaction = async callback => callback({
      get: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) {
          return {
            id: 601,
            flujo_version: 'CHG-025',
            condiciones_pago: 'APARTADO',
            estatus: 'Autorizada',
            almacen_estado: 'PENDIENTE'
          };
        }
        if (text.includes('FROM almacen_movimientos')) {
          return { cantidad: 100 };
        }
        if (text.includes('FROM cotizacion_reservas')) {
          return { cantidad: 0 };
        }
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) {
          return [{ id: 701, cotizacion_id: 601, producto_id: 7, cantidad_ordenada: 200 }];
        }
        if (text.includes('FROM productos')) return [{ id: 7 }];
        if (text.includes('FROM cotizacion_reservas')) return [];
        return [];
      },
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('INSERT INTO cotizacion_reservas')) {
          inserts.push({ sql: text, params });
        }
        if (text.includes('UPDATE cotizaciones')) {
          updates.push({ sql: text, params });
        }
        return { id: inserts.length, changes: 1 };
      }
    });

    const res = await requestJson('POST', '/api/almacen/solicitudes/601/asignaciones', token, {
      detalles: [{
        cotizacion_detalle_id: 701,
        asignaciones: [
          { producto_id: 7, tamano: 'BT', cantidad: 50 },
          { producto_id: 7, tamano: 'BT2', cantidad: 50 },
          { producto_id: 7, tamano: 'BT3', cantidad: 50 },
          { producto_id: 7, tamano: 'SP', cantidad: 50 }
        ]
      }]
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.estatus, 'Vendido');
    assert.equal(inserts.length, 4);
    assert.ok(
      updates.some(u => u.sql.includes("almacen_estado = 'RESERVADA'") && u.sql.includes("estatus = 'Vendido'")),
      'Debe ejecutar UPDATE en cotizaciones con almacen_estado = RESERVADA y estatus = Vendido'
    );
  } finally {
    db.get = origGet;
    db.transaction = origTx;
  }
});

test('TDD-TC-147: Idempotencia (replay) devuelve estatus Vendido y disponibilidad insuficiente (409) no actualiza ni inserta reservas', async () => {
  const origGet = db.get;
  const origTx = db.transaction;
  try {
    const user = makeUser('Almacen', 62);
    const token = makeToken(user);

    // 1. Replay case
    const replayUpdates = [];
    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.transaction = async callback => callback({
      get: async sql => {
        if (String(sql).includes('FROM cotizaciones')) {
          return {
            id: 602,
            flujo_version: 'CHG-025',
            condiciones_pago: 'CREDITO',
            estatus: 'Vendido',
            almacen_estado: 'RESERVADA'
          };
        }
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) {
          return [{ id: 702, cotizacion_id: 602, producto_id: 7, cantidad_ordenada: 100 }];
        }
        if (text.includes('FROM productos')) return [{ id: 7 }];
        if (text.includes('FROM cotizacion_reservas')) {
          return [
            { id: 1, cotizacion_id: 602, cotizacion_detalle_id: 702, producto_id: 7, tamano: 'BT1', lote: '', cantidad: 50, estado: 'ACTIVA' },
            { id: 2, cotizacion_id: 602, cotizacion_detalle_id: 702, producto_id: 7, tamano: 'BT2', lote: '', cantidad: 50, estado: 'ACTIVA' }
          ];
        }
        return [];
      },
      run: async (sql, params) => {
        if (String(sql).includes('UPDATE cotizaciones')) {
          replayUpdates.push({ sql: String(sql), params });
        }
        return { changes: 1 };
      }
    });

    const replayRes = await requestJson('POST', '/api/almacen/solicitudes/602/asignaciones', token, {
      detalles: [{
        cotizacion_detalle_id: 702,
        asignaciones: [
          { producto_id: 7, tamano: 'BT1', cantidad: 50 },
          { producto_id: 7, tamano: 'BT2', cantidad: 50 }
        ]
      }]
    });

    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.body.replay, true);
    assert.equal(replayRes.body.estatus, 'Vendido');
    assert.equal(replayUpdates.length, 0);

    // 2. Insufficient stock case (409)
    const failInserts = [];
    const failUpdates = [];
    db.transaction = async callback => callback({
      get: async (sql, params) => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) {
          return {
            id: 603,
            flujo_version: 'CHG-025',
            condiciones_pago: 'APARTADO',
            estatus: 'Autorizada',
            almacen_estado: 'PENDIENTE'
          };
        }
        if (text.includes('FROM almacen_movimientos')) {
          const size = String(params?.[1] || '').toUpperCase();
          return { cantidad: size === 'BT1' ? 20 : 100 };
        }
        if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) {
          return [{ id: 703, cotizacion_id: 603, producto_id: 7, cantidad_ordenada: 100 }];
        }
        if (text.includes('FROM productos')) return [{ id: 7 }];
        if (text.includes('FROM cotizacion_reservas')) return [];
        return [];
      },
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('INSERT INTO cotizacion_reservas')) failInserts.push(params);
        if (text.includes('UPDATE cotizaciones')) failUpdates.push(text);
        return { changes: 1 };
      }
    });

    const failRes = await requestJson('POST', '/api/almacen/solicitudes/603/asignaciones', token, {
      detalles: [{
        cotizacion_detalle_id: 703,
        asignaciones: [
          { producto_id: 7, tamano: 'BT1', cantidad: 50 },
          { producto_id: 7, tamano: 'BT2', cantidad: 50 }
        ]
      }]
    });

    assert.equal(failRes.status, 409);
    assert.equal(failInserts.length, 0);
    assert.equal(failUpdates.length, 0);
  } finally {
    db.get = origGet;
    db.transaction = origTx;
  }
});

test('TDD-TC-148: RBAC estricto rechaza con 403 a Coordinador y Asesor en disponibilidad y asignaciones (ADR-021)', async () => {
  const origGet = db.get;
  try {
    for (const [idx, role] of ['Coordinador', 'Asesor'].entries()) {
      const user = makeUser(role, 70 + idx);
      const token = makeToken(user);
      db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);

      const getRes = await requestJson('GET', '/api/almacen/solicitudes/601/disponibilidad', token);
      assert.equal(getRes.status, 403, `${role} debe recibir 403 en GET disponibilidad`);

      const postRes = await requestJson('POST', '/api/almacen/solicitudes/601/asignaciones', token, {
        detalles: [{ cotizacion_detalle_id: 701, asignaciones: [{ producto_id: 7, tamano: 'BT1', cantidad: 10 }] }]
      });
      assert.equal(postRes.status, 403, `${role} debe recibir 403 en POST asignaciones`);
    }
  } finally {
    db.get = origGet;
  }
});

test('TDD-TC-149: GET /api/almacen/existencias devuelve reservado y disponible sin alterar existencias físicas ni exponer lotes a Asesor', async () => {
  const origGet = db.get;
  const origAll = db.all;
  try {
    const mockDbForExistencias = role => {
      const user = makeUser(role, 80);
      const token = makeToken(user);
      db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
      db.all = async sql => {
        const text = String(sql);
        if (text.includes('FROM productos')) {
          return [
            { id: 7, producto: 'Híbrido Demo', tipo_categoria: 'Semilla', existencias: 220, reservado: 50 },
            { id: 8, producto: 'Agro Demo', tipo_categoria: 'Agroquímicos', existencias: 40, reservado: 0 }
          ];
        }
        if (text.includes('FROM cotizacion_reservas')) {
          return [
            { producto_id: 7, lote: 'LOTE-A', tamano: 'BT1', reservado: 50 }
          ];
        }
        if (text.includes('FROM almacen_movimientos')) {
          return [
            { producto_id: 7, lote: 'LOTE-A', tamano: 'BT1', stock: 120, reservado: 50 },
            { producto_id: 7, lote: 'LOTE-B', tamano: 'BT2', stock: 100, reservado: 0 }
          ];
        }
        return [];
      };
      return token;
    };

    for (const role of ['Almacen', 'Administrador']) {
      const token = mockDbForExistencias(role);
      const res = await requestJson('GET', '/api/almacen/existencias', token);
      assert.equal(res.status, 200);
      const prod = res.body.find(item => Number(item.id) === 7);
      assert.ok(prod);
      assert.equal(prod.existencias, 220);
      assert.equal(prod.reservado, 50);
      assert.equal(prod.disponible, 170);
      assert.ok(Array.isArray(prod.lotes) && prod.lotes.length === 2, `${role} debe recibir desglose de lotes`);
      const lotA = prod.lotes.find(item => item.lote === 'LOTE-A');
      assert.ok(lotA);
      assert.equal(lotA.stock, 120);
      assert.equal(lotA.reservado, 50);
      assert.equal(lotA.disponible, 70);
    }

    const asesorToken = mockDbForExistencias('Asesor');
    const asesorRes = await requestJson('GET', '/api/almacen/existencias', asesorToken);
    assert.equal(asesorRes.status, 200);
    const asesorProd = asesorRes.body.find(item => Number(item.id) === 7);
    assert.ok(asesorProd);
    assert.equal(asesorProd.existencias, 220);
    assert.equal(asesorProd.reservado, 50);
    assert.equal(asesorProd.disponible, 170);
    assert.equal(Object.hasOwn(asesorProd, 'lotes'), false, 'Asesor no debe ver desglose de lotes');
  } finally {
    db.get = origGet;
    db.all = origAll;
  }
});

test('TDD-TC-150: UI en index.html y app.js soporta asignación desde Kanban/Detalle y muestra disponible y reservado en stock-tbody', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

  const detailModalHtml = indexHtml.slice(
    indexHtml.indexOf('id="quote-detail-modal"'),
    indexHtml.indexOf('id="quote-detail-edit-mode"')
  );
  assert.match(detailModalHtml, /id="btn-assign-warehouse-sizes"/, 'Modal de Detalle de Cotización debe incluir #btn-assign-warehouse-sizes');

  const showDetailsSection = appJs.slice(
    appJs.indexOf('async function showQuoteDetails'),
    appJs.indexOf('window.toggleQuoteEditMode =')
  );
  assert.match(showDetailsSection, /btn-assign-warehouse-sizes/, 'showQuoteDetails debe controlar #btn-assign-warehouse-sizes');
  assert.match(showDetailsSection, /canAssignWarehouseSizes\(\)/, 'showQuoteDetails debe restringir asignación a roles autorizados (ADR-021)');
  assert.match(showDetailsSection, /almacen_estado\s*===\s*['"]PENDIENTE['"]/, 'showQuoteDetails debe validar almacen_estado === PENDIENTE');

  const kanbanSection = appJs.slice(
    appJs.indexOf('const card = document.createElement'),
    appJs.indexOf('const prospectColumn = columns.Borrador')
  );
  assert.match(kanbanSection, /openWarehouseAssignment\(/, 'Tarjeta Kanban debe incluir acción openWarehouseAssignment');
  assert.match(kanbanSection, /canAssignWarehouseSizes\(\)/, 'Botón Kanban debe mostrarse solo a roles autorizados (ADR-021)');
  assert.match(kanbanSection, /almacen_estado\s*===\s*['"]PENDIENTE['"]/, 'Botón Kanban debe mostrarse solo si almacen_estado === PENDIENTE');

  const openAssignmentSection = appJs.slice(
    appJs.indexOf('window.openWarehouseAssignment ='),
    appJs.indexOf('function updateWarehouseMovementLayout()')
  );
  assert.match(openAssignmentSection, /allQuotes\.find/, 'openWarehouseAssignment debe buscar en allQuotes además de warehouseRequests');
  assert.match(openAssignmentSection, /loadCRMBoardData\(/, 'Confirmar asignación debe recargar el Kanban con loadCRMBoardData()');

  const stockSection = appJs.slice(
    appJs.indexOf("const stockTbody = document.getElementById('stock-tbody')"),
    appJs.indexOf('window.toggleProductLotsRow =')
  );
  assert.match(stockSection, /disponible/, 'stock-tbody debe renderizar disponible');
  assert.match(stockSection, /reservado/, 'stock-tbody debe renderizar reservado');
});

test('TDD-TC-151: Reversión de entrega en moveQuoteStatus lleva CHG-025 en Entregado con direction up a Vendido', () => {
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');
  const moveSection = appJs.slice(
    appJs.indexOf('window.moveQuoteStatus ='),
    appJs.indexOf('// Modal helpers')
  );

  assert.match(
    moveSection,
    /direction\s*===\s*['"]up['"]\s*&&\s*currentStatus\s*===\s*['"]Entregado['"][\s\S]*?targetStatus\s*=\s*['"]Vendido['"]/,
    'moveQuoteStatus debe revertir CHG-025 desde Entregado hacia Vendido (no Autorizada)'
  );
  assert.doesNotMatch(
    moveSection,
    /condition\s*===\s*['"]CONTADO['"]\s*\?\s*['"]Vendido['"]\s*:\s*['"]Autorizada['"]/,
    'moveQuoteStatus no debe regresar CREDITO/APARTADO a Autorizada al revertir entrega'
  );
});
