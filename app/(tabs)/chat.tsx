import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

  const contacts: ChatContact[] = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "doctor",
      pharmacy: "CVS Pharmacy",
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
      pharmacy: "Walgreens",
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
      pharmacy: "Local Pharmacy",
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
      pharmacy: "Rite Aid",
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

  const renderContactsTab = () => (
    <ScrollView style={styles.contactsList}>
      {contacts.map(contact => (
        <TouchableOpacity
          key={contact.id}
          style={styles.contactCard}
          onPress={() => startChat(contact)}
        >
          <View style={styles.contactAvatar}>
            <FontAwesome 
              name={contact.avatar as any} 
              size={24} 
              color="#4CAF50" 
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
            <Text style={styles.contactRole}>{contact.role} • {contact.pharmacy}</Text>
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
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.chatContactInfo}>
          <View style={styles.chatAvatar}>
            <FontAwesome 
              name={selectedContact?.avatar as any} 
              size={20} 
              color="#4CAF50" 
            />
            {selectedContact?.isOnline && (
              <View style={styles.chatOnlineIndicator} />
            )}
          </View>
          <View>
            <Text style={styles.chatContactName}>{selectedContact?.name}</Text>
            <Text style={styles.chatContactStatus}>
              {selectedContact?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <FontAwesome name="ellipsis-v" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
          >
            <FontAwesome name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity style={styles.emergencyButton}>
          <FontAwesome name="phone" size={20} color="white" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  emergencyButton: {
    padding: 10,
  },
  contactsList: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
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
    fontWeight: 'bold',
    color: '#333',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#666',
  },
  contactRole: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#4CAF50',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  chatOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  chatContactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  chatContactStatus: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
  },
  moreButton: {
    marginLeft: 15,
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
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
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 5,
  },
  userMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
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
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
}); 