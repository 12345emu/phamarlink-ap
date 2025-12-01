import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useFocusEffect } from 'expo-router';
import { doctorDashboardService } from '../../services/doctorDashboardService';
import { chatService } from '../../services/chatService';
import { notificationService } from '../../services/notificationService';
import { pharmacistInventoryService } from '../../services/pharmacistInventoryService';
import { professionalsService, HealthcareProfessional } from '../../services/professionalsService';
import { apiClient } from '../../services/apiClient';
import { API_CONFIG } from '../../constants/API';
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

const STATIC_BASE_URL = API_CONFIG.BASE_URL.replace('/api', '');

export default function PharmacistChat() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [professionals, setProfessionals] = useState<HealthcareProfessional[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadFacilityId();
    loadConversations();
    initializeNotifications();
  }, []);

  useEffect(() => {
    if (showUsersModal && facilityId) {
      loadFacilityUsers();
    }
  }, [showUsersModal, facilityId]);

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${STATIC_BASE_URL}${url}`;
  };

  const loadFacilityUsers = async () => {
    if (!facilityId) {
      Alert.alert('Error', 'Unable to determine your facility. Please contact support.');
      return;
    }

    try {
      setLoadingUsers(true);
      const query = userSearchQuery.trim().toLowerCase();

      // Get current user ID to filter out self
      const userInfo = await AsyncStorage.getItem('userInfo');
      let currentUserId: number | null = null;
      if (userInfo) {
        const user = JSON.parse(userInfo);
        currentUserId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      }

      // Use the same API as facility chat - get professionals by facility
      const response = await professionalsService.getProfessionalsByFacility(facilityId, 100, true);

      const aggregated: HealthcareProfessional[] = [];

      if (response && response.success && response.data) {
        const data = response.data as any;
        const professionalsList = Array.isArray(data.professionals)
          ? data.professionals
          : Array.isArray(data?.data?.professionals)
            ? data.data.professionals
            : [];

        professionalsList.forEach((pro: any) => {
          if (!pro) return;
          
          // Filter out current user - ensure type consistency
          const proUserId = typeof pro.user_id === 'string' ? parseInt(pro.user_id, 10) : (pro.user_id || pro.id);
          if (currentUserId && proUserId === currentUserId) {
            return; // Skip self
          }
          
          aggregated.push({
            ...pro,
            user_id: proUserId,
            facility_id: pro.facility_id,
            profile_image: normalizeImageUrl(pro.profile_image),
          });
        });
      }

      // Deduplicate by user_id (fallback to professional id)
      const uniqueProfessionals: HealthcareProfessional[] = [];
      const seen = new Set<number>();

      aggregated.forEach((pro) => {
        const key = typeof pro.user_id === 'string' ? parseInt(pro.user_id, 10) : (pro.user_id || pro.id);
        if (!key || seen.has(key)) {
          return;
        }
        
        // Double-check: filter out current user again (in case of duplicates)
        if (currentUserId && key === currentUserId) {
          return;
        }
        
        seen.add(key);

        if (query) {
          const fullName = `${pro.first_name || ''} ${pro.last_name || ''}`.toLowerCase();
          const email = (pro.email || '').toLowerCase();
          if (!fullName.includes(query) && !email.includes(query)) {
            return;
          }
        }

        uniqueProfessionals.push(pro);
      });

      setProfessionals(uniqueProfessionals);
    } catch (err: any) {
      console.error('Error loading facility professionals:', err);
      setProfessionals([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadFacilityId = async () => {
    try {
      const id = await pharmacistInventoryService.getPharmacistFacilityId();
      setFacilityId(id);
    } catch (error) {
      console.error('Error loading facility ID:', error);
    }
  };

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
        const formattedConversations: ChatConversation[] = response.conversations.map((conv: any) => {
          // Safely construct patient name - check multiple field name variations
          // For pharmacists/doctors, backend returns user_first_name and user_last_name
          // For patients, backend returns first_name and last_name
          const firstName = conv.user_first_name || conv.first_name || conv.firstName || '';
          const lastName = conv.user_last_name || conv.last_name || conv.lastName || '';
          const patientName = firstName || lastName 
            ? `${firstName} ${lastName}`.trim() 
            : conv.name || conv.patientName || conv.email?.split('@')[0] || 'Unknown Patient';
          
          console.log('🔍 Conversation data:', {
          id: conv.id,
            user_first_name: conv.user_first_name,
            user_last_name: conv.user_last_name,
            first_name: conv.first_name,
            last_name: conv.last_name,
            constructedName: patientName
          });
          
          return {
            id: conv.id,
            patientId: conv.user_id || conv.patientId || conv.userId,
            patientName: patientName,
          patientEmail: conv.email || '',
          lastMessage: formatLastMessage(conv, userId),
            lastMessageTime: formatTimeAgo(conv.last_message_time || conv.updated_at || conv.lastMessageTime),
            lastMessageType: conv.last_message_type || conv.lastMessageType,
            lastMessageSenderId: conv.last_message_sender_id || conv.lastMessageSenderId,
            unreadCount: conv.unread_count || conv.unreadCount || 0,
          status: conv.status || 'offline',
            avatar: conv.user_profile_image || conv.avatar || conv.profileImage
          };
        });
        
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

  const handleSelectUser = async (professional: HealthcareProfessional) => {
    try {
      setShowUsersModal(false);
      
      // Verify professional has valid ID
      if (!professional.id || professional.id <= 0) {
        Alert.alert('Error', 'Invalid professional selected. Please try again.');
        return;
      }
      
      // IMPORTANT: chat_conversations.professional_id stores users.id, not healthcare_professionals.id
      // The endpoint returns both professional.id (hp.id) and user_id (users.id)
      // We need to use user_id for creating conversations to match the chat system structure
      if (!professional.user_id || professional.user_id <= 0) {
        Alert.alert('Error', 'Professional user information is missing. Please try again.');
        return;
      }
      
      // Check if conversation already exists (compare with user_id since that's what's stored)
      const existingConversation = conversations.find(
        conv => conv.patientId === professional.user_id
      );
      
      if (existingConversation) {
        // Navigate to existing conversation
        router.push({
          pathname: '/patient-chat-modal',
          params: {
            patientId: existingConversation.patientId.toString(),
            patientName: existingConversation.patientName,
            patientEmail: existingConversation.patientEmail,
            patientAvatar: existingConversation.avatar
          }
        });
        return;
      }
      
      // For the backend: It currently accepts healthcare_professionals.id and looks up user_id
      // But we'll send user_id directly if the backend can handle it, otherwise send professional.id
      // Since the backend query looks up by hp.id, we need to send the professional.id
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
          pathname: '/patient-chat-modal',
          params: {
            conversationId: conversationId.toString(),
            patientId: professional.user_id.toString(),
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
            onPress={() => router.push('/(pharmacist-tabs)/patients')}
          >
            <FontAwesome name="users" size={16} color="#3498db" />
            <Text style={styles.actionButtonText}>Patients</Text>
          </TouchableOpacity>
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
                onPress={() => router.push('/(pharmacist-tabs)/patients')}
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
                        styles.statusIndicatorSmall,
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

      {/* Users Modal */}
      <Modal
        visible={showUsersModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowUsersModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                onPress={() => setShowUsersModal(false)}
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
                  value={userSearchQuery}
                  onChangeText={(text) => {
                    setUserSearchQuery(text);
                    // Debounce search
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    searchTimeoutRef.current = setTimeout(() => {
                      loadFacilityUsers();
                    }, 500);
                  }}
                  placeholderTextColor="#bdc3c7"
                />
                {userSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setUserSearchQuery('');
                    loadFacilityUsers();
                  }}>
                    <FontAwesome name="times" size={16} color="#7f8c8d" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingUsers ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#d4af37" />
                <Text style={styles.modalLoadingText}>Loading professionals...</Text>
              </View>
            ) : professionals.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <FontAwesome name="user-md" size={60} color="#bdc3c7" />
                <Text style={styles.modalEmptyText}>No professionals found</Text>
                <Text style={styles.modalEmptySubtext}>
                  {userSearchQuery
                    ? 'Try adjusting your search terms'
                    : 'No staff found for your facility yet'}
                </Text>
              </View>
            ) : (
              professionals.map((professional) => (
                <TouchableOpacity
                  key={professional.id}
                  style={styles.userCard}
                  onPress={() => handleSelectUser(professional)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userCardContent}>
                    <View style={styles.userAvatarContainer}>
                      {professional.profile_image ? (
                        <Image
                          source={{ uri: professional.profile_image }}
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View style={styles.userDefaultAvatar}>
                          <FontAwesome name="user-md" size={24} color="#d4af37" />
                        </View>
                      )}
                      <View style={[
                        styles.professionalStatusDot,
                        { backgroundColor: professional.is_available ? '#27ae60' : '#95a5a6' }
                      ]} />
                    </View>
                    
                    <View style={styles.userDetails}>
                      <View style={styles.professionalNameRow}>
                        <Text style={styles.userName}>
                          {professional.first_name} {professional.last_name}
                        </Text>
                        {professional.is_verified && (
                          <FontAwesome name="check-circle" size={16} color="#d4af37" />
                        )}
                      </View>
                      
                      <Text style={styles.professionalSpecialty}>
                        {professional.specialty || 'General Practitioner'}
                      </Text>
                      
                      {professional.facility_name && (
                        <View style={styles.userPhone}>
                          <FontAwesome name="hospital-o" size={12} color="#7f8c8d" />
                          <Text style={styles.userPhoneText}> {professional.facility_name}</Text>
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setShowUsersModal(true);
        }}
        activeOpacity={0.7}
      >
        <FontAwesome name="user-plus" size={24} color="#fff" />
      </TouchableOpacity>
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
  statusIndicatorSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#7f8c8d',
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
  // FAB Styles
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d4af37',
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
  userCard: {
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
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatarContainer: {
    marginRight: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userDefaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  userPhone: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhoneText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  professionalStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  professionalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#d4af37',
    fontWeight: '500',
    marginBottom: 4,
  },
  professionalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
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
