import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useT } from '../contexts/LanguageContext';
import { Bot, Plus, Edit2, Trash2, ShieldAlert, Check, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AIProvider {
  id: string;
  name: string;
  api_key_masked: string;
  priority: number;
  is_active: boolean;
  usage_count: number;
  monthly_quota: number | null;
  last_used_at: string | null;
}

const SettingsAI: React.FC = () => {
  const t = useT();
  const { profile } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProvider> | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    // Temporary bypass for debugging
  }, [profile, navigate, notify]);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_masked_ai_providers');
      if (error) throw error;
      setProviders(data || []);
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || 'Failed to fetch AI providers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSave = async () => {
    if (!editingProvider?.name || !editingProvider?.priority) {
      notify.error(t('settings.name_priority_required') || 'Name and priority are required.');
      return;
    }

    try {
      const { error } = await supabase.rpc('upsert_ai_provider', {
        p_id: editingProvider.id || null,
        p_name: editingProvider.name,
        p_api_key: apiKeyInput || null,
        p_priority: parseInt(editingProvider.priority as any),
        p_is_active: editingProvider.is_active ?? true,
        p_monthly_quota: editingProvider.monthly_quota ? parseInt(editingProvider.monthly_quota as any) : null
      });

      if (error) throw error;
      
      notify.success(editingProvider.id ? t('settings.saved_provider') : t('settings.saved_provider'));
      setIsModalOpen(false);
      fetchProviders();
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || t('settings.save_failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('settings.confirm_delete_provider'))) return;
    try {
      const { error } = await supabase.rpc('delete_ai_provider', { p_id: id });
      if (error) throw error;
      notify.success(t('settings.deleted_provider') || 'Provider deleted');
      fetchProviders();
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || t('settings.delete_failed'));
    }
  };

  const handleToggleActive = async (provider: AIProvider) => {
    try {
      const { error } = await supabase.rpc('upsert_ai_provider', {
        p_id: provider.id,
        p_name: provider.name,
        p_api_key: null,
        p_priority: provider.priority,
        p_is_active: !provider.is_active,
        p_monthly_quota: provider.monthly_quota
      });
      if (error) throw error;
      notify.success(provider.is_active ? 'Provider disabled' : 'Provider enabled');
      fetchProviders();
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || 'Failed to toggle status');
    }
  };

  const openNewModal = () => {
    if (providers.length >= 3) {
      notify.error('Maximum of 3 AI providers allowed.');
      return;
    }
    setEditingProvider({ name: '', priority: providers.length + 1, is_active: true, monthly_quota: null });
    setApiKeyInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (provider: AIProvider) => {
    setEditingProvider({ ...provider });
    setApiKeyInput(''); // keep empty to preserve existing
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight flex items-center gap-2">
          <Bot className="text-primary" /> {t('settings.ai_management')}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">{t('settings.ai_desc')}</p>
      </div>

      <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-headline font-semibold text-on-surface">{t('settings.api_providers')}</h2>
          <button
            onClick={openNewModal}
            disabled={providers.length >= 3}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> {t('settings.add_provider')}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-primary" /></div>
        ) : providers.length === 0 ? (
          <div className="text-center p-10 border-2 border-dashed ghost-border rounded-xl text-on-surface-variant">
            <ShieldAlert size={32} className="mx-auto mb-3 opacity-50" />
            <p>{t('settings.no_providers')}</p>
            <p className="text-xs mt-1">{t('settings.add_provider_desc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b ghost-border text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="pb-3 font-semibold pl-2">{t('table.priority')}</th>
                  <th className="pb-3 font-semibold">{t('table.provider_name')}</th>
                  <th className="pb-3 font-semibold">{t('table.api_key')}</th>
                  <th className="pb-3 font-semibold text-center">{t('table.usage_quota')}</th>
                  <th className="pb-3 font-semibold text-center">{t('table.status')}</th>
                  <th className="pb-3 font-semibold text-right pr-2">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y ghost-border">
                {providers.map((p) => {
                  const isQuotaExceeded = p.monthly_quota !== null && p.usage_count >= p.monthly_quota;
                  
                  return (
                    <tr key={p.id} className={`transition-colors ${p.is_active ? 'hover:bg-surface-container/50' : 'bg-surface-container/20 opacity-70'}`}>
                      <td className="py-4 pl-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {p.priority}
                        </span>
                      </td>
                      <td className="py-4 text-sm font-medium text-on-surface">{p.name}</td>
                      <td className="py-4 text-sm font-mono text-on-surface-variant bg-surface-container-low px-2 rounded w-max inline-block mt-2">{p.api_key_masked}</td>
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold ${isQuotaExceeded ? 'text-error' : 'text-on-surface'}`}>
                            {p.usage_count}
                          </span>
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                            / {p.monthly_quota ? p.monthly_quota : '∞'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <button 
                          onClick={() => handleToggleActive(p)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.is_active ? 'bg-primary' : 'bg-surface-variant'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${p.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="py-4 text-right pr-2 flex justify-end gap-2">
                        <button onClick={() => openEditModal(p)} className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow border ghost-border overflow-hidden">
            <div className="p-4 border-b ghost-border flex items-center justify-between">
              <h3 className="font-headline font-semibold text-lg text-on-surface">
                {editingProvider.id ? t('settings.edit_provider') : t('settings.add_provider')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">{t('settings.provider_name')}</label>
                <input 
                  type="text" 
                  value={editingProvider.name} 
                  onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value.toLowerCase() })} 
                  className="w-full px-3 py-2 border ghost-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" 
                  placeholder="e.g. openai, anthropic, gemini"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  API Key
                  {editingProvider.id && <span className="text-xs text-on-surface-variant font-normal ml-2">(Leave blank to keep existing)</span>}
                </label>
                <input 
                  type="password" 
                  value={apiKeyInput} 
                  onChange={e => setApiKeyInput(e.target.value)} 
                  className="w-full px-3 py-2 border ghost-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-mono" 
                  placeholder={editingProvider.id ? "••••••••••••••••" : "sk-..."}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">{t('settings.priority_label')}</label>
                  <select 
                    value={editingProvider.priority} 
                    onChange={e => setEditingProvider({ ...editingProvider, priority: parseInt(e.target.value) })} 
                    className="w-full px-3 py-2 border ghost-border rounded-lg focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value={1}>1 - {t('status.primary') || 'Primary'}</option>
                    <option value={2}>2 - {t('status.secondary') || 'Secondary'}</option>
                    <option value={3}>3 - {t('status.tertiary') || 'Tertiary'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">{t('settings.monthly_quota')}</label>
                  <input 
                    type="number" 
                    value={editingProvider.monthly_quota || ''} 
                    onChange={e => setEditingProvider({ ...editingProvider, monthly_quota: e.target.value ? parseInt(e.target.value) : null })} 
                    className="w-full px-3 py-2 border ghost-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" 
                    placeholder={t('settings.unlimited')}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingProvider.is_active} 
                    onChange={e => setEditingProvider({ ...editingProvider, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary focus:ring-primary rounded border-outline"
                  />
                  <span className="text-sm font-medium text-on-surface">{t('settings.active_provider')}</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t ghost-border flex justify-end gap-3 bg-surface/50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-on-surface">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg shadow-sm hover:shadow-md transition-all">
                {t('settings.save_provider')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsAI;
