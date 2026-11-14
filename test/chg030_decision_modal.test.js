'use strict';

// TDD-TC-135..138 — CHG-030 Decisión comercial y doble confirmación en Detalle de Cotización

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('TDD-TC-135: public/index.html contiene los botones de decisión y confirmación en el modal de detalle', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

  // Authorize button exists
  assert.match(indexHtml, /id="btn-authorize-quote"/, 'index.html debe contener btn-authorize-quote');
  // Reject button in detail modal
  assert.match(indexHtml, /id="btn-reject-commercial-request"/, 'index.html debe contener btn-reject-commercial-request en el modal de detalle');
  // Cash confirmation buttons in detail modal
  assert.match(indexHtml, /id="btn-confirm-cash-sale"/, 'index.html debe contener btn-confirm-cash-sale en el modal de detalle');
  assert.match(indexHtml, /id="btn-confirm-cash-payment"/, 'index.html debe contener btn-confirm-cash-payment en el modal de detalle');
});

test('TDD-TC-135: showQuoteDetails habilita autorización y rechazo para CHG-025 a Administrador y Coordinador', () => {
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

  // Verify canManageSalesFlow and isChg025 enable authBtn for CREDITO and APARTADO
  assert.match(appJs, /if\s*\(isBorrador\s*&&\s*canManageSalesFlow\(\)\s*&&\s*isChg025\s*&&\s*\[['"]CREDITO['"],\s*['"]APARTADO['"]\]\.includes\(condition\)\)/,
    'app.js debe habilitar authBtn para CHG-025 bajo canManageSalesFlow');

  // Verify permission checks Administrador or Coordinador for CHG-025 authorization
  assert.match(appJs, /canManageSalesFlow\(\)/, 'app.js debe evaluar canManageSalesFlow para decisiones comerciales');
  assert.match(appJs, /btn-reject-commercial-request/, 'app.js debe controlar visibilidad de btn-reject-commercial-request');
});

test('TDD-TC-136: authBtn y rejectBtn en modal invocan decideCommercialRequest para solicitudes CHG-025', () => {
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

  // Verification that for CHG-025, authBtn connects to decideCommercialRequest
  assert.match(appJs, /decideCommercialRequest\s*\(\s*quote\.id\s*,\s*['"]AUTORIZAR['"]\s*\)/,
    'authBtn en modal debe invocar decideCommercialRequest con AUTORIZAR para CHG-025');
  assert.match(appJs, /decideCommercialRequest\s*\(\s*quote\.id\s*,\s*['"]RECHAZAR['"]\s*\)/,
    'rejectBtn en modal debe invocar decideCommercialRequest con RECHAZAR para CHG-025');
});

test('TDD-TC-137: showQuoteDetails expone doble confirmación para propuestas Contado CHG-025', () => {
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

  // Verification that confirmCashProposal is wired in the modal
  assert.match(appJs, /confirmCashProposal\s*\(\s*quote\.id\s*,\s*['"]venta['"]\s*\)/,
    'Modal debe invocar confirmCashProposal con venta');
  assert.match(appJs, /confirmCashProposal\s*\(\s*quote\.id\s*,\s*['"]cobro['"]\s*\)/,
    'Modal debe invocar confirmCashProposal con cobro');
});

test('TDD-TC-138: tarjeta de prospectos pendientes en Kanban aísla clics en botones de acción', () => {
  const appJs = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');

  // Verify that the card click listener in pending cards checks for button/input targets
  const pendingCardSection = appJs.slice(appJs.indexOf('const pendingAuthorization ='), appJs.indexOf('const col = columns[status];'));
  assert.match(pendingCardSection, /e\.target\.closest\(['"]button['"]\)|e\.target\.closest\(['"]input['"]\)/,
    'La tarjeta de prospectos pendientes debe ignorar clics si el objetivo es un botón o input');
});
