'use strict';

// TDD-TC-111..120 — CHG-025 propuestas internas y reservas por tamaño

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-chg025-secret-at-least-32-characters';
process.env.NODE_ENV = 'test';

const {
  PAYMENT_CONDITIONS,
  calculateHarvestPrice,
  getCommercialPolicy,
  normalizeProposedPrice,
  isWarehouseEligible,
  validateSizeAssignments,
  computeAvailableBySize,
  applyReservationTransition
} = require('../utils/commercialFlow');

const root = path.join(__dirname, '..');

test('TDD-TC-111: cada condición usa un contrato explícito y Crédito calcula precio lleno + 8%', () => {
  assert.deepEqual(PAYMENT_CONDITIONS, ['CONTADO', 'CREDITO', 'APARTADO']);
  assert.equal(calculateHarvestPrice(7000), 7560);
  assert.equal(calculateHarvestPrice(5926.55), 6400.67);

  assert.deepEqual(getCommercialPolicy('CONTADO'), {
    showMonthlyPrice: true,
    allowDiscounts: true,
    allowNucle: true,
    persistMonetaryAmounts: true,
    requiresSalesAuthorization: false
  });
  assert.deepEqual(getCommercialPolicy('CREDITO'), {
    showMonthlyPrice: false,
    allowDiscounts: false,
    allowNucle: false,
    persistMonetaryAmounts: true,
    requiresSalesAuthorization: true
  });
  assert.deepEqual(getCommercialPolicy('APARTADO'), {
    showMonthlyPrice: false,
    allowDiscounts: false,
    allowNucle: false,
    persistMonetaryAmounts: false,
    requiresSalesAuthorization: true
  });
});

test('TDD-TC-112: precio propuesto es opcional, no negativo y no sustituye el precio autorizado', () => {
  assert.equal(normalizeProposedPrice(undefined), null);
  assert.equal(normalizeProposedPrice(''), null);
  assert.equal(normalizeProposedPrice('6100.25'), 6100.25);
  assert.throws(() => normalizeProposedPrice('-1'), /precio propuesto/i);
  assert.throws(() => normalizeProposedPrice('no-numero'), /precio propuesto/i);
});

test('TDD-TC-113: Contado requiere venta y cobro; Crédito/Apartado requieren autorización', () => {
  assert.equal(isWarehouseEligible({ condition: 'CONTADO', saleConfirmed: true, paymentConfirmed: false }), false);
  assert.equal(isWarehouseEligible({ condition: 'CONTADO', saleConfirmed: false, paymentConfirmed: true }), false);
  assert.equal(isWarehouseEligible({ condition: 'CONTADO', saleConfirmed: true, paymentConfirmed: true }), true);
  assert.equal(isWarehouseEligible({ condition: 'CREDITO', authorized: true }), true);
  assert.equal(isWarehouseEligible({ condition: 'CREDITO', authorized: false }), false);
  assert.equal(isWarehouseEligible({ condition: 'APARTADO', authorized: true }), true);
});

test('TDD-TC-116: una partida puede dividirse entre tamaños sin sustituir producto', () => {
  const normalized = validateSizeAssignments({
    detailId: 10,
    productId: 4,
    requestedQuantity: 100,
    assignments: [
      { productId: 4, size: 'BT1', quantity: 60 },
      { productId: 4, size: 'BT2', quantity: 40 }
    ]
  });

  assert.deepEqual(normalized, [
    { detailId: 10, productId: 4, size: 'BT1', quantity: 60 },
    { detailId: 10, productId: 4, size: 'BT2', quantity: 40 }
  ]);
  assert.throws(() => validateSizeAssignments({
    detailId: 10,
    productId: 4,
    requestedQuantity: 100,
    assignments: [{ productId: 5, size: 'BT1', quantity: 100 }]
  }), /mismo producto/i);
  assert.throws(() => validateSizeAssignments({
    detailId: 10,
    productId: 4,
    requestedQuantity: 100,
    assignments: [{ productId: 4, size: 'BT1', quantity: 99 }]
  }), /suma.*100/i);
  assert.throws(() => validateSizeAssignments({
    detailId: 10,
    productId: 4,
    requestedQuantity: 100,
    assignments: [
      { productId: 4, size: 'BT1', quantity: 50 },
      { productId: 4, size: 'bt1', quantity: 50 }
    ]
  }), /tama.*repetido/i);
});

