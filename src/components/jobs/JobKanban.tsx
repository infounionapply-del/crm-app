import React, { useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import JobKanbanColumn from './JobKanbanColumn';
import JobKanbanCard from './JobKanbanCard';

interface JobKanbanProps {
  jobs: any[];
  stages: string[];
  t: (key: string) => string;
  getStatusColor: (status: string) => string;
  getJobQuote: (jobId: string) => any;
  onJobClick: (job: any) => void;
  onStageChange: (jobId: string, newStage: string) => void;
}

const JobKanban: React.FC<JobKanbanProps> = ({
  jobs,
  stages,
  t,
  getStatusColor,
  getJobQuote,
  onJobClick,
  onStageChange
}) => {
  const [activeJob, setActiveJob] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires a 5px drag to start, allowing click events to pass through
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const job = jobs.find(j => j.id === active.id);
    if (job) {
      setActiveJob(job);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStage = over.id as string;
    
    const job = jobs.find(j => j.id === jobId);
    
    if (job && job.stage !== newStage) {
      // Validation: Support cannot change these stages, but we assume handleStageChange in parent handles or validates this
      onStageChange(jobId, newStage);
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4 snap-x h-[calc(100vh-250px)] min-h-[500px]">
        {stages.map(stage => (
          <JobKanbanColumn 
            key={stage}
            stage={stage}
            jobs={jobs.filter(j => j.stage === stage)}
            t={t}
            getStatusColor={getStatusColor}
            getJobQuote={getJobQuote}
            onJobClick={onJobClick}
          />
        ))}
      </div>

      {/* Overlay for dragging */}
      <DragOverlay>
        {activeJob ? (
          <JobKanbanCard
            job={activeJob}
            t={t}
            getStatusColor={getStatusColor}
            getJobQuote={getJobQuote}
            onClick={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default JobKanban;
