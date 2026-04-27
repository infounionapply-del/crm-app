import React, { useState, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { Search, Plus, Filter, MoreVertical, Edit2, Trash2, Tag, Clock, CheckCircle, XCircle } from 'lucide-react';

// Removed mock price list

const CATEGORIES = ['Software', 'Service', 'Support', 'Hardware'];

const PriceList: React.FC = () => {
  const { t } = useLanguage();
  const { notify } = useNotification();
  const { products, addProduct, updateProduct , formatCurrency } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return products.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const handleOpenModal = (item: any = null) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        sku: '',
        name: '',
        category: 'Software',
        currentPrice: 0,
        status: 'Draft',
        effectiveDate: '-',
        history: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (editingItem) {
      const isNew = !editingItem.id;
      const today = new Date().toISOString().split('T')[0];
      
      let updatedItem = { ...editingItem };
      
      try {
        if (isNew) {
          updatedItem.history = [{
            version: 1,
            price: updatedItem.currentPrice,
            date: today,
            status: 'Draft',
            approvedBy: null
          }];
          await addProduct(updatedItem);
        } else {
          const originalItem = products.find(i => i.id === editingItem.id);
          if (originalItem && originalItem.currentPrice !== editingItem.currentPrice) {
            // Price changed, create new pending version
            const newVersion = originalItem.history.length + 1;
            updatedItem.status = 'Pending Approval';
            updatedItem.history = [
              {
                version: newVersion,
                price: updatedItem.currentPrice,
                date: today,
                status: 'Pending Approval',
                approvedBy: null
              },
              ...originalItem.history
            ];
          }
          await updateProduct(editingItem.id, updatedItem);
        }
        notify.success('Product saved successfully');
      } catch (error: any) {
        notify.error('Failed to save product: ' + (error.message || 'Unknown error'));
        return;
      }
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleApprove = async (id: string) => {
    const item = products.find(i => i.id === id);
    if (item && item.status === 'Pending Approval') {
      const today = new Date().toISOString().split('T')[0];
      const updatedHistory = item.history.map((h: any) => {
        if (h.status === 'Pending Approval') return { ...h, status: 'Active', approvedBy: 'Manager' };
        if (h.status === 'Active') return { ...h, status: 'Expired' };
        return h;
      });
      await notify.promise(
        updateProduct(id, { ...item, status: 'Active', effectiveDate: today, history: updatedHistory }),
        {
          loading: 'Approving product...',
          success: 'Product approved successfully',
          error: 'Failed to approve product'
        }
      );
    }
  };

  const handleReject = async (id: string) => {
    const item = products.find(i => i.id === id);
    if (item && item.status === 'Pending Approval') {
      const updatedHistory = item.history.map((h: any) => {
        if (h.status === 'Pending Approval') return { ...h, status: 'Rejected', approvedBy: 'Manager' };
        return h;
      });
      // Revert currentPrice to the last active price
      const lastActive = updatedHistory.find((h: any) => h.status === 'Active');
      const revertedPrice = lastActive ? lastActive.price : 0;
      const revertedStatus = lastActive ? 'Active' : 'Draft';
      await notify.promise(
        updateProduct(id, { ...item, currentPrice: revertedPrice, status: revertedStatus, history: updatedHistory }),
        {
          loading: 'Rejecting product...',
          success: 'Product rejected',
          error: 'Failed to reject product'
        }
      );
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const item = products.find(i => i.id === id);
    if (item) {
      let updatedHistory = [...item.history];
      
      // If changing to Active, we need to handle the history
      if (newStatus === 'Active') {
        updatedHistory = updatedHistory.map(h => {
          if (h.status === 'Pending Approval') return { ...h, status: 'Active', approvedBy: 'Manager' };
          if (h.status === 'Active') return { ...h, status: 'Expired' };
          return h;
        });
      } else if (newStatus === 'Expired') {
        updatedHistory = updatedHistory.map(h => {
          if (h.status === 'Active') return { ...h, status: 'Expired' };
          return h;
        });
      }
      await notify.promise(
        updateProduct(id, { ...item, status: newStatus, history: updatedHistory }),
        {
          loading: 'Updating status...',
          success: 'Status updated successfully',
          error: 'Failed to update status'
        }
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending Approval': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Expired': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'Draft': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('nav.price_list')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('price_list.subtitle')}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white rounded-xl hover:from-[#7c3aed] hover:to-[#c026d3] transition-colors font-medium shadow-sm"
        >
          <Plus size={20} />
          <span>{t('action.add_item')}</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder={t('price_list.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="All">{t('price_list.all_statuses')}</option>
            <option value="Active">Active</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Draft">Draft</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Price List Table */}
      <div className="bg-surface-container-lowest border ghost-border rounded-2xl overflow-hidden editorial-shadow">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b ghost-border">
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.item_details')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.category')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.price')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.status')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.effective_date')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y ghost-border">
              {filteredItems.map((item) => (
                <tr key={item.id} onClick={() => setViewingHistory(item)} className="hover:bg-surface-container-lowest/50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
                        <Tag size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface">{item.name}</div>
                        <div className="text-xs text-on-surface-variant">{item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface">{item.category}</td>
                  <td className="px-6 py-4 text-sm font-medium text-on-surface">{formatCurrency(item.currentPrice)}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={item.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer ${getStatusColor(item.status)}`}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Draft">Draft</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{item.effectiveDate}</td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      {item.status === 'Pending Approval' && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('action.approve')}>
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleReject(item.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('action.reject')}>
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setViewingHistory(item); }}
                        className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                        title={t('action.view_history')}
                      >
                        <Clock size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                        className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                        title={t('action.edit')}
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    No items found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col p-4 gap-4 bg-surface">
          {filteredItems.map((item) => (
            <div key={item.id} onClick={() => setViewingHistory(item)} className="bg-surface-container-lowest border ghost-border rounded-2xl p-4 editorial-shadow flex flex-col gap-3 active:scale-[0.99] transition-transform cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
                    <Tag size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-on-surface leading-tight">{item.name}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{item.sku}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="text-sm text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">{item.category}</div>
                <div className="text-lg font-bold text-on-surface">{formatCurrency(item.currentPrice)}</div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-3 border-t ghost-border">
                <select 
                  value={item.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer ${getStatusColor(item.status)}`}
                >
                  <option value="Active">Active</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Draft">Draft</option>
                  <option value="Expired">Expired</option>
                </select>

                <div className="flex items-center gap-1">
                  {item.status === 'Pending Approval' && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }} className="p-2 text-green-600 bg-green-50 rounded-lg transition-colors" title={t('action.approve')}>
                        <CheckCircle size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleReject(item.id); }} className="p-2 text-red-600 bg-red-50 rounded-lg transition-colors" title={t('action.reject')}>
                        <XCircle size={18} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingHistory(item); }}
                    className="p-2 text-outline hover:bg-surface-container rounded-lg transition-colors"
                  >
                    <Clock size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                    className="p-2 text-outline hover:bg-surface-container rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              No items found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b ghost-border">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                {editingItem.id ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-outline hover:text-on-surface">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">SKU</label>
                <input 
                  type="text" 
                  value={editingItem.sku}
                  onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  placeholder="e.g., ENT-LIC-1Y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  placeholder="e.g., Enterprise License"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">{t('table.category')}</label>
                  <select 
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Price (THB)</label>
                  <input 
                    type="number" 
                    value={editingItem.currentPrice}
                    onChange={(e) => setEditingItem({...editingItem, currentPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>
              {editingItem.id && (
                <div className="p-3 bg-orange-50 text-orange-800 rounded-xl text-xs flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 flex-shrink-0" />
                  <p>Changing the price will create a new version requiring approval before it becomes active.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t ghost-border flex justify-end gap-3 bg-surface-container-low/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveItem}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white rounded-xl hover:from-[#7c3aed] hover:to-[#c026d3] transition-colors shadow-sm"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl editorial-shadow overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border flex-shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface flex items-center gap-2">
                <Clock size={24} className="text-primary" />
                Price History: {viewingHistory.name}
              </h2>
              <button onClick={() => setViewingHistory(null)} className="text-outline hover:text-on-surface">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-container-high before:to-transparent">
                {viewingHistory.history.map((record: any, index: number) => (
                  <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface-container-lowest bg-surface-container-high text-on-surface-variant shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <span className="text-xs font-bold">v{record.version}</span>
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border ghost-border bg-surface-container-lowest editorial-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold text-on-surface">{formatCurrency(record.price)}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant flex items-center justify-between">
                        <span>{record.date}</span>
                        {record.approvedBy && <span>By: {record.approvedBy}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceList;
