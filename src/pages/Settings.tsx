import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { Globe, Bell, Shield, User as UserIcon, Building, Users, FileText, Check, X, Edit2, Plus, Trash2, LayoutTemplate, Bot } from 'lucide-react';
import { PdfBuilder, PdfTemplateLayout } from '../components/pdf-builder';

const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { notify } = useNotification();
  const { users, pdfSettings, companySettings, updateCompanySettings, addUser, updateUser, deleteUser, updateProfile, formatCurrency } = useData();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState('preferences');

  // State for PDF Template Editor
  const [editPdf, setEditPdf] = useState(pdfSettings);

  // State for Users Management
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // State for Visual PDF Builder
  const [showPdfBuilder, setShowPdfBuilder] = useState(false);

  const handleSaveLayout = (layout: PdfTemplateLayout) => {
    const updatedPdfSettings = { ...editPdf, layout };
    setEditPdf(updatedPdfSettings);
    setShowPdfBuilder(false);
    notify.promise(
      updateCompanySettings({ pdf_settings: updatedPdfSettings }),
      { loading: t('settings.saving_template'), success: t('settings.saved_template'), error: t('settings.save_failed') }
    );
  };

  // State for other tabs
  const [editProfile, setEditProfile] = useState({ name: '', email: '' });
  const [editCompany, setEditCompany] = useState({ companyName: '', taxId: '' });
  const [editPrefs, setEditPrefs] = useState({ dateFormat: 'DD/MM/YYYY' });
  const [editSecurity, setEditSecurity] = useState({ password: '', newPassword: '' });
  const [editNotifications, setEditNotifications] = useState({ emailAlerts: true, weeklyReports: true });

  useEffect(() => {
    if (pdfSettings) setEditPdf(pdfSettings);
    if (companySettings?.company_details) {
      setEditCompany({
        companyName: companySettings.company_details.companyName || '',
        taxId: companySettings.company_details.taxId || ''
      });
    }
    if (companySettings?.system_preferences) {
      setEditPrefs({
        dateFormat: companySettings.system_preferences.dateFormat || 'DD/MM/YYYY'
      });
      if (companySettings.system_preferences.notifications) {
        setEditNotifications(companySettings.system_preferences.notifications);
      }
    }
    if (profile) {
      setEditProfile({
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.email || ''
      });
    }
  }, [pdfSettings, companySettings, profile]);

  const handleSavePdf = async () => {
    notify.promise(
      updateCompanySettings({ pdf_settings: editPdf }),
      { loading: t('settings.saving_pdf'), success: t('settings.saved_pdf'), error: t('settings.save_failed') }
    );
  };

  const handleSaveCompany = async () => {
    notify.promise(
      updateCompanySettings({ company_details: editCompany }),
      { loading: t('settings.saving_company'), success: t('settings.saved_company'), error: t('settings.save_failed') }
    );
  };

  const handleSavePrefs = async () => {
    notify.promise(
      updateCompanySettings({ system_preferences: { ...companySettings?.system_preferences, ...editPrefs } }),
      { loading: t('settings.saving_prefs'), success: t('settings.saved_prefs'), error: t('settings.save_failed') }
    );
  };

  const handleSaveNotifications = async () => {
    notify.promise(
      updateCompanySettings({
        system_preferences: {
          ...companySettings?.system_preferences,
          notifications: editNotifications
        }
      }),
      { loading: t('settings.saving_notifications'), success: t('settings.saved_notifications'), error: t('settings.save_failed') }
    );
  };

  const handleSaveProfile = async () => {
    if (profile?.id) {
      const [firstName, ...lastNameArr] = editProfile.name.split(' ');
      notify.promise(
        updateProfile(profile.id, {
          first_name: firstName,
          last_name: lastNameArr.join(' '),
          email: editProfile.email
        }),
        { loading: t('settings.saving_profile'), success: t('settings.saved_profile'), error: t('settings.save_failed') }
      );
    }
  };

  const handleUpdatePassword = async () => {
    if (!editSecurity.newPassword) return;

    const updateTask = async () => {
      // Try Supabase auth first, fall back to profile-only update
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase.auth.updateUser({ password: editSecurity.newPassword });
          if (error) throw error;
        }
      } catch (authError: any) {
        console.warn('Auth update skipped:', authError.message);
      }
      if (profile?.id) {
        await updateProfile(profile.id, { password_hash: editSecurity.newPassword });
      }
    };

    notify.promise(updateTask(), {
      loading: t('settings.updating_password'),
      success: () => {
        setEditSecurity({ password: '', newPassword: '' });
        return t('settings.password_updated');
      },
      error: (e: any) => t('settings.password_failed') + ': ' + e.message
    });
  };

  const handleSaveUser = async () => {
    const saveTask = editingUserId === 'new' ? addUser(editingUser) : updateUser(editingUserId!, editingUser);

    notify.promise(saveTask, {
      loading: t('settings.saving_user'),
      success: () => {
        setEditingUserId(null);
        return t('settings.saved_user');
      },
      error: (e: any) => t('settings.save_user_failed') + ': ' + (e.message || 'Unknown error')
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm(t('user.confirm_delete'))) {
      notify.promise(deleteUser(id), {
        loading: t('settings.deleting_user'),
        success: t('settings.deleted_user'),
        error: t('settings.delete_user_failed')
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-headline font-semibold text-on-surface">{t('settings.user_management')}</h2>
              <button
                onClick={() => { setEditingUserId('new'); setEditingUser({ name: '', email: '', role: 'Sales', team: 'A' }); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />{t('action.add_user')}</button>
            </div>

            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b ghost-border text-xs text-on-surface-variant uppercase tracking-wider">
                    <th className="pb-3 font-semibold">{t('table.name')}</th>
                    <th className="pb-3 font-semibold">{t('table.email')}</th>
                    <th className="pb-3 font-semibold">{t('table.role')}</th>
                    <th className="pb-3 font-semibold">{t('table.team')}</th>
                    <th className="pb-3 font-semibold text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ghost-border">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 text-sm text-on-surface font-medium">{u.name}</td>
                      <td className="py-3 text-sm text-on-surface-variant">{u.email}</td>
                      <td className="py-3 text-sm"><span className="inline-flex px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] uppercase font-bold text-on-surface-variant">{u.role}</span></td>
                      <td className="py-3 text-sm text-on-surface-variant">{u.team}</td>
                      <td className="py-3 text-right flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingUserId(u.id); setEditingUser(u); }} className="p-1.5 text-outline hover:text-primary transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-outline hover:text-error transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4 mt-4">
              {users.map((u: any) => (
                <div key={u.id} className="bg-surface-container-low border ghost-border rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg uppercase">
                        {u.name.substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface">{u.name}</div>
                        <div className="text-xs text-on-surface-variant">{u.email}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t ghost-border">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] uppercase font-bold text-on-surface-variant">
                        {u.role}
                      </span>
                      {u.team && (
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-surface-container text-[10px] uppercase font-bold text-on-surface-variant border ghost-border">
                          {t('user.team_label')} {u.team}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingUserId(u.id); setEditingUser(u); }} className="p-2 text-outline hover:bg-surface-container rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingUserId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow border ghost-border overflow-hidden">
                  <div className="p-4 border-b ghost-border flex items-center justify-between">
                    <h3 className="font-headline font-semibold text-lg text-on-surface">{editingUserId === 'new' ? t('user.new_user') : t('user.edit_user')}</h3>
                    <button onClick={() => setEditingUserId(null)} className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg"><X size={20} /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div><label className="block text-sm mb-1">{t('table.name')}</label><input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="w-full px-3 py-2 border ghost-border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">{t('table.email')}</label><input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full px-3 py-2 border ghost-border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">{t('user.password')} {editingUserId !== 'new' && <span className="text-on-surface-variant text-xs font-normal">{t('user.password_keep_blank')}</span>}</label><input type="password" value={editingUser.password || ''} placeholder={editingUserId !== 'new' ? '••••••••' : t('user.enter_password')} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} className="w-full px-3 py-2 border ghost-border rounded-lg" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">{t('table.role')}</label>
                        <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full px-3 py-2 border ghost-border rounded-lg">
                          <option value="Administrator">{t('user.role_administrator')}</option>
                          <option value="Manager">{t('user.role_manager')}</option>
                          <option value="Sales">{t('user.role_sales')}</option>
                          <option value="Lead">{t('user.role_lead')}</option>
                          <option value="Support">{t('user.role_support')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{t('table.team')}</label>
                        <input type="text" value={editingUser.team} onChange={e => setEditingUser({ ...editingUser, team: e.target.value })} className="w-full px-3 py-2 border ghost-border rounded-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t ghost-border flex justify-end gap-3">
                    <button onClick={() => setEditingUserId(null)} className="px-4 py-2 text-sm font-medium hover:bg-surface-container rounded-lg">{t('common.cancel')}</button>
                    <button onClick={handleSaveUser} className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white rounded-lg shadow-sm hover:from-[#7c3aed] hover:to-[#c026d3]">{t('common.save')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'pdf_template':
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-headline font-semibold text-on-surface">{t('settings.pdf_quote_template')}</h2>
                <p className="text-sm text-on-surface-variant max-w-lg mt-1">{t('settings.pdf_desc')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Configuration Form */}
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
                  <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><LayoutTemplate size={18} />{t('settings.visual_builder')}</h3>
                  <p className="text-sm text-on-surface-variant mb-4">{t('settings.visual_desc')}</p>
                  <button
                    onClick={() => setShowPdfBuilder(true)}
                    className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                  >{t('action.launch_builder')}</button>
                </div>

                <h3 className="font-semibold text-on-surface border-b ghost-border pb-2">Global Variables</h3>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Company Logo URL / Data URI</label>
                  <input type="text" value={editPdf.logoUrl} onChange={e => setEditPdf({ ...editPdf, logoUrl: e.target.value })} className="w-full px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm" placeholder="https://" />
                  <div className="mt-2 text-xs text-on-surface-variant">Recommended size: 200x80px</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.company_name')}</label>
                  <input type="text" value={editPdf.companyName} onChange={e => setEditPdf({ ...editPdf, companyName: e.target.value })} className="w-full px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Company Address</label>
                  <textarea rows={2} value={editPdf.companyAddress} onChange={e => setEditPdf({ ...editPdf, companyAddress: e.target.value })} className="w-full px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Tax ID / เลขประจำตัวผู้เสียภาษี</label>
                    <input type="text" value={editPdf.taxId} onChange={e => setEditPdf({ ...editPdf, taxId: e.target.value })} className="w-full px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">VAT % (Standard Thai = 7)</label>
                    <input type="number" value={editPdf.vatRate} onChange={e => setEditPdf({ ...editPdf, vatRate: Number(e.target.value) })} className="w-full px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Primary Theme Color</label>
                  <div className="flex gap-3">
                    <input type="color" value={editPdf.primaryColor} onChange={e => setEditPdf({ ...editPdf, primaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                    <input type="text" value={editPdf.primaryColor} onChange={e => setEditPdf({ ...editPdf, primaryColor: e.target.value })} className="flex-1 px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm uppercase font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Terms / Footer Notes</label>
                  <textarea rows={4} value={editPdf.footerNotes} onChange={e => setEditPdf({ ...editPdf, footerNotes: e.target.value })} className="w-full px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary text-sm" />
                </div>

                <div className="pt-4 flex justify-end">
                  <button onClick={handleSavePdf} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm">
                    {t('settings.save_template')}
                  </button>
                </div>
              </div>

              {/* Right Preview */}
              <div className="bg-surface-container/30 border ghost-border rounded-xl p-4 flex justify-center items-start overflow-hidden">
                {/* Mock A4 Paper View */}
                <div className="bg-white shadow-xl w-full max-w-sm aspect-[1/1.414] scale-90 md:scale-100 origin-top p-6 flex flex-col pointer-events-none" style={{ '--pf': editPdf.primaryColor } as any}>
                  <div className="flex justify-between items-start mb-6 border-b pb-4" style={{ borderColor: 'var(--pf)' }}>
                    <div>
                      {editPdf.logoUrl ? <img src={editPdf.logoUrl} alt="Logo" className="h-8 object-contain mb-2" /> : <div className="h-8 w-24 bg-gray-200 mb-2" />}
                      <div className="text-[8px] font-bold text-gray-800">{editPdf.companyName}</div>
                      <div className="text-[6px] text-gray-500 whitespace-pre-wrap leading-tight mt-1">{editPdf.companyAddress}</div>
                      <div className="text-[6px] text-gray-500 mt-0.5">Tax ID: {editPdf.taxId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: 'var(--pf)' }}>QUOTATION<br /><span className="text-[10px]">ใบเสนอราคา</span></div>
                      <div className="text-[8px] text-gray-600 mt-1">QT-240001</div>
                    </div>
                  </div>

                  <div className="mx-auto w-full h-8 border-b border-gray-100 flex items-center justify-between text-[7px] text-gray-400 mb-2 font-bold"><span>Description / รายการ</span><span>Total / ยอดรวม</span></div>
                  <div className="mx-auto w-full h-8 border-b border-gray-100 flex items-center justify-between text-[7px] text-gray-400 mb-2"><span>Item 1...</span><span>฿1,000.00</span></div>
                  <div className="mx-auto w-full h-8 border-b border-gray-100 flex items-center justify-between text-[7px] text-gray-400 mb-2"><span>Item 2...</span><span>฿500.00</span></div>

                  <div className="mt-auto ml-auto w-1/2 border-t pt-2 border-gray-200">
                    <div className="flex justify-between text-[8px] text-gray-600 mb-1"><span>Subtotal / ยอดรวม</span><span>฿1,500.00</span></div>
                    <div className="flex justify-between text-[8px] text-gray-600 mb-1"><span>Discount / ส่วนลด</span><span>-฿100.00</span></div>
                    <div className="flex justify-between text-[8px] text-gray-600 mb-1"><span>VAT / ภาษีมูลค่าเพิ่ม ({editPdf.vatRate || 7}%)</span><span>฿{(1400 * (editPdf.vatRate || 7) / 100).toFixed(2)}</span></div>
                    <div className="flex justify-between text-[10px] font-bold mt-2 pt-1 border-t" style={{ color: 'var(--pf)', borderColor: 'var(--pf)' }}>
                      <span>Total / ยอดสุทธิ</span><span>฿{(1400 * (1 + (editPdf.vatRate || 7) / 100)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 text-[6px] text-gray-500 whitespace-pre-wrap leading-tight">
                    {editPdf.footerNotes}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-headline font-semibold text-on-surface mb-4">{t('settings.profile_settings')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.full_name')}</label>
                <input type="text" value={editProfile.name} onChange={e => setEditProfile({ ...editProfile, name: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.email_address')}</label>
                <input type="email" value={editProfile.email} onChange={e => setEditProfile({ ...editProfile, email: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" placeholder="john@example.com" />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t ghost-border flex justify-end">
              <button onClick={handleSaveProfile} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm">{t('settings.save_profile')}</button>
            </div>
          </div>
        );
      case 'company':
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-headline font-semibold text-on-surface mb-4">{t('settings.company_details')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.company_name')}</label>
                <input type="text" value={editCompany.companyName} onChange={e => setEditCompany({ ...editCompany, companyName: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" placeholder="Acme Inc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.tax_id')}</label>
                <input type="text" value={editCompany.taxId} onChange={e => setEditCompany({ ...editCompany, taxId: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" placeholder="1234567890" />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t ghost-border flex justify-end">
              <button onClick={handleSaveCompany} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm">{t('settings.save_details')}</button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-headline font-semibold text-on-surface mb-4">{t('settings.notifications')}</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border ghost-border rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={editNotifications.emailAlerts}
                  onChange={(e) => setEditNotifications({ ...editNotifications, emailAlerts: e.target.checked })}
                  className="w-4 h-4 text-primary focus:ring-primary rounded border-outline"
                />
                <span className="text-sm text-on-surface">{t('settings.email_alerts')}</span>
              </label>
              <label className="flex items-center gap-3 p-3 border ghost-border rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={editNotifications.weeklyReports}
                  onChange={(e) => setEditNotifications({ ...editNotifications, weeklyReports: e.target.checked })}
                  className="w-4 h-4 text-primary focus:ring-primary rounded border-outline"
                />
                <span className="text-sm text-on-surface">{t('settings.weekly_reports')}</span>
              </label>
            </div>
            <div className="mt-6 pt-6 border-t ghost-border flex justify-end">
              <button onClick={handleSaveNotifications} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm">{t('settings.save_notifications')}</button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-headline font-semibold text-on-surface mb-4">{t('settings.security')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.current_password')}</label>
                <input type="password" value={editSecurity.password} onChange={e => setEditSecurity({ ...editSecurity, password: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.new_password')}</label>
                <input type="password" value={editSecurity.newPassword} onChange={e => setEditSecurity({ ...editSecurity, newPassword: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" placeholder="••••••••" />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t ghost-border flex justify-end">
              <button onClick={handleUpdatePassword} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm">{t('settings.update_password')}</button>
            </div>
          </div>
        );
      case 'preferences':
      default:
        return (
          <div className="bg-surface-container-lowest border ghost-border rounded-2xl p-6 editorial-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-headline font-semibold text-on-surface mb-4">{t('settings.lang_region')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.sys_lang')}</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${language === 'en' ? 'border-primary bg-primary/5' : 'ghost-border hover:bg-surface-container'}`}>
                    <input
                      type="radio"
                      name="language"
                      value="en"
                      checked={language === 'en'}
                      onChange={() => setLanguage('en')}
                      className="w-4 h-4 text-primary focus:ring-primary border-outline"
                    />
                    <div>
                      <div className="font-medium text-on-surface">English</div>
                      <div className="text-xs text-on-surface-variant">United States</div>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${language === 'th' ? 'border-primary bg-primary/5' : 'ghost-border hover:bg-surface-container'}`}>
                    <input
                      type="radio"
                      name="language"
                      value="th"
                      checked={language === 'th'}
                      onChange={() => setLanguage('th')}
                      className="w-4 h-4 text-primary focus:ring-primary border-outline"
                    />
                    <div>
                      <div className="font-medium text-on-surface">ภาษาไทย</div>
                      <div className="text-xs text-on-surface-variant">Thailand</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{t('settings.date_format')}</label>
                <select value={editPrefs.dateFormat} onChange={e => setEditPrefs({ ...editPrefs, dateFormat: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm">
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 24/10/2024)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 10/24/2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2024-10-24)</option>
                </select>
              </div>

            </div>

            <div className="mt-6 pt-6 border-t ghost-border flex justify-end">
              <button onClick={handleSavePrefs} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm">{t('common.save_changes')}</button>
            </div>
          </div>
        );
    }
  };

  const getTabClass = (tabId: string) => {
    const isActive = activeTab === tabId;
    return `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${isActive
      ? 'bg-primary-container text-on-primary-container font-medium'
      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
      }`;
  };

  const getIconClass = (tabId: string) => {
    return activeTab === tabId ? 'text-primary' : 'text-outline';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('nav.settings')}</h1>
        <p className="text-sm text-on-surface-variant mt-1">{t('settings.pref_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="space-y-1">
          <button onClick={() => setActiveTab('preferences')} className={getTabClass('preferences')}>
            <Globe size={20} className={getIconClass('preferences')} />
            <span>{t('settings.preferences')}</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={getTabClass('profile')}>
            <UserIcon size={20} className={getIconClass('profile')} />
            <span>{t('settings.profile')}</span>
          </button>

          {['Administrator', 'Manager', 'Admin', 'Super Admin', 'admin', 'manager', 'administrator', 'super admin'].includes(profile?.role) && (
            <>
              <button onClick={() => setActiveTab('users')} className={getTabClass('users')}>
                <Users size={20} className={getIconClass('users')} />
                <span>{t('settings.user_management')}</span>
              </button>
              <button onClick={() => setActiveTab('pdf_template')} className={getTabClass('pdf_template')}>
                <FileText size={20} className={getIconClass('pdf_template')} />
                <span>{t('settings.pdf_templates')}</span>
              </button>
              <button onClick={() => setActiveTab('company')} className={getTabClass('company')}>
                <Building size={20} className={getIconClass('company')} />
                <span>{t('settings.company_details')}</span>
              </button>
              <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
                <Bell size={20} className={getIconClass('notifications')} />
                <span>{t('settings.notifications')}</span>
              </button>
              <Link to="/settings/ai" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
                <Bot size={20} className="text-outline" />
                <span>AI Settings</span>
              </Link>
            </>
          )}

          <button onClick={() => setActiveTab('security')} className={getTabClass('security')}>
            <Shield size={20} className={getIconClass('security')} />
            <span>{t('settings.security')}</span>
          </button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-2 space-y-6">
          {renderContent()}
        </div>
      </div>
      {showPdfBuilder && (
        <PdfBuilder
          initialLayout={editPdf.layout || undefined}
          onSave={handleSaveLayout}
          onClose={() => setShowPdfBuilder(false)}
        />
      )}
    </div>
  );
};

export default Settings;
