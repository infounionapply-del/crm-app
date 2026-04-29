import React, { useState, useEffect } from 'react';
import { X, Search, Users, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConversations } from '../../hooks/useConversations';
import { useData } from '../../contexts/DataContext';

interface NewChatModalProps {
  onClose: () => void;
  type: 'direct' | 'group';
  onChatCreated?: (id: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, type, onChatCreated }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { createConversation } = useConversations();
  const { users: systemUsers } = useData();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const isGroup = type === 'group';
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (systemUsers && systemUsers.length > 0 && user) {
      setUsers(systemUsers.filter((u: any) => u.id !== user.id));
    } else if (user) {
      const fetchUsers = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, role')
            .neq('id', user.id)
            .order('first_name', { ascending: true });
          if (error) throw error;
          setUsers(data || []);
        } catch (err) {
          console.error('Error fetching users:', err);
        }
      };
      fetchUsers();
    }
  }, [systemUsers, user]);

  const toggleUser = (u: any) => {
    if (selectedUsers.find(su => su.id === u.id)) {
      setSelectedUsers(selectedUsers.filter(su => su.id !== u.id));
    } else {
      if (!isGroup) {
        setSelectedUsers([u]);
      } else {
        setSelectedUsers([...selectedUsers, u]);
      }
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    if (isGroup && !groupName.trim()) {
      alert(t('chat.provide_group_name'));
      return;
    }

    setIsLoading(true);
    try {
      const userIds = selectedUsers.map(u => u.id);
      const data = await createConversation(userIds, isGroup ? 'group' : 'direct', isGroup ? groupName.trim() : undefined);
      if (onChatCreated && data?.id) {
        onChatCreated(data.id);
      }
      onClose();
    } catch (err) {
      console.error('Error creating chat:', err);
      alert(t('chat.create_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b ghost-border flex justify-between items-center bg-surface-container-low/50">
          <h2 className="text-lg font-bold text-on-surface">{isGroup ? t('chat.create_group') : t('chat.new_chat')}</h2>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">

          {/* Group Name Input */}
          {isGroup && (
            <div className="mb-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">{t('chat.group_name')}</label>
              <input
                type="text"
                placeholder={t('chat.enter_group_name')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:bg-surface-container-lowest transition-colors text-sm"
              />
            </div>
          )}

          {/* User Search */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              {isGroup ? t('chat.select_members').replace('{count}', String(selectedUsers.length)) : t('chat.select_contact')}
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input
                type="text"
                placeholder={t('chat.search_users')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:bg-surface-container-lowest transition-colors text-sm"
              />
            </div>

            {/* User List */}
            <div className="border ghost-border rounded-xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-on-surface-variant">{t('chat.no_users_found')}</div>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUsers.some(su => su.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleUser(u)}
                        className={`w-full flex items-center justify-between p-3 border-b ghost-border last:border-b-0 hover:bg-surface-container-low transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface'}`}>
                            {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-on-surface">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : (u.email || 'Unknown User')}</p>
                            <p className="text-xs text-on-surface-variant">{u.role || 'User'}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-on-primary">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t ghost-border bg-surface-container-low/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || (isGroup && (selectedUsers.length < 2 || !groupName.trim())) || isLoading}
            className="px-5 py-2.5 text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <UserPlus size={18} />
            )}
            {isGroup ? t('chat.create_group') : t('chat.start_chat')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
