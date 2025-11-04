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
  Modal,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const videoRef = useRef<Video>(null);
  
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
    // Request permissions for image picker
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to send images!');
        }
        
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera permissions to take photos!');
        }
      }
    })();
  }, []);

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

  // Mark messages as read and scroll to bottom when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (conversationIdNum) {
        const markAsRead = async () => {
          try {
            await chatService.markMessagesAsRead(conversationIdNum.toString());
            console.log('✅ ChatScreen - Messages marked as read on focus');
          } catch (error) {
            console.error('⚠️ ChatScreen - Failed to mark messages as read on focus:', error);
          }
        };
        
        // Small delay to ensure screen is fully loaded
        const timer = setTimeout(() => {
          markAsRead();
          // Scroll to bottom when screen comes into focus
          if (scrollViewRef.current && messages.length > 0) {
            scrollViewRef.current.scrollToEnd({ animated: true });
            console.log('✅ ChatScreen - Scrolled to bottom on focus');
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [conversationIdNum, messages.length])
  );

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
        // Process messages - map created_at to timestamp and include attachment_url
        const processedMessages = response.data.map((msg: any) => ({
          ...msg,
          // Map created_at to timestamp for compatibility
          timestamp: msg.created_at || msg.timestamp || new Date().toISOString(),
          // Keep is_doctor field for compatibility but we'll use sender_id comparison instead
          is_doctor: msg.is_doctor !== undefined ? msg.is_doctor : true,
          // Ensure message_type and attachment_url are included
          message_type: msg.message_type || 'text',
          attachment_url: msg.attachment_url
        }));
        
        setMessages(processedMessages);
        console.log('✅ ChatScreen - Messages loaded:', processedMessages.length);
        
        // Mark messages as read after loading
        if (conversationIdNum) {
          try {
            await chatService.markMessagesAsRead(conversationIdNum.toString());
            console.log('✅ ChatScreen - Messages marked as read');
          } catch (markReadError) {
            // Silently fail - don't block the UI if marking as read fails
            console.error('⚠️ ChatScreen - Failed to mark messages as read:', markReadError);
          }
        }
        
        // Scroll to bottom after messages are loaded
        setTimeout(() => {
          if (scrollViewRef.current && processedMessages.length > 0) {
            scrollViewRef.current.scrollToEnd({ animated: false });
            console.log('✅ ChatScreen - Scrolled to bottom after loading messages');
          }
        }, 300);
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
      
      // Keep keyboard open by maintaining focus on TextInput
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
      
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
    if (!conversationIdNum) {
      Alert.alert('Error', 'Please wait for conversation to load');
      return;
    }

    try {
      setUploadingMedia(true);
      
      console.log('🔍 ChatScreen - Uploading media:', { uri, messageType, conversationId: conversationIdNum });
      
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
      
      console.log('🔍 ChatScreen - File details:', { filename, fileType, fileUri });
      
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

      console.log('🔍 ChatScreen - FormData created, sending request...');

      // Upload file - use direct axios call like other services do for FormData
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const axios = require('axios');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/chat/conversations/${conversationIdNum}/upload`,
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

      console.log('✅ ChatScreen - Upload response:', response.data);

      if (response.data && response.data.success) {
        // Reload messages to show the uploaded media
        await loadMessages();
        Alert.alert('Success', 'Media uploaded successfully');
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to upload media');
      }
    } catch (error: any) {
      console.error('❌ ChatScreen - Error uploading media:', error);
      console.error('❌ ChatScreen - Error details:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      
      // Handle future dates (shouldn't happen, but just in case)
      if (diffInMs < 0) {
        return 'Just now';
      }
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      // If message is from today, show time (e.g., "2:30 PM")
      if (diffInDays < 1) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // If message is from yesterday, show "Yesterday"
      if (diffInDays === 1) {
        return 'Yesterday';
      }
      
      // If message is from this week, show day name (e.g., "Mon")
      if (diffInDays < 7) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
      }
      
      // For older messages, show date (e.g., "Jan 13")
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      return `${month} ${day}`;
    } catch (error) {
      return 'Just now';
    }
  };

  const renderMessage = (message: Message) => {
    // Determine if message is from current user (sender) - sender on right, receiver on left
    const isFromCurrentUser = currentUserId ? message.sender_id === currentUserId : false;
    const isMediaMessage = message.message_type === 'image' || message.message_type === 'file';
    const mediaUrl = message.attachment_url || message.message;
    
    console.log('🔍 ChatScreen - Rendering message:', {
      messageId: message.id,
      senderId: message.sender_id,
      currentUserId: currentUserId,
      isFromCurrentUser: isFromCurrentUser,
      messageType: message.message_type,
      mediaUrl: mediaUrl
    });
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.senderMessage : styles.receiverMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isFromCurrentUser ? styles.senderBubble : styles.receiverBubble,
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
                    console.error('❌ ChatScreen - Image load error:', error);
                    console.error('❌ ChatScreen - Failed URL:', mediaUrl.startsWith('http') ? mediaUrl : `http://172.20.10.4:3000${mediaUrl}`);
                  }}
                  onLoad={() => {
                    console.log('✅ ChatScreen - Image loaded successfully:', mediaUrl.startsWith('http') ? mediaUrl : `http://172.20.10.4:3000${mediaUrl}`);
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
                  isFromCurrentUser ? styles.senderText : styles.receiverText,
                  styles.captionText
                ]}>
                  {message.message}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isFromCurrentUser ? styles.senderText : styles.receiverText
            ]}>
              {message.message}
            </Text>
          )}
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardDismissMode="interactive"
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
                  ref={textInputRef}
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
                  onFocus={() => {
                    // Scroll to bottom when input is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
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
  mediaBubble: {
    padding: 4,
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginBottom: 4,
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
