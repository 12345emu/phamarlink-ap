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
  Modal,
  Keyboard,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { chatService } from '../../services/chatService';
import { apiClient } from '../../services/apiClient';
import { API_CONFIG } from '../../constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { professionalsService, HealthcareProfessional } from '../../services/professionalsService';

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
  lastMessageType?: string;
  lastMessageSenderId?: number;
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
  const [showProfessionalsModal, setShowProfessionalsModal] = useState(false);
  const [professionals, setProfessionals] = useState<HealthcareProfessional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [professionalSearchQuery, setProfessionalSearchQuery] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // Refresh conversations when screen comes into focus (when navigating back from chat)
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure navigation has completed
      const timer = setTimeout(() => {
        loadConversations();
      }, 200);
      
      return () => clearTimeout(timer);
    }, []) // loadConversations is stable, no need to include it
  );

  useEffect(() => {
    if (showProfessionalsModal) {
      loadProfessionals();
    }
  }, [showProfessionalsModal]);

  const loadProfessionals = async () => {
    try {
      setLoadingProfessionals(true);
      // Use the new endpoint that fetches from users table (compatible with chat system)
      const response = await professionalsService.getProfessionalsFromUsers({
        search: professionalSearchQuery.trim() || undefined,
        limit: 100
      });
      
      // Debug: Log the response
      if (response) {
        if (response.success && response.data && response.data.professionals) {
          const professionals = Array.isArray(response.data.professionals) ? response.data.professionals : [];
          // Filter out any professionals without valid IDs
          const validProfessionals = professionals.filter(p => p && p.id);
          setProfessionals(validProfessionals);
        } else {
          // No professionals found or error in response
          setProfessionals([]);
        }
      } else {
        setProfessionals([]);
      }
    } catch (err: any) {
      // Error loading professionals
      setProfessionals([]);
    } finally {
      setLoadingProfessionals(false);
    }
  };

  const handleSelectProfessional = async (professional: HealthcareProfessional) => {
    try {
      setShowProfessionalsModal(false);
      
      // Verify professional has valid ID
      if (!professional.id || professional.id <= 0) {
        Alert.alert('Error', 'Invalid professional selected. Please try again.');
        return;
      }
      
      // IMPORTANT: chat_conversations.professional_id stores users.id, not healthcare_professionals.id
      // The new endpoint returns both professional.id (hp.id) and user_id (users.id)
      // We need to use user_id for creating conversations to match the chat system structure
      if (!professional.user_id || professional.user_id <= 0) {
        Alert.alert('Error', 'Professional user information is missing. Please try again.');
        return;
      }
      
      // Check if conversation already exists (compare with user_id since that's what's stored)
      const existingConversation = conversations.find(
        conv => conv.professionalId === professional.user_id
      );
      
      if (existingConversation) {
        // Navigate to existing conversation
        router.push({
          pathname: '/chat-screen',
          params: {
            conversationId: existingConversation.id.toString(),
            patientName: `${professional.first_name} ${professional.last_name}`,
            patientEmail: professional.email,
            patientAvatar: professional.profile_image
          }
        });
        return;
      }
      
      // For the backend: It currently accepts healthcare_professionals.id and looks up user_id
      // But we'll send user_id directly if the backend can handle it, otherwise send professional.id
      // Since the backend query looks up by hp.id, we need to send the professional.id
      // BUT we should fix the backend to accept user_id OR send professional.id and let backend fix it
      const professionalId = professional.id; // healthcare_professionals.id (for backend lookup)
      
      const conversationResponse = await chatService.createConversation({
        professional_id: professionalId, // Backend expects healthcare_professionals.id and will convert
        subject: `Chat with ${professional.first_name} ${professional.last_name}`,
        initial_message: 'Hello.'
      });
      
      if (conversationResponse.success && conversationResponse.data) {
        const conversationId = (conversationResponse.data as any).id || 
                              (conversationResponse.data as any).conversationId ||
                              (conversationResponse.data as any).conversation_id;
        
        if (!conversationId) {
          Alert.alert('Error', 'Failed to get conversation ID. Please try again.');
          return;
        }
        
        router.push({
          pathname: '/chat-screen',
          params: {
            conversationId: conversationId.toString(),
            patientName: `${professional.first_name} ${professional.last_name}`,
            patientEmail: professional.email,
            patientAvatar: professional.profile_image
          }
        });
        
        // Reload conversations to include the new one
        loadConversations();
      } else {
        const errorMessage = conversationResponse.message || 'Failed to start conversation';
        Alert.alert('Error', errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to start conversation. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const formatLastMessage = (conv: any, currentUserId: number | null): string => {
    if (!conv.last_message && !conv.last_message_type) {
      return 'No messages yet';
    }

    // Check if message is from current user
    const isFromCurrentUser = currentUserId && conv.last_message_sender_id === currentUserId;
    const prefix = isFromCurrentUser ? 'You: ' : '';

    // Handle media messages
    if (conv.last_message_type === 'image') {
      return conv.last_message ? `${prefix}📷 ${conv.last_message}` : `${prefix}📷 Image`;
    } else if (conv.last_message_type === 'file' || conv.last_message_type === 'video') {
      return conv.last_message ? `${prefix}🎥 ${conv.last_message}` : `${prefix}🎥 Video`;
    }

    // Regular text message
    return conv.last_message || 'No messages yet';
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user ID first
      const userInfo = await AsyncStorage.getItem('userInfo');
      let userId: number | null = null;
      if (userInfo) {
        const user = JSON.parse(userInfo);
        userId = user.id;
      }
      
      // Use chatService to get conversations
      const response = await chatService.getConversations();
      
      if (response && response.data) {
        const formattedConversations: ChatConversation[] = response.data.map((conv: any) => {
          // Use last_message_time if available, otherwise fallback to last_activity, then updated_at
          const timeSource = conv.last_message_time || conv.last_activity || conv.updated_at || conv.created_at;
          
          return {
            id: conv.id,
            professionalId: conv.professional_id,
            professionalName: `${conv.professional_first_name} ${conv.professional_last_name}` || 'Healthcare Provider',
            professionalEmail: conv.professional_email || '',
            lastMessage: formatLastMessage(conv, userId),
            lastMessageTime: formatTimeAgo(timeSource),
            lastMessageType: conv.last_message_type,
            lastMessageSenderId: conv.last_message_sender_id,
            unreadCount: conv.unread_count || 0,
            status: conv.status || 'offline',
            avatar: conv.professional_profile_image
          };
        });
        
        setConversations(formattedConversations);
      }
    } catch (err: any) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string | null | undefined) => {
    if (!dateString) return 'Just now';
    
    try {
      // Create Date object from string
      const date = new Date(dateString);
      
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      const diffInMs = now.getTime() - date.getTime();
      
      // Handle future dates (shouldn't happen, but just in case)
      if (diffInMs < 0) {
        return 'Just now';
      }
      
      const diffInSeconds = Math.floor(diffInMs / 1000);
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      // For older messages, show the date
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      return `${month} ${day}`;
    } catch (error) {
      return 'Just now';
    }
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

      {/* Healthcare Professionals Modal */}
      <Modal
        visible={showProfessionalsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfessionalsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                onPress={() => setShowProfessionalsModal(false)}
                style={styles.modalCloseButton}
              >
                <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Healthcare Professionals</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>
            
            <View style={styles.modalSearchContainer}>
              <View style={styles.modalSearchBar}>
                <FontAwesome name="search" size={16} color="#7f8c8d" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search professionals..."
                  value={professionalSearchQuery}
                  onChangeText={(text) => {
                    setProfessionalSearchQuery(text);
                    // Debounce search
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    searchTimeoutRef.current = setTimeout(() => {
                      loadProfessionals();
                    }, 500);
                  }}
                  placeholderTextColor="#bdc3c7"
                />
                {professionalSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setProfessionalSearchQuery('');
                    loadProfessionals();
                  }}>
                    <FontAwesome name="times" size={16} color="#7f8c8d" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingProfessionals ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.modalLoadingText}>Loading professionals...</Text>
              </View>
            ) : professionals.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <FontAwesome name="user-md" size={60} color="#bdc3c7" />
                <Text style={styles.modalEmptyText}>No professionals found</Text>
                <Text style={styles.modalEmptySubtext}>
                  Try adjusting your search terms
                </Text>
              </View>
            ) : (
              professionals.map((professional) => (
                <TouchableOpacity
                  key={professional.id}
                  style={styles.professionalCard}
                  onPress={() => handleSelectProfessional(professional)}
                  activeOpacity={0.7}
                >
                  <View style={styles.professionalCardContent}>
                    <View style={styles.professionalAvatarContainer}>
                      {professional.profile_image ? (
                        <Image
                          source={{ uri: professional.profile_image }}
                          style={styles.professionalAvatar}
                        />
                      ) : (
                        <View style={styles.professionalDefaultAvatar}>
                          <FontAwesome name="user-md" size={24} color="#3498db" />
                        </View>
                      )}
                      <View style={[
                        styles.professionalStatusDot,
                        { backgroundColor: professional.is_available ? '#27ae60' : '#95a5a6' }
                      ]} />
                    </View>
                    
                    <View style={styles.professionalDetails}>
                      <View style={styles.professionalNameRow}>
                        <Text style={styles.professionalModalName}>
                          {professional.first_name} {professional.last_name}
                        </Text>
                        {professional.is_verified && (
                          <FontAwesome name="check-circle" size={16} color="#3498db" />
                        )}
                      </View>
                      
                      <Text style={styles.professionalSpecialty}>
                        {professional.specialty || 'General Practitioner'}
                      </Text>
                      
                      {professional.facility_name && (
                        <View style={styles.professionalFacility}>
                          <FontAwesome name="hospital-o" size={12} color="#7f8c8d" />
                          <Text style={styles.professionalFacilityText}>
                            {' '}{professional.facility_name}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.professionalFooter}>
                        <View style={styles.professionalFooterItem}>
                          <FontAwesome name="star" size={12} color="#f39c12" />
                          <Text style={styles.professionalRating}>
                            {professional.rating && typeof professional.rating === 'number' ? professional.rating.toFixed(1) : 'N/A'}
                          </Text>
                        </View>
                        
                        <View style={styles.professionalFooterItem}>
                          <Text style={[
                            styles.professionalStatus,
                            { color: professional.is_available ? '#27ae60' : '#95a5a6' }
                          ]}>
                            {professional.is_available ? 'Available' : 'Unavailable'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setShowProfessionalsModal(true);
        }}
        activeOpacity={0.7}
      >
        <FontAwesome name="user-plus" size={24} color="#fff" />
      </TouchableOpacity>
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
  const textInputRef = useRef<TextInput>(null);
  
  const handleClose = () => {
    router.back();
  };

  useEffect(() => {
    if (conversationIdNum) {
      loadMessages();
      initializeWebSocket();
    }

    // Add keyboard event listeners to scroll when keyboard appears
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      if (wsConnection) {
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
      }, 100);
    }
  }, [messages]);

  const initializeWebSocket = async () => {
    try {
      // Check if WebSocket is already connected
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        return;
      }

      const wsUrl = `ws://172.20.10.3:3000/ws/chat?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setWsConnection(ws);
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
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
          // Silently handle WebSocket message parsing errors
        }
      };
      
      ws.onclose = () => {
        setWsConnection(null);
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        setWsConnection(null);
        setIsConnected(false);
      };
      
    } catch (error) {
      // Silently handle WebSocket initialization errors
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use chatService to load messages from conversation
      const response = await chatService.getMessages(conversationIdNum!.toString());
      
      if (response && response.data) {
        const processedMessages = response.data.map((msg: any) => ({
          ...msg,
          is_doctor: msg.is_doctor !== undefined ? msg.is_doctor : true // Default to doctor messages for patient view
        }));
        
        setMessages(processedMessages);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
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
      
      // Keep keyboard open by maintaining focus on TextInput
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
      
      // Use direct API call like the doctor does
      await sendMessageViaAPI(messageToSend);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send message. Please try again.');
      setNewMessage(messageToSend); // Restore message
    } finally {
      setSending(false);
    }
  };

  const sendMessageViaAPI = async (message: string) => {
    try {
      // If we already have a conversation ID, send message to it
      if (conversationIdNum) {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/conversations/${conversationIdNum}/messages`, {
          message: message,
          message_type: 'text'
        });
        
        if (response.success) {
          return response.data;
        }
      }
      
      // Create new conversation if no conversation ID or sending failed
      const requestData = {
        professional_id: conversationIdNum, // This should be the doctor/professional ID
        subject: `Chat with Professional`,
        initial_message: message
      };
      
      const createConversationResponse = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/conversations`, requestData);
      
      if (createConversationResponse.success) {
        // Store the new conversation ID for future messages
        const newConversationId = (createConversationResponse.data as any)?.id || (createConversationResponse.data as any)?.conversation_id;
        if (newConversationId) {
          setConversationId(newConversationId);
        }
        
        return createConversationResponse.data;
      } else {
        throw new Error(createConversationResponse.message || 'Failed to create conversation');
      }
    } catch (apiError: any) {
      // Handle validation errors specifically
      if (apiError.response?.data?.message === 'Validation error') {
        const validationErrors = apiError.response.data.errors;
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
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardDismissMode="interactive"
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
                  ref={textInputRef}
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
    position: 'relative',
    overflow: 'visible',
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
    paddingBottom: 10, // Reduced padding since KeyboardAvoidingView will handle it
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
    paddingBottom: 80, // Add padding to prevent FAB from covering content
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
  // FAB Styles
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 160,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 9999,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalCloseButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalSearchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  professionalCard: {
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
  professionalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  professionalAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  professionalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  professionalDefaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  professionalStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  professionalDetails: {
    flex: 1,
  },
  professionalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  professionalModalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 4,
  },
  professionalFacility: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  professionalFacilityText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  professionalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  professionalFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  professionalRating: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  professionalStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
});
