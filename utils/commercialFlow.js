'use strict';

const PAYMENT_CONDITIONS = Object.freeze(['CONTADO', 'CREDITO', 'APARTADO']);

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('El importe monetario no es válido.');
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function normalizePaymentCondition(value) {
  const normalized = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (!PAYMENT_CONDITIONS.includes(normalized)) {
    throw new Error('La condición de pago no es válida.');
  }
  return normalized;
}

function calculateHarvestPrice(fullPrice) {
  const price = Number(fullPrice);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('El precio lleno no es válido.');
  }
  return roundMoney(price * 1.08);
}

function getCommercialPolicy(condition) {
  const normalized = normalizePaymentCondition(condition);
  if (normalized === 'CONTADO') {
    return {
      showMonthlyPrice: true,
      allowDiscounts: true,
      allowNucle: true,
      persistMonetaryAmounts: true,
      requiresSalesAuthorization: false
    };
  }
  if (normalized === 'CREDITO') {
    return {
      showMonthlyPrice: false,
      allowDiscounts: false,
      allowNucle: false,
      persistMonetaryAmounts: true,
      requiresSalesAuthorization: true
    };
  }
  return {
    showMonthlyPrice: false,
    allowDiscounts: false,
    allowNucle: false,
    persistMonetaryAmounts: false,
    requiresSalesAuthorization: true
  };
}

function normalizeProposedPrice(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error('El precio propuesto debe ser un importe no negativo.');
  }
  return roundMoney(number);
}

function isWarehouseEligible({ condition, saleConfirmed = false, paymentConfirmed = false, authorized = false }) {
  const normalized = normalizePaymentCondition(condition);
  if (normalized === 'CONTADO') return saleConfirmed === true && paymentConfirmed === true;
  return authorized === true;
}

function validateSizeAssignments({ detailId, productId, requestedQuantity, assignments }) {
  const expected = Number(requestedQuantity);
  if (!Number.isFinite(expected) || expected <= 0) {
    throw new Error('La cantidad solicitada debe ser positiva.');
  }
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new Error('Debes asignar al menos un tamaño.');
  }

  const seenSizes = new Set();
  let total = 0;
  const normalized = assignments.map(assignment => {
    const assignmentProductId = Number(assignment.productId ?? assignment.producto_id);
    if (assignmentProductId !== Number(productId)) {
      throw new Error('Cada tamaño debe pertenecer al mismo producto solicitado.');
    }
    const size = String(assignment.size ?? assignment.tamano ?? '').trim();
    if (!size) throw new Error('El tamaño es obligatorio.');
    const sizeKey = size.toLocaleUpperCase('es-MX');
    if (seenSizes.has(sizeKey)) throw new Error(`Tamaño repetido: ${size}.`);
    seenSizes.add(sizeKey);

    const quantity = Number(assignment.quantity ?? assignment.cantidad);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Cada cantidad asignada debe ser positiva.');
    }
    total += quantity;
    return {
      detailId: Number(detailId),
      productId: Number(productId),
      size,
      quantity
    };
  });

  if (Math.abs(total - expected) > 1e-9) {
    throw new Error(`La suma asignada debe ser exactamente ${expected}.`);
  }
  return normalized;
}

function inventoryKey(productId, size) {
  return `${Number(productId)}::${String(size || '').trim().toLocaleUpperCase('es-MX')}`;
}

function computeAvailableBySize({ physical = [], reservations = [] }) {
  const rows = new Map();
  for (const item of physical) {
    const productId = Number(item.productId ?? item.producto_id);
    const size = String(item.size ?? item.tamano ?? '').trim();
    const key = inventoryKey(productId, size);
    const row = rows.get(key) || { productId, size, physical: 0, reserved: 0, available: 0 };
    row.physical += Number(item.quantity ?? item.cantidad ?? item.existencias ?? 0);
    rows.set(key, row);
  }
  for (const reservation of reservations) {
    if (String(reservation.status ?? reservation.estado).toUpperCase() !== 'ACTIVA') continue;
    const productId = Number(reservation.productId ?? reservation.producto_id);
    const size = String(reservation.size ?? reservation.tamano ?? '').trim();
    const key = inventoryKey(productId, size);
    const row = rows.get(key) || { productId, size, physical: 0, reserved: 0, available: 0 };
    row.reserved += Number(reservation.quantity ?? reservation.cantidad ?? 0);
    rows.set(key, row);
  }
  return [...rows.values()]
    .map(row => ({
      ...row,
      physical: Number(row.physical),
      reserved: Number(row.reserved),
      available: Number(row.physical) - Number(row.reserved)
    }))
    .sort((a, b) => a.productId - b.productId || a.size.localeCompare(b.size));
}

function applyReservationTransition(currentStatus, action) {
  const status = String(currentStatus || '').toUpperCase();
  const normalizedAction = String(action || '').toUpperCase();
  if (normalizedAction === 'ENTREGAR') {
    if (status === 'ACTIVA') return { status: 'CONSUMIDA', physicalDelta: -1, availabilityDelta: 0 };
    if (status === 'CONSUMIDA') return { status, physicalDelta: 0, availabilityDelta: 0 };
  }
  if (normalizedAction === 'CANCELAR') {
    if (status === 'ACTIVA') return { status: 'LIBERADA', physicalDelta: 0, availabilityDelta: 1 };
    if (status === 'LIBERADA') return { status, physicalDelta: 0, availabilityDelta: 0 };
  }
  if (normalizedAction === 'REVERTIR') {
    if (status === 'CONSUMIDA') return { status: 'ACTIVA', physicalDelta: 1, availabilityDelta: 0 };
    if (status === 'ACTIVA') return { status, physicalDelta: 0, availabilityDelta: 0 };
  }
  throw new Error(`Transición de reserva no válida: ${status} -> ${normalizedAction}.`);
}

module.exports = {
  PAYMENT_CONDITIONS,
  roundMoney,
  normalizePaymentCondition,
  calculateHarvestPrice,
  getCommercialPolicy,
  normalizeProposedPrice,
  isWarehouseEligible,
  validateSizeAssignments,
  computeAvailableBySize,
  applyReservationTransition
};
