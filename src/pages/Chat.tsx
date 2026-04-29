import React, { useState } from 'react';
import ChatList from '../components/chat/ChatList';
import ChatRoom from '../components/chat/ChatRoom';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLanguage } from '../contexts/LanguageContext';

const Chat: React.FC = () => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // If mobile, show either list or room. If desktop, show both.
  const showList = !isMobile || !activeConversationId;
  const showRoom = !isMobile || activeConversationId;

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-5.5rem)] -mx-4 -mt-4 md:-m-8 bg-surface-container-lowest overflow-hidden">
      {showList && (
        <div className={`border-r ghost-border flex-shrink-0 ${isMobile ? 'w-full' : 'w-80 lg:w-96'}`}>
          <ChatList 
            activeId={activeConversationId} 
            onSelect={setActiveConversationId} 
          />
        </div>
      )}
      {showRoom && (
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile && !activeConversationId ? 'hidden' : ''}`}>
          {activeConversationId ? (
            <ChatRoom 
              conversationId={activeConversationId} 
              onBack={() => setActiveConversationId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant bg-surface-container-low/30">
              <div className="text-center">
                <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-on-surface mb-1">{t('chat.your_messages')}</h3>
                <p className="text-sm">{t('chat.select_conversation')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
