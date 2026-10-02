const test = require('node:test');
const assert = require('node:assert/strict');
const CmtPrice = require('../src/models/cmtPrice.model');

test('CMT prices normalize Item Codes and store numeric decimal prices', async () => {
  const entry = new CmtPrice({
    itemCode: '  jabut06 ',
    style: 'P/C Bunny Jacket',
    cmtPrice: '45.75',
    workerPrice: '30.00',
  });
  await entry.validate();

  assert.equal(entry.itemCode, 'JABUT06');
  assert.equal(entry.cmtPrice, 45.75);
  assert.equal(entry.workerPrice, 30);
  assert.equal(entry.isActive, true);
  assert.equal(CmtPrice.schema.path('itemCode').options.unique, true);
});

test('CMT prices require Item Code and non-negative numeric prices', async () => {
  await assert.rejects(
    () => new CmtPrice({ itemCode: '', style: 'Jacket', cmtPrice: 10, workerPrice: 5 }).validate(),
    /item code is required/i
  );
  await assert.rejects(
    () =>
      new CmtPrice({ itemCode: 'JK1', style: 'Jacket', cmtPrice: -1, workerPrice: 5 }).validate(),
    /CMT price cannot be negative/i
  );
  await assert.rejects(
    () =>
      new CmtPrice({ itemCode: 'JK1', style: 'Jacket', cmtPrice: 1, workerPrice: -5 }).validate(),
    /Worker price cannot be negative/i
  );
});
