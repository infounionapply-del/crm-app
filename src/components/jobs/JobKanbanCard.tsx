import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Building2, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';

interface JobKanbanCardProps {
  job: any;
  t: (key: string) => string;
  getStatusColor: (status: string) => string;
  getJobQuote: (jobId: string) => any;
  onClick: (job: any) => void;
}

const JobKanbanCard: React.FC<JobKanbanCardProps> = ({
  job,
  t,
  getStatusColor,
  getJobQuote,
  onClick
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: {
      type: 'Job',
      job,
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  const displayStatus = getJobQuote(job.id)?.status || job.status;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent drag click from firing
        if (!isDragging) {
          onClick(job);
        }
      }}
      className={`bg-surface-container-lowest border ghost-border p-4 rounded-xl editorial-shadow hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group ${isDragging ? 'shadow-xl ring-2 ring-primary ring-opacity-50' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(displayStatus)}`}>
          {displayStatus === 'Pending' ? t('status.pending_approval') : t(`status.${displayStatus.toLowerCase().replace(/ /g, '_')}`) || displayStatus}
        </span>
        <span className="text-outline flex items-center gap-1 text-[10px]"><Calendar size={10} /> {job.date}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-1">
        {job.job_number && <span className="text-primary font-bold text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">{job.job_number}</span>}
        <h4 className="font-medium text-on-surface text-sm truncate" title={job.title}>{job.title}</h4>
      </div>
      
      <div className="text-xs text-on-surface-variant mb-3 flex items-center gap-1 truncate" title={job.customer}>
        <Building2 size={12} className="flex-shrink-0" /> <span className="truncate">{job.customer}</span>
      </div>
      
      {job.stage === 'Revision' && job.history && job.history.length > 0 && (
        <div className="mb-3 p-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] border border-purple-100">
          <span className="font-semibold block mb-0.5">{t('job.revision_history')}:</span>
          <span className="line-clamp-2">{job.history[0].note || 'No note provided.'}</span>
        </div>
      )}

      {job.history && job.history.length > 0 && job.stage !== 'Revision' && (
        <div className="mb-3 flex items-start gap-1.5 text-[10px] text-on-surface-variant bg-surface-container-low p-1.5 rounded-lg border ghost-border">
          <Clock size={10} className="mt-0.5 flex-shrink-0" />
          <span className="truncate">{(() => {
            let note = job.history[0].note;
            if (!note) return job.history[0].action;
            if (note === 'Stage updated manually') return t('job.stage_updated_manually');
            if (note.includes('Status changed to ')) {
              const match = note.match(/Status changed to ([^,]+)/);
              if (match) note = note.replace(/Status changed to ([^,]+)/, `${t('job.status_changed_to')} ${t('status.' + match[1].toLowerCase().replace(/ /g, '_')) || match[1]}`);
            }
            if (note.includes('Stage changed to ')) {
              const match = note.match(/Stage changed to ([^,]+)/);
              if (match) note = note.replace(/Stage changed to ([^,]+)/, `${t('job.stage_changed_to')} ${t('status.' + match[1].toLowerCase().replace(/ /g, '_')) || match[1]}`);
            }
            return note;
          })()}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t ghost-border">
        <span className="font-medium text-emerald-600 font-mono">฿{job.value.toLocaleString()}</span>
        {getJobQuote(job.id) && (
          <span className="text-[10px] bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded flex items-center gap-1">
            <FileText size={10} /> {t('table.document')}
          </span>
        )}
      </div>
    </div>
  );
};

export default JobKanbanCard;
