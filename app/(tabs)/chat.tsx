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
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatService } from '../../services/chatService';
import { apiClient } from '../../services/apiClient';
import { API_CONFIG } from '../../constants/API';
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

interface ChatConversation {
  id: number;
  professionalId: number;
  professionalName: string;
  professionalEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'online' | 'offline';
  avatar?: string;
}

function PatientChatList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use chatService to get conversations
      const response = await chatService.getConversations();
      
      if (response && response.data) {
        const formattedConversations: ChatConversation[] = response.data.map((conv: any) => ({
          id: conv.id,
          professionalId: conv.professional_id,
          professionalName: `${conv.professional_first_name} ${conv.professional_last_name}` || 'Healthcare Provider',
          professionalEmail: conv.professional_email || '',
          lastMessage: conv.last_message || 'No messages yet',
          lastMessageTime: formatTimeAgo(conv.last_message_time || conv.updated_at),
          unreadCount: conv.unread_count || 0,
          status: conv.status || 'offline',
          avatar: conv.professional_profile_image
        }));
        
        setConversations(formattedConversations);
      }
    } catch (err: any) {
      console.error('❌ Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.professionalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.professionalEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chat with Healthcare Providers</Text>
          <Text style={styles.headerSubtitle}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search providers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#bdc3c7"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times" size={16} color="#7f8c8d" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      <ScrollView style={styles.conversationsList}>
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="comments" size={60} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No providers found' : 'No conversations yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'You have no conversations with healthcare providers yet'
              }
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => {
                router.push({
                  pathname: '/chat-screen',
                  params: {
                    conversationId: conversation.id.toString(),
                    patientName: conversation.professionalName,
                    patientEmail: conversation.professionalEmail,
                    patientAvatar: conversation.avatar
                  }
                });
              }}
            >
              <View style={styles.cardContent}>
                <View style={styles.avatarContainer}>
                  {conversation.avatar ? (
                    <Image 
                      source={{ uri: conversation.avatar }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.defaultAvatar}>
                      <FontAwesome name="user-md" size={20} color="#3498db" />
                    </View>
                  )}
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: conversation.status === 'online' ? '#27ae60' : '#95a5a6' }
                  ]} />
                </View>
                
                <View style={styles.conversationDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.professionalName}>{conversation.professionalName}</Text>
                    <Text style={styles.timestamp}>{conversation.lastMessageTime}</Text>
                  </View>
                  
                  <View style={styles.messageRow}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {conversation.lastMessage}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.statusRow}>
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: conversation.status === 'online' ? '#27ae60' : '#95a5a6' }
                      ]} />
                      <Text style={styles.statusText}>
                        {conversation.status === 'online' ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color="#bdc3c7" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function PatientChat() {
  const router = useRouter();
  const { patientId, patientName, patientEmail, patientAvatar, conversationId: conversationIdParam } = useLocalSearchParams();
  
  // If no patient is selected, show the main chat page with conversations
  if (!patientId && !conversationIdParam) {
    return <PatientChatList />;
  }
  
  const patientIdNum = patientId ? parseInt(patientId as string) : null;
  const patientNameStr = patientName as string;
  const patientEmailStr = patientEmail as string;
  const patientAvatarStr = patientAvatar as string;
  const conversationIdNum = conversationIdParam ? parseInt(conversationIdParam as string) : null;
  
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const handleClose = () => {
    router.back();
  };

  useEffect(() => {
    if (conversationIdNum) {
      loadMessages();
      initializeWebSocket();
    }

    return () => {
      if (wsConnection) {
        console.log('🔌 PatientChat - Closing WebSocket on unmount');
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, [conversationIdNum]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeWebSocket = async () => {
    try {
      // Check if WebSocket is already connected
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log('✅ PatientChat - WebSocket already connected');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('⚠️ PatientChat - No auth token found');
        return;
      }

      const wsUrl = `ws://172.20.10.3:3000/ws/chat?token=${token}`;
      console.log('🔍 PatientChat - Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ PatientChat - WebSocket connected');
        setWsConnection(ws);
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔍 PatientChat - WebSocket message received:', data);
          
          if (data.type === 'new_message' && data.data) {
            const message = data.data;
            if (message.conversation_id || message.receiver_id === patientIdNum || message.sender_id === patientIdNum) {
              const processedMessage = {
                ...message,
                is_doctor: message.is_doctor !== undefined ? message.is_doctor : false
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
          console.error('❌ PatientChat - Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔍 PatientChat - WebSocket disconnected');
        setWsConnection(null);
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('❌ PatientChat - WebSocket error:', error);
        setWsConnection(null);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('❌ PatientChat - Error initializing WebSocket:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 PatientChat - Loading messages for conversation:', conversationIdNum);
      
      // Use chatService to load messages from conversation
      const response = await chatService.getMessages(conversationIdNum!.toString());
      
      if (response && response.data) {
        const processedMessages = response.data.map((msg: any) => ({
          ...msg,
          is_doctor: msg.is_doctor !== undefined ? msg.is_doctor : true // Default to doctor messages for patient view
        }));
        
        setMessages(processedMessages);
        console.log('✅ PatientChat - Messages loaded:', processedMessages.length);
      } else {
        setMessages([]);
        console.log('⚠️ PatientChat - No messages found');
      }
    } catch (err: any) {
      console.error('❌ PatientChat - Error loading messages:', err);
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

    const messageToSend = newMessage.trim();

    try {
      setSending(true);
      
      console.log('🔍 PatientChat - Sending message:', newMessage);
      
      // Create a temporary message object for immediate UI update
      const tempMessage = {
        id: Date.now(),
        sender_id: conversationIdNum,
        receiver_id: conversationIdNum,
        message: messageToSend,
        timestamp: new Date().toISOString(),
        is_doctor: false,
        is_read: false
      };
      
      // Add message to UI immediately
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Use direct API call like the doctor does
      await sendMessageViaAPI(messageToSend);
      
      console.log('✅ PatientChat - Message sent successfully');
    } catch (err: any) {
      console.error('❌ PatientChat - Error sending message:', err);
      Alert.alert('Error', err.message || 'Failed to send message. Please try again.');
      setNewMessage(messageToSend); // Restore message
    } finally {
      setSending(false);
    }
  };

  const sendMessageViaAPI = async (message: string) => {
    try {
      console.log('🔍 PatientChat - Sending message via API:', { message, conversationId: conversationIdNum });
      
      // If we already have a conversation ID, send message to it
      if (conversationIdNum) {
        console.log('📤 PatientChat - Sending to existing conversation:', conversationIdNum);
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/conversations/${conversationIdNum}/messages`, {
          message: message,
          message_type: 'text'
        });
        
        if (response.success) {
          console.log('✅ PatientChat - Message sent to existing conversation');
          return response.data;
        } else {
          console.log('⚠️ PatientChat - Failed to send to existing conversation, will create new one');
        }
      }
      
      // Create new conversation if no conversation ID or sending failed
      console.log('🆕 PatientChat - Creating new conversation');
      const requestData = {
        professional_id: conversationIdNum, // This should be the doctor/professional ID
        subject: `Chat with Professional`,
        initial_message: message
      };
      console.log('🔍 PatientChat - Request data:', requestData);
      
      const createConversationResponse = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/conversations`, requestData);
      
      console.log('🔍 PatientChat - Create conversation response:', createConversationResponse);
      
      if (createConversationResponse.success) {
        console.log('✅ PatientChat - New conversation created and message sent');
        
        // Store the new conversation ID for future messages
        const newConversationId = (createConversationResponse.data as any)?.id || (createConversationResponse.data as any)?.conversation_id;
        if (newConversationId) {
          setConversationId(newConversationId);
          console.log('💾 PatientChat - Stored conversation ID:', newConversationId);
        }
        
        return createConversationResponse.data;
      } else {
        throw new Error(createConversationResponse.message || 'Failed to create conversation');
      }
    } catch (apiError: any) {
      console.error('❌ PatientChat - API send error:', apiError);
      
      // Handle validation errors specifically
      if (apiError.response?.data?.message === 'Validation error') {
        const validationErrors = apiError.response.data.errors;
        console.error('❌ PatientChat - Validation errors:', validationErrors);
        throw new Error(`Validation failed: ${validationErrors.map((err: any) => err.msg).join(', ')}`);
      }
      
      throw apiError;
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
    // In patient chat: patient messages (is_doctor: false) go on right, doctor messages (is_doctor: true) go on left
    const isFromCurrentUser = !message.is_doctor;
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.patientMessage : styles.doctorMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isFromCurrentUser ? styles.patientBubble : styles.doctorBubble
        ]}>
          <Text style={[
            styles.messageText,
            isFromCurrentUser ? styles.patientText : styles.doctorText
          ]}>
            {message.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isFromCurrentUser ? styles.patientTime : styles.doctorTime
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
            </TouchableOpacity>
            <View style={styles.headerAvatar}>
              {patientAvatarStr ? (
                <Image 
                  source={{ uri: patientAvatarStr }} 
                  style={styles.headerAvatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {patientNameStr ? patientNameStr.split(' ').map(n => n[0]).join('') : 'U'}
                </Text>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{patientNameStr || 'Patient'}</Text>
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
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
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
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffebee',
    margin: 20,
    borderRadius: 10,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
    paddingBottom: 200, // Add space for the input area positioned above tab bar
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
    marginBottom: 15,
  },
  doctorMessage: {
    alignItems: 'flex-end',
  },
  patientMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doctorBubble: {
    backgroundColor: '#3498db',
    borderBottomRightRadius: 6,
  },
  patientBubble: {
    backgroundColor: '#f1f3f4',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  doctorText: {
    color: '#fff',
  },
  patientText: {
    color: '#2c3e50',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  doctorTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  patientTime: {
    color: '#8e8e93',
    textAlign: 'left',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    position: 'absolute',
    bottom: 100, // Position above the tab bar with extra margin
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minHeight: 85,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e1e5e9',
    minHeight: 56,
    maxHeight: 120,
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
  headerContent: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  // Patient Chat List Styles
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
