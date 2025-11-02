import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Keyboard,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatService } from '../services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_name?: string;
  is_doctor: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId, patientName, patientEmail, patientAvatar } = useLocalSearchParams();
  
  const conversationIdNum = conversationId ? parseInt(conversationId as string) : null;
  const patientNameStr = patientName as string;
  const patientEmailStr = patientEmail as string;
  const patientAvatarStr = patientAvatar as string;
  
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const handleClose = () => {
    router.back();
  };

  const getCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Decode JWT token to get user ID
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId || payload.id;
        setCurrentUserId(userId);
        console.log('🔍 ChatScreen - Current user ID:', userId);
        console.log('🔍 ChatScreen - Token payload:', payload);
      }
    } catch (error) {
      console.error('❌ ChatScreen - Error getting current user ID:', error);
    }
  };

  useEffect(() => {
    if (conversationIdNum) {
      getCurrentUserId();
      loadMessages();
      initializeWebSocket();
    }

    // Add keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      // Auto-scroll to bottom when keyboard appears
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Auto-scroll to bottom when keyboard hides
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      if (wsConnection) {
        console.log('🔌 ChatScreen - Closing WebSocket on unmount');
        wsConnection.close();
        setWsConnection(null);
      }
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [conversationIdNum]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // Additional effect to handle keyboard and scrolling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewRef.current && messages.length > 0) {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const initializeWebSocket = async () => {
    try {
      // Check if WebSocket is already connected
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log('✅ ChatScreen - WebSocket already connected');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('⚠️ ChatScreen - No auth token found');
        return;
      }

      const wsUrl = `ws://172.20.10.4:3000/ws/chat?token=${token}`;
      console.log('🔍 ChatScreen - Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ ChatScreen - WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔍 ChatScreen - WebSocket message received:', data);
          
          if (data.type === 'new_message' && data.data) {
            const message = data.data;
            if (message.conversation_id === conversationIdNum || message.receiver_id === conversationIdNum || message.sender_id === conversationIdNum) {
              const processedMessage = {
                ...message,
                // Keep is_doctor field for compatibility but don't use it for alignment
                is_doctor: message.is_doctor !== undefined ? message.is_doctor : true
              };
              
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === processedMessage.id);
                if (!exists) {
                  return [...prev, processedMessage];
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.error('❌ ChatScreen - Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔍 ChatScreen - WebSocket disconnected');
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('❌ ChatScreen - WebSocket error:', error);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('❌ ChatScreen - Error initializing WebSocket:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 ChatScreen - Loading messages for conversation:', conversationIdNum);
      
      const response = await chatService.getMessages(conversationIdNum!.toString());
      
      if (response && response.data) {
        // Process messages without relying on is_doctor field
        const processedMessages = response.data.map((msg: any) => ({
          ...msg,
          // Keep is_doctor field for compatibility but don't use it for alignment
          is_doctor: msg.is_doctor !== undefined ? msg.is_doctor : true
        }));
        
        setMessages(processedMessages);
        console.log('✅ ChatScreen - Messages loaded:', processedMessages.length);
      } else {
        setMessages([]);
        console.log('⚠️ ChatScreen - No messages found');
      }
    } catch (err: any) {
      console.error('❌ ChatScreen - Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    try {
      setSending(true);
      
      console.log('🔍 ChatScreen - Sending message:', newMessage);
      
      // Create a temporary message object for immediate UI update
      const tempMessage = {
        id: Date.now(),
        sender_id: currentUserId || 0,
        receiver_id: conversationIdNum,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        is_doctor: false, // This field is not used anymore, kept for compatibility
        is_read: false
      };
      
      // Add message to UI immediately
      setMessages(prev => [...prev, tempMessage]);
      const messageToSend = newMessage.trim();
      setNewMessage('');
      
      // Scroll to bottom immediately after adding message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Use chatService to send message
      const success = await chatService.sendMessage(conversationIdNum!, messageToSend);
      
      if (!success) {
        Alert.alert('Error', 'Failed to send message. Please try again.');
        setNewMessage(messageToSend); // Restore message
      }
      
      // Scroll to bottom again after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
      
      console.log('✅ ChatScreen - Message sent successfully');
    } catch (err: any) {
      console.error('❌ ChatScreen - Error sending message:', err);
      Alert.alert('Error', err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Just now';
    }
  };

  const renderMessage = (message: Message) => {
    // Determine if message is from current user (sender) - sender on right, receiver on left
    const isFromCurrentUser = currentUserId ? message.sender_id === currentUserId : false;
    
    console.log('🔍 ChatScreen - Rendering message:', {
      messageId: message.id,
      senderId: message.sender_id,
      currentUserId: currentUserId,
      isFromCurrentUser: isFromCurrentUser
    });
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.senderMessage : styles.receiverMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isFromCurrentUser ? styles.senderBubble : styles.receiverBubble
        ]}>
          <Text style={[
            styles.messageText,
            isFromCurrentUser ? styles.senderText : styles.receiverText
          ]}>
            {message.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isFromCurrentUser ? styles.senderTime : styles.receiverTime
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Professional Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
            </TouchableOpacity>
            <View style={styles.avatarContainer}>
              {patientAvatarStr ? (
                <Image 
                  source={{ uri: patientAvatarStr }} 
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.defaultAvatar}>
                  <FontAwesome name="user-md" size={20} color="#3498db" />
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{patientNameStr || 'Healthcare Provider'}</Text>
              {isConnected && (
                <View style={styles.connectionStatus}>
                  <View style={[styles.statusDot, { backgroundColor: '#27ae60' }]} />
                  <Text style={styles.statusText}>Live</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-triangle" size={50} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadMessages} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.messagesContent}
              automaticallyAdjustKeyboardInsets={true}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome name="comments" size={60} color="#bdc3c7" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Start a conversation with {patientNameStr}</Text>
                </View>
              ) : (
                messages.map(renderMessage)
              )}
            </ScrollView>

            {/* Professional Input Area */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  multiline
                  maxLength={500}
                  editable={!sending}
                  returnKeyType="default"
                  blurOnSubmit={false}
                  textAlignVertical="top"
                  onFocus={() => {
                    // Scroll to bottom when input is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <FontAwesome name="send" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  defaultAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffebee',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 12,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 8,
  },
  receiverMessage: {
    alignItems: 'flex-start',
  },
  senderMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  receiverBubble: {
    backgroundColor: '#f1f3f4',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  senderBubble: {
    backgroundColor: '#3498db',
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  senderText: {
    color: '#fff',
  },
  receiverText: {
    color: '#2c3e50',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  senderTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  receiverTime: {
    color: '#7f8c8d',
    textAlign: 'left',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    zIndex: 1000,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    minHeight: 48,
    maxHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    maxHeight: 100,
    minHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
});
