import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useFocusEffect } from 'expo-router';
import { doctorDashboardService } from '../../services/doctorDashboardService';
import { chatService } from '../../services/chatService';
import { notificationService } from '../../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface ChatConversation {
  id: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType?: string;
  lastMessageSenderId?: number;
  unreadCount: number;
  status: 'online' | 'offline';
  avatar?: string;
}

export default function ProfessionalChat() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadConversations();
    initializeWebSocket();
    initializeNotifications();
    
    return () => {
      chatService.disconnect();
    };
  }, []);

  // Refresh conversations when screen comes into focus (when navigating back from chat)
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure navigation has completed
      const timer = setTimeout(() => {
        loadConversations();
      }, 200);
      
      return () => clearTimeout(timer);
    }, [])
  );

  const initializeWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const wsUrl = `ws://172.20.10.3:3000/ws/chat?token=${token}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('❌ WebSocket initialization error:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      console.log('🔔 Doctor Chat - Initializing notifications...');
      
      // Get user info from AsyncStorage
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (!userInfo) {
        console.log('❌ Doctor Chat - No user info found');
        return;
      }

      const user = JSON.parse(userInfo);
      
      // Initialize notification service
      const initialized = await notificationService.initialize();
      if (!initialized) {
        console.log('❌ Doctor Chat - Failed to initialize notifications');
        return;
      }

      // Register device for push notifications
      await notificationService.registerDevice(user.id, user.user_type);
      await notificationService.registerWithBackend(user.id, user.user_type);

      console.log('✅ Doctor Chat - Notifications initialized successfully');
    } catch (error) {
      console.error('❌ Doctor Chat - Error initializing notifications:', error);
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
      
      const response = await doctorDashboardService.getChatConversations();
      
      if (response && response.conversations) {
        const formattedConversations: ChatConversation[] = response.conversations.map((conv: any) => ({
          id: conv.id,
          patientId: conv.user_id,
          patientName: `${conv.first_name} ${conv.last_name}` || 'Unknown Patient',
          patientEmail: conv.email || '',
          lastMessage: formatLastMessage(conv, userId),
          lastMessageTime: formatTimeAgo(conv.last_message_time || conv.updated_at),
          lastMessageType: conv.last_message_type,
          lastMessageSenderId: conv.last_message_sender_id,
          unreadCount: conv.unread_count || 0,
          status: conv.status || 'offline',
          avatar: conv.user_profile_image
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
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
    conv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.patientEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

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
      {/* Professional Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Patient Communications</Text>
          <Text style={styles.headerSubtitle}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            {totalUnreadCount > 0 && ` • ${totalUnreadCount} unread`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(doctor-tabs)/patients')}
          >
            <FontAwesome name="users" size={16} color="#3498db" />
            <Text style={styles.actionButtonText}>Patients</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status */}
      <View style={[styles.statusBar, { backgroundColor: isConnected ? '#27ae60' : '#e74c3c' }]}>
        <View style={styles.statusContent}>
          <View style={[styles.statusDot, { backgroundColor: '#fff' }]} />
        <Text style={styles.statusBarText}>
          {isConnected ? 'Live Connection' : 'Connection Lost'}
        </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
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
      <ScrollView
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="comments" size={48} color="#bdc3c7" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No patients found' : 'No conversations yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Start a conversation with a patient to begin'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => router.push('/(doctor-tabs)/patients')}
              >
                <FontAwesome name="plus" size={16} color="#fff" />
                <Text style={styles.startChatButtonText}>View All Patients</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => {
                router.push({
                  pathname: '/patient-chat-modal',
                  params: {
                    patientId: conversation.patientId,
                    patientName: conversation.patientName,
                    patientEmail: conversation.patientEmail,
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
                      <FontAwesome name="user" size={20} color="#3498db" />
                    </View>
                  )}
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: conversation.status === 'online' ? '#27ae60' : '#95a5a6' }
                  ]} />
                </View>
                
                <View style={styles.conversationDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.patientName}>{conversation.patientName}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  
  // Status Bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Search
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
  
  // Conversations
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
  patientName: {
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
  statusText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
});
