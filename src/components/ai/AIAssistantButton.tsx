import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AIAssistantModal from './AIAssistantModal';

const AIAssistantButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-4 md:right-8 z-40 bg-gradient-to-r from-primary to-primary-dark text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group active:scale-95 flex items-center justify-center animate-bounce-slow ${
          isChat ? 'bottom-36 md:bottom-24' : 'bottom-20 md:bottom-8'
        }`}
        aria-label="Open AI Assistant"
      >
        <Sparkles size={24} className="group-hover:animate-pulse" />
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-primary/40 blur-md -z-10 group-hover:bg-primary/60 transition-colors"></div>
      </button>

      {isOpen && <AIAssistantModal onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default AIAssistantButton;
