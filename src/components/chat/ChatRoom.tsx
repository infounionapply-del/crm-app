import React, { useEffect, useRef } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import MessageInput from './MessageInput';
import { ArrowLeft, Users, Info } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ChatRoomProps {
  conversationId: string;
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ conversationId, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { messages, isLoading, sendMessage } = useMessages(conversationId);
  const { conversations, markAsRead } = useConversations();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find(c => c.id === conversationId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (conversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender_id !== user?.id) {
        markAsRead(conversationId);
      }
    }
  }, [messages, conversationId]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-container-lowest">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Header Details
  const isGroup = conversation.type === 'group';
  const others = conversation.participants.filter(p => p.id !== user?.id);
  const chatName = isGroup && conversation.name 
    ? conversation.name 
    : others.length === 1 
      ? `${others[0].first_name || ''} ${others[0].last_name || ''}`.trim() || others[0].email 
      : others.length > 1 
        ? `${others[0]?.first_name || 'Someone'} ${t('chat.and_others').replace('{count}', String(others.length - 1))}`
        : t('chat.just_you');

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderDateSeparator = (date: Date) => (
    <div className="flex justify-center my-4">
      <span className="bg-surface-container text-on-surface-variant text-[10px] font-medium px-3 py-1 rounded-full uppercase tracking-wider">
        {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
    </div>
  );

  let currentDateStr = '';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E5DDD5]/20 relative">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      {/* Header */}
      <div className="h-16 bg-surface-container-lowest border-b ghost-border px-4 flex items-center justify-between z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={onBack} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-on-surface">
            {isGroup ? <Users size={18} /> : (chatName[0] || '?').toUpperCase()}
          </div>
          
          <div className="min-w-0">
            <h2 className="font-semibold text-on-surface text-sm truncate">{chatName}</h2>
            {isGroup && (
              <p className="text-[10px] text-on-surface-variant truncate">
                {conversation.participants.map(p => p.first_name || p.email.split('@')[0]).join(', ')}
              </p>
            )}
          </div>
        </div>

        <button className="p-2 text-outline hover:text-on-surface transition-colors">
          <Info size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 z-10 custom-scrollbar relative"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const msgDate = new Date(msg.created_at);
            const msgDateStr = msgDate.toDateString();
            
            const showDate = msgDateStr !== currentDateStr;
            if (showDate) {
              currentDateStr = msgDateStr;
            }

            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || new Date(prevMsg.created_at).toDateString() !== msgDateStr;

            return (
              <React.Fragment key={msg.id}>
                {showDate && renderDateSeparator(msgDate)}
                
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
                  
                  {isGroup && !isMe && isFirstInGroup && (
                    <span className="text-[10px] text-on-surface-variant ml-2 mb-1 font-medium">
                      {msg.sender?.first_name ? `${msg.sender.first_name} ${msg.sender.last_name || ''}` : msg.sender?.email}
                    </span>
                  )}

                  <div 
                    className={`
                      relative max-w-[80%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm
                      ${isMe 
                        ? 'bg-[#E3F2FD] text-[#0D47A1] rounded-tr-sm'
                        : 'bg-surface-container-lowest border ghost-border text-on-surface rounded-tl-sm'
                      }
                      ${msg.id.startsWith('temp-') ? 'opacity-70' : ''}
                    `}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                    <div className="flex justify-end items-center gap-1 mt-1 -mb-1">
                      <span className={`text-[9px] ${isMe ? 'text-[#0D47A1]/60' : 'text-on-surface-variant'}`}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div className="z-20 sticky bottom-0">
        <MessageInput onSend={sendMessage} />
      </div>
    </div>
  );
};

export default ChatRoom;
