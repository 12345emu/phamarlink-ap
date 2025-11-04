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
  Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { doctorDashboardService } from '../services/doctorDashboardService';
import { chatService } from '../services/chatService';
import { apiClient } from '../services/apiClient';
import { API_CONFIG } from '../constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_name?: string;
  is_doctor: boolean;
  message_type?: 'text' | 'image' | 'file';
  attachment_url?: string;
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
  const [currentDoctorId, setCurrentDoctorId] = useState<number | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const videoRef = useRef<Video>(null);
  
  const handleClose = () => {
    router.back();
  };

  const getCurrentDoctorId = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Decode JWT token to get user ID
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId || payload.id;
        setCurrentDoctorId(userId);
        console.log('🔍 PatientChatModal - Current doctor ID:', userId);
      }
    } catch (error) {
      console.error('❌ PatientChatModal - Error getting current doctor ID:', error);
    }
  };

  useEffect(() => {
    // Always reload messages when screen opens to ensure we have the latest data
    getCurrentDoctorId();
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

  // Mark messages as read and scroll to bottom when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (conversationId) {
        const markAsRead = async () => {
          try {
            await chatService.markMessagesAsRead(conversationId.toString());
            console.log('✅ PatientChatModal - Messages marked as read on focus');
          } catch (error) {
            console.error('⚠️ PatientChatModal - Failed to mark messages as read on focus:', error);
          }
        };
        
        // Small delay to ensure screen is fully loaded
        const timer = setTimeout(() => {
          markAsRead();
          // Scroll to bottom when screen comes into focus
          if (scrollViewRef.current && messages.length > 0) {
            scrollViewRef.current.scrollToEnd({ animated: true });
            console.log('✅ PatientChatModal - Scrolled to bottom on focus');
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [conversationId, messages.length])
  );


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
              if (message.conversation_id || message.receiver_id === patientIdNum || message.sender_id === patientIdNum) {
                // Process message with timestamp
                const processedMessage = {
                  ...message,
                  timestamp: message.created_at || message.timestamp || new Date().toISOString(),
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
              if (data.message.receiver_id === patientIdNum || data.message.sender_id === patientIdNum) {
                // Process message with timestamp
                const processedMessage = {
                  ...data.message,
                  timestamp: data.message.created_at || data.message.timestamp || new Date().toISOString(),
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
            
            // Process messages - map created_at to timestamp and include attachment_url
            const processedMessages = messages.map((msg: any) => ({
              ...msg,
              timestamp: msg.created_at || msg.timestamp || new Date().toISOString(),
              // Keep is_doctor field for compatibility but we'll use sender_id comparison instead
              is_doctor: msg.is_doctor !== undefined ? msg.is_doctor : true,
              // Ensure message_type and attachment_url are included
              message_type: msg.message_type || 'text',
              attachment_url: msg.attachment_url
            }));
            
            setMessages(processedMessages);
            console.log('✅ PatientChatModal - Messages loaded:', processedMessages.length);
            
            // Mark messages as read after loading
            try {
              await chatService.markMessagesAsRead(existingConversation.id.toString());
              console.log('✅ PatientChatModal - Messages marked as read after loading');
            } catch (markReadError) {
              // Silently fail - don't block the UI if marking as read fails
              console.error('⚠️ PatientChatModal - Failed to mark messages as read:', markReadError);
            }
            
            // Scroll to bottom after messages are loaded
            setTimeout(() => {
              if (scrollViewRef.current && processedMessages.length > 0) {
                scrollViewRef.current.scrollToEnd({ animated: false });
                console.log('✅ PatientChatModal - Scrolled to bottom after loading messages');
              }
            }, 300);
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
        sender_id: currentDoctorId || 0, // Use current doctor's ID
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setImageCaption('');
        setImagePreviewVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setImageCaption('');
        setImagePreviewVisible(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await sendMediaMessage(result.assets[0].uri, 'file');
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Select Media',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Video Library', onPress: pickVideo },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const sendMediaMessage = async (uri: string, messageType: 'image' | 'file', message?: string) => {
    if (!conversationId) {
      Alert.alert('Error', 'Please wait for conversation to load');
      return;
    }

    try {
      setUploadingMedia(true);
      
      console.log('🔍 PatientChatModal - Uploading media:', { uri, messageType, conversationId });
      
      // Create FormData for file upload
      const formData = new FormData();
      const filename = uri.split('/').pop() || `media-${Date.now()}.jpg`;
      
      // Determine file type based on messageType and filename
      let fileType = 'image/jpeg';
      if (messageType === 'file') {
        // For videos, check extension
        if (filename.toLowerCase().endsWith('.mp4') || filename.toLowerCase().endsWith('.mov')) {
          fileType = 'video/mp4';
        } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
          fileType = 'image/jpeg';
        } else if (filename.toLowerCase().endsWith('.png')) {
          fileType = 'image/png';
        }
      } else {
        // For images, check extension
        if (filename.toLowerCase().endsWith('.png')) {
          fileType = 'image/png';
        } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
          fileType = 'image/jpeg';
        }
      }
      
      // Fix URI format for React Native
      let fileUri = uri;
      if (Platform.OS === 'ios') {
        // iOS: remove file:// prefix if present
        fileUri = uri.replace('file://', '');
      } else {
        // Android: keep as is, but ensure it's a valid URI
        fileUri = uri;
      }
      
      console.log('🔍 PatientChatModal - File details:', { filename, fileType, fileUri });
      
      // Append file to FormData (React Native format)
      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: filename,
      } as any);
      
      formData.append('message_type', messageType);
      if (message && message.trim()) {
        formData.append('message', message.trim());
      }

      console.log('🔍 PatientChatModal - FormData created, sending request...');

      // Upload file - use direct axios call like other services do for FormData
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const axios = require('axios');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/chat/conversations/${conversationId}/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            // Don't set Content-Type - let axios set it automatically for FormData
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      console.log('✅ PatientChatModal - Upload response:', response.data);

      if (response.data && response.data.success) {
        // Reload messages to show the uploaded media
        await loadMessages();
        Alert.alert('Success', 'Media uploaded successfully');
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to upload media');
      }
    } catch (error: any) {
      console.error('❌ PatientChatModal - Error uploading media:', error);
      console.error('❌ PatientChatModal - Error details:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    // Determine if message is from current user (doctor) - doctor on right, patient on left
    const isFromCurrentUser = currentDoctorId ? message.sender_id === currentDoctorId : false;
    const isMediaMessage = message.message_type === 'image' || message.message_type === 'file';
    const mediaUrl = message.attachment_url || message.message;
    
    console.log('🔍 PatientChatModal - Rendering message:', {
      messageId: message.id,
      senderId: message.sender_id,
      currentDoctorId: currentDoctorId,
      patientId: patientIdNum,
      isFromCurrentUser: isFromCurrentUser,
      messageType: message.message_type,
      attachmentUrl: message.attachment_url,
      mediaUrl: mediaUrl
    });
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.doctorMessage : styles.patientMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isFromCurrentUser ? styles.doctorBubble : styles.patientBubble,
          isMediaMessage && styles.mediaBubble
        ]}>
          {isMediaMessage && mediaUrl ? (
            <View>
              {message.message_type === 'image' ? (
                <Image 
                  source={{ 
                    uri: mediaUrl.startsWith('http') 
                      ? mediaUrl 
                      : `http://172.20.10.4:3000${mediaUrl}` 
                  }}
                  style={styles.messageImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('❌ PatientChatModal - Image load error:', error);
                    console.error('❌ PatientChatModal - Failed URL:', mediaUrl.startsWith('http') ? mediaUrl : `http://172.20.10.4:3000${mediaUrl}`);
                  }}
                  onLoad={() => {
                    console.log('✅ PatientChatModal - Image loaded successfully:', mediaUrl.startsWith('http') ? mediaUrl : `http://172.20.10.4:3000${mediaUrl}`);
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.videoContainer}
                  onPress={() => {
                    const videoUrl = mediaUrl.startsWith('http')
                      ? mediaUrl
                      : `http://172.20.10.4:3000${mediaUrl}`;
                    setSelectedVideoUrl(videoUrl);
                    setVideoModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Video
                    source={{ uri: mediaUrl.startsWith('http') ? mediaUrl : `http://172.20.10.4:3000${mediaUrl}` }}
                    style={styles.videoThumbnail}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls={false}
                    shouldPlay={false}
                    isLooping={false}
                  />
                  <View style={styles.videoOverlay}>
                    <FontAwesome name="play-circle" size={50} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
              {message.message && (
                <Text style={[
                  styles.messageText,
                  isFromCurrentUser ? styles.doctorText : styles.patientText,
                  styles.captionText
                ]}>
                  {message.message}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isFromCurrentUser ? styles.doctorText : styles.patientText
            ]}>
              {message.message}
            </Text>
          )}
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
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={showMediaOptions}
                  disabled={uploadingMedia || sending}
                >
                  {uploadingMedia ? (
                    <ActivityIndicator size="small" color="#3498db" />
                  ) : (
                    <FontAwesome name="paperclip" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  multiline
                  maxLength={500}
                  editable={!sending && !uploadingMedia}
                  returnKeyType="default"
                  blurOnSubmit={false}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!newMessage.trim() || sending || uploadingMedia) && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sending || uploadingMedia}
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
      
      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          setVideoModalVisible(false);
          setSelectedVideoUrl(null);
          if (videoRef.current) {
            videoRef.current.pauseAsync();
          }
        }}
      >
        <View style={styles.videoModalContainer}>
          <TouchableOpacity
            style={styles.videoModalClose}
            onPress={() => {
              setVideoModalVisible(false);
              setSelectedVideoUrl(null);
              if (videoRef.current) {
                videoRef.current.pauseAsync();
              }
            }}
          >
            <FontAwesome name="times" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedVideoUrl && (
            <Video
              ref={videoRef}
              source={{ uri: selectedVideoUrl }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
              isLooping={false}
            />
          )}
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setImagePreviewVisible(false);
          setSelectedImageUri(null);
          setImageCaption('');
        }}
      >
        <View style={styles.imagePreviewContainer}>
          <View style={styles.imagePreviewContent}>
            <View style={styles.imagePreviewHeader}>
              <TouchableOpacity
                style={styles.imagePreviewCancelButton}
                onPress={() => {
                  setImagePreviewVisible(false);
                  setSelectedImageUri(null);
                  setImageCaption('');
                }}
              >
                <FontAwesome name="times" size={24} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.imagePreviewTitle}>Add Caption (Optional)</Text>
              <TouchableOpacity
                style={styles.imagePreviewSendButton}
                onPress={async () => {
                  if (selectedImageUri) {
                    setImagePreviewVisible(false);
                    await sendMediaMessage(selectedImageUri, 'image', imageCaption);
                    setSelectedImageUri(null);
                    setImageCaption('');
                  }
                }}
                disabled={uploadingMedia}
              >
                {uploadingMedia ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FontAwesome name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            
            {selectedImageUri && (
              <Image 
                source={{ uri: selectedImageUri }} 
                style={styles.imagePreviewImage}
                resizeMode="contain"
              />
            )}
            
            <View style={styles.imagePreviewInputContainer}>
              <Text style={styles.imagePreviewLabel}>Caption (Optional)</Text>
              <TextInput
                style={styles.imagePreviewInput}
                placeholder="Add a caption to your image..."
                placeholderTextColor="#95a5a6"
                value={imageCaption}
                onChangeText={setImageCaption}
                multiline
                maxLength={500}
                autoFocus={true}
                textAlignVertical="top"
              />
              <Text style={styles.imagePreviewCharCount}>
                {imageCaption.length}/500
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
  mediaBubble: {
    padding: 4,
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
  },
  videoContainer: {
    width: 250,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#000',
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: screenWidth,
    height: screenHeight,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContent: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#fff',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  imagePreviewCancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  imagePreviewSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  imagePreviewInputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  imagePreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  imagePreviewInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    minHeight: 60,
    maxHeight: 120,
    backgroundColor: '#f8f9fa',
  },
  imagePreviewCharCount: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'right',
    marginTop: 4,
  },
  captionText: {
    marginTop: 4,
    fontSize: 14,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
