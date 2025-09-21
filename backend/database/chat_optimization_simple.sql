-- Chat System Database Optimizations (Simplified for older MySQL versions)
-- Run these queries to optimize the chat system performance

-- 1. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_facility_id ON chat_conversations(facility_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_activity ON chat_conversations(last_activity);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at);

-- 2. Optimize chat_messages table
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at);

-- 3. Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(conversation_id, is_read, sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_status ON chat_conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_facility_status ON chat_conversations(facility_id, status);

-- 4. Add last_activity column if it doesn't exist
ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Update last_activity for existing conversations
UPDATE chat_conversations 
SET last_activity = (
    SELECT MAX(created_at) 
    FROM chat_messages 
    WHERE conversation_id = chat_conversations.id
)
WHERE last_activity IS NULL;

-- 6. Add read_at column to chat_messages if it doesn't exist
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL;

-- 7. Show current indexes
SHOW INDEX FROM chat_conversations;
SHOW INDEX FROM chat_messages;

-- 8. Analyze tables for better query optimization
ANALYZE TABLE chat_conversations;
ANALYZE TABLE chat_messages;
ANALYZE TABLE users;
ANALYZE TABLE healthcare_facilities;
ANALYZE TABLE healthcare_professionals;
