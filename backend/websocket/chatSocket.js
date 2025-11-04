const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const pushNotificationService = require('../services/pushNotificationService');

class ChatWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/chat'
    });
    
    this.clients = new Map(); // userId -> WebSocket
    this.userSockets = new Map(); // WebSocket -> userId
    
    this.setupWebSocket();
  }
  
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔗 New WebSocket connection attempt');
      
      // Extract token from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('❌ No token provided');
        ws.close(1008, 'No authentication token provided');
        return;
      }
      
      // Verify JWT token
      try {
        console.log('🔍 WebSocket token received:', token ? `${token.substring(0, 20)}...` : 'No token');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        console.log('🔍 WebSocket decoded token:', decoded);
        const userId = decoded.userId || decoded.id;
        const userType = decoded.user_type;
        
        if (!userId) {
          console.error('❌ No userId found in token:', decoded);
          ws.close(1008, 'Invalid token: no user ID');
          return;
        }
        
        console.log(`✅ WebSocket authenticated for user ${userId} (${userType})`);
        
        // Store client connection
        this.clients.set(userId, ws);
        this.userSockets.set(ws, userId);
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Connected to chat server',
          userId: userId
        }));
        
        // Handle incoming messages
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);
            await this.handleMessage(ws, message, userId);
          } catch (error) {
            console.error('❌ Error handling WebSocket message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format'
            }));
          }
        });
        
        // Handle disconnection
        ws.on('close', () => {
          console.log(`🔌 User ${userId} disconnected from WebSocket`);
          this.clients.delete(userId);
          this.userSockets.delete(ws);
        });
        
        // Handle errors
        ws.on('error', (error) => {
          console.error(`❌ WebSocket error for user ${userId}:`, error);
          this.clients.delete(userId);
          this.userSockets.delete(ws);
        });
        
      } catch (error) {
        console.log('❌ Invalid token:', error.message);
        console.log('❌ JWT verification error details:', {
          name: error.name,
          message: error.message,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token'
        });
        ws.close(1008, 'Invalid authentication token');
      }
    });
    
    console.log('🚀 Chat WebSocket server started on /ws/chat');
  }
  
  async handleMessage(ws, message, senderId) {
    const { type, data } = message;
    
    switch (type) {
      case 'send_message':
        await this.handleSendMessage(senderId, data);
        break;
      case 'typing':
        await this.handleTyping(senderId, data);
        break;
      case 'mark_read':
        await this.handleMarkRead(senderId, data);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }
  
  async handleSendMessage(senderId, data) {
    try {
      console.log('🔍 WebSocket - handleSendMessage called:', { senderId, data });
      const { conversationId, message, messageType = 'text' } = data;
      
      console.log('🔍 WebSocket - Parsed data:', { conversationId, message, messageType });
      
      // Validate required parameters
      if (!conversationId || conversationId === undefined) {
        console.error('❌ WebSocket - conversationId is undefined');
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Invalid conversation ID'
        });
        return;
      }
      
      if (!message || message === undefined) {
        console.error('❌ WebSocket - message is undefined');
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Message cannot be empty'
        });
        return;
      }
      
      if (!senderId || senderId === undefined) {
        console.error('❌ WebSocket - senderId is undefined');
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Invalid sender ID'
        });
        return;
      }
      
      // Convert parameters to proper types
      const conversationIdNum = parseInt(conversationId);
      const senderIdNum = parseInt(senderId);
      
      if (isNaN(conversationIdNum)) {
        console.error('❌ WebSocket - conversationId is not a valid number:', conversationId);
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Invalid conversation ID format'
        });
        return;
      }
      
      if (isNaN(senderIdNum)) {
        console.error('❌ WebSocket - senderId is not a valid number:', senderId);
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Invalid sender ID format'
        });
        return;
      }
      
      // Verify user has access to this conversation
      const accessQuery = `
        SELECT id, user_id, professional_id FROM chat_conversations 
        WHERE id = ? AND (user_id = ? OR professional_id = ?)
      `;
      console.log('🔍 WebSocket - Checking access for conversation:', conversationIdNum);
      const accessResult = await executeQuery(accessQuery, [conversationIdNum, senderIdNum, senderIdNum]);
      
      if (!accessResult.success || accessResult.data.length === 0) {
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Access denied to this conversation'
        });
        return;
      }
      
      const conversation = accessResult.data[0];
      const recipientId = conversation.user_id === senderId ? conversation.professional_id : conversation.user_id;
      
      // Insert message into database
      const messageQuery = `
        INSERT INTO chat_messages (
          conversation_id, sender_id, message, message_type, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;
      console.log('🔍 WebSocket - Inserting message:', { conversationId: conversationIdNum, senderId: senderIdNum, message, messageType });
      const messageResult = await executeQuery(messageQuery, [conversationIdNum, senderIdNum, message, messageType]);
      
      console.log('🔍 WebSocket - Message insert result:', messageResult);
      
      if (!messageResult.success) {
        console.error('❌ WebSocket - Failed to insert message:', messageResult);
        this.sendToUser(senderId, {
          type: 'error',
          message: 'Failed to send message'
        });
        return;
      }
      
      const messageId = messageResult.data.insertId;
      console.log('✅ WebSocket - Message inserted with ID:', messageId);
      
      // Update conversation last activity
      const updateQuery = `
        UPDATE chat_conversations 
        SET last_activity = NOW() 
        WHERE id = ?
      `;
      await executeQuery(updateQuery, [conversationId]);
      
      // Get sender info
      const senderQuery = `
        SELECT first_name, last_name, user_type, profile_image 
        FROM users WHERE id = ?
      `;
      const senderResult = await executeQuery(senderQuery, [senderId]);
      const sender = senderResult.success ? senderResult.data[0] : null;
      
      // Create message object
      const messageObj = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        message: message,
        message_type: messageType,
        is_read: false,
        created_at: new Date().toISOString(),
        sender: sender
      };
      
      // Send message to sender (confirmation)
      this.sendToUser(senderId, {
        type: 'message_sent',
        data: messageObj
      });
      
      // Send message to recipient (if online)
      this.sendToUser(recipientId, {
        type: 'new_message',
        data: messageObj
      });
      
      // Send push notification to recipient if they're not online
      // Format message for notification (handle media messages)
      let notificationMessage = message;
      if (messageType === 'image') {
        notificationMessage = message || 'Sent an image';
      } else if (messageType === 'file' || messageType === 'video') {
        notificationMessage = message || 'Sent a video';
      }
      await this.sendPushNotificationToRecipient(recipientId, sender, notificationMessage, conversationId);
      
      console.log(`📨 Message sent from ${senderId} to ${recipientId} in conversation ${conversationId}`);
      
    } catch (error) {
      console.error('❌ Error handling send message:', error);
      this.sendToUser(senderId, {
        type: 'error',
        message: 'Failed to send message'
      });
    }
  }
  
  async handleTyping(senderId, data) {
    try {
      const { conversationId, isTyping } = data;
      
      // Verify user has access to this conversation
      const accessQuery = `
        SELECT id, user_id, professional_id FROM chat_conversations 
        WHERE id = ? AND (user_id = ? OR professional_id = ?)
      `;
      const accessResult = await executeQuery(accessQuery, [conversationId, senderId, senderId]);
      
      if (!accessResult.success || accessResult.data.length === 0) {
        return;
      }
      
      const conversation = accessResult.data[0];
      const recipientId = conversation.user_id === senderId ? conversation.professional_id : conversation.user_id;
      
      // Send typing indicator to recipient
      this.sendToUser(recipientId, {
        type: 'typing',
        data: {
          conversationId: conversationId,
          userId: senderId,
          isTyping: isTyping
        }
      });
      
    } catch (error) {
      console.error('❌ Error handling typing:', error);
    }
  }
  
  async handleMarkRead(senderId, data) {
    try {
      const { conversationId } = data;
      
      // Mark messages as read
      const readQuery = `
        UPDATE chat_messages 
        SET is_read = true, read_at = NOW() 
        WHERE conversation_id = ? AND sender_id != ? AND is_read = false
      `;
      const readResult = await executeQuery(readQuery, [conversationId, senderId]);
      
      if (readResult.success) {
        // Notify other participants that messages were read
        const accessQuery = `
          SELECT user_id, professional_id FROM chat_conversations 
          WHERE id = ? AND (user_id = ? OR professional_id = ?)
        `;
        const accessResult = await executeQuery(accessQuery, [conversationId, senderId, senderId]);
        
        if (accessResult.success && accessResult.data.length > 0) {
          const conversation = accessResult.data[0];
          const recipientId = conversation.user_id === senderId ? conversation.professional_id : conversation.user_id;
          
          this.sendToUser(recipientId, {
            type: 'messages_read',
            data: {
              conversationId: conversationId,
              userId: senderId
            }
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling mark read:', error);
    }
  }
  
  sendToUser(userId, message) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Send push notification to recipient if they're not online
   */
  async sendPushNotificationToRecipient(recipientId, sender, message, conversationId) {
    try {
      // Check if recipient is online
      const isRecipientOnline = this.clients.has(recipientId);
      
      if (!isRecipientOnline) {
        console.log('🔔 WebSocket - Recipient not online, sending push notification');
        
        // Get recipient info to determine notification type
        const recipientQuery = 'SELECT user_type FROM users WHERE id = ?';
        const recipientResult = await executeQuery(recipientQuery, [recipientId]);
        
        if (recipientResult.success && recipientResult.data.length > 0) {
          const recipientType = recipientResult.data[0].user_type;
          const senderName = `${sender.first_name} ${sender.last_name}`;
          
          let notificationData;
          
          if (recipientType === 'doctor') {
            // Doctor receiving message from patient
            notificationData = pushNotificationService.createChatNotification(
              senderName, 
              message, 
              conversationId
            );
          } else {
            // Patient receiving message from doctor
            notificationData = pushNotificationService.createChatNotification(
              senderName, 
              message, 
              conversationId
            );
          }
          
          // Send push notification
          const result = await pushNotificationService.sendNotificationToUser(recipientId, notificationData);
          
          if (result.success) {
            console.log('✅ WebSocket - Push notification sent successfully');
          } else {
            console.log('⚠️ WebSocket - Failed to send push notification:', result.message);
          }
        }
      } else {
        console.log('🔔 WebSocket - Recipient is online, no push notification needed');
      }
    } catch (error) {
      console.error('❌ WebSocket - Error sending push notification:', error);
    }
  }
  
  // Broadcast message to all connected clients
  broadcast(message) {
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
  
  // Get online users count
  getOnlineUsersCount() {
    return this.clients.size;
  }
  
  // Get online users list
  getOnlineUsers() {
    return Array.from(this.clients.keys());
  }
}

module.exports = ChatWebSocketServer;
