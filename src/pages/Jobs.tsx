import React, { useState, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Search, Plus, Filter, MoreVertical, Briefcase, Calendar, Clock, DollarSign, History, X, Building2, CheckSquare, Edit2, Trash2, LayoutList, LayoutGrid, CheckCircle, FileText, Download, Send, FileCheck } from 'lucide-react';
import { generateQuotationPDF, generatePOPDF } from '../utils/pdfGenerator';
import JobKanban from '../components/jobs/JobKanban';
import JobDrawer from '../components/jobs/JobDrawer';

const STAGES = ['Open', 'Assigned', 'QT Approve', 'Negotiating', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'];
const STATUSES = ['New', 'Pending Approval', 'Approved', 'Revision Requested', 'Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Rejected', 'Lost'];

const Jobs: React.FC = () => {
  const t = useT();
  const { notify } = useNotification();
  const { jobs, customers, quotations, products, pdfSettings, users, addJob, updateJob, deleteJob , formatCurrency } = useData();
  const { profile, session } = useAuth();
  const isSupport = profile?.role === 'Support';
  const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.email || 'Unknown User';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [viewingQuoteDetails, setViewingQuoteDetails] = useState<any | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [jobData, setJobData] = useState({
    title: '',
    value: '',
    stage: 'Open',
    status: 'New',
    poNumber: '',
    soNumber: ''
  });

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [stageChangeModal, setStageChangeModal] = useState<{ id: string, newStage: string } | null>(null);
  const [stageReason, setStageReason] = useState('');
  const [soNumberInput, setSoNumberInput] = useState('');
  const [poNumberInput, setPoNumberInput] = useState('');
  const [poFile, setPoFile] = useState<File | null>(null);

  const resolveUserName = (historyEntry: any) => {
    if (historyEntry.userId) {
      const u = users.find((u: any) => u.id === historyEntry.userId);
      if (u) return u.name;
    }
    return historyEntry.user || 'System';
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customerSearch, customers]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            j.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            j.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = stageFilter === 'All' || j.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [jobs, searchTerm, stageFilter]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Approval': 
      case 'Pending': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'Won': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Order Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Process': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'FG': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Revision Requested': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Delivery': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'Lost': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-500';
      case 'Pending Approval': 
      case 'Pending': return 'bg-orange-500';
      case 'Approved': return 'bg-green-500';
      case 'Won': return 'bg-emerald-500';
      case 'Order Pending': return 'bg-amber-500';
      case 'In Process': return 'bg-indigo-500';
      case 'FG': return 'bg-purple-500';
      case 'Revision Requested': return 'bg-pink-500';
      case 'Delivery': return 'bg-teal-500';
      case 'Rejected': return 'bg-red-500';
      case 'Lost': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const handleOpenModal = (job: any = null) => {
    if (job) {
      setEditingJob(job);
      const customer = customers.find(c => c.name === job.customer);
      setSelectedCustomer(customer || { name: job.customer, id: 'UNKNOWN' });
      setJobData({
        title: job.title,
        value: job.value.replace('$', '').replace(',', ''),
        stage: job.stage,
        status: job.status,
        poNumber: job.po_number || '',
        soNumber: job.so_number || '',
        description: job.description || ''
      });
    } else {
      setEditingJob(null);
      setSelectedCustomer(null);
      setJobData({ title: '', description: '', value: '', stage: 'Open', status: 'New', poNumber: '', soNumber: '' });
    }
    setIsCreateModalOpen(true);
    setActiveDropdown(null);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSubmitting(true);

    const rawValue = jobData.value ? Number(jobData.value.toString().replace(/[^0-9.-]+/g, "")) : 0;
    
    let saveTask;
    if (editingJob) {
      saveTask = updateJob(editingJob.id, {
        title: jobData.title,
        customerId: selectedCustomer.id,
        description: jobData.description,
        value: rawValue,
        stage: jobData.stage,
        status: jobData.status,
        poNumber: jobData.poNumber || null,
        soNumber: jobData.soNumber || null
      });
    } else {
      saveTask = addJob({
        title: jobData.title,
        customerId: selectedCustomer.id,
        description: jobData.description,
        value: rawValue,
        stage: jobData.stage,
        status: jobData.status,
        poNumber: jobData.poNumber || null,
        soNumber: jobData.soNumber || null,
        history: [{
          date: new Date().toLocaleString(),
          action: 'Job Created',
          user: userName,
          userId: profile?.id || session?.user?.id,
          note: ''
        }]
      });
    }

    notify.promise(saveTask, {
      loading: 'Saving job...',
      success: () => {
        setIsCreateModalOpen(false);
        return 'Job saved successfully.';
      },
      error: 'Failed to save job'
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await notify.promise(deleteJob(id), {
          loading: 'Deleting job...',
          success: 'Job deleted successfully',
          error: 'Failed to delete job'
        });
      } catch (error) {
        console.error("Failed to delete job:", error);
      }
    }
    setActiveDropdown(null);
  };

  const handleStageChange = async (id: string, newStage: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    if (job.stage === newStage) return;

    if (job.stage === 'Open' && !['Assigned', 'Cancel'].includes(newStage)) {
      notify.error("From Open, you can only change the stage to Assigned or Cancel.");
      return;
    }

    if (job.stage === 'Assigned') {
      notify.error("Jobs in Assigned stage are waiting for Support approval. This will automatically change when a Quotation is Approved and PDF is issued.");
      return; // Cannot manually transition from Assigned
    }

    if (job.stage === 'QT Approve' && !['Negotiating', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'].includes(newStage)) {
      notify.error("From QT Approve, you can only change to Negotiating, Revision, Closed Won, Closed Lost or Cancel.");
      return;
    }

    if (job.stage === 'Negotiating' && !['Revision', 'Closed Won', 'Closed Lost', 'Cancel'].includes(newStage)) {
      notify.error("From Negotiating, you can only change to Revision, Closed Won, Closed Lost, or Cancel.");
      return;
    }

    if (['Closed Won', 'Closed Lost', 'Cancel'].includes(job.stage)) {
      notify.error(`This job is ${job.stage} and cannot be changed anymore.`);
      return;
    }

    try {
      if (newStage === 'Revision' || newStage === 'Closed Won') {
        setStageChangeModal({ id, newStage });
        setStageReason('');
        setSoNumberInput('');
        setPoNumberInput('');
        setPoFile(null);
        return;
      }

      const newHistory = [{
        date: new Date().toLocaleString(),
        action: `Stage changed to ${newStage}`,
        user: userName,
        userId: profile?.id || session?.user?.id,
        note: `Stage updated manually`
      }, ...(job.history || [])];
      
      await notify.promise(
        updateJob(id, { stage: newStage, history: newHistory }),
        {
          loading: 'Updating stage...',
          success: `Stage changed to ${newStage} successfully`,
          error: 'Failed to change stage'
        }
      );
    } catch (error) {
      console.error("Failed to change stage:", error);
    }
  };

  const confirmStageChange = async () => {
    if (!stageChangeModal) return;
    const { id, newStage } = stageChangeModal;
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    try {
      if (newStage === 'Revision') {
        if (!stageReason.trim()) {
          notify.error("Revision reason is required.");
          return;
        }
        const newHistory = [{
          date: new Date().toLocaleString(),
          action: `Stage changed to ${newStage}`,
          user: userName,
          userId: profile?.id || session?.user?.id,
          note: stageReason
        }, ...(job.history || [])];
        
        await notify.promise(
          updateJob(id, { stage: newStage, history: newHistory }),
          {
            loading: 'Updating stage...',
            success: `Stage changed to ${newStage} successfully`,
            error: 'Failed to change stage'
          }
        );
      } else if (newStage === 'Closed Won') {
        const newHistory = [{
          date: new Date().toLocaleString(),
          action: `Stage changed to ${newStage}`,
          user: userName,
          userId: profile?.id || session?.user?.id,
          note: `PO: ${poNumberInput}, SO: ${soNumberInput}`
        }, ...(job.history || [])];
        
        await notify.promise(
          updateJob(stageChangeModal.id, { 
            stage: stageChangeModal.newStage, 
            poNumber: poNumberInput,
            poFile: poFile,
            history: newHistory 
          }),
          {
            loading: 'Closing Job as Won...',
            success: 'Stage changed to Closed Won successfully',
            error: 'Failed to change stage'
          }
        );
      }
      setStageChangeModal(null);
    } catch (error) {
      console.error("Failed to change stage:", error);
    }
  };

  const getLatestQuote = (jobId: string) => {
    const quotes = quotations.filter(q => q.job_id === jobId && q.quotation_pdf_url);
    if (quotes.length === 0) return null;
    return quotes[0];
  };

  const getJobQuote = (jobId: string) => {
    const quotes = quotations.filter(q => q.job_id === jobId);
    if (quotes.length === 0) return null;
    return quotes[0];
  };

  const handleDownloadFromJob = (e: React.MouseEvent, quote: any, action: 'preview' | 'download' = 'preview') => {
    e.stopPropagation();
    generateQuotationPDF(quote, products, pdfSettings, action);
  };

  const getAllowedStages = (currentStage: string) => {
    switch (currentStage) {
      case 'Open':
        return ['Open', 'Assigned', 'Cancel'];
      case 'Assigned':
        return ['Assigned'];
      case 'QT Approve':
        return ['QT Approve', 'Negotiating', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'];
      case 'Negotiating':
        return ['Negotiating', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'];
      case 'Revision':
        return ['Revision'];
      case 'Closed Won':
        return ['Closed Won'];
      case 'Closed Lost':
        return ['Closed Lost'];
      case 'Cancel':
        return ['Cancel'];
      default:
        // Prevent bypassing flow by locking to initial options if somehow invalid
        return ['Open', 'Assigned', 'Cancel'];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('nav.opportunities')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('job.subtitle')}</p>
        </div>
        {!isSupport && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>{t('action.new_job')}</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder={t('header.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="All">{t('job.all_stages')}</option>
              {STAGES.map(s => <option key={s} value={s}>{t('status.' + s.toLowerCase().replace(/ /g, '_')) || s}</option>)}
            </select>
          </div>
          <div className="flex bg-surface-container-lowest border ghost-border rounded-xl p-1">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <LayoutList size={16} /> {t('common.list')}
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'board' ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <LayoutGrid size={16} /> {t('common.board')}
            </button>
          </div>
        </div>
      </div>

      {/* Jobs View */}
      {viewMode === 'list' ? (
        <div className="bg-surface-container-lowest border ghost-border rounded-2xl overflow-hidden editorial-shadow">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b ghost-border bg-surface-container-low/50">
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.job_details')}</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.customer')}</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.value_est')}</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.stage')}</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.status')}</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y ghost-border">
                {filteredJobs.map((job) => {
                  const latestQuote = getLatestQuote(job.id);
                  return (
                  <tr key={job.id} onClick={() => setViewingJob(job)} className="hover:bg-surface-container-lowest/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary-container/50 text-secondary flex items-center justify-center flex-shrink-0">
                          <Briefcase size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-on-surface flex items-center gap-2">
                            {job.job_number && <span className="text-primary font-bold text-xs bg-primary/10 px-2 py-0.5 rounded">{job.job_number}</span>}
                            <span>{job.title}</span>
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {job.date}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-on-surface font-medium truncate max-w-[200px]" title={job.customer}>{job.customer}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-on-surface flex items-center gap-1" title={t('job.estimated_value')}>
                          <Briefcase size={12} className="text-on-surface-variant"/> {formatCurrency(job.value)}
                        </div>
                        {latestQuote && (
                          <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit flex items-center gap-1" title={t('job.quotation_value')}>
                            <FileText size={10}/> {latestQuote.value}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={job.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStageChange(job.id, e.target.value)}
                        disabled={['Assigned', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'].includes(job.stage)}
                        className="bg-surface-container border ghost-border rounded-md text-xs font-medium text-on-surface-variant px-2 py-1 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        {getAllowedStages(job.stage).map(s => <option key={s} value={s}>{t('status.' + s.toLowerCase().replace(/ /g, '_')) || s}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const displayStatus = getJobQuote(job.id)?.status || job.status;
                        return (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(displayStatus)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(displayStatus)}`}></span>
                            {t('status.' + displayStatus.toLowerCase().replace(/ /g, '_')) || displayStatus}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {latestQuote?.quotation_pdf_url && (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => handleDownloadFromJob(e, latestQuote, 'preview')}
                              className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                              title="Preview PDF"
                            >
                              <FileText size={18} />
                            </button>
                            <button 
                              onClick={(e) => handleDownloadFromJob(e, latestQuote, 'download')}
                              className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        )}
                        {!isSupport && (
                          <>
                            {job.stage === 'Open' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleStageChange(job.id, 'Assigned'); }}
                                className="p-2 text-primary hover:bg-primary-container/30 rounded-lg transition-colors flex items-center gap-1"
                                title={t('action.send_to_support')}
                              >
                                <Send size={18} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(job); }}
                              className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" 
                              title={t('action.edit_job')}
                            >
                              <Edit2 size={18} />
                            </button>
                          {job.stage === 'Open' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                              title={t('action.delete_job')}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">
                      No jobs found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-surface">
            {filteredJobs.map((job) => {
              const latestQuote = getLatestQuote(job.id);
              const displayStatus = getJobQuote(job.id)?.status || job.status;
              
              return (
                <div key={job.id} onClick={() => setViewingJob(job)} className="bg-surface-container-lowest border ghost-border rounded-2xl p-4 editorial-shadow flex flex-col gap-3 active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary-container/50 text-secondary flex items-center justify-center flex-shrink-0">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-on-surface flex items-center gap-2 flex-wrap">
                          {job.job_number && <span className="text-primary font-bold text-xs bg-primary/10 px-2 py-0.5 rounded">{job.job_number}</span>}
                          <span className="line-clamp-1">{job.title}</span>
                        </div>
                        <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {job.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="text-sm text-on-surface font-medium truncate">
                      {job.customer}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-sm font-medium text-on-surface flex items-center gap-1">
                        <Briefcase size={12} className="text-on-surface-variant"/> {formatCurrency(job.value)}
                      </div>
                      {latestQuote && (
                        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <FileText size={10}/> {latestQuote.value}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-3 border-t ghost-border">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${getStatusColor(displayStatus)} w-fit`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(displayStatus)}`}></span>
                        {t('status.' + displayStatus.toLowerCase().replace(/ /g, '_')) || displayStatus}
                      </span>
                      <select 
                        value={job.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStageChange(job.id, e.target.value)}
                        disabled={['Assigned', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'].includes(job.stage)}
                        className="bg-surface-container border ghost-border rounded-md text-[10px] font-medium text-on-surface-variant px-2 py-1 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        {getAllowedStages(job.stage).map(s => <option key={s} value={s}>{t('status.' + s.toLowerCase().replace(/ /g, '_')) || s}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {latestQuote?.quotation_pdf_url && (
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => handleDownloadFromJob(e, latestQuote, 'preview')}
                            className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" 
                            title="Preview PDF"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            onClick={(e) => handleDownloadFromJob(e, latestQuote, 'download')}
                            className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors" 
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      )}
                      {!isSupport && (
                        <>
                          {job.stage === 'Open' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleStageChange(job.id, 'Assigned'); }}
                              className="p-2 bg-primary-container text-primary hover:bg-primary hover:text-white rounded-lg transition-colors shadow-sm"
                            >
                              <Send size={18} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(job); }}
                            className="p-2 text-outline hover:bg-surface-container rounded-lg transition-colors" 
                          >
                            <Edit2 size={18} />
                          </button>
                        {job.stage === 'Open' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredJobs.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                No jobs found matching "{searchTerm}"
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t ghost-border bg-surface-container-low/30 flex items-center justify-between text-sm text-on-surface-variant">
            <div>{t('table.showing_entries').replace('{count}', filteredJobs.length.toString())}</div>
          </div>
        </div>
      ) : (
        <JobKanban 
          jobs={filteredJobs}
          stages={STAGES}
          t={t}
          getStatusColor={getStatusColor}
          getJobQuote={getJobQuote}
          onJobClick={(job) => setViewingJob(job)}
          onStageChange={(jobId, newStage) => handleStageChange(jobId, newStage)}
        />
      )}

      {/* Job Detail Drawer */}
      <JobDrawer 
        isOpen={!!viewingJob}
        onClose={() => setViewingJob(null)}
        job={viewingJob}
        t={t}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
        getStatusDot={getStatusDot}
        getJobQuote={getJobQuote}
        handleOpenEditModal={handleOpenModal}
        handleStageChange={handleStageChange}
        handleDeleteJob={handleDeleteJob}
        setViewingQuoteDetails={setViewingQuoteDetails}
        isSupport={isSupport}
        getAllowedStages={getAllowedStages}
        resolveUserName={resolveUserName}
        handleDownloadFromJob={handleDownloadFromJob}
      />

      {/* Create/Edit Job Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border flex-shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                {editingJob ? t('action.edit_job') : t('action.create_job')}
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-outline hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveJob} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('job.title_label')}</label>
                <input 
                  required 
                  type="text" 
                  value={jobData.title} 
                  onChange={e => setJobData({...jobData, title: e.target.value})}
                  disabled={editingJob && editingJob.stage !== 'Open'} 
                  className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 text-base sm:text-sm" 
                  placeholder={t('job.title_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('common.description')}</label>
                <textarea 
                  rows={3}
                  value={jobData.description} 
                  onChange={e => setJobData({...jobData, description: e.target.value})}
                  disabled={editingJob && editingJob.stage !== 'Open'} 
                  className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 resize-none text-base sm:text-sm" 
                  placeholder={t('job.desc_placeholder')}
                />
              </div>

              {/* Customer Selection (CRITICAL) */}
              <div className="relative">
                <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('job.select_customer')}<span className="text-error">*</span>
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
                    <button 
                      type="button" 
                      onClick={() => setSelectedCustomer(null)}
                      disabled={editingJob && editingJob.stage !== 'Open'}
                      className="p-1 text-outline hover:text-error rounded-md transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
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
                      disabled={editingJob && editingJob.stage !== 'Open'}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base sm:text-sm disabled:opacity-50"
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
                  <p className="text-xs text-error mt-1.5">A customer must be selected to create a job.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Estimated Value *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">฿</span>
                    <input 
                      required
                      type="number" 
                      value={jobData.value}
                      onChange={(e) => setJobData({...jobData, value: e.target.value})}
                      placeholder="0.00"
                      disabled={editingJob && editingJob.stage !== 'Open'}
                      className="w-full pl-8 pr-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 text-base sm:text-sm" 
                    />
                  </div>
                </div>
                {editingJob && (
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">Stage (Managed via list view)</label>
                    <select 
                      value={jobData.stage} 
                      onChange={e => setJobData({...jobData, stage: e.target.value})}
                      disabled={true} 
                      className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                    >
                      <option value={jobData.stage}>{jobData.stage}</option>
                    </select>
                  </div>
                )}
              </div>

              {editingJob && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">Status (Managed by Support)</label>
                    <select 
                      value={jobData.status} 
                      onChange={e => setJobData({...jobData, status: e.target.value})}
                      disabled={true} 
                      className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('table.po_number')}</label>
                      <input 
                        type="text" 
                        value={jobData.poNumber}
                        onChange={(e) => setJobData({...jobData, poNumber: e.target.value})}
                        placeholder="e.g. PO-12345"
                        disabled={editingJob && editingJob.stage !== 'Open'}
                        className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('job.so_number')}</label>
                      <input 
                        type="text" 
                        value={jobData.soNumber}
                        onChange={(e) => setJobData({...jobData, soNumber: e.target.value})}
                        placeholder="e.g. SO-67890"
                        disabled={editingJob && editingJob.stage !== 'Open'}
                        className="w-full px-4 py-2 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50" 
                      />
                      <p className="text-xs text-on-surface-variant mt-1.5">Input SO Number to notify support team.</p>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t ghost-border">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-full font-medium transition-colors"
                >{t('common.cancel')}</button>
                <button 
                  type="submit" 
                  disabled={!selectedCustomer || (!!editingJob && editingJob.stage !== 'Open')}
                  className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingJob ? 'Save Changes' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  {/* Stage Change Modal */}
  {stageChangeModal && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow overflow-hidden">
        <div className="p-6 border-b ghost-border">
          <h2 className="text-xl font-headline font-semibold text-on-surface">
            Change Stage to {stageChangeModal.newStage}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {stageChangeModal.newStage === 'Revision' && (
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('job.revision_reason')}<span className="text-error">*</span>
              </label>
              <textarea
                value={stageReason}
                onChange={(e) => setStageReason(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm min-h-[120px]"
                placeholder="Please enter the detailed reason for revision to notify Support..."
              />
              <p className="text-xs text-on-surface-variant mt-2">
                This note will be highlighted for the Support team to review.
              </p>
            </div>
          )}

          {stageChangeModal.newStage === 'Closed Won' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Purchase Order (PO) Number <span className="text-outline text-xs ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={poNumberInput}
                  onChange={(e) => setPoNumberInput(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                  placeholder="Enter PO Number (e.g. PO-12345)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Attach Document / Image <span className="text-outline text-xs ml-1">(Optional)</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setPoFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              <p className="text-xs text-on-surface-variant bg-primary-container/30 p-3 rounded-lg border border-primary/20">
                <span className="font-semibold text-primary">Note:</span> Support will assign the SO Number when they open the job in the fulfillment phase.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => setStageChangeModal(null)}
              className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-full font-medium transition-colors"
            >{t('common.cancel')}</button>
            <button 
              onClick={confirmStageChange}
              disabled={
                (stageChangeModal.newStage === 'Revision' && !stageReason.trim())
              }
              className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >{t('common.confirm')}</button>
          </div>
        </div>
      </div>
    </div>
  )}
  {/* Quotation Details Modal */}
  {viewingQuoteDetails && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-4xl editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b ghost-border flex-shrink-0 bg-surface-container-low/30">
          <div>
            <h2 className="text-xl font-headline font-semibold text-on-surface flex items-center gap-2">
              <FileText size={24} className="text-primary" />
              {t('quote.quotation_details')}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">{t('quote.reference')} {viewingQuoteDetails.quotation_number || `QT-${viewingQuoteDetails.id.substring(0, 8)}`}</p>
          </div>
          <button onClick={() => setViewingQuoteDetails(null)} className="p-2 text-outline hover:text-error hover:bg-error-container/50 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-surface-container-lowest">
          <div className="overflow-x-auto border ghost-border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b ghost-border bg-surface-container-low/50">
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider w-1/2">{t('table.product_service')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">{t('table.qty')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-center">{t('table.unit')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">{t('table.price_unit')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">{t('table.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y ghost-border">
                {(() => {
                  const items = viewingQuoteDetails.details?.items || viewingQuoteDetails.items || [];
                  if (items.length > 0) {
                    return items.map((item: any, index: number) => {
                      const productInfo = products.find(p => p.id === item.productId || p.id === item.itemId);
                      const price = item.price || item.unitPrice || 0;
                      const lineTotal = item.total || ((item.quantity * price) - (item.discount || 0));
                      return (
                        <tr key={index} className="hover:bg-surface-container-lowest/50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-on-surface">{productInfo?.name || item.itemId || item.productId || 'Custom Item'}</div>
                            {item.description && (
                              <div className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{item.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-on-surface text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-on-surface-variant text-center">{productInfo?.unit || item.unit || '-'}</td>
                          <td className="px-4 py-3 text-sm text-on-surface text-right">{formatCurrency(price)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-on-surface text-right">{formatCurrency(lineTotal)}</td>
                        </tr>
                      );
                    });
                  } else {
                    return (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                          No line items found.
                        </td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
              <tfoot className="bg-surface-container-low/30 border-t ghost-border">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-on-surface-variant text-right">{t('quote.subtotal')}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-on-surface text-right">{formatCurrency(viewingQuoteDetails.details?.subtotal || viewingQuoteDetails.subtotal || 0)}</td>
                </tr>
                {(viewingQuoteDetails.details?.discountAmount > 0 || viewingQuoteDetails.discount > 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-medium text-error text-right">Discount</td>
                    <td className="px-4 py-3 text-sm font-semibold text-error text-right">-{formatCurrency(viewingQuoteDetails.details?.discountAmount || viewingQuoteDetails.discount || 0)}</td>
                  </tr>
                )}
                <tr className="border-t ghost-border bg-primary/5">
                  <td colSpan={4} className="px-4 py-4 text-base font-bold text-on-surface text-right">{t('quote.grand_total')}</td>
                  <td className="px-4 py-4 text-base font-bold text-primary text-right">{viewingQuoteDetails.value}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )}

</div>
  );
};

export default Jobs;
