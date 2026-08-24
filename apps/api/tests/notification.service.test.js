const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Notification = require('../src/models/notification.model');
const Permission = require('../src/models/permission.model');
const Role = require('../src/models/role.model');
const User = require('../src/models/user.model');
const notificationService = require('../src/services/notification.service');

function distinctQuery(result) {
  return {
    session() {
      return { distinct: async () => result };
    },
  };
}

test('notification types remain extensible while production workflow types are defined', async () => {
  assert.equal(
    Notification.NOTIFICATION_TYPES.PRODUCTION_ENTRY_SUBMITTED,
    'PRODUCTION_ENTRY_SUBMITTED'
  );

  const notification = new Notification({
    recipient: new mongoose.Types.ObjectId(),
    type: 'FUTURE_PRODUCTION_EVENT',
    message: 'A future event occurred.',
  });

  await notification.validate();
  assert.equal(notification.isRead, false);
});

test('reviewer recipient lookup follows database permissions, wildcards, and active roles', async () => {
  const originals = {
    permissionFind: Permission.find,
    roleFind: Role.find,
    userFind: User.find,
  };
  const session = { id: 'notification-test-session' };
  const excludedUserId = new mongoose.Types.ObjectId();
  const reviewerId = new mongoose.Types.ObjectId();
  let permissionFilter;
  let roleFilter;
  let userFilter;

  try {
    Permission.find = (filter) => {
      permissionFilter = filter;
      return distinctQuery(['permission-exact', 'permission-wildcard']);
    };
    Role.find = (filter) => {
      roleFilter = filter;
      return distinctQuery(['role-production-manager']);
    };
    User.find = (filter) => {
      userFilter = filter;
      return distinctQuery([reviewerId]);
    };

    const recipients = await notificationService.findRecipientIdsForAnyPermission(
      ['production_entry.approve', 'production_entry.reject'],
      { excludeUserIds: [excludedUserId], session }
    );

    assert.deepEqual(permissionFilter.key.$in, [
      'production_entry.approve',
      'production_entry.*',
      '*',
      'production_entry.reject',
    ]);
    assert.deepEqual(roleFilter, {
      isActive: { $ne: false },
      permissions: { $in: ['permission-exact', 'permission-wildcard'] },
    });
    assert.deepEqual(userFilter, {
      role: { $in: ['role-production-manager'] },
      isActive: { $ne: false },
      _id: { $nin: [excludedUserId] },
    });
    assert.deepEqual(recipients, [reviewerId]);
  } finally {
    Permission.find = originals.permissionFind;
    Role.find = originals.roleFind;
    User.find = originals.userFind;
  }
});

test('notification creation deduplicates recipients and never writes an empty batch', async () => {
  const originalInsertMany = Notification.insertMany;
  const insertedBatches = [];

  try {
    Notification.insertMany = async (documents, options) => {
      insertedBatches.push({ documents, options });
      return documents;
    };
    const recipient = new mongoose.Types.ObjectId();
    const session = { id: 'notification-test-session' };
    const result = await notificationService.createNotificationsForUsers({
      recipientIds: [recipient, recipient.toString()],
      type: Notification.NOTIFICATION_TYPES.PRODUCTION_ENTRY_SUBMITTED,
      message: 'A production entry was submitted.',
      session,
    });

    assert.equal(result.length, 1);
    assert.equal(insertedBatches.length, 1);
    assert.equal(insertedBatches[0].documents[0].recipient, recipient.toString());
    assert.equal(insertedBatches[0].options.session, session);

    const emptyResult = await notificationService.createNotificationsForUsers({
      recipientIds: [],
      type: 'NO_RECIPIENT_EVENT',
      message: 'Nobody should receive this.',
    });
    assert.deepEqual(emptyResult, []);
    assert.equal(insertedBatches.length, 1);
  } finally {
    Notification.insertMany = originalInsertMany;
  }
});
