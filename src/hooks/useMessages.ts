import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: any;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache of user profiles to avoid re-fetching
  const usersCache = useRef<Record<string, any>>({});
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const fetchUserProfile = async (userId: string) => {
    if (usersCache.current[userId]) return usersCache.current[userId];
    
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', userId)
      .single();
    
    if (data) {
      usersCache.current[userId] = data;
    }
    return data;
  };

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    fetchMessages();

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch sender info
          const senderData = await fetchUserProfile(newMessage.sender_id);
          if (senderData) {
            newMessage.sender = senderData;
          }

          // Ensure no duplicates
          if (!messagesRef.current.some(m => m.id === newMessage.id)) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const fetchMessages = async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      // Fetch messages without join
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch unique sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      for (const sid of senderIds) {
        await fetchUserProfile(sid);
      }

      // Attach sender info to each message
      const messagesWithSender = (data || []).map(m => ({
        ...m,
        sender: usersCache.current[m.sender_id] || null
      }));

      setMessages(messagesWithSender);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!conversationId || !user) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      }
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content
        })
        .select('*')
        .single();

      if (error) throw error;

      // Attach sender and replace temp message
      const senderData = await fetchUserProfile(user.id);
      const realMessage = { ...data, sender: senderData };
      setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m));
    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw err;
    }
  };

  return { messages, isLoading, error, sendMessage };
}
