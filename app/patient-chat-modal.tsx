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
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doctorDashboardService } from '../services/doctorDashboardService';
import { chatService } from '../services/chatService';
import { apiClient } from '../services/apiClient';
import { API_CONFIG } from '../constants/API';
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

export default function PatientChatModal() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams();
  
  const patientIdNum = parseInt(patientId as string);
  const patientNameStr = patientName as string;
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [patientProfileImage, setPatientProfileImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const handleClose = () => {
    router.back();
  };

  useEffect(() => {
    // Always reload messages when screen opens to ensure we have the latest data
    loadMessages();
    loadPatientProfile();
    initializeWebSocket();

    return () => {
      // Close WebSocket when component unmounts
      if (wsConnection) {
        console.log('🔌 PatientChatModal - Closing WebSocket on unmount');
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, []);


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
        console.log('✅ PatientChatModal - WebSocket already connected');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('⚠️ PatientChatModal - No auth token found');
        return;
      }

      const wsUrl = `ws://172.20.10.3:3000/ws/chat?token=${token}`;
      console.log('🔍 PatientChatModal - Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ PatientChatModal - WebSocket connected');
        setWsConnection(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔍 PatientChatModal - WebSocket message received:', data);
          
          if (data.type === 'new_message' && data.data) {
            // Handle new message from WebSocket
            const message = data.data;
            if (message.conversation_id || message.receiver_id === patientId || message.sender_id === patientId) {
              // Ensure the message has the correct is_doctor field
              const processedMessage = {
                ...message,
                is_doctor: message.is_doctor !== undefined ? message.is_doctor : true
              };
              
              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.some(msg => msg.id === processedMessage.id);
                if (!exists) {
                  return [...prev, processedMessage];
                }
                return prev;
              });
            }
          } else if (data.type === 'message' && data.message) {
            // Handle legacy message format
            if (data.message.receiver_id === patientId || data.message.sender_id === patientId) {
              // Ensure the message has the correct is_doctor field
              const processedMessage = {
                ...data.message,
                is_doctor: data.message.is_doctor !== undefined ? data.message.is_doctor : true
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
          console.error('❌ PatientChatModal - Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔍 PatientChatModal - WebSocket disconnected');
        setWsConnection(null);
      };
      
      ws.onerror = (error) => {
        console.error('❌ PatientChatModal - WebSocket error:', error);
        setWsConnection(null);
      };
      
    } catch (error) {
      console.error('❌ PatientChatModal - Error initializing WebSocket:', error);
    }
  };

  const closeWebSocket = () => {
    if (wsConnection) {
      console.log('🔍 PatientChatModal - Closing WebSocket connection');
      wsConnection.close();
      setWsConnection(null);
    }
  };

  // Cleanup function that only runs when component unmounts
  useEffect(() => {
    return () => {
      // Only close WebSocket when component is completely unmounted
      closeWebSocket();
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 PatientChatModal - Loading messages for patient:', patientIdNum);
      
      // Try to get conversations first
      const conversationResponse = await doctorDashboardService.getChatConversations();
      
      // Service now returns { conversations: [...], pagination: {...} }
      const conversations = conversationResponse?.conversations;
      
      if (conversations && Array.isArray(conversations)) {
        // Find conversation with this patient
        const existingConversation = conversations.find(
          (conv: any) => conv.user_id === patientIdNum
        );
        
        if (existingConversation) {
          // Store conversation ID for future messages
          setConversationId(existingConversation.id);
          console.log('💾 PatientChatModal - Found existing conversation:', existingConversation.id);
          
          // Extract profile image from conversation data if available
          if (existingConversation.user_profile_image) {
            setPatientProfileImage(existingConversation.user_profile_image);
            console.log('✅ PatientChatModal - Profile image from conversation:', existingConversation.user_profile_image);
          }
          
          // Get messages for this conversation
          const messagesResponse = await apiClient.get(`${API_CONFIG.BASE_URL}/chat/conversations/${existingConversation.id}/messages`);
          
          if (messagesResponse.success && messagesResponse.data) {
            const messages = Array.isArray(messagesResponse.data) ? messagesResponse.data : [];
            
            // Process messages to ensure correct is_doctor field
            // We need to determine if the message is from the current doctor
            // For now, we'll use the is_doctor field from the database if available
            // In a real implementation, we'd compare sender_id with the current doctor's ID
            const processedMessages = messages.map((msg: any) => ({
              ...msg,
              is_doctor: msg.is_doctor !== undefined ? msg.is_doctor : true // Use database value or default to doctor
            }));
            
            setMessages(processedMessages);
            console.log('✅ PatientChatModal - Messages loaded:', processedMessages.length);
          } else {
            setMessages([]);
            console.log('⚠️ PatientChatModal - No messages found in conversation');
          }
        } else {
          // No conversation exists yet - this is normal for new chats
          setMessages([]);
          setConversationId(null);
          console.log('ℹ️ PatientChatModal - No conversation found with this patient - conversation will be created when first message is sent');
        }
      } else {
        setMessages([]);
        console.log('⚠️ PatientChatModal - No conversations found');
      }
    } catch (err: any) {
      console.error('❌ PatientChatModal - Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientProfile = async () => {
    try {
      console.log('🔍 PatientChatModal - Loading patient profile for:', patientIdNum);
      
      // First try to get from patients list
      const response = await doctorDashboardService.getPatients(100, 1, '', 'all');
      
      if (response.patients && Array.isArray(response.patients)) {
        const patient = response.patients.find((p: any) => p.id === patientIdNum);
        
        if (patient && patient.profile_image) {
          setPatientProfileImage(patient.profile_image);
          console.log('✅ PatientChatModal - Patient profile image from patients list:', patient.profile_image);
          return;
        }
      }
      
      // Fallback: try to get from conversations
      console.log('🔍 PatientChatModal - Trying to get profile image from conversations...');
      const conversationResponse = await doctorDashboardService.getChatConversations();
      const conversations = conversationResponse?.conversations;
      
      if (conversations && Array.isArray(conversations)) {
        const conversation = conversations.find((conv: any) => conv.user_id === patientIdNum);
        
        if (conversation && conversation.user_profile_image) {
          setPatientProfileImage(conversation.user_profile_image);
          console.log('✅ PatientChatModal - Patient profile image from conversation:', conversation.user_profile_image);
        } else {
          console.log('⚠️ PatientChatModal - No profile image found in conversations either');
        }
      } else {
        console.log('⚠️ PatientChatModal - No conversations found');
      }
    } catch (err: any) {
      console.error('❌ PatientChatModal - Error loading patient profile:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    try {
      setSending(true);
      
      console.log('🔍 PatientChatModal - Sending message:', newMessage);
      
      // Create a temporary message object for immediate UI update
      const tempMessage = {
        id: Date.now(), // Temporary ID
        sender_id: patientIdNum,
        receiver_id: patientIdNum,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        is_doctor: true,
        is_read: false
      };
      
      // Add message to UI immediately
      setMessages(prev => [...prev, tempMessage]);
      const messageToSend = newMessage.trim();
      setNewMessage('');
      
      // Always use API for message sending to ensure conversation creation
      // WebSocket will be used for receiving messages, not sending
      await sendMessageViaAPI(messageToSend);
      
      console.log('✅ PatientChatModal - Message sent successfully');
    } catch (err: any) {
      console.error('❌ PatientChatModal - Error sending message:', err);
      Alert.alert('Error', err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendMessageViaAPI = async (message: string) => {
    try {
      console.log('🔍 PatientChatModal - Sending message via API:', { message, patientId: patientIdNum });
      
      // If we already have a conversation ID, send message to it
      if (conversationId) {
        console.log('📤 PatientChatModal - Sending to existing conversation:', conversationId);
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/conversations/${conversationId}/messages`, {
          message: message,
          message_type: 'text'
        });
        
        if (response.success) {
          console.log('✅ PatientChatModal - Message sent to existing conversation');
          return response.data;
        } else {
          console.log('⚠️ PatientChatModal - Failed to send to existing conversation, will create new one');
        }
      }
      
      // Create new conversation if no conversation ID or sending failed
      console.log('🆕 PatientChatModal - Creating new conversation');
      const requestData = {
        patient_id: patientIdNum,
        subject: `Chat with ${patientNameStr}`,
        initial_message: message
      };
      console.log('🔍 PatientChatModal - Request data:', requestData);
      
      const createConversationResponse = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/doctor-conversations`, requestData);
      
      console.log('🔍 PatientChatModal - Create conversation response:', createConversationResponse);
      
      if (createConversationResponse.success) {
        console.log('✅ PatientChatModal - New conversation created and message sent');
        
        // Store the new conversation ID for future messages
        const newConversationId = (createConversationResponse.data as any)?.id || (createConversationResponse.data as any)?.conversation_id;
        if (newConversationId) {
          setConversationId(newConversationId);
          console.log('💾 PatientChatModal - Stored conversation ID:', newConversationId);
        }
        
        return createConversationResponse.data;
      } else {
        throw new Error(createConversationResponse.message || 'Failed to create conversation');
      }
    } catch (apiError: any) {
      console.error('❌ PatientChatModal - API send error:', apiError);
      
      // Handle validation errors specifically
      if (apiError.response?.data?.message === 'Validation error') {
        const validationErrors = apiError.response.data.errors;
        console.error('❌ PatientChatModal - Validation errors:', validationErrors);
        throw new Error(`Validation failed: ${validationErrors.map((err: any) => err.msg).join(', ')}`);
      }
      
      throw apiError;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    // Check if the current user (doctor) sent this message
    // We need to get the current doctor's ID to compare with sender_id
    // For now, we'll use the is_doctor field but we should improve this logic
    const isFromCurrentUser = message.is_doctor;
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.doctorMessage : styles.patientMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isFromCurrentUser ? styles.doctorBubble : styles.patientBubble
        ]}>
          <Text style={[
            styles.messageText,
            isFromCurrentUser ? styles.doctorText : styles.patientText
          ]}>
            {message.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isFromCurrentUser ? styles.doctorTime : styles.patientTime
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
            <View style={styles.headerAvatar}>
              {patientProfileImage ? (
                <Image 
                  source={{ uri: patientProfileImage }} 
                  style={styles.headerAvatarImage}
                  onError={(error) => {
                    console.log('❌ PatientChatModal - Image load error:', error);
                    console.log('❌ PatientChatModal - Failed to load image:', patientProfileImage);
                  }}
                  onLoad={() => {
                    console.log('✅ PatientChatModal - Image loaded successfully:', patientProfileImage);
                  }}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {patientNameStr.split(' ').map(n => n[0]).join('')}
                </Text>
              )}
            </View>
            <Text style={styles.headerTitle}>{patientNameStr}</Text>
            {wsConnection && (
              <View style={styles.connectionStatus}>
                <View style={[styles.statusDot, { backgroundColor: '#27ae60' }]} />
                <Text style={styles.statusText}>Live</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.closeButton}
            activeOpacity={0.7}
            accessibilityLabel="Close chat"
            accessibilityRole="button"
          >
            <FontAwesome name="times-circle" size={24} color="#e74c3c" />
          </TouchableOpacity>
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
                  <Text style={styles.emptySubtext}>Start a conversation with {patientName}</Text>
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
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    padding: 12,
    borderRadius: 18,
  },
  doctorBubble: {
    backgroundColor: '#3498db',
    borderBottomRightRadius: 4,
  },
  patientBubble: {
    backgroundColor: '#e9ecef',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  doctorText: {
    color: '#fff',
  },
  patientText: {
    color: '#2c3e50',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  doctorTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  patientTime: {
    color: '#7f8c8d',
    textAlign: 'left',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 15 : 20,
    position: 'relative',
    zIndex: 1000,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 50,
    maxHeight: 120,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
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
});
