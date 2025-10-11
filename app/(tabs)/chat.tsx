import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage, ChatConversation } from '../../services/chatService';
import { constructProfileImageUrl } from '../../utils/imageUtils';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    isConnected,
    loadConversations,
    createConversation,
    sendMessage,
    markAsRead,
    setCurrentConversation,
    clearError,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'conversations' | 'chat'>('conversations');
  const [messageText, setMessageText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState<any>(null);
  const [showSpecialists, setShowSpecialists] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      loadSpecialists();
    }
  }, [user, loadConversations]);

  // Hide/show tab bar based on active tab
  useEffect(() => {
    if (activeTab === 'chat') {
      // Hide tab bar when in chat
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });
    } else {
      // Show tab bar when in conversations or specialists
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    }
  }, [activeTab, navigation]);

  // Cleanup effect to show tab bar when component unmounts
  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    };
  }, [navigation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Mark messages as read when conversation is active
  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      markAsRead(currentConversation.id.toString());
    }
  }, [currentConversation, messages, markAsRead]);

  const loadSpecialists = async () => {
    try {
      // Load specialists from the professionals API
      // Use a high limit to get all verified specialists
      const response = await fetch('http://172.20.10.4:3000/api/professionals?limit=100&is_available=true', {
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.professionals) {
          console.log('📊 Loaded specialists:', data.data.professionals.length);
          console.log('👥 Specialists data:', data.data.professionals);
          setSpecialists(data.data.professionals);
        } else {
          console.log('⚠️ No professionals data found in response:', data);
          setSpecialists([]);
        }
      } else {
        console.log('❌ Failed to fetch specialists, status:', response.status);
        setSpecialists([]);
      }
    } catch (error) {
      console.error('Error loading specialists:', error);
      setSpecialists([]); // Ensure specialists is always an array
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const startChatWithSpecialist = async (specialist: any) => {
    try {
      console.log('🚀 Starting chat with specialist:', specialist.first_name, specialist.last_name);
      setSelectedSpecialist(specialist);
      setActiveTab('chat');
      console.log('📱 Chat state set - selectedSpecialist:', specialist.id, 'activeTab: chat');
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const messageToSend = messageText.trim();
    setMessageText('');

    if (currentConversation) {
      // Send message to existing conversation
      const success = await sendMessage(currentConversation.id.toString(), messageToSend);
      if (!success) {
        Alert.alert('Error', 'Failed to send message. Please try again.');
        setMessageText(messageToSend); // Restore message
      }
    } else if (selectedSpecialist) {
      // Create new conversation and send first message
      const specialistName = `${selectedSpecialist.first_name} ${selectedSpecialist.last_name}`;
      const success = await createConversation(
        selectedSpecialist.id,
        `Chat with ${specialistName}`,
        messageToSend
      );
      
      if (success) {
        // Find and set the new conversation
        const newConversation = conversations.find(conv => 
          conv.professional_id === selectedSpecialist.id
        );
        if (newConversation) {
          setCurrentConversation(newConversation);
        }
        setSelectedSpecialist(null);
      } else {
        Alert.alert('Error', 'Failed to start conversation. Please try again.');
        setMessageText(messageToSend); // Restore message
      }
    }
  };

  const goBackToConversations = () => {
    setActiveTab('conversations');
    setCurrentConversation(null);
    setSelectedSpecialist(null);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderSpecialistsList = () => (
    <View style={styles.fullScreenSpecialistsContainer}>
      {/* Header */}
      <View style={styles.specialistsFullHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowSpecialists(false)}
        >
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.specialistsFullTitle}>Start a new chat</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Specialists List */}
      <ScrollView style={styles.fullScreenSpecialistsList}>
        {!Array.isArray(specialists) || specialists.length === 0 ? (
          <View style={styles.emptySpecialistsFull}>
            <FontAwesome name="user-md" size={48} color="#bdc3c7" />
            <Text style={styles.emptySpecialistsFullText}>No specialists available</Text>
            <Text style={styles.emptySpecialistsFullSubtext}>Check back later for available healthcare professionals</Text>
          </View>
        ) : (
          specialists.map((specialist) => (
            <TouchableOpacity
              key={specialist.id}
              style={styles.specialistItemFull}
              onPress={() => {
                startChatWithSpecialist(specialist);
                setShowSpecialists(false);
              }}
            >
              <View style={styles.specialistAvatarFull}>
                {specialist.profile_image ? (
                  <Image
                    source={{ uri: constructProfileImageUrl(specialist.profile_image) || '' }}
                    style={styles.avatarImageFull}
                    onLoad={() => console.log('✅ Specialist image loaded:', specialist.first_name, specialist.profile_image)}
                    onError={(error) => console.error('❌ Specialist image error:', error.nativeEvent.error, 'URL:', constructProfileImageUrl(specialist.profile_image))}
                  />
                ) : (
                  <FontAwesome
                    name="user-md"
                    size={32}
                    color="#3498db"
                  />
                )}
              </View>
              
              <View style={styles.specialistInfoFull}>
                <Text style={styles.specialistNameFull}>
                  {specialist.first_name} {specialist.last_name}
                </Text>
                <Text style={styles.specialistSpecialtyFull}>
                  {specialist.specialty}
                </Text>
                {specialist.qualification && (
                  <Text style={styles.specialistQualification}>
                    {specialist.qualification}
                  </Text>
                )}
                {specialist.experience_years && (
                  <Text style={styles.specialistExperience}>
                    {specialist.experience_years} years experience
                  </Text>
                )}
                {specialist.facility_name && (
                  <Text style={styles.specialistFacilityFull}>
                    📍 {specialist.facility_name}
                  </Text>
                )}
                {specialist.bio && (
                  <Text style={styles.specialistBio} numberOfLines={2}>
                    {specialist.bio}
                  </Text>
                )}
              </View>
              
              <View style={styles.specialistActions}>
                <TouchableOpacity style={styles.chatButtonFull}>
                  <FontAwesome name="comment" size={16} color="white" />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderConversationsTab = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <FontAwesome name="search" size={20} color="#2c3e50" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              setShowSpecialists(!showSpecialists);
              if (!showSpecialists) {
                loadSpecialists();
              }
            }}
          >
            <FontAwesome name="plus" size={20} color="#2c3e50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status */}
      <View style={[styles.statusBar, { backgroundColor: isConnected ? '#2ecc71' : '#e74c3c' }]}>
        <FontAwesome name={isConnected ? 'wifi' : 'wifi'} size={12} color="white" />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      {/* Conversations List */}
      <ScrollView
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && conversations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="comments" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start a chat with a healthcare professional</Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationItem}
              onPress={() => {
                setCurrentConversation(conversation);
                setActiveTab('chat');
              }}
            >
              <View style={styles.conversationAvatar}>
                {conversation.professional_profile_image ? (
                  <Image
                    source={{ uri: constructProfileImageUrl(conversation.professional_profile_image) || '' }}
                    style={styles.avatarImage}
                    onLoad={() => console.log('✅ Conversation image loaded:', conversation.professional_first_name)}
                    onError={(error) => console.error('❌ Conversation image error:', error.nativeEvent.error)}
                  />
                ) : (
                  <FontAwesome
                    name="user-md"
                    size={24}
                    color="#3498db"
                  />
                )}
                {conversation.unread_count && conversation.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conversation.unread_count}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName}>
                    {conversation.professional_first_name} {conversation.professional_last_name}
                  </Text>
                  <Text style={styles.conversationTime}>
                    {conversation.last_message_time ? formatTime(conversation.last_message_time) : ''}
                  </Text>
                </View>
                
                <View style={styles.conversationFooter}>
                  <Text style={styles.conversationLastMessage} numberOfLines={1}>
                    {conversation.last_message || 'No messages yet'}
                  </Text>
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderChatTab = () => {
    const displayName = currentConversation?.professional_first_name && currentConversation?.professional_last_name
      ? `${currentConversation.professional_first_name} ${currentConversation.professional_last_name}`
      : selectedSpecialist
      ? `${selectedSpecialist.first_name} ${selectedSpecialist.last_name}`
      : 'Unknown';

    return (
      <View style={styles.chatContainer}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBackToConversations}
          >
            <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatAvatar}>
              {currentConversation?.professional_profile_image ? (
                <Image
                  source={{ uri: constructProfileImageUrl(currentConversation.professional_profile_image) || '' }}
                  style={styles.avatarImage}
                  onLoad={() => console.log('✅ Chat header image loaded:', currentConversation.professional_first_name)}
                  onError={(error) => console.error('❌ Chat header image error:', error.nativeEvent.error)}
                />
              ) : selectedSpecialist?.profile_image ? (
                <Image
                  source={{ uri: constructProfileImageUrl(selectedSpecialist.profile_image) || '' }}
                  style={styles.avatarImage}
                  onLoad={() => console.log('✅ Selected specialist image loaded:', selectedSpecialist.first_name)}
                  onError={(error) => console.error('❌ Selected specialist image error:', error.nativeEvent.error)}
                />
              ) : (
                <FontAwesome name="user-md" size={20} color="#3498db" />
              )}
            </View>
            <View>
              <Text style={styles.chatContactName}>{displayName}</Text>
              <Text style={styles.chatContactStatus}>
                {isConnected ? '🟢 Online' : '🔴 Offline'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.moreButton}>
            <FontAwesome name="ellipsis-v" size={20} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
              <Text style={styles.emptyMessagesSubtext}>Start the conversation!</Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isMe = message.sender_id === parseInt(user?.id?.toString() || '0');
              const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
              
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    isMe ? styles.messageContainerMe : styles.messageContainerOther
                  ]}
                >
                  {!isMe && showAvatar && (
                    <View style={styles.messageAvatar}>
                      {currentConversation?.professional_profile_image ? (
                        <Image
                          source={{ uri: constructProfileImageUrl(currentConversation.professional_profile_image) || '' }}
                          style={styles.messageAvatarImage}
                          onLoad={() => console.log('✅ Message avatar image loaded')}
                          onError={(error) => console.error('❌ Message avatar image error:', error.nativeEvent.error)}
                        />
                      ) : (
                        <FontAwesome name="user-md" size={16} color="#3498db" />
                      )}
                    </View>
                  )}
                  
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.messageBubbleMe : styles.messageBubbleOther
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMe ? styles.messageTextMe : styles.messageTextOther
                      ]}
                    >
                      {message.message}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isMe ? styles.messageTimeMe : styles.messageTimeOther
                      ]}
                    >
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
          style={[styles.professionalInputContainer, { paddingBottom: insets.bottom + 10 }]}
        >
          <View style={styles.professionalInputWrapper}>
            <TextInput
              style={styles.professionalMessageInput}
              placeholder="Type a message..."
              placeholderTextColor="#95a5a6"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.professionalSendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <FontAwesome name="send" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {showSpecialists ? (
        renderSpecialistsList()
      ) : activeTab === 'conversations' ? (
        renderConversationsTab()
      ) : (
        renderChatTab()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 8,
  },
  
  // Status bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Conversations list
  conversationsList: {
    flex: 1,
    paddingBottom: 20, // Add padding to prevent overlap with tab bar
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  conversationTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    marginLeft: 8,
  },
  
  // Chat styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    marginRight: 12,
  },
  chatContactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  chatContactStatus: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  moreButton: {
    padding: 8,
  },
  
  // Messages
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120, // Add padding to account for absolutely positioned input
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageContainerMe: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageBubbleMe: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextMe: {
    color: 'white',
  },
  messageTextOther: {
    color: '#2c3e50',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  messageTimeOther: {
    color: '#7f8c8d',
  },
  
  // Input
  inputContainer: {
    backgroundColor: '#f0f8ff',
    borderTopWidth: 3,
    borderTopColor: '#e74c3c',
    paddingBottom: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  professionalInputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  professionalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  professionalMessageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f7f9fa',
    minHeight: 40,
  },
  professionalSendButton: {
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 5,
    borderColor: '#0000ff',
    borderRadius: 30,
    paddingHorizontal: 25,
    paddingVertical: 20,
    fontSize: 20,
    maxHeight: 100,
    backgroundColor: '#ffff00',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  sendButton: {
    backgroundColor: '#00ff00',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#000000',
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  
  // Loading and empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
  },
  
  // Specialists list styles
  specialistsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    maxHeight: 300,
  },
  specialistsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  specialistsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 8,
  },
  specialistsList: {
    maxHeight: 200,
  },
  specialistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  specialistAvatar: {
    marginRight: 15,
  },
  specialistInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  specialistSpecialty: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 2,
  },
  specialistFacility: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  chatButton: {
    backgroundColor: '#007bff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySpecialists: {
    padding: 40,
    alignItems: 'center',
  },
  emptySpecialistsText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  
  // Full screen specialists styles
  fullScreenSpecialistsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  specialistsFullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  specialistsFullTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  fullScreenSpecialistsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20, // Add padding to prevent overlap with tab bar
  },
  specialistItemFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  specialistAvatarFull: {
    marginRight: 16,
  },
  avatarImageFull: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  specialistInfoFull: {
    flex: 1,
  },
  specialistNameFull: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  specialistSpecialtyFull: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 2,
  },
  specialistQualification: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  specialistExperience: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  specialistFacilityFull: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  specialistBio: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  specialistActions: {
    marginLeft: 12,
  },
  chatButtonFull: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptySpecialistsFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySpecialistsFullText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
  },
  emptySpecialistsFullSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
});