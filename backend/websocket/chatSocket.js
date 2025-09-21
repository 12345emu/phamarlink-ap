const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

class ChatSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/chat',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // userId -> WebSocket
    this.rooms = new Map(); // conversationId -> Set of userIds
    
    this.setupEventHandlers();
    console.log('🚀 Chat WebSocket server initialized');
  }

  async verifyClient(info) {
    try {
      const token = info.req.url.split('token=')[1];
      if (!token) {
        console.log('❌ No token provided');
        return false;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 WebSocket - JWT decoded:', decoded);
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      return false;
    }
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const userId = req.user.userId || req.user.id;
      const userType = req.user.user_type;
      
      console.log(`🔗 User ${userId} (${userType}) connected to chat`);
      
      // Store client connection
      this.clients.set(userId, ws);
      
      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        success: true,
        userId: userId,
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(userId, userType, message, ws);
        } catch (error) {
          console.error('❌ Error handling message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`🔌 User ${userId} disconnected from chat`);
        this.clients.delete(userId);
        this.removeUserFromAllRooms(userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for user ${userId}:`, error);
        this.clients.delete(userId);
      });
    });
  }

  async handleMessage(userId, userType, message, ws) {
    const { type, data } = message;

    switch (type) {
      case 'join_conversation':
        await this.joinConversation(userId, data.conversationId, ws);
        break;
        
      case 'leave_conversation':
        await this.leaveConversation(userId, data.conversationId);
        break;
        
      case 'send_message':
        await this.sendMessage(userId, userType, data, ws);
        break;
        
      case 'typing':
        await this.handleTyping(userId, data.conversationId, data.isTyping);
        break;
        
      case 'mark_read':
        await this.markMessagesAsRead(userId, data.conversationId);
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  async joinConversation(userId, conversationId, ws) {
    try {
      console.log(`🔍 WebSocket - User ${userId} attempting to join conversation ${conversationId}`);
      
      // Verify user has access to this conversation
      const hasAccess = await this.verifyConversationAccess(userId, conversationId);
      if (!hasAccess) {
        console.log(`❌ WebSocket - Access denied for user ${userId} to conversation ${conversationId}`);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Access denied to conversation'
        }));
        return;
      }

      // Add user to room
      if (!this.rooms.has(conversationId)) {
        this.rooms.set(conversationId, new Set());
        console.log(`🔍 WebSocket - Created new room for conversation ${conversationId}`);
      }
      this.rooms.get(conversationId).add(userId);

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'joined_conversation',
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }));

      console.log(`👥 WebSocket - User ${userId} joined conversation ${conversationId}. Room now has: [${Array.from(this.rooms.get(conversationId)).join(', ')}]`);
    } catch (error) {
      console.error('❌ Error joining conversation:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to join conversation'
      }));
    }
  }

  async leaveConversation(userId, conversationId) {
    if (this.rooms.has(conversationId)) {
      this.rooms.get(conversationId).delete(userId);
      if (this.rooms.get(conversationId).size === 0) {
        this.rooms.delete(conversationId);
      }
    }
    console.log(`👋 User ${userId} left conversation ${conversationId}`);
  }

  async sendMessage(userId, userType, data, ws) {
    try {
      const { conversationId, message, messageType = 'text' } = data;
      
      console.log(`🔍 WebSocket - Sending message: User ${userId} to conversation ${conversationId}: "${message}"`);

      // Verify access and conversation exists
      const hasAccess = await this.verifyConversationAccess(userId, conversationId);
      if (!hasAccess) {
        console.log(`❌ WebSocket - Access denied for user ${userId} to conversation ${conversationId}`);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Access denied'
        }));
        return;
      }
      
      console.log(`✅ WebSocket - Access granted for user ${userId} to conversation ${conversationId}`);

      // Validate message data before saving
      if (!conversationId || !userId || !message) {
        console.log(`❌ WebSocket - Invalid message data: conversationId=${conversationId}, userId=${userId}, message=${message}`);
        throw new Error('Invalid message data');
      }

      // Save message to database
      const messageResult = await executeQuery(
        `INSERT INTO chat_messages (conversation_id, sender_id, message, message_type, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [conversationId, userId, message, messageType]
      );

      if (!messageResult.success) {
        console.log(`❌ WebSocket - Failed to save message to database:`, messageResult.error);
        throw new Error('Failed to save message');
      }

      const messageId = messageResult.data.insertId;
      console.log(`✅ WebSocket - Message saved to database with ID: ${messageId}`);

      // Update conversation last activity
      await executeQuery(
        'UPDATE chat_conversations SET last_activity = NOW() WHERE id = ?',
        [conversationId]
      );

      // Get sender info
      const senderResult = await executeQuery(
        'SELECT first_name, last_name, user_type FROM users WHERE id = ?',
        [userId]
      );

      const sender = senderResult.success ? senderResult.data[0] : null;

      // Create message object
      const messageObj = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: userId,
        message: message,
        message_type: messageType,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_name: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
        sender_type: sender ? sender.user_type : 'unknown'
      };

      // Broadcast to all users in the conversation
      console.log(`🔍 WebSocket - Broadcasting message to conversation ${conversationId}`);
      await this.broadcastToConversation(conversationId, {
        type: 'new_message',
        data: messageObj
      }, userId);

      // Also send to the sender to confirm delivery
      const senderClient = this.clients.get(userId);
      if (senderClient && senderClient.readyState === WebSocket.OPEN) {
        senderClient.send(JSON.stringify({
          type: 'message_sent',
          data: { messageId: messageId, conversationId: conversationId }
        }));
      }

      console.log(`💬 WebSocket - Message sent in conversation ${conversationId} by user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send message'
      }));
    }
  }

  async handleTyping(userId, conversationId, isTyping) {
    // Broadcast typing indicator to other users in conversation
    await this.broadcastToConversation(conversationId, {
      type: 'typing',
      data: {
        userId: userId,
        isTyping: isTyping,
        timestamp: new Date().toISOString()
      }
    }, userId);
  }

  async markMessagesAsRead(userId, conversationId) {
    try {
      await executeQuery(
        `UPDATE chat_messages 
         SET is_read = true, read_at = NOW() 
         WHERE conversation_id = ? AND sender_id != ? AND is_read = false`,
        [conversationId, userId]
      );

      // Broadcast read receipt to other users
      await this.broadcastToConversation(conversationId, {
        type: 'messages_read',
        data: {
          userId: userId,
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        }
      }, userId);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }

  async broadcastToConversation(conversationId, message, excludeUserId = null) {
    if (!this.rooms.has(conversationId)) {
      console.log(`🔍 WebSocket - No room found for conversation ${conversationId}`);
      return;
    }

    const userIds = Array.from(this.rooms.get(conversationId));
    console.log(`🔍 WebSocket - Broadcasting to conversation ${conversationId}, users: [${userIds.join(', ')}], excluding: ${excludeUserId}`);
    
    for (const userId of userIds) {
      if (excludeUserId && userId === excludeUserId) {
        console.log(`🔍 WebSocket - Skipping sender user ${userId}`);
        continue;
      }

      const client = this.clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          console.log(`🔍 WebSocket - Sending message to user ${userId}`);
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ Error sending to user ${userId}:`, error);
          this.clients.delete(userId);
        }
      } else {
        console.log(`🔍 WebSocket - User ${userId} not connected or client not found`);
      }
    }
  }

  async verifyConversationAccess(userId, conversationId) {
    try {
      // Validate inputs
      if (!userId || !conversationId) {
        console.log(`❌ WebSocket - Invalid parameters: userId=${userId}, conversationId=${conversationId}`);
        return false;
      }

      // Get conversation details
      const conversationResult = await executeQuery(
        'SELECT * FROM chat_conversations WHERE id = ?',
        [conversationId]
      );

      if (!conversationResult.success || conversationResult.data.length === 0) {
        console.log(`❌ WebSocket - Conversation ${conversationId} not found`);
        return false;
      }

      const conversation = conversationResult.data[0];

      // Get sender's user type
      const userResult = await executeQuery(
        'SELECT user_type FROM users WHERE id = ?',
        [userId]
      );

      if (!userResult.success || userResult.data.length === 0) {
        console.log(`❌ WebSocket - User ${userId} not found`);
        return false;
      }

      const senderUserType = userResult.data[0].user_type;

      // Check access based on sender's user type
      if (senderUserType === 'patient') {
        // Patient can only access their own conversations
        return conversation.user_id === userId;
      } else if (senderUserType === 'doctor' || senderUserType === 'pharmacist') {
        // Healthcare professionals can access conversations for their facilities
        const facilityResult = await executeQuery(
          'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?',
          [conversation.facility_id, userId]
        );
        return facilityResult.success && facilityResult.data.length > 0;
      }

      return false;
    } catch (error) {
      console.error('❌ Error verifying conversation access:', error);
      return false;
    }
  }

  removeUserFromAllRooms(userId) {
    for (const [conversationId, userIds] of this.rooms.entries()) {
      userIds.delete(userId);
      if (userIds.size === 0) {
        this.rooms.delete(conversationId);
      }
    }
  }

  // Method to send notification to specific user
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.clients.size;
  }

  // Get users in specific conversation
  getUsersInConversation(conversationId) {
    return this.rooms.has(conversationId) ? 
      Array.from(this.rooms.get(conversationId)) : [];
  }
}

module.exports = ChatSocketServer;
