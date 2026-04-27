import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { 
  Menu,
  Settings,
  Bell,
  LogOut,
  X,
  ChevronRight
} from 'lucide-react';
import { getMobileBottomNav, getMobileMoreNav, SETTINGS_SUBMENUS } from '../../config/navigation';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { profile, signOut } = useAuth();
  const { notifications } = useData();
  const unreadCount = notifications ? notifications.filter((n: any) => !n.isRead).length : 0;
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const role = profile?.role || '';
  const bottomNavItems = getMobileBottomNav(role);
  const moreNavItems = getMobileMoreNav(role, bottomNavItems);
  const settingsSubmenus = SETTINGS_SUBMENUS.filter(item => !item.roles || item.roles.includes(role));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t ghost-border z-40 pb-safe pt-1 px-2 md:hidden flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path.includes('?') && location.pathname + location.search === item.path);
          const Icon = item.icon;
          
          if (item.isCenter) {
            return (
              <div key={item.id} className="relative -top-5 px-2">
                <Link
                  to={item.path}
                  className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform ${isActive ? 'bg-primary text-on-primary scale-105' : 'bg-primary text-on-primary hover:scale-105'}`}
                >
                  <Icon size={24} />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full py-2 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              <Icon size={20} className={isActive ? 'mb-1' : 'mb-1 opacity-70'} />
              <span className="text-[10px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis px-1 text-center w-full">{t(item.label)}</span>
            </Link>
          );
        })}
        
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center w-full py-2 ${isMoreOpen ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <div className="relative">
            <Menu size={20} className={isMoreOpen ? 'mb-1' : 'mb-1 opacity-70'} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full border border-surface-container-lowest"></span>}
          </div>
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>

      {/* "More" Drawer Overlay */}
      {isMoreOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsMoreOpen(false)}
        >
          {/* Drawer Content */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-outline-variant rounded-full opacity-50"></div>
            </div>
            
            <div className="px-6 py-4 border-b ghost-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                  {profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : (profile?.name ? profile.name.charAt(0).toUpperCase() : 'U')}
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface">{profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : (profile?.name || 'User')}</h3>
                  <p className="text-xs text-on-surface-variant">{profile?.role || 'No Role'}</p>
                </div>
              </div>
              <button onClick={() => setIsMoreOpen(false)} className="p-2 bg-surface-container rounded-full text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-2 pb-8">
              
              {/* Dynamic Items Based on Role */}
              {moreNavItems.length > 0 && (
                <div className="mb-6">
                  <h4 className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider">{t('nav.menu')}</h4>
                  <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                    {moreNavItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <Link 
                          key={item.id} 
                          to={item.path} 
                          onClick={() => setIsMoreOpen(false)} 
                          className={`flex items-center justify-between px-4 py-3 ${index !== moreNavItems.length - 1 ? 'border-b ghost-border' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={18} className="text-outline" />
                            <span className="text-sm font-medium text-on-surface">{t(item.label)}</span>
                          </div>
                          <ChevronRight size={16} className="text-outline-variant" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settings Submenus */}
              <div className="mb-6">
                <Link to="/settings" onClick={() => setIsMoreOpen(false)} className="px-4 py-2 flex items-center justify-between group">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider group-hover:text-primary-dark transition-colors">{t('nav.settings')}</h4>
                  <Settings size={14} className="text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                </Link>
                <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                  {settingsSubmenus.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link 
                        key={item.path} 
                        to={item.path} 
                        onClick={() => setIsMoreOpen(false)} 
                        className={`flex items-center justify-between px-4 py-3 ${index !== settingsSubmenus.length - 1 ? 'border-b ghost-border' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className="text-outline" />
                          <span className="text-sm font-medium text-on-surface">{t(item.label)}</span>
                        </div>
                        {item.path.includes('notifications') && unreadCount > 0 ? (
                          <span className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                        ) : (
                          <ChevronRight size={16} className="text-outline-variant" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Logout */}
              <div className="mb-4">
                <button 
                  onClick={async () => {
                    setIsMoreOpen(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 text-error font-medium justify-center bg-error/10 rounded-2xl active:bg-error/20 transition-colors"
                >
                  <LogOut size={20} />
                  <span>{t('nav.sign_out')}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

