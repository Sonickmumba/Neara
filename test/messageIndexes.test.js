const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('schema includes composite message pagination index', () => {
  const schema = readFileSync('db/schema.sql', 'utf8');

  assert.match(schema, /idx_messages_conversation_created/);
  assert.match(schema, /ON messages\(conversation_id, created_at DESC, id DESC\)/);
});

test('message index migration can be applied independently', () => {
  const migration = readFileSync('db/migration_message_indexes.sql', 'utf8');

  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_messages_conversation_created/);
  assert.match(migration, /ON messages\(conversation_id, created_at DESC, id DESC\)/);
});
