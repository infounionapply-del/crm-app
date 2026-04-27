import React, { createContext, useContext, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'loading' | 'info';

interface NotificationContextType {
  notify: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    loading: (message: string) => string | number;
    dismiss: (id: string | number) => void;
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => Promise<T>;
  };
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState<{id: number, message: string}[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Setup listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const notify = {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    loading: (message: string) => toast.loading(message),
    dismiss: (id: string | number) => toast.dismiss(id),
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      const taskId = Date.now() + Math.random();
      setLoadingTasks(prev => [...prev, { id: taskId, message: messages.loading }]);

      toast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      });

      promise.finally(() => {
        setLoadingTasks(prev => prev.filter(t => t.id !== taskId));
      });

      return promise;
    }
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {/* 
        Sonner Toaster configured to be minimal and modern.
        Desktop: bottom-right
        Mobile: top-center
      */}
      <Toaster 
        position="top-center" 
        richColors 
        closeButton 
        theme="light"
        toastOptions={{
          style: {
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            borderRadius: '12px',
          }
        }}
      />
      
      {/* Global Fullscreen Loading Overlay */}
      {loadingTasks.length > 0 && (
        <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-8 rounded-2xl editorial-shadow border border-primary/20 flex flex-col items-center max-w-sm text-center transform transition-all scale-100">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-surface-container-lowest rounded-full p-3 border border-primary/10 shadow-sm">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Processing...</h3>
            <p className="text-sm font-medium text-on-surface-variant">
              {loadingTasks[loadingTasks.length - 1].message}
            </p>
          </div>
        </div>
      )}

      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
