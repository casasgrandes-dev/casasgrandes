'use strict';

// TDD-TC-152..155 — CHG-034 Asignación integral por tamaños y lotes para Almacén

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-chg034-secret-at-least-32-chars';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const db = require('../db');
const { app } = require('../server');

const root = path.join(__dirname, '..');

function makeUser(nivelRol, id = 84) {
  return {
    id,
    nombre: `${nivelRol} Prueba CHG-034`,
    usuario: `${nivelRol.toLowerCase()}.chg034`,
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

test('TDD-TC-152: GET /api/cotizaciones permite lectura (200) a Almacen con almacen_estado normalizado y bloquea mutaciones (403)', async () => {
  const origGet = db.get;
  const origAll = db.all;
  try {
    const user = makeUser('Almacen', 84);
    const token = makeToken(user);

    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.all = async sql => {
      const text = String(sql);
      if (text.includes('FROM cotizaciones q')) {
        return [{
          id: 801,
          folio_cotizacion: 'CG-2026-801',
          cliente_id: 10,
          asesor_id: 3,
          cliente_nombre: 'Agricultor Demo',
          asesor_nombre: 'Asesor Demo',
          flujo_version: 'CHG-025',
          condiciones_pago: 'CREDITO',
          estatus: 'Autorizada',
          almacen_estado: null,
          total_mxn: 120000
        }];
      }
      if (text.includes('FROM cotizacion_detalles d')) {
        return [{
          id: 901,
          cotizacion_id: 801,
          producto_id: 7,
          producto_nombre: 'Híbrido Demo',
          tipo_categoria: 'Semilla',
          cantidad_ordenada: 100,
          tamano: 'BT1'
        }];
      }
      return [];
    };

    const getRes = await requestJson('GET', '/api/cotizaciones', token);
    assert.equal(getRes.status, 200, 'Almacen debe poder consultar GET /api/cotizaciones para el Canal de Ventas');
    assert.equal(getRes.body.length, 1);
    assert.equal(getRes.body[0].almacen_estado, 'PENDIENTE', 'Solicitud Autorizada con almacen_estado null debe normalizarse a PENDIENTE');
    assert.equal(getRes.body[0].items[0].tamano, 'BT1', 'Almacen debe conservar visibilidad de tamano en items');

    const decisionRes = await requestJson('PUT', '/api/cotizaciones/801/decision', token, { decision: 'AUTORIZAR' });
    assert.equal(decisionRes.status, 403, 'Almacen no debe poder autorizar ni rechazar solicitudes');

    const createRes = await requestJson('POST', '/api/cotizaciones', token, { cliente_id: 10, condiciones_pago: 'CREDITO', items: [] });
    assert.equal(createRes.status, 403, 'Almacen no debe poder crear cotizaciones');
  } finally {
    db.get = origGet;
    db.all = origAll;
  }
});

test('TDD-TC-153: ensureQuotationsSchema asegura cotizacion_reservas (lote) y GET disponibilidad preserva lotes con o sin tamaño previo', async () => {
  const dbSource = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
  const ensureFnSection = dbSource.slice(
    dbSource.indexOf('async function ensureQuotationsSchema()'),
    dbSource.indexOf('const tableColumnCache = new Map()')
  );
  assert.match(ensureFnSection, /CREATE TABLE IF NOT EXISTS cotizacion_reservas/, 'ensureQuotationsSchema debe crear cotizacion_reservas');
  assert.match(ensureFnSection, /ALTER TABLE cotizacion_reservas ADD COLUMN IF NOT EXISTS lote TEXT/, 'ensureQuotationsSchema debe asegurar columna lote en cotizacion_reservas');
  assert.match(ensureFnSection, /uq_cotizacion_reserva_activa_detalle_tamano_lote/, 'ensureQuotationsSchema debe asegurar índice único multi-lote');

  const origGet = db.get;
  const origAll = db.all;
  const origEnsure = db.ensureQuotationsSchema;
  const origEnsureMoves = db.ensureWarehouseMovementsSchema;
  try {
    const user = makeUser('Almacen', 85);
    const token = makeToken(user);
    let ensureCalled = 0;
    let failFirstSubquery = true;

    db.ensureQuotationsSchema = async () => {
      ensureCalled += 1;
    };
    db.ensureWarehouseMovementsSchema = async () => {};
    db.get = async sql => {
      const text = String(sql);
      if (text.includes('FROM asesores')) return user;
      if (text.includes('FROM productos')) {
        return {
          id: 7,
          producto: 'Híbrido Demo',
          tipo_categoria: 'Semilla',
          tamanos: 'BT1, BT2, BT3'
        };
      }
      return null;
    };
    db.all = async sql => {
      const text = String(sql);
      if (text.includes('FROM cotizacion_detalles')) {
        return [{ id: 902, producto_id: 7, cantidad_ordenada: 100 }];
      }
      if (text.includes('FROM almacen_movimientos')) {
        if (failFirstSubquery && text.includes('FROM cotizacion_reservas')) {
          failFirstSubquery = false;
          const err = new Error('column r.lote does not exist');
          err.code = '42703';
          throw err;
        }
        const filtersOutEmptySize = /m\.tamano\s+IS\s+NOT\s+NULL\s+AND\s+BTRIM\(m\.tamano\)\s*<>\s*''/i.test(text);
        const rows = [
          { tamano: '', lote: 'LOTE-SIN-TAMANO', fisico: 60, reservado: 0 },
          { tamano: 'BT2', lote: 'LOTE-CON-TAMANO', fisico: 50, reservado: 10 }
        ];
        return filtersOutEmptySize ? rows.filter(r => Boolean(r.tamano)) : rows;
      }
      return [];
    };

    const res = await requestJson('GET', '/api/almacen/solicitudes/802/disponibilidad', token);
    assert.equal(res.status, 200);
    assert.ok(ensureCalled >= 1, 'Debe invocar ensureQuotationsSchema al recuperar de 42703');
    const item = res.body[0];
    assert.ok(Array.isArray(item.lotes), 'Debe incluir lotes');
    assert.equal(item.lotes.length, 2, 'Debe conservar tanto lotes con tamaño como lotes sin tamaño previo');
    assert.ok(item.lotes.some(l => l.lote === 'LOTE-SIN-TAMANO' && l.disponible === 60));
    assert.ok(item.lotes.some(l => l.lote === 'LOTE-CON-TAMANO' && l.tamano === 'BT2' && l.disponible === 40));
    assert.ok(Array.isArray(item.tamanos_catalogo) && item.tamanos_catalogo.includes('BT1'), 'Debe exponer tamanos_catalogo');
  } finally {
    db.get = origGet;
    db.all = origAll;
    db.ensureQuotationsSchema = origEnsure;
    db.ensureWarehouseMovementsSchema = origEnsureMoves;
  }
});

test('TDD-TC-154: POST /api/almacen/solicitudes/:id/asignaciones autorrecupera esquema, acepta almacen_estado null y reserva sobre lotes sin tamaño previo', async () => {
  const origGet = db.get;
  const origTx = db.transaction;
  const origEnsure = db.ensureQuotationsSchema;
  const origEnsureMoves = db.ensureWarehouseMovementsSchema;
  try {
    const user = makeUser('Almacen', 86);
    const token = makeToken(user);
    const inserts = [];
    const updates = [];
    let ensureCalls = 0;
    let failFirstAttempt = true;

    db.ensureQuotationsSchema = async () => {
      ensureCalls += 1;
    };
    db.ensureWarehouseMovementsSchema = async () => {};
    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.transaction = async callback => {
      if (failFirstAttempt) {
        failFirstAttempt = false;
        const err = new Error('column "lote" of relation "cotizacion_reservas" does not exist');
        err.code = '42703';
        throw err;
      }
      return callback({
        get: async (sql, params) => {
          const text = String(sql);
          if (text.includes('FROM cotizaciones')) {
            return {
              id: 803,
              flujo_version: 'CHG-025',
              condiciones_pago: 'CREDITO',
              estatus: 'Autorizada',
              almacen_estado: null
            };
          }
          if (text.includes('FROM almacen_movimientos')) {
            const supportsUntypedLot = /BTRIM\(COALESCE\(tamano,\s*''\)\)\s*=\s*''/i.test(text);
            if (params && params.length >= 3) {
              const lot = String(params[2]).toUpperCase();
              if (lot === 'LOTE-SIN-TAMANO') {
                return { cantidad: supportsUntypedLot ? 60 : 0 };
              }
              return { cantidad: 50 };
            }
            const size = String(params?.[1] || '').toUpperCase();
            if (size === 'BT1') {
              return { cantidad: supportsUntypedLot ? 60 : 0 };
            }
            return { cantidad: 50 };
          }
          if (text.includes('FROM cotizacion_reservas')) return { cantidad: 0 };
          return null;
        },
        all: async sql => {
          const text = String(sql);
          if (text.includes('FROM cotizacion_detalles')) {
            return [{ id: 903, cotizacion_id: 803, producto_id: 7, cantidad_ordenada: 100 }];
          }
          if (text.includes('FROM productos')) return [{ id: 7 }];
          if (text.includes('FROM cotizacion_reservas')) return [];
          return [];
        },
        run: async (sql, params) => {
          const text = String(sql);
          if (text.includes('INSERT INTO cotizacion_reservas')) inserts.push({ sql: text, params });
          if (text.includes('UPDATE cotizaciones')) updates.push({ sql: text, params });
          return { id: inserts.length, changes: 1 };
        }
      });
    };

    const res = await requestJson('POST', '/api/almacen/solicitudes/803/asignaciones', token, {
      detalles: [{
        cotizacion_detalle_id: 903,
        asignaciones: [
          { producto_id: 7, tamano: 'BT1', lote: 'LOTE-SIN-TAMANO', cantidad: 60 },
          { producto_id: 7, tamano: 'BT2', lote: 'LOTE-CON-TAMANO', cantidad: 40 }
        ]
      }]
    });

    assert.equal(res.status, 201);
    assert.equal(ensureCalls, 1, 'Debe autorrecuperar esquema ante error 42703 en cotizacion_reservas');
    assert.equal(res.body.estatus, 'Vendido');
    assert.equal(inserts.length, 2);
    assert.ok(updates.some(u => u.sql.includes("almacen_estado = 'RESERVADA'") && u.sql.includes("estatus = 'Vendido'")));
  } finally {
    db.get = origGet;
    db.transaction = origTx;
    db.ensureQuotationsSchema = origEnsure;
    db.ensureWarehouseMovementsSchema = origEnsureMoves;
  }
});

test('TDD-TC-155: loadCRMBoardData, openWarehouseAssignment y security.js permiten a Almacen cargar Canal de Ventas y seleccionar tamaños y lotes', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');
  const security = require('../public/js/security');

  assert.equal(security.isAllowedHandler('openWarehouseAssignment(101)'), true, 'security.js debe permitir openWarehouseAssignment');
  assert.equal(security.isAllowedHandler('event.stopPropagation(); openWarehouseAssignment(101)'), true, 'security.js debe permitir openWarehouseAssignment desde Kanban');
  assert.equal(security.isAllowedHandler('addWarehouseAssignmentRow(901, 7)'), true, 'security.js debe permitir addWarehouseAssignmentRow');
  assert.equal(security.isAllowedHandler('onWarehouseLotSizeChange(this)'), true, 'security.js debe permitir onWarehouseLotSizeChange');

  assert.doesNotMatch(
    indexHtml,
    /js\/app\.js\?v=20261104-lotes/,
    'public/index.html debe actualizar la versión de cache-busting de js/app.js'
  );

  const crmBoardSection = appJs.slice(
    appJs.indexOf('async function loadCRMBoardData()'),
    appJs.indexOf('function renderKanbanBoard(')
  );
  assert.match(
    crmBoardSection,
    /user\??\.nivel_rol\s*!==\s*['"]Almacen['"]|user\??\.nivel_rol\s*===\s*['"]Almacen['"]/,
    'loadCRMBoardData no debe bloquear a Almacen por rutas exclusivas de roles comerciales (/api/clientes, /api/prospectos)'
  );

  const assignmentSection = appJs.slice(
    appJs.indexOf('window.openWarehouseAssignment ='),
    appJs.indexOf('function updateWarehouseMovementLayout()')
  );
  assert.match(
    assignmentSection,
    /warehouse-lot-size-select|addWarehouseAssignmentRow/,
    'openWarehouseAssignment debe ofrecer selectores de tamaño y lote para asignar inventario'
  );
});
