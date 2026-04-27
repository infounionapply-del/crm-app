import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export const InstallPWA: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setSupportsPWA(false);
    });

    return () => window.removeEventListener('transitionend', handler);
  }, []);

  const onClick = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    if (!promptInstall) {
      return;
    }
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setSupportsPWA(false);
    }
  };

  if (!supportsPWA || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 bg-surface-container-highest border border-primary/20 rounded-2xl p-4 shadow-2xl z-50 animate-slide-up flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center shrink-0">
          <Download size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-on-surface text-sm">Install App</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Add this app to your home screen for a better experience and offline access.</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button 
          onClick={() => setSupportsPWA(false)} 
          className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
        >
          Later
        </button>
        <button 
          onClick={onClick} 
          className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
        >
          Install
        </button>
      </div>
    </div>
  );
};
