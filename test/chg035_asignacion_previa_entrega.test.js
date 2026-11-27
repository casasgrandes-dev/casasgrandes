'use strict';

// TDD-TC-156..159 — CHG-035 Asignación previa (Almacen/Administrador) y paso directo a Entrega

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-chg035-secret-at-least-32-chars';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const db = require('../db');
const { app } = require('../server');

const root = path.join(__dirname, '..');

function makeUser(nivelRol, id = 95) {
  return {
    id,
    nombre: `${nivelRol} Prueba CHG-035`,
    usuario: `${nivelRol.toLowerCase()}.chg035`,
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

test('TDD-TC-156: RBAC ADR-021 permite asignación a Administrador y Almacen, bloquea Coordinador/Asesor y limita Almacen a Entregado sobre RESERVADA', async () => {
  const origGet = db.get;
  const origAll = db.all;
  const origTx = db.transaction;
  try {
    // 1. Administrador can access /api/almacen/solicitudes and /disponibilidad
    const admin = makeUser('Administrador', 91);
    const adminToken = makeToken(admin);
    db.get = async sql => (String(sql).includes('FROM asesores') ? admin : null);
    db.all = async sql => {
      const text = String(sql);
      if (text.includes('FROM cotizaciones q')) {
        return [{ id: 951, folio_cotizacion: 'CG-951', condiciones_pago: 'APARTADO', almacen_estado: 'PENDIENTE', estatus: 'Autorizada', cliente_nombre: 'Prod Demo' }];
      }
      if (text.includes('FROM cotizacion_detalles')) return [{ id: 1051, producto_id: 7, cantidad_ordenada: 100 }];
      if (text.includes('FROM almacen_movimientos')) return [{ tamano: 'BT1', lote: 'LOTE-A', fisico: 120, reservado: 0 }];
      return [];
    };

    const adminReqs = await requestJson('GET', '/api/almacen/solicitudes', adminToken);
    assert.equal(adminReqs.status, 200, 'Administrador debe poder consultar /api/almacen/solicitudes');

    const adminDisp = await requestJson('GET', '/api/almacen/solicitudes/951/disponibilidad', adminToken);
    assert.equal(adminDisp.status, 200, 'Administrador debe poder consultar disponibilidad de solicitud');

    // 2. Coordinador and Asesor still get 403 on assignment routes
    for (const role of ['Coordinador', 'Asesor']) {
      const u = makeUser(role, 92);
      const t = makeToken(u);
      db.get = async sql => (String(sql).includes('FROM asesores') ? u : null);
      const disp = await requestJson('GET', '/api/almacen/solicitudes/951/disponibilidad', t);
      assert.equal(disp.status, 403, `${role} debe recibir 403 en disponibilidad`);
      const assign = await requestJson('POST', '/api/almacen/solicitudes/951/asignaciones', t, {
        detalles: [{ cotizacion_detalle_id: 1051, asignaciones: [{ producto_id: 7, tamano: 'BT1', cantidad: 100 }] }]
      });
      assert.equal(assign.status, 403, `${role} debe recibir 403 en asignaciones`);
    }

    // 3. Almacen gets 403 on Cancelada, reversion, and LEGACY quotes in PUT /api/cotizaciones/:id/status
    const almacen = makeUser('Almacen', 93);
    const almacenToken = makeToken(almacen);
    db.get = async sql => (String(sql).includes('FROM asesores') ? almacen : null);
    let activeQuote = { id: 952, flujo_version: 'CHG-025', estatus: 'Vendido', almacen_estado: 'RESERVADA' };
    db.transaction = async cb => cb({
      get: async sql => (String(sql).includes('FROM cotizaciones') ? { ...activeQuote } : null),
      all: async () => [],
      run: async () => ({ changes: 1 })
    });

    const cancelRes = await requestJson('PUT', '/api/cotizaciones/952/status', almacenToken, { estatus: 'Cancelada' });
    assert.equal(cancelRes.status, 403, 'Almacen no puede cancelar solicitudes');

    activeQuote = { id: 952, flujo_version: 'CHG-025', estatus: 'Entregado', almacen_estado: 'ENTREGADA' };
    const revertRes = await requestJson('PUT', '/api/cotizaciones/952/status', almacenToken, { estatus: 'Vendido' });
    assert.equal(revertRes.status, 403, 'Almacen no puede revertir entregas');

    activeQuote = { id: 953, flujo_version: 'LEGACY', estatus: 'Vendido', almacen_estado: null };
    const legacyRes = await requestJson('PUT', '/api/cotizaciones/953/status', almacenToken, { estatus: 'Entregado' });
    assert.equal(legacyRes.status, 403, 'Almacen no puede mover cotizaciones LEGACY');
  } finally {
    db.get = origGet;
    db.all = origAll;
    db.transaction = origTx;
  }
});

test('TDD-TC-157: Almacen entrega pedido RESERVADA descontando tamaño/lote reservados y recibe 409 si está PENDIENTE', async () => {
  const origGet = db.get;
  const origTx = db.transaction;
  try {
    const almacen = makeUser('Almacen', 94);
    const token = makeToken(almacen);
    const movesInserted = [];

    db.get = async sql => (String(sql).includes('FROM asesores') ? almacen : null);

    // 1. PENDIENTE -> 409
    db.transaction = async cb => cb({
      get: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) {
          return { id: 954, folio_cotizacion: 'CG-954', flujo_version: 'CHG-025', estatus: 'Autorizada', almacen_estado: 'PENDIENTE' };
        }
        return null;
      },
      all: async () => [],
      run: async () => ({ changes: 1 })
    });
    const pendingRes = await requestJson('PUT', '/api/cotizaciones/954/status', token, { estatus: 'Entregado' });
    assert.equal(pendingRes.status, 409, 'No se puede entregar una solicitud PENDIENTE sin asignación previa');

    // 2. RESERVADA -> 200 and physical movement with exact tamano and lote
    db.transaction = async cb => cb({
      get: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones')) {
          return { id: 955, folio_cotizacion: 'CG-955', flujo_version: 'CHG-025', estatus: 'Vendido', almacen_estado: 'RESERVADA' };
        }
        if (text.includes('SELECT tipo_movimiento FROM almacen_movimientos')) return null;
        if (text.includes('SELECT existencias_resultantes')) return { existencias_resultantes: 150 };
        if (text.includes('FROM almacen_movimientos')) return { cantidad: 150 };
        return null;
      },
      all: async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizacion_detalles')) return [{ id: 1055, producto_id: 7, cantidad_ordenada: 100 }];
        if (text.includes('FROM productos')) return [{ id: 7 }];
        if (text.includes('FROM cotizacion_reservas')) {
          return [{ id: 1, cotizacion_id: 955, cotizacion_detalle_id: 1055, producto_id: 7, tamano: 'BT2', lote: 'LOTE-XYZ', cantidad: 100, estado: 'ACTIVA' }];
        }
        return [];
      },
      run: async (sql, params) => {
        if (String(sql).includes('INSERT INTO almacen_movimientos')) {
          movesInserted.push({ sql: String(sql), params });
        }
        return { id: 1, changes: 1 };
      }
    });

    const deliverRes = await requestJson('PUT', '/api/cotizaciones/955/status', token, { estatus: 'Entregado' });
    assert.equal(deliverRes.status, 200, 'Almacen debe poder marcar como Entregado una solicitud RESERVADA');
    assert.equal(movesInserted.length, 1);
    assert.ok(movesInserted[0].params.includes('BT2'));
    assert.ok(movesInserted[0].params.includes('LOTE-XYZ'));
  } finally {
    db.get = origGet;
    db.transaction = origTx;
  }
});

