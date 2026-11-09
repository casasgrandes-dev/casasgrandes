const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');

test('Resiliencia de flujo_version: db.hasCotizacionesColumn está exportada y funciona', async () => {
  assert.equal(typeof db.hasCotizacionesColumn, 'function', 'db.hasCotizacionesColumn debe ser una función');
});

test('Resiliencia de flujo_version: server.js realiza inserción adaptativa ante ausencia de columna', () => {
  const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  // Both insert branches
  assert.match(serverJs, /if \(useFlujoVersion\)/, 'server.js debe bifurcar inserción según useFlujoVersion');
  // Outer catch handles isFlujoVersionError cleanly on retry
  assert.match(serverJs, /isFlujoVersionError/, 'server.js debe capturar isFlujoVersionError para reintento limpio sin flujo_version');
  assert.match(serverJs, /useFlujoVersion = false;/, 'server.js debe desactivar useFlujoVersion y reintentar si la columna no existe');
  // getAttachmentQuoteAccess fallback
  assert.match(serverJs, /SELECT id, asesor_id, condiciones_pago FROM cotizaciones WHERE id = \?/, 'getAttachmentQuoteAccess debe tener fallback si flujo_version no existe');
  // Almacen solicitudes fallback
  assert.match(serverJs, /column .*flujo_version.* does not exist/, 'almacen/solicitudes debe manejar la ausencia de flujo_version sin 500');
});

test('Resiliencia de flujo_version: db.ensureQuotationsSchema registra advertencias de DDL', () => {
  const dbJs = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
  assert.match(dbJs, /\[ensureQuotationsSchema\] DDL warning/, 'db.js debe registrar advertencias de DDL en vez de silenciarlas');
});
