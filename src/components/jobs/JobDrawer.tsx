import React, { useState } from 'react';
import { X, Briefcase, Building2, Calendar, FileText, Download, History, CheckCircle, Clock, Edit2, Trash2, Send } from 'lucide-react';

interface JobDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  t: (key: string) => string;
  formatCurrency: (value: number) => string;
  getStatusColor: (status: string) => string;
  getStatusDot: (status: string) => string;
  getJobQuote: (jobId: string) => any;
  handleOpenEditModal: (job: any) => void;
  handleStageChange: (jobId: string, stage: string) => void;
  handleDeleteJob: (jobId: string) => void;
  setViewingQuoteDetails: (quote: any) => void;
  isSupport: boolean;
  getAllowedStages: (stage: string) => string[];
  resolveUserName: (entry: any) => string;
  handleDownloadFromJob?: (e: React.MouseEvent, quote: any, action: 'preview' | 'download') => void;
}

const JobDrawer: React.FC<JobDrawerProps> = ({
  isOpen,
  onClose,
  job,
  t,
  formatCurrency,
  getStatusColor,
  getStatusDot,
  getJobQuote,
  handleOpenEditModal,
  handleStageChange,
  handleDeleteJob,
  setViewingQuoteDetails,
  isSupport,
  getAllowedStages,
  resolveUserName,
  handleDownloadFromJob
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  if (!isOpen || !job) return null;

  const quoteStatus = getJobQuote(job.id)?.status || job.status;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-surface-container-lowest shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b ghost-border shrink-0 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {job.job_number && <span className="text-primary font-bold text-xs bg-primary/10 px-2 py-0.5 rounded">{job.job_number}</span>}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(quoteStatus)}`}>
                  {quoteStatus === 'Pending' ? t('status.pending_approval') : t(`status.${quoteStatus.toLowerCase().replace(/ /g, '_')}`) || quoteStatus}
                </span>
              </div>
              <h2 className="text-lg font-bold text-on-surface line-clamp-1">{job.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b ghost-border px-6 pt-2 shrink-0 bg-surface-container-low/30">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            {t('job.tab_details')}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            {t('job.tab_timeline')}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' && (
            <>
              {/* Order Progress (if Won) */}
              {job.stage === 'Closed Won' && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].includes(quoteStatus) && (
                <div className="p-5 bg-surface-container border ghost-border rounded-xl">
                  <h3 className="text-xs font-semibold text-on-surface mb-6 uppercase tracking-wider">{t('job.order_progress')}</h3>
                  <div className="relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-container-high -translate-y-1/2 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500" 
                      style={{ 
                        width: quoteStatus === 'Won' ? '0%' : 
                               quoteStatus === 'Order Pending' ? '25%' :
                               quoteStatus === 'In Process' ? '50%' :
                               quoteStatus === 'FG' ? '75%' : '100%'
                      }}
                    ></div>
                    
                    <div className="relative z-10 flex justify-between">
                      {['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].map((step, index) => {
                        const stepIndex = ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].indexOf(quoteStatus);
                        const isCompleted = stepIndex > index || (stepIndex === index && quoteStatus === 'Delivery');
                        const isCurrent = stepIndex === index && quoteStatus !== 'Delivery';
                        
                        return (
                          <div key={t('status.' + step.toLowerCase().replace(/ /g, '_')) || step} className="flex flex-col items-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 mb-1.5 transition-colors ${
                              isCompleted ? 'bg-primary border-primary text-on-primary' : 
                              isCurrent ? 'bg-primary-container border-primary text-primary' : 
                                          'bg-surface-container-lowest border-outline-variant text-outline'
                            }`}>
                              {isCompleted ? <CheckCircle size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>}
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

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 bg-surface-container-lowest rounded-xl p-5 border ghost-border editorial-shadow-sm">
                <div className="col-span-2">
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">{t('table.customer')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface font-medium bg-surface-container px-3 py-2 rounded-lg">
                    <Building2 size={16} className="text-outline" />
                    {job.customer}
                  </div>
                </div>
                
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">{t('table.stage')}</span>
                  <select 
                    value={job.stage}
                    onChange={(e) => handleStageChange(job.id, e.target.value)}
                    disabled={['Assigned', 'Revision', 'Closed Won', 'Closed Lost', 'Cancel'].includes(job.stage)}
                    className="w-full bg-surface-container border ghost-border rounded-lg text-sm font-medium text-on-surface px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  >
                    {getAllowedStages(job.stage).map(s => <option key={s} value={s}>{t('status.' + s.toLowerCase().replace(/ /g, '_')) || s}</option>)}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">{t('table.value')}</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                    <span className="font-bold">฿</span>
                    {formatCurrency(job.value).replace('฿', '').trim()}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">{t('table.created_date')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface">
                    <Calendar size={14} className="text-outline" />
                    {job.date}
                  </div>
                </div>

                {job.po_number && (
                  <div>
                    <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">{t('table.po_number')}</span>
                    <div className="text-sm text-on-surface font-medium">{job.po_number}</div>
                  </div>
                )}
                {job.so_number && (
                  <div>
                    <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">{t('job.so_number')}</span>
                    <div className="text-sm text-on-surface font-medium">{job.so_number}</div>
                  </div>
                )}
              </div>

              {job.description && (
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">{t('common.description')}</span>
                  <div className="text-sm text-on-surface-variant bg-surface-container-low p-4 rounded-xl border ghost-border whitespace-pre-wrap">
                    {job.description}
                  </div>
                </div>
              )}

              {/* Quotation Buttons */}
              {(() => {
                const latestQuote = getJobQuote(job.id);
                if (latestQuote) {
                  return (
                    <div className="flex flex-col gap-2">
                      {['Approved', 'Won', 'Order Pending', 'In Process', 'FG', 'Delivery'].includes(latestQuote.status) && (
                        <button 
                          onClick={() => {
                            onClose();
                            setViewingQuoteDetails(latestQuote);
                          }}
                          className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-neutral-900 text-white hover:bg-black rounded-xl font-medium transition-colors text-sm shadow-sm"
                        >
                          <FileText size={16} /> {t('job.view_approved_quote')}
                        </button>
                      )}
                      
                      {latestQuote.quotation_pdf_url && handleDownloadFromJob && (
                        <div className="flex gap-2 w-full mt-2">
                          <button 
                            onClick={(e) => handleDownloadFromJob(e, latestQuote, 'preview')}
                            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-medium transition-colors text-sm shadow-sm border ghost-border"
                          >
                            <FileText size={16} /> Preview PDF
                          </button>
                          <button 
                            onClick={(e) => handleDownloadFromJob(e, latestQuote, 'download')}
                            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium transition-colors text-sm shadow-sm border border-primary/20"
                          >
                            <Download size={16} /> Download PDF
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-surface-container-high rounded-full"></div>
              {job.history && job.history.length > 0 ? (
                job.history.map((entry: any, index: number) => (
                  <div key={index} className="flex gap-4 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 border-4 border-surface-container-lowest shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-on-primary"></div>
                    </div>
                    <div className="flex-1 bg-surface-container-lowest p-4 rounded-xl border ghost-border shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-medium text-on-surface flex flex-wrap items-center gap-2">
                          {entry.action}
                          {resolveUserName(entry) && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{resolveUserName(entry)}</span>}
                        </div>
                        <span className="text-[10px] text-on-surface-variant whitespace-nowrap bg-surface-container px-2 py-0.5 rounded-full">{entry.date}</span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{(() => {
                          let note = entry.note === 'Stage updated manually' ? t('job.stage_updated_manually') : entry.note;
                          if (note.includes('Status changed to ')) {
                            const match = note.match(/Status changed to ([^,]+)/);
                            if (match) note = note.replace(/Status changed to ([^,]+)/, `${t('job.status_changed_to')} ${t('status.' + match[1].toLowerCase().replace(/ /g, '_')) || match[1]}`);
                          }
                          if (note.includes('Stage changed to ')) {
                            const match = note.match(/Stage changed to ([^,]+)/);
                            if (match) note = note.replace(/Stage changed to ([^,]+)/, `${t('job.stage_changed_to')} ${t('status.' + match[1].toLowerCase().replace(/ /g, '_')) || match[1]}`);
                          }
                          return note;
                        })()}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-on-surface-variant text-sm">
                  No history available.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t ghost-border bg-surface-container-lowest shrink-0 flex items-center gap-3">
          {!isSupport && (
            <>
              {job.stage === 'Open' && (
                <button 
                  onClick={() => handleStageChange(job.id, 'Assigned')}
                  className="flex-1 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Send size={16} /> Assign
                </button>
              )}
              <button 
                onClick={() => {
                  onClose();
                  handleOpenEditModal(job);
                }}
                className="flex-1 px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-sm shadow-primary/20"
              >
                <Edit2 size={16} /> Edit
              </button>
              {job.stage === 'Open' && (
                <button 
                  onClick={() => {
                    onClose();
                    handleDeleteJob(job.id);
                  }}
                  className="px-3 py-2 text-error hover:bg-error-container rounded-xl transition-colors flex items-center justify-center border ghost-border"
                  title={t('action.delete')}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default JobDrawer;
