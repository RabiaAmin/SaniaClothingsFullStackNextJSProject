const Invoice = require('../models/invoice.model');
const { escapeRegex } = require('../utils/query');

const INVOICE_RELATIONSHIP_STATES = {
  NONE: 'NONE',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
};

function normalizePoNumber(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function buildExactPoRegex(poNumbers) {
  const normalized = [...new Set(poNumbers.map(normalizePoNumber).filter(Boolean))];
  if (normalized.length === 0) return null;
  return new RegExp(`^\\s*(?:${normalized.map(escapeRegex).join('|')})\\s*$`, 'i');
}

function summarizeInvoices(invoices = []) {
  const matchCount = invoices.length;
  return {
    state:
      matchCount === 0
        ? INVOICE_RELATIONSHIP_STATES.NONE
        : matchCount === 1
          ? INVOICE_RELATIONSHIP_STATES.SINGLE
          : INVOICE_RELATIONSHIP_STATES.MULTIPLE,
    matchCount,
    statuses: [...new Set(invoices.map((invoice) => invoice.status).filter(Boolean))],
    latestInvoice: invoices[0] ?? null,
    invoices,
  };
}

async function findInvoiceRelationships(poNumbers) {
  const normalizedPoNumbers = [...new Set(poNumbers.map(normalizePoNumber).filter(Boolean))];
  const relationships = new Map(
    normalizedPoNumbers.map((poNumber) => [poNumber, summarizeInvoices()])
  );
  const poRegex = buildExactPoRegex(normalizedPoNumbers);
  if (!poRegex) return relationships;

  const invoices = await Invoice.find({ poNumber: poRegex })
    .select('invoiceNumber poNumber status totalAmount date toClient')
    .sort({ date: -1, _id: -1 });
  const groupedInvoices = new Map();
  invoices.forEach((invoice) => {
    const normalizedPoNumber = normalizePoNumber(invoice.poNumber);
    if (!relationships.has(normalizedPoNumber)) return;
    const matches = groupedInvoices.get(normalizedPoNumber) ?? [];
    matches.push(invoice);
    groupedInvoices.set(normalizedPoNumber, matches);
  });
  groupedInvoices.forEach((matches, poNumber) => {
    relationships.set(poNumber, summarizeInvoices(matches));
  });
  return relationships;
}

async function findInvoiceRelationship(poNumber) {
  const normalizedPoNumber = normalizePoNumber(poNumber);
  if (!normalizedPoNumber) return summarizeInvoices();
  const relationships = await findInvoiceRelationships([normalizedPoNumber]);
  return relationships.get(normalizedPoNumber) ?? summarizeInvoices();
}

module.exports = {
  INVOICE_RELATIONSHIP_STATES,
  normalizePoNumber,
  buildExactPoRegex,
  summarizeInvoices,
  findInvoiceRelationships,
  findInvoiceRelationship,
};
