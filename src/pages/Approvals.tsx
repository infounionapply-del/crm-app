import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, CheckCircle, XCircle, Clock, FileText, MessageSquare } from 'lucide-react';

const Approvals: React.FC = () => {
  const { t } = useLanguage();
  const { notify } = useNotification();
  const { profile } = useAuth();
  const isManagerOrAdmin = ['Manager', 'Admin', 'Super Admin', 'Administrator'].includes(profile?.role);
  const { approvals, quotations, products, updateApprovalStatus, formatCurrency } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Pending');
  const [viewingApproval, setViewingApproval] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-orange-500';
      case 'Approved': return 'bg-green-500';
      case 'Rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredApprovals = approvals.filter(app => {
    const matchesTab = app.status === activeTab;
    const matchesSearch = 
      app.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.requester.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleApprove = async (id: string) => {
    try {
      await notify.promise(
        updateApprovalStatus(id, 'Approved'),
        {
          loading: 'Approving...',
          success: 'Approved successfully',
          error: 'Failed to approve'
        }
      );
      setViewingApproval(null);
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = (id: string) => {
    setRejectModal({ id });
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await notify.promise(
        updateApprovalStatus(rejectModal.id, 'Rejected', rejectReason),
        {
          loading: 'Rejecting...',
          success: 'Rejected successfully',
          error: 'Failed to reject'
        }
      );
      setRejectModal(null);
      setRejectReason('');
      setViewingApproval(null);
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('nav.approvals')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('approval.subtitle')}</p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-surface-container-lowest border ghost-border rounded-xl p-1">
          {['Pending', 'Approved', 'Rejected'].map(tab => (
            <button 
              key={t('approval.' + tab.toLowerCase())}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center ${
                activeTab === tab 
                  ? 'bg-primary-container text-on-primary-container' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {t('approval.' + tab.toLowerCase())}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab 
                  ? 'bg-on-primary-container/10 text-on-primary-container' 
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : rejectedCount}
              </span>
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input 
              type="text" 
              placeholder={t('common.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-3 py-2 bg-surface-container-lowest border ghost-border rounded-xl text-on-surface hover:bg-surface-container transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.map((approval) => (
          <div key={approval.id} className="bg-surface-container-lowest border ghost-border rounded-2xl p-5 editorial-shadow hover:border-primary/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-start gap-4 flex-1 cursor-pointer" onClick={() => setViewingApproval(approval)}>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 mt-1">
                  {approval.type === 'Quotation' ? <FileText size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-on-surface">{approval.type} Request</span>
                    <span className="text-sm text-on-surface-variant">• {(() => {
                      const qt = quotations.find((q: any) => q.id === approval.reference);
                      return qt?.quotation_number || approval.reference;
                    })()}</span>
                  </div>
                  <div className="text-sm text-on-surface mb-2">
                    <span className="font-medium">{approval.requester}</span>{t('approval.requested_for')}<span className="font-medium">{approval.customer}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1"><Clock size={14} /> {approval.date}</span>
                    <span className="font-medium text-on-surface bg-surface-container px-2 py-0.5 rounded-md">{approval.amount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 md:pl-4 md:border-l ghost-border">
                {approval.status === 'Pending' ? (
                  <>
                    {isManagerOrAdmin && (
                      <>
                        <button onClick={() => handleReject(approval.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-error hover:bg-error-container transition-colors">
                          <XCircle size={18} />{t('action.reject')}</button>
                        <button onClick={() => handleApprove(approval.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] transition-colors shadow-sm">
                          <CheckCircle size={18} />{t('action.approve')}</button>
                      </>
                    )}
                    {!isManagerOrAdmin && (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(approval.status)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${getStatusDot(approval.status)}`}></span>
                        {approval.status}
                      </span>
                    )}
                  </>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(approval.status)}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${getStatusDot(approval.status)}`}></span>
                    {approval.status}
                  </span>
                )}
                <button className="p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors" title={t('action.add_comment')}>
                  <MessageSquare size={20} />
                </button>
              </div>

            </div>
          </div>
        ))}
        
        {filteredApprovals.length === 0 && (
          <div className="text-center py-12 bg-surface-container-lowest border ghost-border rounded-2xl">
            <div className="w-16 h-16 mx-auto bg-surface-container rounded-full flex items-center justify-center text-outline mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-1">{t('approval.all_caught_up')}</h3>
            <p className="text-on-surface-variant">There are no {activeTab.toLowerCase()} approvals matching your criteria.</p>
          </div>
        )}
      </div>

      {/* View Approval Modal */}
      {viewingApproval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border flex-shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface flex items-center gap-2">
                {viewingApproval.type === 'Quotation' ? <FileText size={24} className="text-primary" /> : <Clock size={24} className="text-primary" />}
                Approval Details
              </h2>
              <button onClick={() => setViewingApproval(null)} className="text-outline hover:text-on-surface">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-on-surface-variant mb-1">Reference</span>
                  <span className="font-medium text-on-surface">
                    {(() => {
                      const qt = quotations.find((q: any) => q.id === viewingApproval.reference);
                      return qt?.quotation_number || viewingApproval.reference;
                    })()}
                  </span>
                </div>
                <div>
                  <span className="block text-on-surface-variant mb-1">Customer</span>
                  <span className="font-medium text-on-surface">{viewingApproval.customer}</span>
                </div>
                <div>
                  <span className="block text-on-surface-variant mb-1">Requester</span>
                  <span className="font-medium text-on-surface">{viewingApproval.requester}</span>
                </div>
                <div>
                  <span className="block text-on-surface-variant mb-1">Date</span>
                  <span className="font-medium text-on-surface">{viewingApproval.date}</span>
                </div>
                <div>
                  <span className="block text-on-surface-variant mb-1">Amount / Value</span>
                  <span className="font-medium text-on-surface">{viewingApproval.amount}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t ghost-border">
                <span className="block text-sm font-medium text-on-surface-variant mb-2">Details / Justification</span>
                <p className="text-sm text-on-surface bg-surface-container-low p-4 rounded-xl border ghost-border whitespace-pre-wrap">
                  {(() => {
                    try {
                      const details = typeof viewingApproval.details === 'string' && viewingApproval.details.startsWith('{')
                        ? JSON.parse(viewingApproval.details)
                        : viewingApproval.details;
                      
                      if (typeof details === 'object' && details !== null) {
                        const qt = quotations.find((q: any) => q.id === details.quotation_id);
                        const qtNo = qt?.quotation_number || details.quotation_id || '-';
                        return `Quotation No: ${qtNo}\nPO: ${details.po_number || '-'}\nSO: ${details.so_number || '-'}`;
                      }
                      return details || '-';
                    } catch (e) {
                      return viewingApproval.details || '-';
                    }
                  })()}
                </p>
              </div>

              {/* Quotation Detailed Items (Read-only) */}
              {viewingApproval.type === 'Quotation' && (() => {
                const qt = quotations.find((q: any) => q.id === viewingApproval.reference);
                if (qt && qt.details && qt.details.items) {
                  return (
                    <div className="pt-4 border-t ghost-border">
                      <span className="block text-sm font-medium text-on-surface-variant mb-2">Quotation Items</span>
                      <div className="bg-surface-container-low rounded-xl border ghost-border overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-surface-container/50 border-b ghost-border">
                            <tr>
                              <th className="px-4 py-2 font-medium text-on-surface-variant">Product/Service</th>
                              <th className="px-4 py-2 font-medium text-on-surface-variant text-right">Qty</th>
                              <th className="px-4 py-2 font-medium text-on-surface-variant text-right">Unit Price</th>
                              <th className="px-4 py-2 font-medium text-on-surface-variant text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y ghost-border">
                            {qt.details.items.map((item: any, idx: number) => {
                              const product = products.find((p: any) => p.id === item.itemId);
                              const productName = product ? product.name : item.itemId;
                              const lineTotal = (item.quantity * item.price) - (item.discount || 0);
                              return (
                                <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                                  <td className="px-4 py-2 text-on-surface">{productName}</td>
                                  <td className="px-4 py-2 text-on-surface text-right">{item.quantity}</td>
                                  <td className="px-4 py-2 text-on-surface text-right">{formatCurrency(item.price)}</td>
                                  <td className="px-4 py-2 text-on-surface text-right">{formatCurrency(lineTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-surface-container/30 border-t ghost-border font-medium">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-on-surface-variant">Subtotal</td>
                              <td className="px-4 py-2 text-right text-on-surface">{formatCurrency(qt.details.subtotal || 0)}</td>
                            </tr>
                            {(qt.details.discountAmount > 0) && (
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-error">Discount</td>
                                <td className="px-4 py-2 text-right text-error">-{formatCurrency(qt.details.discountAmount || 0)}</td>
                              </tr>
                            )}
                            <tr className="bg-surface-container/50 text-base">
                              <td colSpan={3} className="px-4 py-3 text-right text-on-surface font-bold">Total</td>
                              <td className="px-4 py-3 text-right text-primary font-bold">{formatCurrency((qt.details.subtotal || 0) - (qt.details.discountAmount || 0))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="pt-4 flex items-center justify-between flex-shrink-0">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(viewingApproval.status)}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${getStatusDot(viewingApproval.status)}`}></span>
                  {viewingApproval.status}
                </span>
                
                {viewingApproval.status === 'Pending' && isManagerOrAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { handleReject(viewingApproval.id); }} 
                      className="px-4 py-2 rounded-xl text-sm font-medium text-error hover:bg-error-container transition-colors"
                    >{t('action.reject')}</button>
                    <button 
                      onClick={() => { handleApprove(viewingApproval.id); }} 
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] transition-colors shadow-sm"
                    >{t('action.approve')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow overflow-hidden">
            <div className="p-6 border-b ghost-border">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                Reject Approval
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Reason for Rejection <span className="text-error">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm min-h-[100px]"
                  placeholder="Please enter the reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setRejectModal(null)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-full font-medium transition-colors"
                >{t('common.cancel')}</button>
                <button 
                  onClick={confirmReject}
                  disabled={!rejectReason.trim()}
                  className="px-6 py-2 bg-error text-on-error rounded-full font-medium hover:bg-error/90 transition-colors disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
