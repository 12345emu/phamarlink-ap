import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatService, ChatConversation, ChatMessage } from '../services/chatService';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  messages: ChatMessage[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, message: string, messageType?: string) => Promise<boolean>;
  createConversation: (facilityId: number, subject: string, initialMessage: string) => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  
  // Real-time simulation
  startPolling: () => void;
  stopPolling: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    console.log('🔍 ChatContext - loadConversations called');
    console.log('🔍 ChatContext - User:', user);
    
    if (!user) {
      console.log('❌ ChatContext - No user, returning early');
      return;
    }
    
    console.log('🔍 ChatContext - Setting loading to true');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 ChatContext - Calling chatService.getConversations()');
      const response = await chatService.getConversations();
      console.log('🔍 ChatContext - Response received:', response);
      
      if (response.success) {
        console.log('✅ ChatContext - Response successful, setting conversations');
        setConversations(response.data?.conversations || []);
        // Clear any previous errors
        setError(null);
      } else {
        console.log('❌ ChatContext - Response not successful:', response);
        console.log('❌ ChatContext - Response message:', response.message);
        console.log('❌ ChatContext - Response error:', response.error);
        setError(response.message || response.error || 'Failed to load conversations');
      }
    } catch (error) {
      console.error('❌ ChatContext - Load conversations error:', error);
      setError('Failed to load conversations');
    } finally {
      console.log('🔍 ChatContext - Setting loading to false');
      setIsLoading(false);
    }
  }, [user]);

  // Load specific conversation with messages
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await chatService.getConversation(conversationId);
      
      if (response.success && response.data) {
        setCurrentConversation(response.data.conversation);
        setMessages(response.data.messages || []);
        
        // Mark messages as read
        await markAsRead(conversationId);
      } else {
        setError(response.message || 'Failed to load conversation');
        console.error('Load conversation error:', response);
      }
    } catch (error) {
      console.error('Load conversation error:', error);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send message
  const sendMessage = useCallback(async (
    conversationId: string, 
    message: string, 
    messageType: string = 'text'
  ): Promise<boolean> => {
    if (!user || !message.trim()) return false;
    
    try {
      const success = await chatService.sendMessage(conversationId, {
        message: message.trim(),
        message_type: messageType as any
      });
      
      if (success) {
        // Reload messages to get the new message
        await loadConversation(conversationId);
        // Also refresh conversations list to update last_activity sorting
        await loadConversations();
        return true;
      } else {
        setError('Failed to send message');
        return false;
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError('Failed to send message');
      return false;
    }
  }, [user, loadConversation, loadConversations]);

  // Create new conversation
  const createConversation = useCallback(async (
    facilityId: number, 
    subject: string, 
    initialMessage: string
  ): Promise<boolean> => {
    if (!user) return false;
    
    console.log('🔍 ChatContext - Creating conversation with data:', {
      facility_id: facilityId,
      subject,
      initial_message: initialMessage,
      message_type: 'general'
    });
    
    try {
      const response = await chatService.createConversation({
        facility_id: facilityId,
        subject,
        initial_message: initialMessage,
        message_type: 'general'
      });
      
      console.log('🔍 ChatContext - Create conversation response:', response);
      
      if (response.success) {
        console.log('✅ ChatContext - Conversation created successfully');
        // Reload conversations to include the new one
        await loadConversations();
        
        // Load the newly created conversation if we have the conversation data
        if (response.data && response.data.conversation) {
          console.log('🔍 ChatContext - Loading newly created conversation:', response.data.conversation.id);
          setCurrentConversation(response.data.conversation);
          
          // Load messages for this conversation
          if (response.data.message) {
            setMessages([response.data.message]);
          } else {
            // If no initial message in response, load messages from server
            await loadConversation(response.data.conversation.id.toString());
          }
        }
        
        return true;
      } else {
        console.log('❌ ChatContext - Create conversation failed:', response.message);
        
        // If the error is due to existing conversation, try to find and open it
        if (response.message && response.message.includes('already exists')) {
          console.log('🔍 Conversation already exists, trying to find it...');
          // Reload conversations to get the latest list
          await loadConversations();
          
          // Find the existing conversation with this facility
          const existingConv = conversations.find(conv => 
            conv.facility_id === facilityId && conv.status === 'active'
          );
          
          if (existingConv) {
            console.log('✅ Found existing conversation, loading it:', existingConv.id);
            await loadConversation(existingConv.id.toString());
            return true;
          }
        }
        
        setError(response.message || 'Failed to create conversation');
        console.error('Create conversation error:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ ChatContext - Create conversation error:', error);
      setError('Failed to create conversation');
      return false;
    }
  }, [user, loadConversations]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      await chatService.markAsRead(conversationId);
      // Refresh unread count
      await refreshUnreadCount();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }, [user]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await chatService.getUnreadCount();
      
      if (response.success && response.data) {
        setUnreadCount(response.data.count || 0);
      }
      // Don't set error for unread count failures, just log them
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      // Don't set error for unread count failures, just log them
    }
  }, [user]);

  // Real-time polling simulation
  const startPolling = useCallback(() => {
    if (pollingInterval) return;
    
    const interval = setInterval(async () => {
      // Refresh conversations and unread count
      await loadConversations();
      await refreshUnreadCount();
      
      // If we have a current conversation, refresh its messages
      if (currentConversation) {
        await loadConversation(currentConversation.id.toString());
      }
    }, 30000); // Poll every 30 seconds
    
    setPollingInterval(interval);
  }, [pollingInterval, loadConversations, refreshUnreadCount, currentConversation, loadConversation]);

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Load initial data when user changes
  useEffect(() => {
    if (user) {
      loadConversations();
      refreshUnreadCount();
      startPolling();
    } else {
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setUnreadCount(0);
      stopPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [user, loadConversations, refreshUnreadCount, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const value: ChatContextType = {
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
    markAsRead,
    refreshUnreadCount,
    startPolling,
    stopPolling,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
