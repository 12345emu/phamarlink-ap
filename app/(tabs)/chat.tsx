import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, View, Text, BackHandler, RefreshControl, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { professionalsService, HealthcareProfessional } from '../../services/professionalsService';
import { API_CONFIG } from '../../constants/API';

// Base URL for static files (without /api)
const STATIC_BASE_URL = API_CONFIG.BASE_URL.replace('/api', '');

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const BACKGROUND = '#f8f9fa';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'pharmacist' | 'doctor';
  timestamp: Date;
  isRead: boolean;
}

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    conversations, 
    currentConversation, 
    messages, 
    unreadCount,
    isLoading, 
    error,
    loadConversations, 
    loadConversation, 
    sendMessage,
    createConversation,
    markAsRead
  } = useChat();
  
  const [activeTab, setActiveTab] = useState<'contacts' | 'chat' | 'specialists'>('contacts');
  const [messageText, setMessageText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const scrollViewRef = useRef<ScrollView>(null);

  // Load conversations when component mounts
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Handle incoming professional parameters and auto-start chat
  useEffect(() => {
    // Only run if we have professional parameters and haven't already started a chat
    if (params.professionalId && params.professionalName && !currentConversation) {
      const facilityId = parseInt(params.professionalId as string);
      const professionalName = params.professionalName as string;
      const facilityName = params.facilityName as string || 'Unknown Facility';
      
      // Create a new conversation with the professional
      const handleCreateConversation = async () => {
        const success = await createConversation(
          facilityId,
          `Chat with ${professionalName}`,
          `Hello! I'd like to chat with ${professionalName} from ${facilityName}.`
        );
        
        if (success) {
      setActiveTab('chat');
        } else {
          Alert.alert('Error', 'Failed to start conversation. Please try again.');
        }
      };
      
      handleCreateConversation();
    }
  }, [params.professionalId, params.professionalName, currentConversation, createConversation]);

  // Handle back button/gesture
  useEffect(() => {
    const backAction = () => {
      if (activeTab === 'chat' && currentConversation) {
        goBackToContacts();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [activeTab, currentConversation]);

  // Function to go back to contacts view
  const goBackToContacts = () => {
    setActiveTab('contacts');
    // Clear the URL parameters by navigating to the chat tab without params
    router.replace('/(tabs)/chat');
  };

  // Load specialists data from database
  const loadSpecialists = async () => {
    try {
      console.log('🔍 Loading specialists from database...');
      const response = await professionalsService.getProfessionals({
        is_available: true,
        limit: 50
      });
      
      if (response.success && response.data?.professionals) {
        console.log('✅ Specialists loaded successfully:', response.data.professionals.length);
        
        // Transform database professionals to the format expected by the UI
        const transformedSpecialists = response.data.professionals.map((professional: HealthcareProfessional) => ({
          id: professional.id,
          facility_id: professional.facility_id, // Add facility_id for creating conversations
          name: `${professional.first_name} ${professional.last_name}`,
          specialty: professional.specialty,
          facility: professional.facility_name || 'Unknown Facility',
          facilityType: professional.facility_type || 'clinic',
          experience: `${professional.experience_years} years`,
          rating: 4.5, // Default rating since we don't have this in the database yet
          patients: Math.floor(Math.random() * 2000) + 500, // Random patient count for now
          avatar: professional.user_type === 'pharmacist' ? 'user' : 'user-md',
          isOnline: professional.is_available,
          consultationFee: professional.consultation_fee ? `₵${professional.consultation_fee}` : 'Free',
          languages: professional.languages || ['English'],
          education: professional.education || 'Medical Degree',
          description: professional.bio || `Experienced ${professional.specialty} professional.`,
          profile_image: professional.profile_image // Add the processed profile image URL
        }));
        
        setSpecialists(transformedSpecialists);
      } else {
        console.log('❌ Failed to load specialists:', response.message);
        // Fallback to empty array if loading fails
        setSpecialists([]);
      }
    } catch (error) {
      console.error('❌ Error loading specialists:', error);
      // Fallback to empty array if loading fails
      setSpecialists([]);
    }
  };

  // Load specialists data
  useEffect(() => {
    loadSpecialists();
  }, []);

  // Refresh conversations and specialists
  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    await loadSpecialists();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (messageText.trim() && currentConversation) {
      const success = await sendMessage(currentConversation.id.toString(), messageText.trim());
      if (success) {
        setMessageText('');
      }
    }
  };

  // Handle typing indicator (simplified - no WebSocket typing for now)
  const handleTyping = (isTyping: boolean) => {
    // Typing indicator functionality removed for simplicity
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startChat = async (conversation: any) => {
    await loadConversation(conversation.id.toString());
    setActiveTab('chat');
    // Clear any URL parameters when starting a chat from contacts
    if (params.professionalId) {
      router.replace('/(tabs)/chat');
    }
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Would you like to make an emergency call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Alert.alert('Calling emergency services...') }
      ]
    );
  };

  // Filter specialists based on search and category
  const filteredSpecialists = specialists.filter(specialist => {
    const fullName = `${specialist.first_name} ${specialist.last_name}`;
    const matchesSearch = searchQuery === '' || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specialist.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (specialist.facility_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      specialist.facility_type === selectedCategory ||
      (selectedCategory === 'doctor' && specialist.specialty.toLowerCase().includes('doctor')) ||
      (selectedCategory === 'pharmacist' && specialist.specialty.toLowerCase().includes('pharmacist'));
    
    return matchesSearch && matchesCategory;
  });

  // Start chat with specialist
  const startChatWithSpecialist = async (specialist: any) => {
    console.log('🔍 Starting chat with specialist:', specialist);
    console.log('🔍 Specialist properties:', Object.keys(specialist));
    console.log('🔍 Using facility_id:', specialist.facility_id);
    
    // Handle freelancers (professionals without facility_id)
    let facilityId = specialist.facility_id;
    
    if (!facilityId || facilityId < 1) {
      console.log('🔍 Professional is a freelancer (no facility_id), using professional ID as facility ID');
      // For freelancers, we'll use the professional's ID as a pseudo facility ID
      // This allows the chat system to work with freelancers
      facilityId = specialist.id;
    }
    
    // First, check if there's already an active conversation with this professional
    const existingConversation = conversations.find(conv => 
      conv.facility_id === facilityId && conv.status === 'active'
    );
    
    if (existingConversation) {
      console.log('🔍 Found existing conversation, opening it:', existingConversation.id);
      // Open the existing conversation
      await loadConversation(existingConversation.id.toString());
      setActiveTab('chat');
    } else {
      console.log('🔍 No existing conversation found, creating new one');
      // Create a new conversation
      const specialistName = `${specialist.first_name} ${specialist.last_name}`;
      const success = await createConversation(
        facilityId,
        `Chat with ${specialistName}`,
        `Hello! I'd like to chat with ${specialistName} about ${specialist.specialty}.`
      );
      
      if (success) {
        setActiveTab('chat');
      } else {
        Alert.alert('Error', 'Failed to start conversation. Please try again.');
      }
    }
  };

  const renderContactsTab = () => (
    <ScrollView 
      style={styles.contactsList} 
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#95a5a6"
          />
        </View>
      </View>
      
      {isLoading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="comments" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with a healthcare professional</Text>
        <TouchableOpacity
            style={styles.findSpecialistsButton}
            onPress={() => setActiveTab('specialists')}
            activeOpacity={0.8}
          >
            <FontAwesome name="search" size={16} color="white" />
            <Text style={styles.findSpecialistsText}>Find Specialists</Text>
          </TouchableOpacity>
        </View>
      ) : (
        conversations.map(conversation => (
          <TouchableOpacity
            key={conversation.id}
          style={styles.contactCard}
            onPress={() => startChat(conversation)}
          activeOpacity={0.7}
        >
          <View style={styles.contactAvatar}>
            {conversation.professional_profile_image && conversation.professional_profile_image !== 'null' && conversation.professional_profile_image !== '' && 
             (conversation.professional_profile_image.startsWith('/') || conversation.professional_profile_image.startsWith('http')) ? (
              <Image 
                source={{ uri: conversation.professional_profile_image.startsWith('http') ? conversation.professional_profile_image : `${STATIC_BASE_URL}${conversation.professional_profile_image}` }}
                style={styles.avatarImage}
                defaultSource={require('../../assets/images/icon.png')}
                onError={() => console.log('Failed to load professional profile image')}
              />
            ) : (
              <FontAwesome 
                name="user-md" 
                size={24} 
                color={ACCENT} 
              />
            )}
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
                <Text style={styles.contactName}>
                  {conversation.facility_name || `${conversation.professional_first_name} ${conversation.professional_last_name}`}
                </Text>
                <Text style={styles.lastMessageTime}>
                  {conversation.last_message_time ? formatTime(conversation.last_message_time) : 'Now'}
                </Text>
            </View>
            <Text style={styles.contactRole}>
                {conversation.facility_type === 'freelancer' ? 'Freelancer' : conversation.facility_type} • {conversation.subject}
            </Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
                {conversation.last_message || 'No messages yet'}
            </Text>
          </View>
            {conversation.unread_count > 0 && (
            <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{conversation.unread_count}</Text>
            </View>
          )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderSpecialistsTab = () => (
    <ScrollView 
      style={styles.specialistsList} 
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search specialists..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {['all', 'doctor', 'pharmacist', 'hospital', 'clinic', 'pharmacy'].map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.activeCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.activeCategoryButtonText
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
        </TouchableOpacity>
      ))}
        </ScrollView>
      </View>

      {/* Specialists List */}
      {filteredSpecialists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="user-md" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>No specialists found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or category filter</Text>
        </View>
      ) : (
        filteredSpecialists.map(specialist => (
          <TouchableOpacity
            key={specialist.id}
            style={styles.specialistCard}
            onPress={() => startChatWithSpecialist(specialist)}
            activeOpacity={0.7}
          >
            <View style={styles.specialistHeader}>
              <View style={styles.specialistAvatar}>
                {specialist.profile_image && specialist.profile_image !== 'null' && (specialist.profile_image.startsWith('http') || specialist.profile_image.startsWith('/')) ? (
                  <Image 
                    source={{ uri: specialist.profile_image.startsWith('http') ? specialist.profile_image : `${STATIC_BASE_URL}${specialist.profile_image}` }}
                    style={styles.avatarImage}
                    defaultSource={require('../../assets/images/icon.png')}
                    onError={() => console.log('Failed to load specialist profile image')}
                  />
                ) : (
                  <FontAwesome 
                    name={specialist.specialty.toLowerCase().includes('doctor') ? 'user-md' : 'user'} 
                    size={24} 
                    color={specialist.specialty.toLowerCase().includes('doctor') ? '#e74c3c' : ACCENT} 
                  />
                )}
                {specialist.is_available && (
                  <View style={styles.onlineIndicator} />
                )}
              </View>
              <View style={styles.specialistInfo}>
                <Text style={styles.specialistName}>{specialist.first_name} {specialist.last_name}</Text>
                <Text style={styles.specialistSpecialty}>{specialist.specialty}</Text>
                <Text style={styles.specialistFacility}>{specialist.facility_name || 'Independent Practice'}</Text>
              </View>
              <View style={styles.specialistActions}>
                <View style={styles.ratingContainer}>
                  <FontAwesome name="star" size={12} color="#f39c12" />
                  <Text style={styles.ratingText}>{specialist.rating || '4.5'}</Text>
                </View>
                <Text style={styles.consultationFee}>${specialist.consultation_fee || '50'}</Text>
              </View>
            </View>
            
            <View style={styles.specialistDetails}>
              <View style={styles.detailRow}>
                <FontAwesome name="clock-o" size={12} color="#7f8c8d" />
                <Text style={styles.detailText}>{specialist.experience_years || 5} years experience</Text>
              </View>
              <View style={styles.detailRow}>
                <FontAwesome name="users" size={12} color="#7f8c8d" />
                <Text style={styles.detailText}>{specialist.total_reviews || 0} reviews</Text>
              </View>
              <View style={styles.detailRow}>
                <FontAwesome name="graduation-cap" size={12} color="#7f8c8d" />
                <Text style={styles.detailText}>{specialist.education || 'Medical Degree'}</Text>
              </View>
            </View>

            <Text style={styles.specialistDescription} numberOfLines={2}>
              {specialist.bio || `Experienced ${specialist.specialty} professional.`}
            </Text>

            <View style={styles.specialistFooter}>
              <View style={styles.languagesContainer}>
                {(specialist.languages || ['English']).map((language: string, index: number) => (
                  <View key={index} style={styles.languageTag}>
                    <Text style={styles.languageText}>{language}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => startChatWithSpecialist(specialist)}
              >
                <FontAwesome name="comment" size={14} color="white" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderChatTab = () => (
    <View 
      style={styles.chatContainer}
      onTouchStart={(e) => {
        // Store initial touch position for swipe detection
        const touch = e.nativeEvent.touches[0];
        if (touch) {
          (renderChatTab as any).startX = touch.pageX;
        }
      }}
      onTouchEnd={(e) => {
        // Detect swipe gesture
        const touch = e.nativeEvent.changedTouches[0];
        if (touch && (renderChatTab as any).startX) {
          const deltaX = touch.pageX - (renderChatTab as any).startX;
          const deltaY = Math.abs(touch.pageY - (e.nativeEvent.touches[0]?.pageY || 0));
          
          // If it's a right swipe (deltaX > 50) and not too vertical (deltaY < 100)
          if (deltaX > 50 && deltaY < 100) {
            goBackToContacts();
          }
        }
        (renderChatTab as any).startX = null;
      }}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBackToContacts} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <View style={styles.chatContactInfo}>
          <View style={styles.chatAvatar}>
            <FontAwesome 
              name="user-md" 
              size={20} 
              color={ACCENT} 
            />
            <View style={styles.onlineIndicator} />
          </View>
          <View>
            <Text style={styles.chatContactName}>{currentConversation?.facility_name}</Text>
            <Text style={styles.chatContactStatus}>
              🟢 Online • {currentConversation?.facility_type} • {currentConversation?.subject}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <FontAwesome name="ellipsis-v" size={20} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ paddingBottom: 120 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => currentConversation && loadConversation(currentConversation.id.toString())}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="comment" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation by sending a message</Text>
          </View>
        ) : (
          messages.map(message => {
            const isUser = message.sender_id === parseInt(user?.id?.toString() || '0');
            return (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
                  isUser ? styles.userMessage : styles.otherMessage
            ]}
          >
            {!isUser && (
              <View style={styles.messageAvatar}>
                {message.user_profile_image && message.user_profile_image !== 'null' && message.user_profile_image.startsWith('/') ? (
                  <Image 
                    source={{ uri: `${STATIC_BASE_URL}${message.user_profile_image}` }}
                    style={styles.messageAvatarImage}
                    defaultSource={require('../../assets/images/icon.png')}
                    onError={() => console.log('Failed to load message user profile image')}
                  />
                ) : (
                  <FontAwesome 
                    name="user-md" 
                    size={16} 
                    color={ACCENT} 
                  />
                )}
              </View>
            )}
            <View style={[
              styles.messageBubble,
                  isUser ? styles.userBubble : styles.otherBubble
            ]}>
              <Text style={[
                styles.messageText,
                    isUser ? styles.userMessageText : styles.otherMessageText
              ]}>
                    {message.message}
              </Text>
              <Text style={[
                styles.messageTime,
                    isUser ? styles.userMessageTime : styles.otherMessageTime
              ]}>
                    {formatTime(message.created_at)}
              </Text>
            </View>
            {isUser && (
              <View style={styles.messageAvatar}>
                {user?.profileImage && user.profileImage !== 'null' && user.profileImage.startsWith('/') ? (
                  <Image 
                    source={{ uri: `${STATIC_BASE_URL}${user.profileImage}` }}
                    style={styles.messageAvatarImage}
                    defaultSource={require('../../assets/images/icon.png')}
                    onError={() => console.log('Failed to load user profile image')}
                  />
                ) : (
                  <FontAwesome 
                    name="user" 
                    size={16} 
                    color="#95a5a6" 
                  />
                )}
              </View>
            )}
          </View>
            );
          })
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
        keyboardVerticalOffset={150}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#95a5a6"
            value={messageText}
            onChangeText={setMessageText}
            onFocus={() => handleTyping(true)}
            onBlur={() => handleTyping(false)}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            activeOpacity={0.8}
          >
            <FontAwesome name="send" size={16} color="#2c3e50" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with Navigation */}
      {activeTab !== 'chat' && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Chat</Text>
            <TouchableOpacity
              style={styles.findSpecialistsButton}
              onPress={() => setActiveTab('specialists')}
              activeOpacity={0.8}
            >
              <FontAwesome name="search" size={16} color="white" />
              <Text style={styles.findSpecialistsText}>Find Specialists</Text>
            </TouchableOpacity>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
              onPress={() => setActiveTab('contacts')}
            >
              <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>
                Conversations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'specialists' && styles.activeTab]}
              onPress={() => setActiveTab('specialists')}
            >
              <Text style={[styles.tabText, activeTab === 'specialists' && styles.activeTabText]}>
                Find Specialists
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {activeTab === 'contacts' && renderContactsTab()}
      {activeTab === 'specialists' && renderSpecialistsTab()}
      {activeTab === 'chat' && currentConversation && renderChatTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  emergencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactsList: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#34495e',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(52, 152, 219, 0.1)',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: SUCCESS,
    borderWidth: 2,
    borderColor: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  contactRole: {
    fontSize: 13,
    color: ACCENT,
    marginBottom: 6,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    marginRight: 15,
  },
  chatContactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(52, 152, 219, 0.1)',
  },
  chatOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SUCCESS,
    borderWidth: 2,
    borderColor: SUCCESS,
  },
  chatContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  chatContactStatus: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  moreButton: {
    marginLeft: 15,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  messageAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 6,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    marginBottom: 6,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
    fontWeight: '500',
  },
  otherMessageText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 11,
  },
  userMessageTime: {
    color: 'white',
    opacity: 0.8,
  },
  otherMessageTime: {
    color: '#666',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingBottom: 120, // Reduced padding since keyboard will handle spacing
    marginBottom: 80, // Reduced margin for better keyboard handling
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 15,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    backgroundColor: '#43e97b', // Green color to match the app theme
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Header styles
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
  findSpecialistsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  findSpecialistsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#2c3e50',
  },
  // Specialists styles
  specialistsList: {
    flex: 1,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoryScroll: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeCategoryButton: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeCategoryButtonText: {
    color: 'white',
  },
  specialistCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  specialistHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  specialistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(52, 152, 219, 0.1)',
  },
  specialistInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  specialistSpecialty: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 2,
  },
  specialistFacility: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  specialistActions: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 4,
  },
  consultationFee: {
    fontSize: 12,
    fontWeight: '600',
    color: SUCCESS,
  },
  specialistDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
    fontWeight: '500',
  },
  specialistDescription: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  specialistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  languageTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  languageText: {
    fontSize: 10,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 