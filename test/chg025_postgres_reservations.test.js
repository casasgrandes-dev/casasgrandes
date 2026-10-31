'use strict';

// TDD-TC-118 — PostgreSQL real: concurrencia e idempotencia de reservas CHG-025.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const postgresUrl = String(process.env.CHG025_TEST_POSTGRES_URL || '').trim();

function scopedConnectionString(baseUrl, schema) {
  const url = new URL(baseUrl);
  url.searchParams.set('options', `-csearch_path=${schema}`);
  url.searchParams.set('application_name', 'chg025-reservation-test');
  return url.toString();
}

function poolOptions(connectionString) {
  const local = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  return {
    connectionString,
    ssl: local || connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
  };
}

test('TDD-TC-118: dos reservas concurrentes no sobreasignan y el replay no duplica', {
  skip: postgresUrl ? false : 'Requiere CHG025_TEST_POSTGRES_URL apuntando a PostgreSQL aislado.'
}, async () => {
  const schema = `chg025_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  assert.match(schema, /^[a-z0-9_]+$/);

  const adminPool = new Pool(poolOptions(postgresUrl));
  let db;
  let server;
  try {
    const setup = await adminPool.connect();
    try {
      await setup.query(`CREATE SCHEMA "${schema}"`);
      await setup.query(`SET search_path TO "${schema}"`);
      await setup.query(`
        CREATE TABLE asesores (
          id INTEGER PRIMARY KEY,
          nombre TEXT NOT NULL,
          usuario TEXT NOT NULL,
          nivel_rol TEXT NOT NULL,
          email TEXT NOT NULL,
          telefono TEXT,
          activo INTEGER NOT NULL DEFAULT 1,
          session_version INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE productos (
          id INTEGER PRIMARY KEY,
          producto TEXT NOT NULL
        );
        CREATE TABLE cotizaciones (
          id INTEGER PRIMARY KEY,
          flujo_version TEXT NOT NULL,
          almacen_estado TEXT,
          condiciones_pago TEXT NOT NULL
        );
        CREATE TABLE cotizacion_detalles (
          id INTEGER PRIMARY KEY,
          cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
          producto_id INTEGER NOT NULL REFERENCES productos(id),
          cantidad_ordenada NUMERIC(14,3) NOT NULL
        );
        CREATE TABLE almacen_movimientos (
          id SERIAL PRIMARY KEY,
          producto_id INTEGER NOT NULL REFERENCES productos(id),
          tamano TEXT,
          cantidad_entrante NUMERIC(14,3) NOT NULL DEFAULT 0,
          cantidad_saliente NUMERIC(14,3) NOT NULL DEFAULT 0
        );
        CREATE TABLE cotizacion_reservas (
          id SERIAL PRIMARY KEY,
          cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
          cotizacion_detalle_id INTEGER NOT NULL REFERENCES cotizacion_detalles(id) ON DELETE CASCADE,
          producto_id INTEGER NOT NULL REFERENCES productos(id),
          tamano TEXT NOT NULL,
          cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
          estado TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'CONSUMIDA', 'LIBERADA')),
          reservado_por_id INTEGER NOT NULL REFERENCES asesores(id),
          reservado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX uq_cotizacion_reserva_activa_detalle_tamano
          ON cotizacion_reservas (cotizacion_detalle_id, UPPER(tamano))
          WHERE estado = 'ACTIVA';
        CREATE INDEX idx_cotizacion_reservas_disponibilidad
          ON cotizacion_reservas (producto_id, UPPER(tamano), estado);
      `);
      await setup.query(`
        INSERT INTO asesores (id, nombre, usuario, nivel_rol, email)
        VALUES (1, 'Almacén QA', 'almacen.qa', 'Almacen', 'almacen.qa@example.test');
        INSERT INTO productos (id, producto) VALUES (7, 'Híbrido QA');
        INSERT INTO cotizaciones (id, flujo_version, almacen_estado, condiciones_pago)
        VALUES
          (101, 'CHG-025', 'PENDIENTE', 'APARTADO'),
          (102, 'CHG-025', 'PENDIENTE', 'APARTADO');
        INSERT INTO cotizacion_detalles (id, cotizacion_id, producto_id, cantidad_ordenada)
        VALUES
          (201, 101, 7, 60),
          (202, 102, 7, 60);
        INSERT INTO almacen_movimientos (producto_id, tamano, cantidad_entrante, cantidad_saliente)
        VALUES (7, 'BT1', 100, 0);
      `);
    } finally {
      setup.release();
    }

    process.env.JWT_SECRET = 'test-only-chg025-postgres-secret-at-least-32-characters';
    process.env.NODE_ENV = 'test';
    process.env.PGSSL = 'false';
    process.env.SKIP_INIT_SCHEMA = 'true';
    process.env.DATABASE_URL = scopedConnectionString(postgresUrl, schema);

    db = require('../db');
    const { app } = require('../server');
    server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    const token = jwt.sign(
      { id: 1, nivel_rol: 'Almacen', session_version: 1 },
      process.env.JWT_SECRET
    );
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const payloadFor = detailId => ({
      detalles: [{
        cotizacion_detalle_id: detailId,
        asignaciones: [{ producto_id: 7, tamano: 'BT1', cantidad: 60 }]
      }]
    });
    const reserve = (quoteId, detailId) => fetch(`${baseUrl}/api/almacen/solicitudes/${quoteId}/asignaciones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadFor(detailId))
    });

    const attempts = await Promise.all([
      reserve(101, 201),
      reserve(102, 202)
    ]);
    const outcomes = await Promise.all(attempts.map(async response => ({
      status: response.status,
      body: await response.json()
    })));
    assert.deepEqual(outcomes.map(item => item.status).sort((a, b) => a - b), [201, 409]);

    const successfulIndex = outcomes.findIndex(item => item.status === 201);
    const successfulQuoteId = successfulIndex === 0 ? 101 : 102;
    const successfulDetailId = successfulIndex === 0 ? 201 : 202;
    const replay = await reserve(successfulQuoteId, successfulDetailId);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replay, true);

    const reservationResult = await adminPool.query(`
      SELECT COUNT(*)::int AS filas, COALESCE(SUM(cantidad), 0)::numeric AS total
      FROM "${schema}".cotizacion_reservas
      WHERE estado = 'ACTIVA'
    `);
    assert.equal(reservationResult.rows[0].filas, 1);
    assert.equal(Number(reservationResult.rows[0].total), 60);

    const quoteResult = await adminPool.query(`
      SELECT almacen_estado, COUNT(*)::int AS cantidad
      FROM "${schema}".cotizaciones
      GROUP BY almacen_estado
      ORDER BY almacen_estado
    `);
    assert.deepEqual(quoteResult.rows, [
      { almacen_estado: 'PENDIENTE', cantidad: 1 },
      { almacen_estado: 'RESERVADA', cantidad: 1 }
    ]);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminPool.end();
  }
});
