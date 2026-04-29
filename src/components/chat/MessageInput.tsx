import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  isLoading?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, isLoading }) => {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isLoading || isSending) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert(t('chat.send_failed'));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-surface-container-lowest border-t ghost-border p-3 md:p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-surface-container rounded-3xl flex items-center pr-1 overflow-hidden transition-all border border-transparent focus-within:border-primary/30 focus-within:bg-surface-container-lowest">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.message_placeholder')}
            disabled={isLoading || isSending}
            className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 text-sm placeholder:text-outline disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isLoading || isSending}
          className="w-12 h-12 flex-shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-dark transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md"
        >
          <Send size={18} className="ml-1" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
