-- Chat System Database Optimizations
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

-- 7. Create a view for conversation summaries (optional optimization)
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
    cc.id,
    cc.user_id,
    cc.facility_id,
    cc.subject,
    cc.status,
    cc.conversation_type,
    cc.last_activity,
    cc.created_at,
    u.first_name,
    u.last_name,
    hf.name as facility_name,
    hf.facility_type,
    hp.first_name as professional_first_name,
    hp.last_name as professional_last_name,
    (SELECT cm.message 
     FROM chat_messages cm 
     WHERE cm.conversation_id = cc.id 
     ORDER BY cm.created_at DESC 
     LIMIT 1) as last_message,
    (SELECT cm.created_at 
     FROM chat_messages cm 
     WHERE cm.conversation_id = cc.id 
     ORDER BY cm.created_at DESC 
     LIMIT 1) as last_message_time,
    (SELECT COUNT(*) 
     FROM chat_messages cm 
     WHERE cm.conversation_id = cc.id 
     AND cm.is_read = false 
     AND cm.sender_id != cc.user_id) as unread_count
FROM chat_conversations cc
JOIN users u ON cc.user_id = u.id
LEFT JOIN healthcare_facilities hf ON cc.facility_id = hf.id
LEFT JOIN healthcare_professionals hp ON cc.professional_id = hp.id;

-- 8. Create a stored procedure for getting conversation messages (optional)
DELIMITER //
CREATE PROCEDURE GetConversationMessages(
    IN p_conversation_id INT,
    IN p_user_id INT,
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE p_offset INT DEFAULT (p_page - 1) * p_limit;
    
    -- Get messages with pagination
    SELECT 
        cm.id,
        cm.conversation_id,
        cm.sender_id,
        cm.message,
        cm.message_type,
        cm.attachment_url,
        cm.is_read,
        cm.read_at,
        cm.created_at,
        u.first_name,
        u.last_name,
        u.user_type,
        u.profile_image as user_profile_image
    FROM chat_messages cm
    JOIN users u ON cm.sender_id = u.id
    WHERE cm.conversation_id = p_conversation_id
    ORDER BY cm.created_at DESC
    LIMIT p_limit OFFSET p_offset;
    
    -- Mark messages as read for the current user
    UPDATE chat_messages 
    SET is_read = true, read_at = NOW() 
    WHERE conversation_id = p_conversation_id 
    AND sender_id != p_user_id 
    AND is_read = false;
END //
DELIMITER ;

-- 9. Create a function to get unread count (optional)
DELIMITER //
CREATE FUNCTION GetUnreadCount(p_user_id INT, p_user_type VARCHAR(20))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE unread_count INT DEFAULT 0;
    
    IF p_user_type = 'patient' THEN
        SELECT COUNT(*) INTO unread_count
        FROM chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        WHERE cc.user_id = p_user_id 
        AND cm.sender_id != p_user_id 
        AND cm.is_read = false;
    ELSEIF p_user_type IN ('doctor', 'pharmacist') THEN
        SELECT COUNT(*) INTO unread_count
        FROM chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        WHERE cc.facility_id IN (
            SELECT id FROM healthcare_facilities WHERE user_id = p_user_id
        )
        AND cm.sender_id != p_user_id 
        AND cm.is_read = false;
    END IF;
    
    RETURN unread_count;
END //
DELIMITER ;

-- 10. Add constraints to ensure data integrity (MySQL 8.0+ syntax)
-- Note: CHECK constraints are supported in MySQL 8.0.16+
-- For older versions, these will be ignored

-- Add conversation status constraint
ALTER TABLE chat_conversations 
ADD CONSTRAINT chk_conversation_status 
CHECK (status IN ('active', 'closed', 'archived'));

-- Add message type constraint  
ALTER TABLE chat_messages 
ADD CONSTRAINT chk_message_type 
CHECK (message_type IN ('text', 'image', 'file', 'prescription'));

-- 11. Create a trigger to update last_activity when messages are inserted
DELIMITER //
CREATE TRIGGER update_conversation_activity
AFTER INSERT ON chat_messages
FOR EACH ROW
BEGIN
    UPDATE chat_conversations 
    SET last_activity = NEW.created_at 
    WHERE id = NEW.conversation_id;
END //
DELIMITER ;

-- 12. Add cleanup procedure for old messages (optional - run periodically)
DELIMITER //
CREATE PROCEDURE CleanupOldMessages(IN days_to_keep INT)
BEGIN
    -- Archive old closed conversations
    UPDATE chat_conversations 
    SET status = 'archived' 
    WHERE status = 'closed' 
    AND last_activity < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Optionally delete very old archived conversations
    -- DELETE FROM chat_conversations 
    -- WHERE status = 'archived' 
    -- AND last_activity < DATE_SUB(NOW(), INTERVAL (days_to_keep * 2) DAY);
END //
DELIMITER ;

-- 13. Show current indexes
SHOW INDEX FROM chat_conversations;
SHOW INDEX FROM chat_messages;

-- 14. Analyze tables for better query optimization
ANALYZE TABLE chat_conversations;
ANALYZE TABLE chat_messages;
ANALYZE TABLE users;
ANALYZE TABLE healthcare_facilities;
ANALYZE TABLE healthcare_professionals;
