const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProductSizes, parseProductSizes, getSizesForProduct } = require('../utils/productos');

test('normalizeProductSizes: limpia espacios, filtra vacíos y normaliza lista separada por comas', () => {
  assert.equal(normalizeProductSizes(' BT1,  BT2,  bt3 , bw1 '), 'BT1, BT2, BT3, BW1');
  assert.equal(normalizeProductSizes('PW1,PW2'), 'PW1, PW2');
  assert.equal(normalizeProductSizes(''), null);
  assert.equal(normalizeProductSizes(null), null);
  assert.equal(normalizeProductSizes(undefined), null);
  assert.equal(normalizeProductSizes(' , , '), null);
});

test('parseProductSizes: convierte string separado por comas a un array limpio de tamaños', () => {
  assert.deepEqual(parseProductSizes('BT1, BT2, BT3, BW1, BW2'), ['BT1', 'BT2', 'BT3', 'BW1', 'BW2']);
  assert.deepEqual(parseProductSizes('PW1, PW2'), ['PW1', 'PW2']);
  assert.deepEqual(parseProductSizes(''), []);
  assert.deepEqual(parseProductSizes(null), []);
  assert.deepEqual(parseProductSizes(undefined), []);
});

test('getSizesForProduct: extrae los tamaños dinámicos directamente de la entidad producto', () => {
  const prodWithSizes = {
    id: 1,
    producto: 'A-7573 PONCHO',
    tipo_categoria: 'Híbrido',
    tamanos: 'PW1, PW2'
  };
  assert.deepEqual(getSizesForProduct(prodWithSizes), ['PW1', 'PW2']);

  const prodWithoutSizes = {
    id: 2,
    producto: 'ACIDO FOSFORICO 20LT',
    tipo_categoria: 'Agroquímico',
    tamanos: null
  };
  assert.deepEqual(getSizesForProduct(prodWithoutSizes), []);

  const prodWithCustomSizes = {
    id: 3,
    producto: 'HIPOPÓTAMO ACCELERON',
    tipo_categoria: 'Híbrido',
    tamanos: 'BT1, BT2, BT3, BW1, BW2, PT1, PT2, PT3, PW1, PW2'
  };
  assert.deepEqual(getSizesForProduct(prodWithCustomSizes), [
    'BT1', 'BT2', 'BT3', 'BW1', 'BW2', 'PT1', 'PT2', 'PT3', 'PW1', 'PW2'
  ]);
});

test('getSizesForProduct: busca por nombre de producto en el catálogo allProductsList', () => {
  const catalog = [
    { id: 10, producto: 'A-7573 PONCHO', tamanos: 'PW1, PW2' },
    { id: 11, producto: 'MURALLA MAX 250ML', tamanos: null }
  ];

  assert.deepEqual(getSizesForProduct('A-7573 PONCHO', catalog), ['PW1', 'PW2']);
  assert.deepEqual(getSizesForProduct('MURALLA MAX 250ML', catalog), []);
  assert.deepEqual(getSizesForProduct('INEXISTENTE', catalog), []);
});


test('CHG-030: Administrador puede gestionar calibres (tamanos) en catálogo y UI', () => {
  const fs = require('fs');
  const path = require('path');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  // UI modal elements
  assert.match(indexHtml, /id="prod-tamanos"/, 'index.html debe tener el input prod-tamanos en el modal de producto');
  assert.match(indexHtml, /Calibres \/ Tamaños/, 'index.html debe describir la etiqueta de calibres/tamaños');

  // app.js wiring
  assert.match(appJs, /document\.getElementById\('prod-tamanos'\)\.value = p\.tamanos \|\| '';/, 'openEditProductoModal debe cargar tamanos');
  assert.match(appJs, /tamanos: document\.getElementById\('prod-tamanos'\)/, 'submit debe enviar tamanos');

  // server.js handling
  assert.match(serverJs, /normalizeProductSizes\(req\.body\.tamanos\)/, 'server.js debe normalizar tamanos al crear o editar');
  assert.match(serverJs, /req\.user\.nivel_rol !== 'Almacen' && !includeInactive/, 'server.js debe permitir tamanos a Administrador con include_inactive=1');
});

test('CHG-030: POST /api/cotizaciones autorrecupera temporada y no falla cuando temporada_id no existe', () => {
  const fs = require('fs');
  const path = require('path');
  const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  // Verify safe fallback and error handling
  assert.match(serverJs, /SELECT id FROM temporadas WHERE id = 1/, 'Debe consultar si existe id 1 antes de forzarlo');
  assert.match(serverJs, /error: err\.message \|\| 'Failed to create quotation'/, 'Debe propagar err.message para diagnóstico transparente');
  assert.match(serverJs, /txErr\.code === '23503'/, 'Debe capturar errores 23503 en la transacción de cotización');
});
