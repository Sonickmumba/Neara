BEGIN;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC, id DESC);

COMMIT;
