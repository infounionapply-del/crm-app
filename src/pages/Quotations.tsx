import React, { useState, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Filter, MoreVertical, FileText, Download, Send, Eye, CheckCircle, FileCheck, X, Building2, Trash2, Edit2, Printer, Play, ArrowRight } from 'lucide-react';
import { generateQuotationPDF, generatePOPDF } from '../utils/pdfGenerator';

const STATUSES = ['New', 'Pending Approval', 'Approved', 'Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Rejected', 'Revision Requested', 'Canceled'];

// Removed mockPriceList

const Quotations: React.FC = () => {
  const { t, language } = useLanguage();
  const { notify } = useNotification();
  const { profile } = useAuth();
  const isSupport = profile?.role === 'Support';
  const isSales = profile?.role === 'Sales';
  const canManageFulfillment = ['Support', 'Manager', 'Admin', 'Super Admin', 'Administrator'].includes(profile?.role);
  const { quotations, customers, jobs, pdfSettings, users, addQuotation, updateQuotation, deleteQuotation, updateJob, products , formatCurrency } = useData();
  const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.email || 'Unknown User';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [viewingQuote, setViewingQuote] = useState<any>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [statusChangeModal, setStatusChangeModal] = useState<{ id: string, newStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  // Form States
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [lineItems, setLineItems] = useState<Array<{ id: string, itemId: string, quantity: number, price: number, discount?: number }>>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [poNumberInput, setPoNumberInput] = useState<string>('');
  const [soNumberInput, setSoNumberInput] = useState<string>('');
  const [estimatedDateInput, setEstimatedDateInput] = useState<string>('');

  const resolveUserName = (historyEntry: any) => {
    if (historyEntry.userId) {
      const u = users.find((u: any) => u.id === historyEntry.userId);
      if (u) return u.name;
    }
    return historyEntry.user || 'System';
  };

  const parseCustomerName = (customerStr: string) => {
    if (!customerStr) return '-';
    if (typeof customerStr === 'string' && customerStr.startsWith('{')) {
      try {
        const parsed = JSON.parse(customerStr);
        return parsed[language] || parsed.th || parsed.en || customerStr;
      } catch (e) {
        return customerStr;
      }
    }
    return customerStr;
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customerSearch, customers]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = q.customer.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'drafts') matchesTab = ['New'].includes(q.status);
      else if (activeTab === 'approvals') matchesTab = ['Pending Approval'].includes(q.status);
      else if (activeTab === 'revisions') matchesTab = ['Rejected', 'Revision Requested'].includes(q.status);
      else if (activeTab === 'approved') matchesTab = ['Approved'].includes(q.status);
      else if (activeTab === 'fulfillment') matchesTab = ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].includes(q.status);
      else if (activeTab === 'canceled') matchesTab = ['Canceled'].includes(q.status);

      return matchesSearch && matchesTab;
    });
  }, [quotations, searchTerm, activeTab]);

  const subtotal = lineItems.reduce((sum, item) => sum + ((item.price * item.quantity) - (item.discount || 0)), 0);
  const discountAmount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
  const total = Math.max(0, subtotal - discountAmount);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Approval': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'Won': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Order Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Process': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'FG': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Delivery': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'Revision Requested': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Canceled': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-500';
      case 'Pending Approval': return 'bg-orange-500';
      case 'Approved': return 'bg-green-500';
      case 'Won': return 'bg-emerald-500';
      case 'Order Pending': return 'bg-amber-500';
      case 'In Process': return 'bg-indigo-500';
      case 'FG': return 'bg-purple-500';
      case 'Delivery': return 'bg-teal-500';
      case 'Rejected': return 'bg-red-500';
      case 'Revision Requested': return 'bg-purple-500';
      case 'Canceled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusKey = (status: string) => {
    return status.toLowerCase().replace(' ', '_');
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { id: Date.now().toString(), itemId: '', quantity: 1, price: 0, discount: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'itemId') {
          const priceItem = products.find(p => p.id === value);
          if (priceItem) updated.price = priceItem.currentPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const resetModal = () => {
    setEditingQuoteId(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setSelectedJob('');
    setLineItems([]);
    setDiscountType('percent');
    setDiscountValue(0);
    setPoNumberInput('');
    setSoNumberInput('');
  };

  const handleOpenCreateModal = () => {
    resetModal();
    setIsCreateModalOpen(true);
  };

  const handleEdit = (quote: any) => {
    setEditingQuoteId(quote.id);
    const customer = customers.find(c => c.name === quote.customer);
    setSelectedCustomer(customer || { name: quote.customer, id: 'UNKNOWN' });
    setSelectedJob(quote.job_id || '');
    
    if (quote.details) {
      setLineItems(quote.details.items || []);
      setDiscountType(quote.details.discountType || 'percent');
      setDiscountValue(quote.details.discountValue || 0);
    } else {
      setLineItems([]);
      setDiscountType('percent');
      setDiscountValue(0);
    }

    setPoNumberInput(quote.poNumber || '');
    setSoNumberInput(quote.soNumber || '');
    
    setIsCreateModalOpen(true);
    setActiveDropdown(null);
  };

  const handleView = (quote: any) => {
    setViewingQuote(quote);
    setIsViewModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await notify.promise(deleteQuotation(id), {
          loading: 'Deleting quotation...',
          success: 'Quotation deleted successfully',
          error: 'Failed to delete quotation'
        });
      } catch (error) {
        console.error("Failed to delete quotation:", error);
      }
    }
    setActiveDropdown(null);
  };

  const handleDownloadPDF = async (quote: any, type: 'Quotation' | 'PO' = 'Quotation', action: 'preview' | 'download' | 'generate' = 'download') => {
    if (quote.status !== 'Approved' && quote.status !== 'Won' && quote.status !== 'Order Pending' && quote.status !== 'In Process' && quote.status !== 'FG' && quote.status !== 'Delivery') {
      notify.success('Documents can only be generated for Approved or Won quotations.');
      return;
    }

    try {
      let result;
      if (type === 'Quotation') {
        result = await generateQuotationPDF(quote, products, pdfSettings, action);
      } else {
        result = await generatePOPDF(quote, products, pdfSettings, action);
      }
      
      // If just previewing, don't update the database
      if (action === 'preview') return;

      const { fileLink, blob, filename } = result as any;

      // If downloading, update history and link if it's the first time
      if (!quote.quotation_pdf_url) {
        const newHistory = [{
          date: new Date().toLocaleString(),
          action: `Generated ${type} PDF`,
          user: userName,
          userId: profile?.id,
          note: `File generated and saved.`
        }, ...(quote.history || [])];

        await updateQuotation(quote.id, {
          history: newHistory,
          [`${type.toLowerCase()}PdfLink`]: fileLink,
          quotationPdfBlob: blob,
          quotationPdfFilename: filename
        });
      }

      if (type === 'Quotation' && quote.status === 'Approved') {
        const jobToUpdate = jobs.find(j => j.id === quote.job_id);
        if (jobToUpdate && (jobToUpdate.stage === 'Assigned' || jobToUpdate.stage === 'Revision')) {
          const newJobHistory = [{
            date: new Date().toLocaleString(),
            action: 'Stage auto-changed to QT Approve',
            user: userName,
            userId: profile?.id,
            note: 'Quotation approved and PDF generated'
          }, ...(jobToUpdate.history || [])];
          await updateJob(jobToUpdate.id, { stage: 'QT Approve', history: newJobHistory });
        }
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      notify.error('Failed to generate PDF. Please check the console for details.');
    }
    setActiveDropdown(null);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'Rejected' || newStatus === 'Revision Requested' || newStatus === 'Approved' || newStatus === 'Pending Approval') {
      setStatusChangeModal({ id, newStatus });
      setStatusReason('');
    } else if (newStatus === 'Order Pending') {
      setStatusChangeModal({ id, newStatus });
      setSoNumberInput('');
      setEstimatedDateInput('');
      setStatusReason('');
    } else {
      updateStatus(id, newStatus, '');
    }
  };

  const updateStatus = async (id: string, newStatus: string, reason: string) => {
    try {
      const q = quotations.find(qt => qt.id === id);
      if (!q) return;

      const isOrderPending = newStatus === 'Order Pending';
      const newHistory = [{
        date: new Date().toLocaleString(),
        action: `Status changed to ${newStatus}`,
        user: userName,
        note: isOrderPending ? `SO Number: ${soNumberInput || '-'} | Est. Completion: ${estimatedDateInput || '-'}` : reason
      }, ...(q.history || [])];
      
      const payload: any = {
        status: newStatus,
        history: newHistory,
      };
      if (isOrderPending) {
        payload.soNumber = soNumberInput;
        payload.estimatedCompletionDate = estimatedDateInput;
      }
      
      await notify.promise(
        updateQuotation(id, payload),
        {
          loading: newStatus === 'Pending Approval' ? t('status.updating_pending') : t('status.processing'),
          success: 'Status updated successfully',
          error: 'Failed to update status'
        }
      );
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const confirmStatusChange = () => {
    if (statusChangeModal) {
      updateStatus(statusChangeModal.id, statusChangeModal.newStatus, statusReason);
      setStatusChangeModal(null);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (lineItems.length === 0 || lineItems.some(item => !item.itemId)) {
      notify.success("Please add at least one valid item from the price list.");
      return;
    }
    
    setIsSubmitting(true);

    const quoteDetails = {
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        total,
        items: lineItems
      };

      let saveTask;
      if (editingQuoteId) {
        const q = quotations.find(qt => qt.id === editingQuoteId);
        if (q) {
          let newStatus = q.status;
          let newRevisionCount = q.revisionCount || 0;
          let action = 'Edited';

          if (q.status === 'Revision Requested') {
            newStatus = 'Pending Approval';
            newRevisionCount += 1;
            action = 'Resubmitted after revision';
          }

          const newHistory = [{
            date: new Date().toLocaleString(),
            action: action,
            user: userName,
            note: 'Updated quotation details'
          }, ...(q.history || [])];

          saveTask = updateQuotation(editingQuoteId, {
            jobId: selectedJob || null,
            customerId: selectedCustomer.id,
            totalAmount: total,
            status: newStatus,
            poNumber: poNumberInput || null,
            soNumber: soNumberInput || null,
            details: quoteDetails,
            revisionCount: newRevisionCount,
            history: newHistory
          });
        }
      } else {
        const validUntil = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        saveTask = addQuotation({
          jobId: selectedJob || null,
          customerId: selectedCustomer.id,
          totalAmount: total,
          status: 'New',
          validUntil: validUntil,
          poNumber: poNumberInput || null,
          soNumber: soNumberInput || null,
          details: quoteDetails,
          revisionCount: 0,
          history: [{ date: new Date().toLocaleString(), action: 'Created', user: userName, note: '' }]
        }, lineItems);
      }

      if (saveTask) {
        notify.promise(saveTask, {
          loading: 'Saving quotation...',
          success: () => {
            setIsCreateModalOpen(false);
            resetModal();
            return 'Quotation saved successfully.';
          },
          error: 'Failed to save quotation'
        }).finally(() => {
          setIsSubmitting(false);
        });
      } else {
        setIsSubmitting(false);
      }
  };
  const tabs = [
    { id: 'all', label: t('quotation.tab_all'), count: quotations.length },
    { id: 'drafts', label: t('quotation.tab_inbox'), count: quotations.filter(q => ['New'].includes(q.status)).length },
    { id: 'approvals', label: t('quotation.tab_approvals'), count: quotations.filter(q => ['Pending Approval'].includes(q.status)).length },
    { id: 'revisions', label: t('quotation.tab_revisions'), count: quotations.filter(q => ['Rejected', 'Revision Requested'].includes(q.status)).length },
    { id: 'approved', label: t('quotation.tab_approved'), count: quotations.filter(q => ['Approved'].includes(q.status)).length },
    { id: 'fulfillment', label: t('quotation.tab_fulfillment'), count: quotations.filter(q => ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].includes(q.status)).length },
    { id: 'canceled', label: t('quotation.tab_canceled'), count: quotations.filter(q => ['Canceled'].includes(q.status)).length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('nav.quotations')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('quotation.subtitle')}</p>
        </div>
        {!isSales && (
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>{t('action.create_quotation')}</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        {/* Tabs - Desktop */}
        <div className="hidden md:flex overflow-x-auto pb-2 scrollbar-hide border-b ghost-border">
          <div className="flex gap-2 min-w-max px-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
                }`}
              >
                {tab.label}
                <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-primary-container text-primary' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {tab.count}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" style={{ marginBottom: '-1px' }}></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown - Mobile */}
        <div className="md:hidden relative w-full">
          <select 
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full appearance-none bg-surface-container-lowest border ghost-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-on-surface editorial-shadow-sm"
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label} ({tab.count})
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder={t('header.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
      </div>

      {/* NEW: Jobs Waiting for Quotation */}
      {jobs.filter(j => {
        if (j.stage === 'Open' || j.stage === 'New') return false;
        if (['Closed Won', 'Closed Lost', 'Cancel'].includes(j.stage)) return false;
        const activeQuotations = quotations.filter(q => q.job_id === j.id && !['Canceled', 'Lost'].includes(q.status));
        return activeQuotations.length === 0;
      }).length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>{t('quotation.new_jobs_pending')}</h2>
          <div className="bg-orange-50/50 border border-orange-200 rounded-xl overflow-hidden editorial-shadow">
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-orange-200 bg-orange-100/50">
                    <th className="px-6 py-3 text-xs font-medium text-orange-800 uppercase tracking-wider">{t('table.job_id_title')}</th>
                    <th className="px-6 py-3 text-xs font-medium text-orange-800 uppercase tracking-wider">{t('table.customer')}</th>
                    <th className="px-6 py-3 text-xs font-medium text-orange-800 uppercase tracking-wider">{t('table.value')}</th>
                    <th className="px-6 py-3 text-xs font-medium text-orange-800 uppercase tracking-wider text-right">{t('table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-orange-100">
                  {jobs.filter(j => {
                    if (j.stage === 'Open' || j.stage === 'New') return false;
                    if (['Closed Won', 'Closed Lost', 'Cancel'].includes(j.stage)) return false;
                    const activeQuotations = quotations.filter(q => q.job_id === j.id && !['Canceled', 'Lost'].includes(q.status));
                    return activeQuotations.length === 0;
                  }).map(job => (
                    <tr key={job.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-medium text-orange-900 flex items-center gap-2">
                          {job.job_number && <span className="text-orange-700 font-bold text-[10px] bg-orange-200/50 px-1.5 py-0.5 rounded">{job.job_number}</span>}
                          <span>{job.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-orange-800 font-medium">{job.customer}</td>
                      <td className="px-6 py-3 text-sm text-orange-800">{job.value}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => {
                            const cust = customers.find(c => c.name === job.customer);
                            setSelectedCustomer(cust || null);
                            setSelectedJob(job.id);
                            setIsCreateModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors hover:bg-orange-700 shadow-sm"
                        >
                          <Plus size={14} />{t('quotation.create_quote')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View for Pending Jobs */}
            <div className="md:hidden flex flex-col p-4 gap-4 bg-orange-50">
              {jobs.filter(j => {
                if (j.stage === 'Open' || j.stage === 'New') return false;
                if (['Closed Won', 'Closed Lost', 'Cancel'].includes(j.stage)) return false;
                const activeQuotations = quotations.filter(q => q.job_id === j.id && !['Canceled', 'Lost'].includes(q.status));
                return activeQuotations.length === 0;
              }).map(job => (
                <div key={job.id} className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-orange-900 flex items-center gap-2">
                      {job.job_number && <span className="text-orange-700 font-bold text-[10px] bg-orange-100 px-1.5 py-0.5 rounded">{job.job_number}</span>}
                      <span className="leading-tight">{job.title}</span>
                    </div>
                    <div className="text-sm text-orange-800 font-medium">{parseCustomerName(job.customer)}</div>
                    <div className="text-sm text-orange-700">{job.value}</div>
                  </div>
                  <button
                    onClick={() => {
                      const cust = customers.find(c => c.name === job.customer);
                      setSelectedCustomer(cust || null);
                      setSelectedJob(job.id);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full flex justify-center items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors hover:bg-orange-700"
                  >
                    <Plus size={16} />{t('quotation.create_quote')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quotations List */}
      <div className="bg-surface-container-lowest border ghost-border rounded-2xl overflow-hidden editorial-shadow">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b ghost-border bg-surface-container-low/50">
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.quotation')}</th>
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('quotation.customer_and_job')}</th>
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">PO / SO</th>
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.value')}</th>
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.dates')}</th>
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.status')}</th>
                <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y ghost-border">
              {filteredQuotations.map((quote) => (
                <tr key={quote.id} onClick={() => handleView(quote)} className="hover:bg-surface-container-lowest/50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-tertiary-container/30 text-tertiary flex items-center justify-center flex-shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="font-medium text-on-surface">{quote.quotation_number || 'Pending QT No.'}</div>
                        </div>
                      </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-on-surface">{parseCustomerName(quote.customer)}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                      {quote.jobNumber && <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{quote.jobNumber}</span>}
                      <span className="truncate">{quote.jobTitle || quote.job}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 flex flex-col gap-1">
                    {quote.poNumber ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container-high text-on-surface-variant">
                        PO: {quote.poNumber}
                      </span>
                    ) : null}
                    {quote.soNumber ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container-high text-on-surface-variant">
                        SO: {quote.soNumber}
                      </span>
                    ) : null}
                    {(!quote.poNumber && !quote.soNumber) && <span className="text-xs text-outline">-</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-on-surface">{quote.value}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-on-surface">{quote.date}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">Valid until: {quote.validUntil}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(quote.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(quote.status)}`}></span>
                      {t('status.' + quote.status.toLowerCase().replace(/ /g, '_')) || quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      {(quote.status === 'Approved' || quote.status === 'Won' || quote.status === 'Order Pending' || quote.status === 'In Process' || quote.status === 'FG' || quote.status === 'Delivery') && (
                        <>
                          {!quote.quotation_pdf_url ? (
                            <>

                              <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(quote, 'Quotation', 'generate'); }} className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/20 transition-colors uppercase" title={t('action.generate_pdf')}>
                                GEN PDF
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(quote, 'Quotation', 'preview'); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" title={t('action.preview_pdf')}>
                                <FileText size={18} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(quote, 'Quotation', 'download'); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" title={t('action.download_pdf')}>
                                <Download size={18} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {quote.status === 'Won' && canManageFulfillment && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleStatusChange(quote.id, 'Order Pending');
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors uppercase flex items-center gap-1"
                          title={t('action.open_job')}
                        >
                          <Play size={12} /> {t('status.order_pending')}
                        </button>
                      )}

                      {/* Status Updates (Support) */}
                      {canManageFulfillment && quote.status === 'Order Pending' && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'In Process'); }} className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-colors uppercase flex items-center gap-1" title={t('action.update_in_process')}>
                          <ArrowRight size={12} /> {t('status.in_process')}
                        </button>
                      )}
                      {canManageFulfillment && quote.status === 'In Process' && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'FG'); }} className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-700 transition-colors uppercase flex items-center gap-1" title={t('action.update_fg')}>
                          <ArrowRight size={12} /> {t('status.finished_goods')}
                        </button>
                      )}
                      {canManageFulfillment && quote.status === 'FG' && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'Delivery'); }} className="px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg hover:bg-teal-700 transition-colors uppercase flex items-center gap-1" title={t('action.update_delivery')}>
                          <ArrowRight size={12} /> {t('status.delivery')}
                        </button>
                      )}

                      {/* Submit for Approval */}
                      {!isSales && (quote.status === 'New' || quote.status === 'Rejected' || quote.status === 'Revision Requested') && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'Pending Approval'); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title={t('action.submit_approval')}>
                          <Send size={18} />
                        </button>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); handleView(quote); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" title={t('action.view_details')}>
                        <Eye size={18} />
                      </button>

                      {!isSales && (quote.status === 'New' || quote.status === 'Rejected' || quote.status === 'Revision Requested') && (
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(quote); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" title={t('action.edit_quotation')}>
                          <Edit2 size={18} />
                        </button>
                      )}

                      {(quote.status === 'New' || quote.status === 'Rejected' || quote.status === 'Canceled') && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(quote.id); }} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title={t('action.delete')}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">
                    No quotations found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col p-4 gap-4 bg-surface">
          {filteredQuotations.map((quote) => (
            <div key={quote.id} onClick={() => handleView(quote)} className="bg-surface-container-lowest border ghost-border rounded-2xl p-4 editorial-shadow flex flex-col gap-3 active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-tertiary-container/30 text-tertiary flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-on-surface leading-tight">{quote.quotation_number || 'Pending QT No.'}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{quote.date}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                <div className="text-sm font-medium text-on-surface truncate">{quote.customer}</div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  {quote.jobNumber && <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{quote.jobNumber}</span>}
                  <span className="truncate">{quote.jobTitle || quote.job}</span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className="text-sm font-medium text-on-surface">{quote.value}</div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {quote.poNumber ? <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">PO: {quote.poNumber}</span> : null}
                    {quote.soNumber ? <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">SO: {quote.soNumber}</span> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-3 border-t ghost-border">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${getStatusColor(quote.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(quote.status)}`}></span>
                  {t('status.' + quote.status.toLowerCase().replace(/ /g, '_')) || quote.status}
                </span>

                <div className="flex items-center gap-1">
                  {(quote.status === 'Approved' || quote.status === 'Won' || quote.status === 'Order Pending' || quote.status === 'In Process' || quote.status === 'FG' || quote.status === 'Delivery') && (
                    <>
                      {!quote.quotation_pdf_url ? (
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(quote, 'Quotation', 'generate'); }} className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/20 transition-colors uppercase">
                          GEN PDF
                        </button>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(quote, 'Quotation', 'preview'); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors">
                            <FileText size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(quote, 'Quotation', 'download'); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors">
                            <Download size={18} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {quote.status === 'Won' && canManageFulfillment && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'Order Pending'); }}
                      className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play size={12} />
                    </button>
                  )}
                  {canManageFulfillment && quote.status === 'Order Pending' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'In Process'); }} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><ArrowRight size={14} /></button>
                  )}
                  {canManageFulfillment && quote.status === 'In Process' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'FG'); }} className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"><ArrowRight size={14} /></button>
                  )}
                  {canManageFulfillment && quote.status === 'FG' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'Delivery'); }} className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"><ArrowRight size={14} /></button>
                  )}
                  {!isSales && (quote.status === 'New' || quote.status === 'Rejected' || quote.status === 'Revision Requested') && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, 'Pending Approval'); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                      <Send size={18} />
                    </button>
                  )}
                  {!isSales && (quote.status === 'New' || quote.status === 'Rejected' || quote.status === 'Revision Requested') && (
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(quote); }} className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredQuotations.length === 0 && (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              No quotations found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* View Quotation Modal */}
      {isViewModalOpen && viewingQuote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-3xl editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start md:items-center justify-between p-4 md:p-6 border-b ghost-border flex-shrink-0 bg-surface-container-low/30 gap-2">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-lg md:text-xl font-headline font-semibold text-on-surface flex items-center gap-2 truncate">
                  <FileText size={24} className="text-primary hidden sm:block" />
                  <span className="truncate">{viewingQuote.quotation_number || 'Pending QT No.'}</span>
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium border mt-2 ${getStatusColor(viewingQuote.status)}`}>
                  {t('status.' + viewingQuote.status.toLowerCase().replace(/ /g, '_')) || viewingQuote.status}
                </span>
              </div>
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {(viewingQuote.status === 'Approved' || viewingQuote.status === 'Won' || viewingQuote.status === 'Order Pending' || viewingQuote.status === 'In Process' || viewingQuote.status === 'FG' || viewingQuote.status === 'Delivery') && (
                  <>
                    {!viewingQuote.quotation_pdf_url ? (
                      <button onClick={() => handleDownloadPDF(viewingQuote, 'Quotation', 'generate')} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white rounded-lg transition-colors hover:from-[#7c3aed] hover:to-[#c026d3] font-bold uppercase" title={t('action.generate_pdf')}>
                        <FileText size={16} /> <span className="hidden sm:inline">GEN PDF</span>
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleDownloadPDF(viewingQuote, 'Quotation', 'preview')} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm bg-surface-container hover:bg-surface-container-high text-primary rounded-lg transition-colors" title={t('action.preview_pdf')}>
                          <FileText size={16} /> <span className="hidden sm:inline">{t('action.preview')}</span>
                        </button>
                        <button onClick={() => handleDownloadPDF(viewingQuote, 'Quotation', 'download')} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm bg-surface-container hover:bg-surface-container-high text-primary rounded-lg transition-colors" title={t('action.download_pdf')}>
                          <Download size={16} /> <span className="hidden sm:inline">{t('action.download')}</span>
                        </button>
                      </>
                    )}
                  </>
                )}
                <button onClick={() => setIsViewModalOpen(false)} className="p-1.5 md:p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors ml-1 md:ml-2 bg-surface-container-low" title={t('common.close')}>
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Timeline Header for Won statuses */}
              {['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].includes(viewingQuote.status) && (
                <div className="mb-8 p-6 bg-surface-container-lowest border ghost-border rounded-xl">
                  <h3 className="text-sm font-semibold text-on-surface mb-6">{t('job.order_progress')}</h3>
                  <div className="relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-container-low -translate-y-1/2 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500" 
                      style={{ 
                        width: viewingQuote.status === 'Won' ? '0%' : 
                               viewingQuote.status === 'Order Pending' ? '25%' :
                               viewingQuote.status === 'In Process' ? '50%' :
                               viewingQuote.status === 'FG' ? '75%' : '100%'
                      }}
                    ></div>
                    
                    <div className="relative z-10 flex justify-between">
                      {['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].map((step, index) => {
                        const stepIndex = ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].indexOf(viewingQuote.status);
                        const isCompleted = stepIndex > index || (stepIndex === index && viewingQuote.status === 'Delivery');
                        const isCurrent = stepIndex === index && viewingQuote.status !== 'Delivery';
                        
                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 transition-colors ${
                              isCompleted ? 'bg-primary border-primary text-on-primary' : 
                              isCurrent ? 'bg-primary-container border-primary text-primary' : 
                                          'bg-surface-container-lowest border-outline-variant text-outline'
                            }`}>
                              {isCompleted ? <CheckCircle size={16} /> : <div className="w-2.5 h-2.5 rounded-full bg-current opacity-70"></div>}
                            </div>
                            <span className={`text-xs font-medium text-center max-w-[80px] ${isCompleted || isCurrent ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                              {step === 'Won' ? t('status.closed_won_so') : step === 'FG' ? t('status.finished_goods') : (t(`status.${step.toLowerCase().replace(/ /g, '_')}`) || step)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">{t('quote.customer_details')}</h3>
                  <p className="font-medium text-on-surface text-lg">{parseCustomerName(viewingQuote.customer)}</p>
                  <p className="text-sm text-on-surface-variant mt-1">{t('quote.ref_job')} {viewingQuote.jobTitle || viewingQuote.job}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">{t('quote.quotation_info')}</h3>
                  <p className="text-sm text-on-surface"><span className="text-on-surface-variant">{t('quote.date')}</span> {viewingQuote.date}</p>
                  <p className="text-sm text-on-surface"><span className="text-on-surface-variant">{t('quote.valid_until')}</span> {viewingQuote.validUntil}</p>
                  {(viewingQuote.poNumber || viewingQuote.jobPoNumber || viewingQuote.soNumber) && (
                    <div className="mt-2 pt-2 border-t ghost-border">
                      {(viewingQuote.poNumber || viewingQuote.jobPoNumber) && (
                        <div className="flex flex-col gap-1 items-end">
                          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">PO No:</span> {viewingQuote.poNumber || viewingQuote.jobPoNumber}</p>
                          {viewingQuote.jobPoAttachment && (
                            <a href={viewingQuote.jobPoAttachment} target="_blank" rel="noreferrer" className="text-[10px] bg-surface-container hover:bg-surface-container-high text-primary px-2 py-1 rounded-md flex items-center gap-1 transition-colors w-fit">
                              <FileText size={12} /> {t('quote.view_document')}
                            </a>
                          )}
                        </div>
                      )}
                      {viewingQuote.soNumber && <p className="text-sm text-on-surface mt-1"><span className="text-on-surface-variant">SO No:</span> {viewingQuote.soNumber}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="border ghost-border rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low/50 border-b ghost-border">
                    <tr>
                      <th className="px-4 py-3 font-medium text-on-surface-variant">{t('table.product_service_short')}</th>
                      <th className="px-4 py-3 font-medium text-on-surface-variant text-right">{t('table.qty')}</th>
                      <th className="px-4 py-3 font-medium text-on-surface-variant text-right">{t('common.unit_price')}</th>
                      <th className="px-4 py-3 font-medium text-on-surface-variant text-right">{t('quotation.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y ghost-border">
                    {viewingQuote.details?.items.map((item: any) => {
                      const product = products.find(p => p.id === item.itemId);
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-on-surface font-medium">{product?.name || item.itemId}</td>
                          <td className="px-4 py-3 text-on-surface text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-on-surface text-right">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3 text-on-surface text-right font-medium">{formatCurrency((item.price * item.quantity))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">{t('quotation.subtotal')}</span>
                    <span className="font-medium">{formatCurrency(viewingQuote.details?.subtotal)}</span>
                  </div>
                  {viewingQuote.details?.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>{t('table.discount')} ({viewingQuote.details.discountType === 'percent' ? `${viewingQuote.details.discountValue}%` : 'Fixed'})</span>
                      <span>-{formatCurrency(viewingQuote.details.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-primary pt-3 border-t ghost-border">
                    <span>{t('quotation.total')}</span>
                    <span>{formatCurrency(viewingQuote.details?.total)}</span>
                  </div>
                </div>
              </div>

              {/* Revision History */}
              <div className="mt-8 border-t ghost-border pt-6">
                <h3 className="text-sm font-medium text-on-surface mb-4">{t('job.revision_history')} (Count: {viewingQuote.revisionCount || 0})</h3>
                <div className="space-y-4">
                  {(viewingQuote.history || []).map((h: any, i: number) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-on-surface">{h.action}</p>
                        <p className="text-xs text-on-surface-variant">{h.date} by {resolveUserName(h)}</p>
                        {h.note && <p className="text-on-surface mt-1 bg-surface-container-lowest p-2 rounded border ghost-border">{(() => {
                          let note = h.note === 'Stage updated manually' ? t('job.stage_updated_manually') : h.note;
                          if (note.includes('Status changed to ')) {
                            const match = note.match(/Status changed to ([^,]+)/);
                            if (match) note = note.replace(/Status changed to ([^,]+)/, `${t('job.status_changed_to')} ${t('status.' + match[1].toLowerCase().replace(/ /g, '_')) || match[1]}`);
                          }
                          if (note.includes('Stage changed to ')) {
                            const match = note.match(/Stage changed to ([^,]+)/);
                            if (match) note = note.replace(/Stage changed to ([^,]+)/, `${t('job.stage_changed_to')} ${t('status.' + match[1].toLowerCase().replace(/ /g, '_')) || match[1]}`);
                          }
                          return note;
                        })()}</p>}
                      </div>
                    </div>
                  ))}
                  {(!viewingQuote.history || viewingQuote.history.length === 0) && (
                    <p className="text-sm text-on-surface-variant">No history available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusChangeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow overflow-hidden">
            <div className="p-6 border-b ghost-border">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                {t('action.change_stage')} : {t('status.' + statusChangeModal.newStatus.toLowerCase().replace(/ /g, '_')) || statusChangeModal.newStatus}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {statusChangeModal.newStatus === 'Order Pending' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                      Sales Order (SO) Number <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={soNumberInput}
                      onChange={(e) => setSoNumberInput(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm"
                      placeholder="Enter SO Number (e.g. SO-12345)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                      Estimated Completion Date <span className="text-error">*</span>
                    </label>
                    <input
                      type="date"
                      value={estimatedDateInput}
                      onChange={(e) => setEstimatedDateInput(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm"
                    />
                    <p className="text-xs text-on-surface-variant mt-1.5">
                      This date will be visible to the Sales team to track fulfillment progress.
                    </p>
                  </div>
                </div>
              ) : statusChangeModal.newStatus === 'Pending Approval' ? (
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">
                    {t('approval.note_optional')}
                  </label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm min-h-[100px]"
                    placeholder={t('approval.enter_notes')}
                  />
                  <p className="text-xs text-on-surface-variant mt-2 text-orange-600">
                    {t('approval.cannot_edit_warning')}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">
                    Reason / Note {statusChangeModal.newStatus !== 'Approved' && <span className="text-error">*</span>}
                  </label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm min-h-[100px]"
                    placeholder={`Enter reason for ${statusChangeModal.newStatus.toLowerCase()}...`}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setStatusChangeModal(null)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-full font-medium transition-colors"
                >{t('common.cancel')}</button>
                <button 
                  onClick={confirmStatusChange}
                  disabled={
                    (statusChangeModal.newStatus === 'Rejected' || statusChangeModal.newStatus === 'Revision Requested') && !statusReason.trim() ||
                    (statusChangeModal.newStatus === 'Order Pending' && (!soNumberInput.trim() || !estimatedDateInput.trim()))
                  }
                  className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {t('action.confirm_submission')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border flex-shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                {editingQuoteId ? t('quotation.edit_quotation') : t('action.create_quotation')}
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-outline hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            
            {editingQuoteId && quotations.find(q => q.id === editingQuoteId)?.status === 'Revision Requested' && (
              <div className="mx-6 mt-6 mb-2 p-4 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 flex flex-col gap-1 shadow-sm">
                <span className="font-semibold text-sm flex items-center gap-2"><FileText size={16}/> Revision Note from Sales:</span>
                <span className="text-sm">
                  {quotations.find(q => q.id === editingQuoteId)?.history?.[0]?.note || 'No note provided.'}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveQuotation} className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Customer Selection (CRITICAL) */}
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">
                    Select Customer <span className="text-error">*</span>
                  </label>
                  
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 bg-surface-container border border-primary rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-on-surface">{selectedCustomer.name}</div>
                        </div>
                      </div>
                      {!editingQuoteId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setSelectedCustomer(null);
                            setSelectedJob('');
                          }}
                          className="p-1 text-outline hover:text-error rounded-md transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search and select customer..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className="w-full pl-10 pr-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base sm:text-sm"
                      />
                      
                      {/* Autocomplete Dropdown */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border ghost-border rounded-xl editorial-shadow z-10 max-h-48 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setIsDropdownOpen(false);
                                  setCustomerSearch('');
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-surface-container transition-colors flex items-center gap-3 border-b ghost-border last:border-0"
                              >
                                <Building2 size={16} className="text-outline" />
                                <div>
                                  <div className="text-sm font-medium text-on-surface">{c.name}</div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-on-surface-variant text-center">
                              No customers found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!selectedCustomer && (
                    <p className="text-xs text-error mt-1.5">A customer must be selected to create a quotation.</p>
                  )}
                </div>

                {/* Job Selection and Estimated Value Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('quotation.reference_job')}</label>
                    <select 
                      value={selectedJob}
                      onChange={e => setSelectedJob(e.target.value)}
                      disabled={!selectedCustomer || !!editingQuoteId}
                      className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 text-base sm:text-sm"
                    >
                      <option value="">-- Select a Job --</option>
                      {selectedCustomer && jobs.filter(j => {
                        if (j.customer !== selectedCustomer.name) return false;
                        if (editingQuoteId && j.id === selectedJob) return true;
                        
                        // 1. Must be sent from sales (not Open)
                        if (j.stage === 'Open' || j.stage === 'New') return false;
                        // Prevent selecting closed jobs
                        if (['Closed Won', 'Closed Lost', 'Cancel'].includes(j.stage)) return false;
                        
                        // 2. Prevent selecting jobs that already have an active quotation
                        const activeQuotations = quotations.filter(q => 
                          q.job_id === j.id && 
                          !['Canceled', 'Lost'].includes(q.status)
                        );
                        
                        return activeQuotations.length === 0;
                      }).map(job => (
                        <option key={job.id} value={job.id}>
                          {job.job_number ? `[${job.job_number}] ` : ''}{job.title} ({job.stage})
                        </option>
                      ))}
                    </select>
                    {selectedCustomer && jobs.filter(j => j.customer === selectedCustomer.name).length > 0 && (
                      <p className="text-xs text-on-surface-variant mt-1.5">{t('quotation.reference_desc')}</p>
                    )}
                  </div>

                  {selectedJob && (
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('quotation.estimated_value')}</label>
                      <div className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl text-base sm:text-sm font-medium text-on-surface flex items-center h-[46px]">
                        {formatCurrency(jobs.find(j => j.id === selectedJob)?.value || 0)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* PO and SO Numbers are now hidden from Create Quotation and only shown when status changes to Won */}

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-on-surface-variant">{t('quotation.line_items_active')}</label>
                  <button type="button" onClick={handleAddItem} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                    <Plus size={14} /> {t('quotation.add_item')}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 bg-surface-container-lowest p-3 rounded-xl border ghost-border">
                      <div className="flex-1">
                        <select 
                          value={item.itemId}
                          onChange={e => handleItemChange(item.id, 'itemId', e.target.value)}
                          className="w-full px-3 py-3 bg-surface-container border ghost-border rounded-lg text-base sm:text-sm outline-none mb-3"
                          required
                        >
                          <option value="">{t('quotation.select_product')}</option>
                          {products.filter(p => p.status === 'Active' || p.id === item.itemId).map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.currentPrice)}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="w-20">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">{t('table.qty')}</label>
                            <input 
                              type="number" min="1" 
                              value={item.quantity}
                              onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2.5 bg-surface-container border ghost-border rounded-lg text-base sm:text-sm outline-none"
                            />
                          </div>
                          <div className="flex-1 min-w-[100px]">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">{t('common.unit_price')}</label>
                            <div className="px-3 py-2.5 bg-surface-container-low border ghost-border rounded-lg text-base sm:text-sm text-on-surface-variant h-[42px] flex items-center">
                              {formatCurrency(item.price)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[100px]">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">{t('table.discount')} (฿)</label>
                            <input 
                              type="number" min="0" 
                              value={item.discount || ''}
                              placeholder="0"
                              onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2.5 bg-surface-container border ghost-border rounded-lg text-base sm:text-sm outline-none"
                            />
                          </div>
                          <div className="flex-1 min-w-[100px]">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">{t('quotation.total')}</label>
                            <div className="px-3 py-2.5 bg-surface-container-low border ghost-border rounded-lg text-base sm:text-sm font-medium text-on-surface h-[42px] flex items-center">
                              {formatCurrency((item.price * item.quantity) - (item.discount || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg mt-1 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {lineItems.length === 0 && (
                    <div className="text-center py-6 text-sm text-outline border border-dashed ghost-border rounded-xl">{t('quotation.no_items')}</div>
                  )}
                </div>
              </div>

              {/* Discount & Summary */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border ghost-border space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">{t('quotation.subtotal')}</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-on-surface-variant">{t('quotation.discount')}</span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={discountType}
                      onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                      className="px-2 py-2.5 bg-surface-container border ghost-border rounded-lg text-base sm:text-sm outline-none"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">฿</option>
                    </select>
                    <input 
                      type="number" min="0" step="0.01"
                      value={discountValue}
                      onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2.5 bg-surface-container border ghost-border rounded-lg text-base sm:text-sm outline-none text-right"
                    />
                  </div>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-emerald-600">
                    <span>{t('quotation.discount_amount')}</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                
                <div className="pt-4 border-t ghost-border flex items-center justify-between">
                  <span className="font-medium text-on-surface">{t('quotation.total')}</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t ghost-border">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-full font-medium transition-colors"
                >{t('common.cancel')}</button>
                <button 
                  type="submit" 
                  disabled={!selectedCustomer || lineItems.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingQuoteId ? t('action.save_changes') : t('action.create_quotation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotations;
