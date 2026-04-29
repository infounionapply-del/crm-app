import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileBottomNav } from './layout/MobileBottomNav';
import { InstallPWA } from './InstallPWA';
import AIAssistantButton from './ai/AIAssistantButton';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  Search,
  Bell,
  Settings,
  LogOut
} from 'lucide-react';
import { getWebNavGroups } from '../config/navigation';

const Layout: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const { notifications } = useData();
  const unreadCount = notifications ? notifications.filter((n: any) => !n.isRead).length : 0;

  const menuGroups = getWebNavGroups(profile?.role || '');

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'th' : 'en');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden glass-header sticky top-0 z-40 flex items-center justify-between p-4 border-b ghost-border">
        <div className="flex items-center gap-3">
          {/* Left space for balance, menu moved to bottom nav */}
          <div className="w-8"></div>
          <div className="font-headline font-semibold text-primary text-xl tracking-tight">CRM SYSTEM</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1 text-sm font-medium rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            {language.toUpperCase()}
          </button>
          <div className="relative">
            <button 
              onClick={() => { setIsNotifDropdownOpen(!isNotifDropdownOpen); setIsProfileDropdownOpen(false); }}
              className="p-2 text-on-surface-variant relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
              )}
            </button>
            
            {isNotifDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotifDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-lg border ghost-border py-2 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b ghost-border flex justify-between items-center">
                    <h3 className="font-semibold text-on-surface text-sm">{t('nav.notifications')}</h3>
                    {unreadCount > 0 && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                  </div>
                  {(!notifications || notifications.length === 0) ? (
                    <div className="p-4 text-center text-sm text-on-surface-variant">{t('notification.empty')}</div>
                  ) : (
                    <div className="divide-y ghost-border">
                      {notifications.map((notif: any) => (
                        <Link 
                          key={notif.id} 
                          to={notif.link}
                          onClick={() => setIsNotifDropdownOpen(false)}
                          className={`block p-3 hover:bg-surface-container transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-medium ${!notif.isRead ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>{notif.title}</span>
                            <span className="text-[10px] text-on-surface-variant">{notif.time}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant line-clamp-2">{notif.message}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-surface-container-lowest border-r ghost-border transform transition-transform duration-300 ease-in-out
        hidden md:flex flex-col md:relative md:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          <div className="hidden md:flex items-center h-16 px-6 border-b ghost-border">
            <div className="font-headline font-semibold text-primary text-xl tracking-tight">CRM SYSTEM</div>
          </div>

          <div className="flex-1 py-6 px-4 space-y-6 overflow-y-auto custom-scrollbar">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-4 text-xs font-semibold text-outline tracking-wider uppercase mb-2">
                  {t(group.title)}
                </div>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm
                        ${isActive
                          ? 'bg-primary-container text-on-primary-container font-medium'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}
                      `}
                    >
                      <Icon size={18} className={isActive ? 'text-primary' : 'text-outline'} />
                      <span>{t(item.label)}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="p-4 border-t ghost-border hidden">
            {/* Settings moved to Profile Menu */}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 glass-header border-b ghost-border sticky top-0 z-30">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
              <input
                type="text"
                placeholder={t('header.search')}
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <span className={language === 'th' ? 'text-primary' : ''}>TH</span>
              <span className="text-outline-variant">|</span>
              <span className={language === 'en' ? 'text-primary' : ''}>EN</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => { setIsNotifDropdownOpen(!isNotifDropdownOpen); setIsProfileDropdownOpen(false); }}
                className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
                )}
              </button>
              
              {isNotifDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border ghost-border py-2 z-50 max-h-96 overflow-y-auto editorial-shadow">
                    <div className="px-4 py-3 border-b ghost-border flex justify-between items-center sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
                      <h3 className="font-semibold text-on-surface text-sm">{t('nav.notifications')}</h3>
                      {unreadCount > 0 && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                    </div>
                    {(!notifications || notifications.length === 0) ? (
                      <div className="p-8 text-center text-sm text-on-surface-variant">
                        <Bell size={24} className="mx-auto mb-2 opacity-50" />{t('notification.empty')}</div>
                    ) : (
                      <div className="divide-y ghost-border">
                        {notifications.map((notif: any) => (
                          <Link 
                            key={notif.id} 
                            to={notif.link}
                            onClick={() => setIsNotifDropdownOpen(false)}
                            className={`block p-4 hover:bg-surface-container transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className={`text-sm ${!notif.isRead ? 'text-on-surface font-semibold' : 'text-on-surface-variant font-medium'}`}>{notif.title}</span>
                              <span className="text-[10px] text-on-surface-variant flex-shrink-0 mt-0.5">{notif.time}</span>
                            </div>
                            <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{notif.message}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => { setIsProfileDropdownOpen(!isProfileDropdownOpen); setIsNotifDropdownOpen(false); }}
                className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-medium text-sm ml-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </button>
              
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border ghost-border py-1 z-50">
                    <div className="px-4 py-2 border-b ghost-border">
                      <p className="text-sm font-medium text-on-surface truncate">{profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : (profile?.name || 'User')}</p>
                      <p className="text-xs text-on-surface-variant truncate">{profile?.role || 'No Role'}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                    >
                      <Settings size={16} /> {t('nav.settings')}
                    </Link>
                    <div className="my-1 border-t ghost-border"></div>
                    <button
                      onClick={async () => {
                        setIsProfileDropdownOpen(false);
                        await signOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={16} /> {t('nav.sign_out')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* AI Assistant Floating Button */}
      <AIAssistantButton />

      {/* PWA Install Prompt */}
      <InstallPWA />
    </div>
  );
};

export default Layout;