test('TDD-TC-117: disponibilidad por tamaño resta únicamente reservas activas', () => {
  const result = computeAvailableBySize({
    physical: [
      { productId: 4, size: 'BT1', quantity: 90 },
      { productId: 4, size: 'BT2', quantity: 60 }
    ],
    reservations: [
      { productId: 4, size: 'BT1', quantity: 30, status: 'ACTIVA' },
      { productId: 4, size: 'BT1', quantity: 10, status: 'LIBERADA' },
      { productId: 4, size: 'BT2', quantity: 60, status: 'ACTIVA' }
    ]
  });
  assert.deepEqual(result, [
    { productId: 4, size: 'BT1', physical: 90, reserved: 30, available: 60 },
    { productId: 4, size: 'BT2', physical: 60, reserved: 60, available: 0 }
  ]);
});

test('TDD-TC-119: transiciones de reserva son idempotentes y distinguen físico de disponibilidad', () => {
  assert.deepEqual(applyReservationTransition('ACTIVA', 'ENTREGAR'), {
    status: 'CONSUMIDA', physicalDelta: -1, availabilityDelta: 0
  });
  assert.deepEqual(applyReservationTransition('ACTIVA', 'CANCELAR'), {
    status: 'LIBERADA', physicalDelta: 0, availabilityDelta: 1
  });
  assert.deepEqual(applyReservationTransition('CONSUMIDA', 'REVERTIR'), {
    status: 'ACTIVA', physicalDelta: 1, availabilityDelta: 0
  });
  assert.deepEqual(applyReservationTransition('LIBERADA', 'CANCELAR'), {
    status: 'LIBERADA', physicalDelta: 0, availabilityDelta: 0
  });
});

test('TDD-TC-114/115/120: backend y UI declaran roles, PDF institucional y contrato interno', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'public/js/app.js'), 'utf8');

  assert.match(server, /\/api\/documentos-credito\/activo/);
  assert.match(server, /\/api\/cotizaciones\/:id\/decision/);
  assert.match(server, /Administrador.*Coordinador|Coordinador.*Administrador/);
  assert.match(server, /\/api\/almacen\/solicitudes\/:id\/asignaciones/);
  assert.match(server, /req\.user\.nivel_rol === 'Almacen'[\s\S]*item\.lotes/);
  assert.match(server, /req\.path === '\/existencias'/);
  assert.match(html, /value="APARTADO"/);
  assert.match(html, /id="kanban-payment-filter"/);
  assert.match(html, /<h2>Nueva propuesta<\/h2>/);
  assert.doesNotMatch(html, /quote-preview-column|quote-document-sheet/);
  assert.doesNotMatch(html, /btn-print-quote|btn-whatsapp-quote/);
  assert.doesNotMatch(html, /class="mobile-quote-summary"/);
  assert.match(html, /id="tab-solicitudes"/);
  assert.match(html, /id="warehouse-requests-tbody"/);
  assert.doesNotMatch(app, /item-tamano-select/);
  assert.doesNotMatch(app, /uploadCreditAttachment/);
  assert.doesNotMatch(app, /preview-table-body|resetVirtualSheet|updateVirtualSheet/);
  assert.match(app, /monthlyDiscountSummary\.style\.display = isCash \? '' : 'none'/);
  assert.doesNotMatch(html, /id="prod-sizes"|Tamaños \/ Calibres/);
  assert.match(server, /req\.user\.nivel_rol !== 'Almacen'[\s\S]*delete row\.tamanos/);
});

