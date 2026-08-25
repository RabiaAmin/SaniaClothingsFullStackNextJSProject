const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const { assignInitialAdminSafely } = require('../src/services/rbac.service');

test('legacy migration never promotes roleless users when an active admin exists', async () => {
  const originals = { countDocuments: User.countDocuments, findOne: User.findOne };
  let searchedForCandidate = false;
  User.countDocuments = async () => 1;
  User.findOne = () => {
    searchedForCandidate = true;
    return { sort: async () => null };
  };

  try {
    const result = await assignInitialAdminSafely({ _id: new mongoose.Types.ObjectId() });
    assert.equal(result, null);
    assert.equal(searchedForCandidate, false);
  } finally {
    User.countDocuments = originals.countDocuments;
    User.findOne = originals.findOne;
  }
});

test('legacy migration promotes at most one deterministic roleless account', async () => {
  const originals = { countDocuments: User.countDocuments, findOne: User.findOne };
  const adminRoleId = new mongoose.Types.ObjectId();
  let savedWith;
  let sort;
  const candidate = {
    _id: new mongoose.Types.ObjectId(),
    role: null,
    save: async (options) => {
      savedWith = options;
    },
  };
  User.countDocuments = async () => 0;
  User.findOne = () => ({
    sort: async (value) => {
      sort = value;
      return candidate;
    },
  });

  try {
    const result = await assignInitialAdminSafely({ _id: adminRoleId });
    assert.equal(result, candidate);
    assert.equal(candidate.role, adminRoleId);
    assert.deepEqual(sort, { _id: 1 });
    assert.deepEqual(savedWith, { validateBeforeSave: false });
  } finally {
    User.countDocuments = originals.countDocuments;
    User.findOne = originals.findOne;
  }
});
