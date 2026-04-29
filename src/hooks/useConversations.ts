import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  created_at: string;
  updated_at: string;
  participants: any[];
  last_message?: any;
  unread_count: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to new conversations or updates
    const channelName = `public:conversations:${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchConversations = async () => {
    try {
      if (!user) return;
      
      // Step 1: Get all conversation IDs the user is part of
      const { data: myMemberships, error: mError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (mError) throw mError;
      
      if (!myMemberships || myMemberships.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const convIds = [...new Set(myMemberships.map(m => m.conversation_id))];

      // Step 2: Fetch conversation details
      const { data: convData, error: cError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds);

      if (cError) throw cError;
      if (!convData) { setConversations([]); setIsLoading(false); return; }

      // Step 3: Fetch ALL members for these conversations
      const { data: allMembers, error: amError } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds);

      if (amError) throw amError;

      // Step 4: Get unique user IDs and fetch their profiles
      const allUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
      const { data: usersData, error: uError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .in('id', allUserIds);

      if (uError) throw uError;

      const usersMap: Record<string, any> = {};
      (usersData || []).forEach(u => { usersMap[u.id] = u; });

      // Step 5: Fetch last message for each conversation
      const messagesPromises = convIds.map(cid =>
        supabase
          .from('messages')
          .select('id, content, created_at, sender_id')
          .eq('conversation_id', cid)
          .order('created_at', { ascending: false })
          .limit(1)
      );
      const messagesResults = await Promise.all(messagesPromises);

      const lastMessageMap: Record<string, any> = {};
      messagesResults.forEach((result, idx) => {
        if (result.data && result.data.length > 0) {
          lastMessageMap[convIds[idx]] = result.data[0];
        }
      });

      // Step 6: Assemble final conversations
      const formatted: Conversation[] = convData.map((c: any) => {
        const memberUserIds = (allMembers || [])
          .filter(m => m.conversation_id === c.id)
          .map(m => m.user_id);
        
        const participants = memberUserIds
          .map(uid => usersMap[uid])
          .filter(Boolean);

        return {
          id: c.id,
          type: c.type,
          name: c.name,
          created_at: c.created_at,
          updated_at: c.updated_at || c.created_at,
          participants,
          last_message: lastMessageMap[c.id] || null,
          unread_count: 0
        };
      });

      // Sort by latest message
      formatted.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.updated_at;
        const timeB = b.last_message?.created_at || b.updated_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      setConversations(formatted);
    } catch (err) {
      console.error('Error fetching conversations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createConversation = async (userIds: string[], type: 'direct' | 'group', name?: string) => {
    try {
      if (type === 'direct') {
        if (userIds.length !== 1) throw new Error("Direct chat must have exactly one other user.");
        const targetUserId = userIds[0];
        
        // Check for existing direct chat with this specific user
        const existingDirect = conversations.find(c => {
          if (c.type !== 'direct') return false;
          const otherParticipants = c.participants.filter(p => p.id !== user.id);
          return otherParticipants.length === 1 && otherParticipants[0].id === targetUserId;
        });
        
        if (existingDirect) {
          return { id: existingDirect.id };
        }
      } else if (type === 'group') {
        if (userIds.length < 2) throw new Error("Group chat must have at least 2 other users.");
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({ type, name })
        .select()
        .single();
        
      if (error) throw error;
      
      const allUserIds = [...new Set([...userIds, user.id])];
      const participantsToInsert = allUserIds.map(id => ({
        conversation_id: data.id,
        user_id: id
      }));

      const { error: pError } = await supabase
        .from('conversation_members')
        .insert(participantsToInsert);
        
      if (pError) throw pError;
      
      await fetchConversations();
      return data;
    } catch (err) {
      console.error('Error creating conversation', err);
      throw err;
    }
  };

  const markAsRead = async (conversationId: string) => {
    return Promise.resolve();
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // Delete messages first (cascade should handle this but be explicit)
      await supabase.from('messages').delete().eq('conversation_id', conversationId);
      // Delete members
      await supabase.from('conversation_members').delete().eq('conversation_id', conversationId);
      // Delete conversation
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      if (error) throw error;
      
      // Update local state immediately
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (err) {
      console.error('Error deleting conversation', err);
      throw err;
    }
  };

  return { conversations, isLoading, createConversation, deleteConversation, markAsRead, refresh: fetchConversations };
}