test('TDD-TC-158: GET /api/cotizaciones adjunta reservas activas solo para Almacen y Administrador', async () => {
  const origGet = db.get;
  const origAll = db.all;
  try {
    const setupRole = role => {
      const user = makeUser(role, 96);
      const token = makeToken(user);
      db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
      db.all = async sql => {
        const text = String(sql);
        if (text.includes('FROM cotizaciones q')) {
          return [{
            id: 956,
            folio_cotizacion: 'CG-956',
            cliente_nombre: 'Productor Demo',
            asesor_nombre: 'Asesor Demo',
            flujo_version: 'CHG-025',
            condiciones_pago: 'CREDITO',
            estatus: 'Vendido',
            almacen_estado: 'RESERVADA',
            total_mxn: 100000
          }];
        }
        if (text.includes('FROM cotizacion_detalles d')) {
          return [{ id: 1056, producto_id: 7, producto_nombre: 'Híbrido Demo', cantidad_ordenada: 50, tamano: 'BT1' }];
        }
        if (text.includes('FROM cotizacion_reservas')) {
          return [{ cotizacion_detalle_id: 1056, producto_id: 7, tamano: 'BT1', lote: 'LOTE-A', cantidad: 50, estado: 'ACTIVA' }];
        }
        return [];
      };
      return token;
    };

    for (const role of ['Almacen', 'Administrador']) {
      const res = await requestJson('GET', '/api/cotizaciones', setupRole(role));
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body[0].reservas) && res.body[0].reservas.length === 1, `${role} debe recibir reservas activas`);
      assert.equal(res.body[0].reservas[0].lote, 'LOTE-A');
    }

    for (const role of ['Coordinador', 'Asesor']) {
      const res = await requestJson('GET', '/api/cotizaciones', setupRole(role));
      assert.equal(res.status, 200);
      assert.equal(Object.hasOwn(res.body[0], 'reservas'), false, `${role} no debe recibir desglose de reservas por tamaño/lote`);
    }
  } finally {
    db.get = origGet;
    db.all = origAll;
  }
});

test('TDD-TC-159: UI habilita asignación a Almacen/Administrador y botón Marcar como Entregado en escritorio y móvil', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');
  const security = require('../public/js/security');

  assert.equal(security.isAllowedHandler('event.stopPropagation(); deliverReservedQuote(955, event)'), true, 'security.js debe autorizar deliverReservedQuote');
  assert.match(indexHtml, /id="btn-deliver-reserved-quote"/, 'Detalle de Cotización debe incluir #btn-deliver-reserved-quote');
  assert.match(indexHtml, /js\/app\.js\?v=20261126-chg035/, 'public/index.html debe actualizar la versión de js/app.js');

  assert.match(appJs, /function canAssignWarehouseSizes\(\)/, 'app.js debe definir canAssignWarehouseSizes()');
  assert.match(appJs, /function canDeliverReservedQuote\(\)/, 'app.js debe definir canDeliverReservedQuote()');
  assert.match(appJs, /window\.deliverReservedQuote\s*=/, 'app.js debe exponer window.deliverReservedQuote');
  assert.match(appJs, /Marcar como Entregado/, 'UI debe mostrar acción Marcar como Entregado para solicitudes RESERVADA');
});
