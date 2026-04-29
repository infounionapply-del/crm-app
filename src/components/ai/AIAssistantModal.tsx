import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface AIAssistantModalProps {
  onClose: () => void;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<{role: 'ai' | 'user', content: string}[]>([
    { role: 'ai', content: t('ai.welcome_message') }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { 
          message: userMessage,
          userId: user?.id,
          language: language
        }
      });

      if (error) throw error;
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: data.response || t('ai.error_response')
      }]);
    } catch (err: any) {
      console.error("AI Error Detailed:", err);
      const errorMessage = err.message || t('ai.connection_error');
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `${t('ai.connection_error')} (${errorMessage})`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal/Slide-up Panel */}
      <div 
        className="bg-surface-container-lowest w-full sm:w-[400px] h-[80vh] sm:h-[600px] max-h-screen sm:rounded-2xl shadow-2xl flex flex-col relative pointer-events-auto animate-slide-up sm:animate-none editorial-shadow border ghost-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-on-primary p-4 flex justify-between items-center relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl transform -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide flex items-center gap-2">
                {t('ai.assistant_title')}
              </h3>
              <p className="text-xs text-primary-container/80 font-medium">{t('ai.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors relative z-10"
          >
            <X size={20} className="text-black" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center flex-shrink-0 shadow-sm mb-1">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div 
                  className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-br-sm' 
                      : 'bg-surface-container-lowest border ghost-border text-on-surface rounded-bl-sm'
                    }
                  `}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center flex-shrink-0 mb-1">
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-surface-container-lowest border ghost-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t ghost-border bg-surface-container-lowest">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            <div className="absolute left-3 text-primary">
              <Sparkles size={18} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ai.placeholder')}
              className="flex-1 pl-10 pr-12 py-3 bg-surface-container rounded-full border border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/5 transition-all text-sm"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-1 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-dark transition-transform disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-md"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-outline font-medium tracking-wide">{t('ai.footer_note')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