test('TDD-TC-111/115: Crédito y Apartado no consultan tabulador mensual ni temporada', async t => {
  const jwt = require('jsonwebtoken');
  const db = require('../db');
  const { app } = require('../server');
  const originalGet = db.get;
  const queriedSql = [];
  db.get = async query => {
    const sql = String(query);
    queriedSql.push(sql);
    if (sql.includes('FROM asesores')) return {
      id: 1,
      nombre: 'Asesor de prueba',
      usuario: 'asesor-chg025',
      nivel_rol: 'Asesor',
      email: 'asesor@example.test',
      activo: 1,
      session_version: 1
    };
    if (sql.includes('FROM clientes')) return { id: 10, nombre: 'Productor', asesor_id: 1, cuenta_clave_id: 1, activo: 1 };
    if (sql.includes('FROM cuentas_clave')) return { id: 1, tier_name: 'General', descuento_mxn: 0 };
    if (sql.includes('FROM productos')) return {
      id: 7,
      producto: 'Hipopótamo',
      tipo_categoria: 'Híbrido',
      list_price_mxn: 7015,
      descontar: 1,
      activo: 1
    };
    return null;
  };
  t.after(() => { db.get = originalGet; });

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const token = jwt.sign({ id: 1, nivel_rol: 'Asesor', session_version: 1 }, process.env.JWT_SECRET);
  const request = condition => fetch(`http://127.0.0.1:${server.address().port}/api/cotizaciones/calcular`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente_id: 10,
      condiciones_pago: condition,
      items: [{ producto_id: 7, cantidad: 2, descuento_aplicado: 9999 }]
    })
  });

  const creditResponse = await request('CREDITO');
  assert.equal(creditResponse.status, 200);
  const credit = await creditResponse.json();
  assert.equal(credit.items[0].precio_final, 7576.2);
  assert.equal(credit.total_mxn, 15152.4);
  assert.equal(credit.items[0].max_discount_mxn, 0);
  assert.equal(credit.nucle_aplicado, false);

  const layawayResponse = await request('APARTADO');
  assert.equal(layawayResponse.status, 200);
  const layaway = await layawayResponse.json();
  assert.equal(layaway.total_mxn, 0);
  assert.equal(layaway.items[0].precio_final, 0);
  assert.equal(queriedSql.some(sql => sql.includes('crm_precios_mensuales')), false);
  assert.equal(queriedSql.some(sql => sql.includes('FROM temporadas')), false);
});

test('TDD-TC-120: el catálogo entrega tamaños únicamente a Almacén', async t => {
  const jwt = require('jsonwebtoken');
  const db = require('../db');
  const { app } = require('../server');
  const originalGet = db.get;
  const originalAll = db.all;
  db.get = async (query, params = []) => {
    if (!String(query).includes('FROM asesores')) return null;
    const id = Number(params[0]);
    return {
      id,
      nombre: id === 2 ? 'Almacén' : 'Administrador',
      usuario: `usuario-${id}`,
      nivel_rol: id === 2 ? 'Almacen' : 'Administrador',
      email: `usuario-${id}@example.test`,
      activo: 1,
      session_version: 1
    };
  };
  db.all = async query => String(query).includes('FROM productos')
    ? [{ id: 7, producto: 'Hipopótamo', tamanos: 'BT1,BT2', activo: 1 }]
    : [];
  t.after(() => {
    db.get = originalGet;
    db.all = originalAll;
  });

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const requestAs = async (id, role) => {
    const token = jwt.sign({ id, nivel_rol: role, session_version: 1 }, process.env.JWT_SECRET);
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/productos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    return response.json();
  };

  const adminProducts = await requestAs(1, 'Administrador');
  assert.equal(Object.hasOwn(adminProducts[0], 'tamanos'), false);
  const warehouseProducts = await requestAs(2, 'Almacen');
  assert.equal(warehouseProducts[0].tamanos, 'BT1,BT2');
});

