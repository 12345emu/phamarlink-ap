import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, View, Text, StatusBar } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

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

interface ChatContact {
  id: number;
  name: string;
  role: 'pharmacist' | 'doctor';
  pharmacy: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export default function ChatScreen() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'chat'>('contacts');
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const contacts: ChatContact[] = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "doctor",
      pharmacy: "Holy Family Hospital",
      avatar: "user-md",
      lastMessage: "Your prescription is ready for pickup",
      lastMessageTime: "2:30 PM",
      unreadCount: 2,
      isOnline: true
    },
    {
      id: 2,
      name: "Mike Chen",
      role: "pharmacist",
      pharmacy: "CityMed Pharmacy",
      avatar: "user",
      lastMessage: "I can help you with dosage questions",
      lastMessageTime: "1:45 PM",
      unreadCount: 0,
      isOnline: true
    },
    {
      id: 3,
      name: "Dr. Emily Rodriguez",
      role: "doctor",
      pharmacy: "East Legon Clinic",
      avatar: "user-md",
      lastMessage: "Let's schedule a consultation",
      lastMessageTime: "Yesterday",
      unreadCount: 1,
      isOnline: false
    },
    {
      id: 4,
      name: "James Wilson",
      role: "pharmacist",
      pharmacy: "WellCare Pharmacy",
      avatar: "user",
      lastMessage: "Your order has been processed",
      lastMessageTime: "2 days ago",
      unreadCount: 0,
      isOnline: false
    }
  ];

  const sampleMessages: Message[] = [
    {
      id: 1,
      text: "Hello! How can I help you today?",
      sender: "pharmacist",
      timestamp: new Date(Date.now() - 3600000),
      isRead: true
    },
    {
      id: 2,
      text: "Hi! I have a question about my medication",
      sender: "user",
      timestamp: new Date(Date.now() - 3500000),
      isRead: true
    },
    {
      id: 3,
      text: "Of course! What medication are you taking?",
      sender: "pharmacist",
      timestamp: new Date(Date.now() - 3400000),
      isRead: true
    },
    {
      id: 4,
      text: "I'm taking Amoxicillin 250mg",
      sender: "user",
      timestamp: new Date(Date.now() - 3300000),
      isRead: true
    },
    {
      id: 5,
      text: "Great! Amoxicillin is an antibiotic. Are you experiencing any side effects?",
      sender: "pharmacist",
      timestamp: new Date(Date.now() - 3200000),
      isRead: false
    }
  ];

  useEffect(() => {
    if (selectedContact) {
      setMessages(sampleMessages);
    }
  }, [selectedContact]);

  const sendMessage = () => {
    if (messageText.trim()) {
      const newMessage: Message = {
        id: Date.now(),
        text: messageText.trim(),
        sender: 'user',
        timestamp: new Date(),
        isRead: false
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
      
      // Simulate response after 2 seconds
      setTimeout(() => {
        const response: Message = {
          id: Date.now() + 1,
          text: "Thank you for your message. I'll get back to you shortly.",
          sender: selectedContact?.role === 'doctor' ? 'doctor' : 'pharmacist',
          timestamp: new Date(),
          isRead: false
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startChat = (contact: ChatContact) => {
    setSelectedContact(contact);
    setActiveTab('chat');
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

  const renderContactsTab = () => (
    <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#95a5a6"
          />
        </View>
      </View>
      
      {contacts.map(contact => (
        <TouchableOpacity
          key={contact.id}
          style={styles.contactCard}
          onPress={() => startChat(contact)}
          activeOpacity={0.7}
        >
          <View style={styles.contactAvatar}>
            <FontAwesome 
              name={contact.avatar as any} 
              size={24} 
              color={contact.role === 'doctor' ? '#e74c3c' : ACCENT} 
            />
            {contact.isOnline && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.lastMessageTime}>{contact.lastMessageTime}</Text>
            </View>
            <Text style={styles.contactRole}>
              {contact.role === 'doctor' ? '👨‍⚕️' : '💊'} {contact.role} • {contact.pharmacy}
            </Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {contact.lastMessage}
            </Text>
          </View>
          {contact.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderChatTab = () => (
    <View style={styles.chatContainer}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setActiveTab('contacts')} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <View style={styles.chatContactInfo}>
          <View style={styles.chatAvatar}>
            <FontAwesome 
              name={selectedContact?.avatar as any} 
              size={20} 
              color={selectedContact?.role === 'doctor' ? '#e74c3c' : ACCENT} 
            />
            {selectedContact?.isOnline && (
              <View style={styles.chatOnlineIndicator} />
            )}
          </View>
          <View>
            <Text style={styles.chatContactName}>{selectedContact?.name}</Text>
            <Text style={styles.chatContactStatus}>
              {selectedContact?.isOnline ? '🟢 Online' : '⚪ Offline'}
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
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.sender === 'user' ? styles.userMessage : styles.otherMessage
            ]}
          >
            <View style={[
              styles.messageBubble,
              message.sender === 'user' ? styles.userBubble : styles.otherBubble
            ]}>
              <Text style={[
                styles.messageText,
                message.sender === 'user' ? styles.userMessageText : styles.otherMessageText
              ]}>
                {message.text}
              </Text>
              <Text style={[
                styles.messageTime,
                message.sender === 'user' ? styles.userMessageTime : styles.otherMessageTime
              ]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#95a5a6"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
            activeOpacity={0.8}
          >
            <FontAwesome name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
          <FontAwesome name="phone" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {activeTab === 'contacts' && renderContactsTab()}
      {activeTab === 'chat' && selectedContact && renderChatTab()}
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
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
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
    backgroundColor: ACCENT,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
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
}); 