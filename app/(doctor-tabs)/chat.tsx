import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

interface ChatConversation {
  id: number;
  patientName: string;
  patientEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'online' | 'offline';
}

export default function DoctorChat() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    // TODO: Replace with actual API call
    const mockConversations: ChatConversation[] = [
      {
        id: 1,
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        lastMessage: 'Thank you for the prescription, doctor.',
        lastMessageTime: '2 hours ago',
        unreadCount: 0,
        status: 'online',
      },
      {
        id: 2,
        patientName: 'Jane Smith',
        patientEmail: 'jane@example.com',
        lastMessage: 'I have a question about my medication...',
        lastMessageTime: '4 hours ago',
        unreadCount: 2,
        status: 'offline',
      },
      {
        id: 3,
        patientName: 'Mike Johnson',
        patientEmail: 'mike@example.com',
        lastMessage: 'When should I schedule my next appointment?',
        lastMessageTime: '1 day ago',
        unreadCount: 1,
        status: 'offline',
      },
      {
        id: 4,
        patientName: 'Sarah Wilson',
        patientEmail: 'sarah@example.com',
        lastMessage: 'The medication is working well, thank you!',
        lastMessageTime: '2 days ago',
        unreadCount: 0,
        status: 'online',
      },
    ];
    setConversations(mockConversations);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const filteredConversations = conversations.filter(conversation => {
    return conversation.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conversation.patientEmail.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalUnreadMessages = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Messages</Text>
        {totalUnreadMessages > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{totalUnreadMessages}</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#bdc3c7"
          />
        </View>
      </View>

      {/* Conversations List */}
      <ScrollView
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="comments" size={60} color="#bdc3c7" />
            <Text style={styles.emptyText}>No conversations found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'You have no patient conversations yet'
              }
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => {
                // TODO: Navigate to chat screen with specific patient
                console.log('Open chat with:', conversation.patientName);
              }}
            >
              <View style={styles.conversationHeader}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.avatarText}>
                    {conversation.patientName.split(' ').map(n => n[0]).join('')}
                  </Text>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: conversation.status === 'online' ? '#2ecc71' : '#95a5a6' }
                  ]} />
                </View>
                <View style={styles.conversationInfo}>
                  <View style={styles.patientNameRow}>
                    <Text style={styles.patientName}>{conversation.patientName}</Text>
                    <Text style={styles.lastMessageTime}>{conversation.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.patientEmail}>{conversation.patientEmail}</Text>
                </View>
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.lastMessageContainer}>
                <Text 
                  style={[
                    styles.lastMessage,
                    conversation.unreadCount > 0 && styles.unreadMessage
                  ]}
                  numberOfLines={2}
                >
                  {conversation.lastMessage}
                </Text>
              </View>

              <View style={styles.conversationActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Navigate to patient profile
                    console.log('View patient profile:', conversation.id);
                  }}
                >
                  <FontAwesome name="user" size={14} color="#3498db" />
                  <Text style={styles.actionButtonText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Create prescription for patient
                    console.log('Create prescription:', conversation.id);
                  }}
                >
                  <FontAwesome name="file-text-o" size={14} color="#e74c3c" />
                  <Text style={styles.actionButtonText}>Prescribe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Schedule appointment
                    console.log('Schedule appointment:', conversation.id);
                  }}
                >
                  <FontAwesome name="calendar" size={14} color="#2ecc71" />
                  <Text style={styles.actionButtonText}>Appointment</Text>
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  conversationsList: {
    flex: 1,
    padding: 20,
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  lastMessageContainer: {
    marginBottom: 15,
  },
  lastMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  conversationActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    gap: 5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 5,
  },
});
