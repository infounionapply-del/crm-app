import React, { useState } from 'react';
import { useConversations, Conversation } from '../../hooks/useConversations';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Users, Plus, Search, User, Users as UsersIcon, Trash2 } from 'lucide-react';
import NewChatModal from './NewChatModal';

interface ChatListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ activeId, onSelect }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { conversations, isLoading, markAsRead, deleteConversation } = useConversations();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'direct' | 'group'>('direct');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const getChatName = (conv: Conversation) => {
    if (conv.type === 'group' && conv.name) return conv.name;
    
    const others = conv.participants.filter(p => p.id !== user?.id);
    if (others.length === 0) return t('chat.just_you');
    if (others.length === 1) return `${others[0].first_name || ''} ${others[0].last_name || ''}`.trim() || others[0].email;
    return `${others[0].first_name || 'Someone'} ${t('chat.and_others').replace('{count}', String(others.length - 1))}`;
  };

  const getChatAvatar = (conv: Conversation) => {
    if (conv.type === 'group') {
      return (
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Users size={20} />
        </div>
      );
    }
    
    const others = conv.participants.filter(p => p.id !== user?.id);
    const initial = others.length > 0 ? (others[0].first_name?.[0] || others[0].email?.[0] || '?').toUpperCase() : '?';
    
    return (
      <div className="w-12 h-12 rounded-full bg-surface-variant text-on-surface flex items-center justify-center flex-shrink-0 font-medium">
        {initial}
      </div>
    );
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleSelect = (conv: Conversation) => {
    onSelect(conv.id);
    if (conv.unread_count > 0) {
      markAsRead(conv.id);
    }
  };

  const filteredConversations = conversations.filter(c => 
    getChatName(c).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-surface-container-lowest">
      {/* Header */}
      <div className="p-4 border-b ghost-border">
        <div className="flex justify-between items-center mb-4 relative">
          <h2 className="text-xl font-bold text-on-surface">{t('chat.title')}</h2>
          <button 
            onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
            className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-dark transition-colors shadow-sm relative z-10"
          >
            <Plus size={20} className={`transition-transform duration-200 ${isActionMenuOpen ? 'rotate-45' : ''}`} />
          </button>
          
          {/* Action Menu (Dropdown) */}
          {isActionMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsActionMenuOpen(false)}></div>
              <div className="absolute right-0 top-12 w-48 bg-surface-container-lowest border ghost-border rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    setModalType('direct');
                    setIsNewModalOpen(true);
                    setIsActionMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-3"
                >
                  <User size={16} className="text-primary" /> {t('chat.start_chat')}
                </button>
                <div className="h-[1px] bg-outline-variant/30 w-full"></div>
                <button
                  onClick={() => {
                    setModalType('group');
                    setIsNewModalOpen(true);
                    setIsActionMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-3"
                >
                  <UsersIcon size={16} className="text-primary" /> {t('chat.create_group')}
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input
            type="text"
            placeholder={t('chat.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border-none focus:ring-2 focus:ring-primary text-sm transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center p-8 text-on-surface-variant flex flex-col items-center">
            <MessageSquare size={32} className="opacity-50 mb-3" />
            <p className="text-sm">{t('chat.no_conversations')}</p>
            {searchTerm && <p className="text-xs mt-1">{t('chat.try_different_search')}</p>}
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isUnread = conv.unread_count > 0;
            const lastMsg = conv.last_message;
            
            return (
              <div
                key={conv.id}
                className={`relative group flex items-center rounded-xl transition-colors mb-1
                  ${activeId === conv.id ? 'bg-primary/10' : 'hover:bg-surface-container-low'}
                `}
              >
                <button
                  onClick={() => handleSelect(conv)}
                  className="w-full text-left p-3 flex items-center gap-3 min-w-0"
                >
                  {getChatAvatar(conv)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`text-sm font-semibold truncate pr-2 ${isUnread ? 'text-on-surface' : 'text-on-surface'}`}>
                        {getChatName(conv)}
                      </h4>
                      <span className={`text-[10px] whitespace-nowrap ${isUnread ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                        {formatTime(lastMsg?.created_at || conv.updated_at)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-xs truncate ${isUnread ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                        {lastMsg?.content || t('chat.no_messages_yet')}
                      </p>
                      {isUnread && (
                        <span className="w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('chat.delete_confirm'))) {
                      deleteConversation(conv.id);
                      if (activeId === conv.id) onSelect('');
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-outline hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  title={t('chat.delete_chat')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {isNewModalOpen && (
        <NewChatModal 
          type={modalType} 
          onClose={() => setIsNewModalOpen(false)} 
          onChatCreated={(id) => {
            onSelect(id);
          }}
        />
      )}
    </div>
  );
};

export default ChatList;
