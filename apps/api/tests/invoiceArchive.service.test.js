const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  ARCHIVE_SCHEMA_VERSION,
  retentionCutoff,
  eligibleFilter,
  isEligibleInvoiceDate,
  checksum,
  exactInvoiceDeleteFilter,
  createArchive,
  confirmDeletion,
  validateRestoreArchive,
} = require('../src/services/invoiceArchive.service');
const { consumeOAuthState, hashState } = require('../src/services/googleDrive.service');
const { authorize } = require('../src/middleware/authorization.middleware');

function invoice(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    invoiceNumber: 'INV-100',
    poNumber: 'PO-1',
    date: new Date('2025-01-15T10:00:00.000Z'),
    fromBusiness: new mongoose.Types.ObjectId(),
    toClient: new mongoose.Types.ObjectId(),
    category: 'CMT Services',
    items: [
      {
        _id: new mongoose.Types.ObjectId(),
        quantity: 2,
        description: 'Item',
        unitPrice: 10,
        amount: 20,
      },
    ],
    subTotal: 20,
    tax: 3,
    totalAmount: 23,
    status: 'Sent',
    __v: 0,
    ...overrides,
  };
}

function archiveHarness({ invoices = [invoice()], pdfError, uploadError, corruptReadback } = {}) {
  let createdJob;
  const Invoice = {
    find() {
      return { sort: () => ({ lean: async () => invoices }) };
    },
  };
  const InvoiceArchiveJob = {
    findOne: async () => null,
    async create(data) {
      createdJob = { ...data, _id: new mongoose.Types.ObjectId(), files: [], async save() {} };
      return createdJob;
    },
  };
  const uploaded = new Map();
  let sequence = 0;
  const driveService = {
    authorizedDrive: async () => ({ connection: { folderId: 'root' }, drive: {} }),
    createArchiveFolder: async () => ({
      id: 'archive-folder',
      webViewLink: 'https://drive.test/folder',
    }),
    uploadBuffer: async (_drive, _folder, file) => {
      if (uploadError) throw new Error('quota exceeded');
      const id = `file-${++sequence}`;
      uploaded.set(id, file.buffer);
      return { id };
    },
    downloadBuffer: async (_drive, id) =>
      corruptReadback ? Buffer.from('corrupt') : uploaded.get(id),
  };
  return {
    dependencies: {
      models: { Invoice, InvoiceArchiveJob },
      driveService,
      referenceSnapshots: async () => ({
        businesses: [],
        clients: [],
        bankAccounts: [],
        invoiceStatements: [],
      }),
      generateInvoicePdf: async () => {
        if (pdfError) throw new Error('renderer unavailable');
        return Buffer.from('%PDF-test');
      },
    },
    job: () => createdJob,
  };
}

test('rolling cutoff clamps month-end in UTC and eligibility is strictly earlier', () => {
  assert.equal(
    retentionCutoff(new Date('2026-08-31T23:30:00.000Z')).toISOString(),
    '2026-02-28T23:30:00.000Z'
  );
  assert.equal(
    retentionCutoff(new Date('2024-08-31T10:00:00.000Z')).toISOString(),
    '2024-02-29T10:00:00.000Z'
  );
  assert.deepEqual(eligibleFilter(new Date('2026-04-03T00:00:00.000Z')), {
    date: { $type: 'date', $lt: new Date('2026-04-03T00:00:00.000Z') },
  });
  const cutoff = new Date('2026-04-03T00:00:00.000Z');
  assert.equal(isEligibleInvoiceDate('2026-04-02T23:59:59.999Z', cutoff), true);
  assert.equal(isEligibleInvoiceDate('2026-04-03T00:00:00.000Z', cutoff), false);
  assert.equal(isEligibleInvoiceDate('not-a-date', cutoff), false);
  assert.equal(isEligibleInvoiceDate(null, cutoff), false);
});

test('archive uploads JSON, every PDF, and manifest then verifies read-back checksums', async () => {
  const harness = archiveHarness({ invoices: [invoice(), invoice({ invoiceNumber: 'INV-101' })] });
  const job = await createArchive({
    userId: new mongoose.Types.ObjectId(),
    idempotencyKey: 'request-1',
    now: new Date('2026-10-03T12:00:00.000Z'),
    dependencies: harness.dependencies,
  });
  assert.equal(job.status, 'READY_FOR_CONFIRMATION');
  assert.equal(job.expectedInvoiceCount, 2);
  assert.equal(job.files.length, 4);
  assert.ok(job.files.every((file) => file.verified));
  assert.equal(job.verification.allFilesMatched, true);
  assert.equal(job.verification.invoiceIdsMatched, true);
});

test('PDF generation failure marks the durable job failed before upload', async () => {
  const harness = archiveHarness({ pdfError: true });
  await assert.rejects(
    createArchive({
      userId: new mongoose.Types.ObjectId(),
      now: new Date('2026-10-03T12:00:00Z'),
      dependencies: harness.dependencies,
    }),
    /PDF generation failed/
  );
  assert.equal(harness.job().status, 'FAILED');
  assert.match(harness.job().error.message, /renderer unavailable/);
});

test('failed uploads and corrupt read-back never produce a verified archive', async () => {
  for (const scenario of [{ uploadError: true }, { corruptReadback: true }]) {
    const harness = archiveHarness(scenario);
    await assert.rejects(
      createArchive({
        userId: new mongoose.Types.ObjectId(),
        now: new Date('2026-10-03T12:00:00Z'),
        dependencies: harness.dependencies,
      })
    );
    assert.equal(harness.job().status, 'FAILED');
    assert.notEqual(harness.job().verification?.allFilesMatched, true);
  }
});

