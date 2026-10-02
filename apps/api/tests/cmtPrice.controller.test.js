const test = require('node:test');
const assert = require('node:assert/strict');
const CmtPrice = require('../src/models/cmtPrice.model');
const controller = require('../src/controllers/cmtPrice.controller');

function invoke(handler, { body = {}, params = {}, query = {}, user = {} } = {}) {
  return new Promise((resolve, reject) => {
    const result = {};
    handler(
      { body, params, query, user },
      {
        status(status) {
          result.status = status;
          return this;
        },
        json(payload) {
          result.body = payload;
          resolve(result);
        },
      },
      reject
    );
  });
}

test('CMT price controller creates normalized numeric entries', async () => {
  const original = CmtPrice.create;
  let created;
  CmtPrice.create = async (payload) => {
    created = payload;
    return { _id: 'price-1', ...payload };
  };
  try {
    const response = await invoke(controller.createCmtPrice, {
      body: {
        itemCode: ' jabut06 ',
        style: ' Bunny Jacket ',
        cmtPrice: '45,75',
        workerPrice: '30.00',
      },
    });
    assert.equal(response.status, 201);
    assert.deepEqual(created, {
      itemCode: 'JABUT06',
      style: 'Bunny Jacket',
      cmtPrice: 45.75,
      workerPrice: 30,
      isActive: true,
    });
  } finally {
    CmtPrice.create = original;
  }
});

test('CMT price controller retrieves the complete internal list', async () => {
  const original = CmtPrice.find;
  const entries = [{ _id: 'price-1', itemCode: 'A1', cmtPrice: 10, workerPrice: 5 }];
  CmtPrice.find = () => ({ sort: async () => entries });
  try {
    const response = await invoke(controller.getCmtPrices);
    assert.equal(response.status, 200);
    assert.equal(response.body.cmtPrices, entries);
  } finally {
    CmtPrice.find = original;
  }
});

test('CMT price controller updates prices and active state', async () => {
  const original = CmtPrice.findById;
  let saved = false;
  const entry = {
    itemCode: 'A1',
    style: 'Old Style',
    cmtPrice: 10,
    workerPrice: 5,
    isActive: true,
    async save() {
      saved = true;
    },
    toObject() {
      return { ...this, save: undefined, toObject: undefined };
    },
  };
  CmtPrice.findById = async () => entry;
  try {
    const response = await invoke(controller.updateCmtPrice, {
      params: { id: 'price-1' },
      body: { cmtPrice: 12.5, workerPrice: 6.25, isActive: false },
    });
    assert.equal(response.status, 200);
    assert.equal(saved, true);
    assert.equal(entry.cmtPrice, 12.5);
    assert.equal(entry.workerPrice, 6.25);
    assert.equal(entry.isActive, false);
  } finally {
    CmtPrice.findById = original;
  }
});

test('purpose-scoped lookup never returns both internal price types', async () => {
  const original = CmtPrice.findOne;
  CmtPrice.findOne = async () => ({
    itemCode: 'A1',
    style: 'Style A',
    cmtPrice: 10,
    workerPrice: 5,
    isActive: true,
  });
  try {
    const invoiceResponse = await invoke(controller.lookupCmtPrice, {
      params: { itemCode: 'a1' },
      query: { usage: 'invoice' },
      user: { role: { permissions: [{ key: 'invoice.create' }] } },
    });
    assert.equal(invoiceResponse.status, 200);
    assert.equal(invoiceResponse.body.price.cmtPrice, 10);
    assert.equal(invoiceResponse.body.price.workerPrice, undefined);

    const productionResponse = await invoke(controller.lookupCmtPrice, {
      params: { itemCode: 'a1' },
      query: { usage: 'production' },
      user: { role: { permissions: [{ key: 'production_order.create' }] } },
    });
    assert.equal(productionResponse.body.price.workerPrice, 5);
    assert.equal(productionResponse.body.price.cmtPrice, undefined);
  } finally {
    CmtPrice.findOne = original;
  }
});
