const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  createStatementHistory,
  deleteStatementHistory,
} = require('../src/services/invoiceStatementHistory.service');

const INVOICE_ONE = new mongoose.Types.ObjectId('64b000000000000000000001');
const INVOICE_TWO = new mongoose.Types.ObjectId('64b000000000000000000002');
const USER_ID = new mongoose.Types.ObjectId('64b000000000000000000010');

function selectedStatement() {
  return [
    {
      _id: 'Acme Retail',
      invoices: [
        { _id: INVOICE_ONE, status: 'Sent', date: '2026-08-10T00:00:00.000Z' },
        { _id: INVOICE_TWO, status: 'Sent', date: '2026-08-20T00:00:00.000Z' },
      ],
    },
  ];
}

test('successful PDF storage creates exactly one history record with validated invoice IDs', async () => {
  const creates = [];
  const statementModel = {
    async create(record) {
      creates.push(record);
      return record;
    },
  };

  const result = await createStatementHistory(
    {
      invoiceIds: [INVOICE_ONE.toString(), INVOICE_TWO.toString()],
      pdfBuffer: Buffer.from('pdf'),
      generatedBy: USER_ID,
    },
    {
      statementModel,
      validateInvoices: async () => selectedStatement(),
      uploadPdf: async () => ({
        secure_url: 'https://cdn.test/statement.pdf',
        public_id: 'INVOICE_STATEMENTS/STMT-1',
      }),
    }
  );

  assert.equal(creates.length, 1);
  assert.deepEqual(creates[0].invoiceIds, [INVOICE_ONE, INVOICE_TWO]);
  assert.equal(creates[0].invoiceCount, 2);
  assert.equal(creates[0].clientName, 'Acme Retail');
  assert.equal(creates[0].generatedBy, USER_ID);
  assert.equal(creates[0].pdf.url, 'https://cdn.test/statement.pdf');
  assert.equal(creates[0].startDate.toISOString(), '2026-08-10T00:00:00.000Z');
  assert.equal(creates[0].endDate.toISOString(), '2026-08-20T00:00:00.000Z');
  assert.equal(result, creates[0]);
});

test('failed PDF upload never creates a history record', async () => {
  let createCount = 0;
  await assert.rejects(
    createStatementHistory(
      {
        invoiceIds: [INVOICE_ONE.toString()],
        pdfBuffer: Buffer.from('pdf'),
        generatedBy: USER_ID,
      },
      {
        statementModel: {
          async create() {
            createCount += 1;
          },
        },
        validateInvoices: async () => selectedStatement(),
        uploadPdf: async () => {
          throw new Error('Cloud storage failed');
        },
      }
    ),
    /Cloud storage failed/
  );
  assert.equal(createCount, 0);
});

test('database failure cleans up the uploaded PDF', async () => {
  const destroyed = [];
  await assert.rejects(
    createStatementHistory(
      {
        invoiceIds: [INVOICE_ONE.toString()],
        pdfBuffer: Buffer.from('pdf'),
        generatedBy: USER_ID,
      },
      {
        statementModel: {
          async create() {
            throw new Error('Database failed');
          },
        },
        validateInvoices: async () => selectedStatement(),
        uploadPdf: async () => ({ secure_url: 'https://cdn.test/file.pdf', public_id: 'pdf-1' }),
        destroyPdf: async (publicId) => destroyed.push(publicId),
      }
    ),
    /Database failed/
  );
  assert.deepEqual(destroyed, ['pdf-1']);
});

test('deletion removes only the stored PDF and statement record', async () => {
  const actions = [];
  const statement = {
    pdf: { publicId: 'INVOICE_STATEMENTS/STMT-1' },
    async deleteOne() {
      actions.push('record');
    },
  };

  await deleteStatementHistory(statement, {
    destroyPdf: async (publicId) => actions.push(`pdf:${publicId}`),
  });

  assert.deepEqual(actions, ['pdf:INVOICE_STATEMENTS/STMT-1', 'record']);
});