test('TDD-TC-120: Kardex, lotes y movimientos manuales preservan la exclusividad de tamaños', async t => {
  const jwt = require('jsonwebtoken');
  const db = require('../db');
  const { app } = require('../server');
  const originalGet = db.get;
  const originalAll = db.all;
  const originalTransaction = db.transaction;
  let movementInsertAttempted = false;

  db.get = async (query, params = []) => {
    if (!String(query).includes('FROM asesores')) return null;
    const id = Number(params[0]);
    return {
      id,
      nombre: id === 2 ? 'Almacén' : 'Administrador',
      usuario: `usuario-${id}`,
      nivel_rol: id === 2 ? 'Almacen' : 'Administrador',
      email: `usuario-${id}@example.test`,
      activo: 1,
      session_version: 1
    };
  };
  db.all = async query => {
    const sql = String(query);
    if (sql.includes('FROM almacen_movimientos m') && sql.includes('LEFT JOIN productos')) {
      return [{ id: 91, producto_id: 7, producto_nombre: 'Hipopótamo', lote: 'L-1', tamano: 'BT1' }];
    }
    if (sql.includes('SUM(COALESCE(cantidad_entrante')) {
      return [{ lote: 'L-1', tamano: 'BT1', existencias: 30 }];
    }
    return [];
  };
  db.transaction = async callback => callback({
    get: async query => String(query).includes('FROM productos WHERE id')
      ? { id: 7, producto: 'Hipopótamo', tipo_categoria: 'Semilla', activo: 1 }
      : { existencias_resultantes: 30 },
    run: async () => {
      movementInsertAttempted = true;
      return { id: 1, changes: 1 };
    }
  });
  t.after(() => {
    db.get = originalGet;
    db.all = originalAll;
    db.transaction = originalTransaction;
  });

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headersFor = (id, role) => ({
    Authorization: `Bearer ${jwt.sign({ id, nivel_rol: role, session_version: 1 }, process.env.JWT_SECRET)}`,
    'Content-Type': 'application/json'
  });

  const adminHeaders = headersFor(1, 'Administrador');
  const warehouseHeaders = headersFor(2, 'Almacen');

  const adminMovementsResponse = await fetch(`${baseUrl}/api/almacen/movimientos`, { headers: adminHeaders });
  assert.equal(adminMovementsResponse.status, 200);
  const adminMovements = await adminMovementsResponse.json();
  assert.equal(Object.hasOwn(adminMovements[0], 'tamano'), false);

  const warehouseMovementsResponse = await fetch(`${baseUrl}/api/almacen/movimientos`, { headers: warehouseHeaders });
  assert.equal(warehouseMovementsResponse.status, 200);
  assert.equal((await warehouseMovementsResponse.json())[0].tamano, 'BT1');

  const adminLotsResponse = await fetch(`${baseUrl}/api/almacen/lotes-disponibles?producto_id=7`, { headers: adminHeaders });
  assert.equal(adminLotsResponse.status, 200);
  const adminLots = await adminLotsResponse.json();
  assert.equal(Object.hasOwn(adminLots[0], 'tamano'), false);

  const adminSizeProbe = await fetch(`${baseUrl}/api/almacen/lotes-disponibles?producto_id=7&tamano=BT1`, { headers: adminHeaders });
  assert.equal(adminSizeProbe.status, 403);

  const warehouseLotsResponse = await fetch(`${baseUrl}/api/almacen/lotes-disponibles?producto_id=7&tamano=BT1`, { headers: warehouseHeaders });
  assert.equal(warehouseLotsResponse.status, 200);
  assert.equal((await warehouseLotsResponse.json())[0].tamano, 'BT1');

  const adminSeedMovement = await fetch(`${baseUrl}/api/almacen/movimientos`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      tipo: 'Entrada',
      items: [{ producto_id: 7, lote: 'L-1', tamano: 'BT1', cantidad: 10, categoria: 'Agroquímicos' }]
    })
  });
  assert.equal(adminSeedMovement.status, 403);
  assert.equal(movementInsertAttempted, false);
});

test('TDD-TC-113/119: las rutas reales preservan reservas e idempotencia de transiciones', async t => {
  const jwt = require('jsonwebtoken');
  const db = require('../db');
  const { app } = require('../server');
  const originalGet = db.get;
  const originalTransaction = db.transaction;
  let activeQuote = null;
  let mutationCount = 0;

  db.get = async query => String(query).includes('FROM asesores')
    ? {
        id: 1,
        nombre: 'Administrador',
        usuario: 'admin-chg025',
        nivel_rol: 'Administrador',
        email: 'admin@example.test',
        activo: 1,
        session_version: 1
      }
    : null;
  db.transaction = async callback => callback({
    get: async query => {
      const sql = String(query);
      if (sql.includes('FROM cotizaciones WHERE id')) return { ...activeQuote };
      return null;
    },
    all: async () => [],
    run: async () => {
      mutationCount += 1;
      return { id: 1, changes: 1 };
    }
  });
  t.after(() => {
    db.get = originalGet;
    db.transaction = originalTransaction;
  });

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const token = jwt.sign({ id: 1, nivel_rol: 'Administrador', session_version: 1 }, process.env.JWT_SECRET);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  activeQuote = {
    id: 70,
    flujo_version: 'CHG-025',
    condiciones_pago: 'CONTADO',
    estatus: 'Vendido',
    venta_confirmada: 1,
    cobro_confirmado: 1,
    almacen_estado: 'RESERVADA'
  };
  const deconfirmation = await fetch(`${baseUrl}/api/cotizaciones/70/confirmaciones-contado`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ venta_confirmada: false })
  });
  assert.equal(deconfirmation.status, 409);
  assert.equal(mutationCount, 0);

  activeQuote = {
    id: 71,
    flujo_version: 'CHG-025',
    condiciones_pago: 'CREDITO',
    estatus: 'Entregado',
    almacen_estado: 'ENTREGADA'
  };
  const deliveryReplay = await fetch(`${baseUrl}/api/cotizaciones/71/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ estatus: 'Entregado' })
  });
  assert.equal(deliveryReplay.status, 200);
  assert.equal((await deliveryReplay.json()).replay, true);
  assert.equal(mutationCount, 0);
});
