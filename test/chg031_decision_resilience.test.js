'use strict';

// TDD-TC-139..141 — CHG-031 Resiliencia de esquema en decisión comercial y confirmaciones Contado

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-chg031-secret';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const db = require('../db');
const { app } = require('../server');

function makeUser(nivelRol = 'Administrador') {
  return {
    id: 1,
    nombre: 'Admin Prueba',
    usuario: 'admin.chg031',
    nivel_rol: nivelRol,
    email: 'admin@example.test',
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
      body: JSON.stringify(body)
    });
    const json = await res.json();
    return { status: res.status, body: json };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('TDD-TC-139: PUT /api/cotizaciones/:id/decision autoriza y rechaza adaptando UPDATE cuando falta columna aditiva (42703)', async () => {
  const origGet = db.get;
  const origAll = db.all;
  const origTx = db.transaction;
  const origEnsure = db.ensureQuotationsSchema;

  try {
    const user = makeUser('Administrador');
    const token = makeToken(user);
    const quote = {
      id: 301,
      condiciones_pago: 'CREDITO',
      flujo_version: 'CHG-025',
      estatus: 'Pendiente',
      almacen_estado: null
    };
    let ensureCalled = 0;

    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.all = async () => [];
    db.ensureQuotationsSchema = async () => { ensureCalled += 1; };
    db.transaction = async callback => callback({
      get: async sql => (String(sql).includes('FROM cotizaciones') ? quote : null),
      all: async () => [],
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('decision_por_id')) {
          const err = new Error('column "decision_por_id" of relation "cotizaciones" does not exist');
          err.code = '42703';
          throw err;
        }
        if (text.includes('almacen_estado')) {
          const err = new Error('column "almacen_estado" of relation "cotizaciones" does not exist');
          err.code = '42703';
          throw err;
        }
        quote.estatus = params[0];
        return { changes: 1 };
      }
    });

    const authRes = await requestJson('PUT', '/api/cotizaciones/301/decision', token, { decision: 'AUTORIZAR' });
    assert.equal(authRes.status, 200);
    assert.equal(authRes.body.estatus, 'Autorizada');
    assert.ok(ensureCalled >= 1, 'Debe invocar ensureQuotationsSchema al detectar 42703');

    quote.estatus = 'Pendiente';
    const rejectRes = await requestJson('PUT', '/api/cotizaciones/301/decision', token, { decision: 'RECHAZAR', motivo: 'Límite de crédito' });
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.estatus, 'Rechazada');
  } finally {
    db.get = origGet;
    db.all = origAll;
    db.transaction = origTx;
    db.ensureQuotationsSchema = origEnsure;
  }
});

test('TDD-TC-140: PUT /api/cotizaciones/:id/confirmaciones-contado adapta UPDATE cuando falta columna de marca temporal (42703)', async () => {
  const origGet = db.get;
  const origAll = db.all;
  const origTx = db.transaction;
  const origEnsure = db.ensureQuotationsSchema;

  try {
    const user = makeUser('Coordinador');
    const token = makeToken(user);
    const quote = {
      id: 302,
      condiciones_pago: 'CONTADO',
      flujo_version: 'CHG-025',
      estatus: 'Pendiente',
      venta_confirmada: 0,
      cobro_confirmado: 0,
      almacen_estado: null
    };

    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.all = async () => [];
    db.ensureQuotationsSchema = async () => {};
    db.transaction = async callback => callback({
      get: async sql => (String(sql).includes('FROM cotizaciones') ? quote : null),
      all: async () => [],
      run: async (sql, params) => {
        const text = String(sql);
        if (text.includes('venta_confirmada_en')) {
          const err = new Error('column "venta_confirmada_en" of relation "cotizaciones" does not exist');
          err.code = '42703';
          throw err;
        }
        quote.venta_confirmada = params[0];
        quote.cobro_confirmado = params[1];
        return { changes: 1 };
      }
    });

    const res = await requestJson('PUT', '/api/cotizaciones/302/confirmaciones-contado', token, { venta_confirmada: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.venta_confirmada, true);
    assert.equal(quote.venta_confirmada, 1);
  } finally {
    db.get = origGet;
    db.all = origAll;
    db.transaction = origTx;
    db.ensureQuotationsSchema = origEnsure;
  }
});

test('TDD-TC-141: PUT /api/cotizaciones/:id/decision devuelve 500 inmediato ante errores ajenos al esquema', async () => {
  const origGet = db.get;
  const origAll = db.all;
  const origTx = db.transaction;

  try {
    const user = makeUser('Administrador');
    const token = makeToken(user);
    let attempts = 0;

    db.get = async sql => (String(sql).includes('FROM asesores') ? user : null);
    db.all = async () => [];
    db.transaction = async () => {
      attempts += 1;
      throw new Error('ECONNREFUSED');
    };

    const res = await requestJson('PUT', '/api/cotizaciones/303/decision', token, { decision: 'AUTORIZAR' });
    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'No fue posible registrar la decisión.');
    assert.equal(attempts, 1);
  } finally {
    db.get = origGet;
    db.all = origAll;
    db.transaction = origTx;
  }
});
