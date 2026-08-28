import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/database/db';
import { generateToken } from '../src/middleware/auth';
import bcrypt from 'bcryptjs';

test('TalkTime Test Suite', async (t) => {
  // Reset and seed data
  await db.connect();
  await db.seedInitialData();
  t.after(() => db.close());

  await t.test('1. Authentication - User Registration', async () => {                                                                                                                                                                                                                                                                                                             
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);
    const user = await db.createUser({
      name: 'Test Automation User',
      username: 'testauto',
      email: 'testauto@talktime.app',
      passwordHash: hash,
      bio: 'Automated test account',
    });

    assert.ok(user.id, 'User ID should be created');
    assert.equal(user.username, 'testauto');
    assert.equal(user.email, 'testauto@talktime.app');

    const retrieved = await db.findUserById(user.id);
    assert.ok(retrieved, 'User should be found in database');
    assert.equal(retrieved?.name, 'Test Automation User');
  });

  await t.test('2. Authentication - Password Verification & JWT Generation', async () => {
    const user = await db.findUserByEmailOrUsername('testauto');
    assert.ok(user, 'User should exist');

    const isValid = await bcrypt.compare('TestPass123!', user!.passwordHash);
    assert.equal(isValid, true, 'Password comparison should succeed');

    const token = generateToken({
      userId: user!.id,
      email: user!.email,
      username: user!.username,
    });
    assert.ok(token, 'JWT Token should be generated');
    assert.ok(token.length > 20, 'JWT Token should have valid length');
  });

  await t.test('3. User Search - Search functionality', async () => {
    const results = await db.searchUsers('sarah');
    assert.ok(results.length >= 1, 'Should find at least one user matching "sarah"');
    assert.equal(results[0].username, 'sarah');

    const all = await db.searchUsers('');
    assert.ok(all.length >= 5, 'Should return multiple users when query is empty');
  });

  await t.test('4. Conversations - Direct and Group Creation', async () => {
    const user1 = await db.findUserByEmailOrUsername('johndoe');
    const user2 = await db.findUserByEmailOrUsername('testauto');

    // 1-on-1 Conversation
    const direct = await db.createConversation({
      isGroup: false,
      creatorId: user1!.id,
      memberIds: [user2!.id],
    });

    assert.ok(direct.conversation.id, 'Direct conversation ID should exist');
    assert.equal(direct.conversation.isGroup, false);
    assert.equal(direct.members.length, 2);

    // Group Conversation
    const group = await db.createConversation({
      isGroup: true,
      name: 'Release Sprint Alpha',
      creatorId: user1!.id,
      memberIds: [user2!.id],
    });

    assert.ok(group.conversation.id, 'Group conversation ID should exist');
    assert.equal(group.conversation.isGroup, true);
    assert.equal(group.conversation.name, 'Release Sprint Alpha');
  });

  await t.test('5. Messages - Send, Edit, and Delete', async () => {
    const user1 = await db.findUserByEmailOrUsername('johndoe');
    const convs = await db.getUserConversations(user1!.id);
    const targetConvId = convs[0].conversation.id;

    // Send
    const msg = await db.createMessage({
      conversationId: targetConvId,
      senderId: user1!.id,
      content: 'Automated test message for real-time validation',
      messageType: 'TEXT',
    });

    assert.ok(msg.id, 'Message should have an ID');
    assert.equal(msg.content, 'Automated test message for real-time validation');
    assert.equal(msg.isEdited, false);

    // Edit
    const edited = await db.updateMessage(msg.id, 'Updated automated test content');
    assert.ok(edited);
    assert.equal(edited?.content, 'Updated automated test content');
    assert.equal(edited?.isEdited, true);

    // Delete
    const deleted = await db.deleteMessage(msg.id, user1!.id, 'FOR_EVERYONE');
    assert.ok(deleted);
    assert.equal(deleted?.isDeleted, true);
  });

  await t.test('6. Notifications - Create and Read', async () => {
    const user = await db.findUserByEmailOrUsername('johndoe');
    const notif = await db.createNotification({
      userId: user!.id,
      type: 'NEW_MESSAGE',
      title: 'Automated test alert',
      body: 'Testing notification delivery',
    });

    assert.ok(notif.id, 'Notification should have an ID');
    assert.equal(notif.isRead, false);

    const marked = await db.markNotificationAsRead(notif.id, user!.id);
    assert.equal(marked, true, 'Notification should be marked as read');
  });
});
