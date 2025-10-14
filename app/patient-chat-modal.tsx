import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
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
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doctorDashboardService } from '../services/doctorDashboardService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PatientChatModalProps {
  visible: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
}

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

export default function PatientChatModal({ 
  visible, 
  onClose, 
  patientId, 
  patientName 
}: PatientChatModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadMessages();
      initializeWebSocket();
    } else {
      closeWebSocket();
    }

    return () => {
      closeWebSocket();
    };
  }, [visible]);


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
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ PatientChatModal - No auth token found');
        return;
      }

      const wsUrl = `ws://172.20.10.4:3000/ws/chat?token=${token}`;
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
          
          if (data.type === 'message' && data.message) {
            // Check if this message is for the current patient
            if (data.message.receiver_id === patientId || data.message.sender_id === patientId) {
              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.some(msg => msg.id === data.message.id);
                if (!exists) {
                  return [...prev, data.message];
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

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 PatientChatModal - Loading messages for patient:', patientId);
      
      const response = await doctorDashboardService.getChatMessages(patientId);
      
      if (response && response.messages) {
        setMessages(response.messages);
        console.log('✅ PatientChatModal - Messages loaded:', response.messages.length);
      } else {
        setMessages([]);
        console.log('⚠️ PatientChatModal - No messages found');
      }
    } catch (err: any) {
      console.error('❌ PatientChatModal - Error loading messages:', err);
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
      
      console.log('🔍 PatientChatModal - Sending message:', newMessage);
      
      const response = await doctorDashboardService.sendChatMessage(patientId, newMessage.trim());
      
      if (response && response.message) {
        // Add the new message to the list immediately for better UX
        setMessages(prev => [...prev, response.message]);
        setNewMessage('');
        console.log('✅ PatientChatModal - Message sent successfully');
        
        // Also send via WebSocket if connected for real-time delivery
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          try {
            wsConnection.send(JSON.stringify({
              type: 'send_message',
              receiver_id: patientId,
              message: newMessage.trim()
            }));
          } catch (wsError) {
            console.log('⚠️ PatientChatModal - WebSocket send failed, but message was sent via API');
          }
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err: any) {
      console.error('❌ PatientChatModal - Error sending message:', err);
      Alert.alert('Error', err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    const isDoctor = message.is_doctor;
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isDoctor ? styles.doctorMessage : styles.patientMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isDoctor ? styles.doctorBubble : styles.patientBubble
        ]}>
          <Text style={[
            styles.messageText,
            isDoctor ? styles.doctorText : styles.patientText
          ]}>
            {message.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isDoctor ? styles.doctorTime : styles.patientTime
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FontAwesome name="user-md" size={20} color="#3498db" />
            <Text style={styles.headerTitle}>Chat with {patientName}</Text>
            {wsConnection && (
              <View style={styles.connectionStatus}>
                <View style={[styles.statusDot, { backgroundColor: '#27ae60' }]} />
                <Text style={styles.statusText}>Live</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times-circle" size={24} color="#7f8c8d" />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 0,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  closeButton: {
    padding: 5,
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