test('concurrent archive creation is rejected by the durable active-job lock', async () => {
  const item = invoice();
  const conflict = new Error('duplicate key');
  conflict.code = 11000;
  await assert.rejects(
    createArchive({
      userId: new mongoose.Types.ObjectId(),
      now: new Date('2026-10-03T12:00:00Z'),
      dependencies: {
        models: {
          Invoice: { find: () => ({ sort: () => ({ lean: async () => [item] }) }) },
          InvoiceArchiveJob: {
            findOne: async () => null,
            create: async () => {
              throw conflict;
            },
          },
        },
      },
    }),
    (error) => error.statusCode === 409 && /already active/.test(error.message)
  );
});

test('deletion skips recent and changed invoices and deletes only verified snapshots', async () => {
  const old = invoice({ invoiceNumber: 'OLD', date: new Date('2026-01-01T00:00:00Z') });
  const changed = invoice({ invoiceNumber: 'CHANGED', date: new Date('2026-01-02T00:00:00Z') });
  const recent = invoice({ invoiceNumber: 'RECENT', date: new Date('2026-09-01T00:00:00Z') });
  const records = [old, changed, recent].map((item) => ({
    invoiceId: String(item._id),
    invoiceNumber: item.invoiceNumber,
    invoiceDate: item.date,
    documentChecksum: checksum(item),
    originalDocument: item,
  }));
  const current = new Map([
    [String(old._id), old],
    [String(changed._id), { ...changed, totalAmount: 999 }],
    [String(recent._id), recent],
  ]);
  const deleted = [];
  const job = {
    archiveId: 'archive-1',
    invoiceRecords: records,
    status: 'DELETING',
    async save() {},
  };
  const Invoice = {
    findById(id) {
      return { lean: async () => current.get(String(id)) };
    },
    async deleteOne(query) {
      deleted.push(String(query._id));
      return { deletedCount: 1 };
    },
  };
  const InvoiceArchiveJob = { findOneAndUpdate: async () => job };
  const result = await confirmDeletion({
    jobId: new mongoose.Types.ObjectId(),
    archiveId: 'archive-1',
    confirmation: 'DELETE',
    userId: new mongoose.Types.ObjectId(),
    now: new Date('2026-10-03T12:00:00Z'),
    dependencies: { Invoice, InvoiceArchiveJob },
  });
  assert.deepEqual(deleted, [String(old._id)]);
  assert.equal(result.deletedCount, 1);
  assert.equal(result.deletionSkipped.length, 2);
  assert.equal(result.status, 'COMPLETED');
});

test('atomic delete filter constrains absent optional fields and every invoice business field', () => {
  const item = invoice({ tax: undefined, category: undefined });
  const filter = exactInvoiceDeleteFilter(item);
  assert.equal(String(filter._id), String(item._id));
  assert.deepEqual(
    filter.$and.find((entry) => entry.tax),
    { tax: { $exists: false } }
  );
  assert.deepEqual(
    filter.$and.find((entry) => entry.category),
    {
      category: { $exists: false },
    }
  );
  assert.deepEqual(
    filter.$and.find((entry) => entry.items),
    { items: item.items }
  );
});

test('deletion requires explicit confirmation and a verified ready job', async () => {
  await assert.rejects(
    confirmDeletion({
      jobId: new mongoose.Types.ObjectId(),
      archiveId: 'a',
      confirmation: 'no',
      userId: new mongoose.Types.ObjectId(),
    }),
    /Explicit deletion confirmation/
  );
  await assert.rejects(
    confirmDeletion({
      jobId: new mongoose.Types.ObjectId(),
      archiveId: 'a',
      confirmation: 'DELETE',
      userId: new mongoose.Types.ObjectId(),
      dependencies: { InvoiceArchiveJob: { findOneAndUpdate: async () => null } },
    }),
    /not verified, is stale, or has already been confirmed/
  );
});

test('OAuth state is hashed, expiry-constrained, and consumed only once', async () => {
  let received;
  const stateModel = {
    async findOneAndUpdate(filter, update) {
      received = { filter, update };
      return { requestedBy: 'admin' };
    },
  };
  const result = await consumeOAuthState('secret-state', stateModel);
  assert.equal(result.requestedBy, 'admin');
  assert.equal(received.filter.stateHash, hashState('secret-state'));
  assert.equal(received.filter.usedAt, null);
  assert.ok(received.filter.expiresAt.$gt instanceof Date);
  assert.ok(received.update.$set.usedAt instanceof Date);
  assert.equal(await consumeOAuthState('', stateModel), null);
});

test('archive permission is enforced independently of invoice read access', () => {
  const middleware = authorize('invoice.archive');
  let statusCode;
  middleware(
    { user: { role: { permissions: [{ key: 'invoice.read' }] } } },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {},
    },
    () => assert.fail('read-only user should not pass')
  );
  assert.equal(statusCode, 403);
  let allowed = false;
  middleware({ user: { role: { permissions: [{ key: 'invoice.*' }] } } }, {}, () => {
    allowed = true;
  });
  assert.equal(allowed, true);
});

test('restore validation rejects malformed archives and duplicate IDs or invoice numbers', () => {
  assert.equal(validateRestoreArchive({}).valid, false);
  const id = new mongoose.Types.ObjectId().toString();
  const payload = {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    invoices: [
      { _id: id, invoiceNumber: 'INV-1' },
      { _id: id, invoiceNumber: 'INV-2' },
    ],
  };
  const duplicate = validateRestoreArchive(payload);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.some((message) => message.includes('Duplicate invoice identifier')));
  const existing = validateRestoreArchive(
    {
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      invoices: [{ _id: new mongoose.Types.ObjectId(), invoiceNumber: 'INV-1' }],
    },
    { ids: new Set(), numbers: new Set(['INV-1']) }
  );
  assert.equal(existing.valid, false);
});
