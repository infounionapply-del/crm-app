import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import JobKanbanCard from './JobKanbanCard';

interface JobKanbanColumnProps {
  stage: string;
  jobs: any[];
  t: (key: string) => string;
  getStatusColor: (status: string) => string;
  getJobQuote: (jobId: string) => any;
  onJobClick: (job: any) => void;
}

const JobKanbanColumn: React.FC<JobKanbanColumnProps> = ({
  stage,
  jobs,
  t,
  getStatusColor,
  getJobQuote,
  onJobClick
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: stage,
    data: {
      type: 'Column',
      stage,
    }
  });

  const stageLabel = t('status.' + stage.toLowerCase().replace(/ /g, '_')) || stage;

  return (
    <div className="flex-shrink-0 w-80 bg-surface-container-lowest border ghost-border rounded-2xl flex flex-col snap-start max-h-full">
      <div className="p-4 border-b ghost-border flex items-center justify-between bg-surface-container-low/50 rounded-t-2xl">
        <h3 className="font-medium text-on-surface">{stageLabel}</h3>
        <span className="bg-surface-container text-on-surface-variant text-xs font-medium px-2 py-1 rounded-full">
          {jobs.length}
        </span>
      </div>
      
      <div 
        ref={setNodeRef}
        className={`p-4 flex-1 overflow-y-auto space-y-4 min-h-[200px] transition-colors ${isOver ? 'bg-primary-container/20 ring-2 ring-primary ring-inset rounded-b-2xl' : ''}`}
      >
        {jobs.map(job => (
          <JobKanbanCard 
            key={job.id}
            job={job}
            t={t}
            getStatusColor={getStatusColor}
            getJobQuote={getJobQuote}
            onClick={onJobClick}
          />
        ))}
        {jobs.length === 0 && (
          <div className="h-32 flex items-center justify-center text-sm text-outline border-2 border-dashed ghost-border rounded-xl p-4 text-center">
            {t('job.drop_jobs_here')}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobKanbanColumn;
